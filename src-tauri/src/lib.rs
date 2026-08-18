use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::{
    collections::BTreeSet,
    env, fs,
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
    process::{Child, ChildStdin, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Clone, Default)]
struct RpcManager {
    process: Arc<Mutex<Option<RpcProcess>>>,
}

struct RpcProcess {
    pid: u32,
    child: Arc<Mutex<Child>>,
    stdin: Arc<Mutex<ChildStdin>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeInfo {
    binary_path: String,
    cwd: String,
    pid: u32,
}

#[derive(Clone, Serialize)]
struct RpcOutput {
    stream: &'static str,
    line: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RpcExit {
    pid: u32,
    code: Option<i32>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProviderConfigInput {
    provider_id: String,
    api_key: Option<String>,
    model_id: Option<String>,
    base_url: Option<String>,
    custom: bool,
    make_default: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ConfigSnapshot {
    configured_providers: Vec<String>,
    default_provider: Option<String>,
    default_model: Option<String>,
    serper_configured: bool,
    mcp_server_count: usize,
    github_configured: bool,
    skill_directory_count: usize,
}

fn agent_dir() -> Result<PathBuf, String> {
    env::var_os("HOME")
        .map(PathBuf::from)
        .map(|home| home.join(".prime/agent"))
        .ok_or_else(|| "The user home directory is unavailable.".to_string())
}

fn read_json(path: &Path) -> Result<Value, String> {
    if !path.exists() {
        return Ok(json!({}));
    }
    let content = fs::read_to_string(path)
        .map_err(|error| format!("Could not read {}: {error}", path.display()))?;
    serde_json::from_str(&content)
        .map_err(|error| format!("Could not parse {}: {error}", path.display()))
}

fn write_private_json(path: &Path, value: &Value) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Could not create {}: {error}", parent.display()))?;
    }
    let content = serde_json::to_string_pretty(value)
        .map_err(|error| format!("Could not serialize {}: {error}", path.display()))?;
    fs::write(path, format!("{content}\n"))
        .map_err(|error| format!("Could not write {}: {error}", path.display()))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600))
            .map_err(|error| format!("Could not protect {}: {error}", path.display()))?;
    }
    Ok(())
}

fn validate_id(id: &str) -> Result<(), String> {
    if id.is_empty()
        || id.len() > 80
        || !id
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
    {
        return Err("The provider identifier is invalid.".to_string());
    }
    Ok(())
}

fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\"'\"'"))
}

fn store_in_keychain(id: &str, secret: &str) -> Result<String, String> {
    validate_id(id)?;
    if secret.trim().is_empty() {
        return Err("The API key cannot be empty.".to_string());
    }
    let service = format!("prime-agent-desktop-{id}");
    let account = env::var("USER").unwrap_or_else(|_| "prime-agent".to_string());
    let output = Command::new("security")
        .args([
            "add-generic-password",
            "-U",
            "-a",
            &account,
            "-s",
            &service,
            "-w",
            secret,
        ])
        .output()
        .map_err(|error| format!("Could not access macOS Keychain: {error}"))?;
    if !output.status.success() {
        return Err(format!(
            "macOS Keychain rejected the credential: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    Ok(format!(
        "!security find-generic-password -a {} -s {} -w",
        shell_quote(&account),
        shell_quote(&service)
    ))
}

fn object_mut(value: &mut Value) -> Result<&mut Map<String, Value>, String> {
    value
        .as_object_mut()
        .ok_or_else(|| "Prime Agent configuration must be a JSON object.".to_string())
}

fn save_auth_reference(provider_id: &str, key_reference: String) -> Result<(), String> {
    let path = agent_dir()?.join("auth.json");
    let mut auth = read_json(&path)?;
    object_mut(&mut auth)?.insert(
        provider_id.to_string(),
        json!({ "type": "api_key", "key": key_reference }),
    );
    write_private_json(&path, &auth)
}

#[tauri::command]
fn prime_config_status() -> Result<ConfigSnapshot, String> {
    let directory = agent_dir()?;
    let auth = read_json(&directory.join("auth.json"))?;
    let models = read_json(&directory.join("models.json"))?;
    let settings = read_json(&directory.join("settings.json"))?;
    let mut configured = BTreeSet::new();
    if let Some(entries) = auth.as_object() {
        configured.extend(entries.keys().filter(|id| id.as_str() != "serper").cloned());
    }
    if let Some(entries) = models.get("providers").and_then(Value::as_object) {
        configured.extend(entries.iter().filter_map(|(id, provider)| {
            provider
                .get("apiKey")
                .and_then(Value::as_str)
                .map(|_| id.clone())
        }));
    }
    let serper_configured = auth.get("serper").is_some();
    let mcp_server_count = settings
        .get("mcpServers")
        .and_then(Value::as_object)
        .map_or(0, Map::len);
    let home = env::var_os("HOME").map(PathBuf::from);
    let skill_directory_count = home
        .map(|home| {
            [
                home.join(".prime/agent/skills"),
                home.join(".agents/skills"),
            ]
            .into_iter()
            .filter(|path| path.is_dir())
            .count()
        })
        .unwrap_or(0);
    let github_configured = Command::new("gh")
        .args(["auth", "status"])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .is_ok_and(|status| status.success());

    Ok(ConfigSnapshot {
        configured_providers: configured.into_iter().collect(),
        default_provider: settings
            .get("defaultProvider")
            .and_then(Value::as_str)
            .map(str::to_string),
        default_model: settings
            .get("defaultModel")
            .and_then(Value::as_str)
            .map(str::to_string),
        serper_configured,
        mcp_server_count,
        github_configured,
        skill_directory_count,
    })
}

#[tauri::command]
fn prime_save_provider(input: ProviderConfigInput) -> Result<(), String> {
    validate_id(&input.provider_id)?;
    let directory = agent_dir()?;
    let mut key_reference = None;
    if let Some(secret) = input
        .api_key
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        let reference = store_in_keychain(&input.provider_id, secret.trim())?;
        save_auth_reference(&input.provider_id, reference.clone())?;
        key_reference = Some(reference);
    }

    if input.custom {
        let base_url = input
            .base_url
            .as_deref()
            .map(str::trim)
            .filter(|value| value.starts_with("https://"))
            .ok_or_else(|| "A custom provider requires an HTTPS Base URL.".to_string())?;
        let model_id = input
            .model_id
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| "A custom provider requires a Model ID.".to_string())?;
        let models_path = directory.join("models.json");
        let mut models = read_json(&models_path)?;
        let root = object_mut(&mut models)?;
        let providers = root
            .entry("providers")
            .or_insert_with(|| json!({}))
            .as_object_mut()
            .ok_or_else(|| "models.json providers must be a JSON object.".to_string())?;
        let existing_reference = providers
            .get(&input.provider_id)
            .and_then(|provider| provider.get("apiKey"))
            .and_then(Value::as_str)
            .map(str::to_string);
        let reference = key_reference.or(existing_reference).ok_or_else(|| {
            "This provider needs an API key before it can be configured.".to_string()
        })?;
        providers.insert(
            input.provider_id.clone(),
            json!({
                "baseUrl": base_url,
                "api": "openai-completions",
                "apiKey": reference,
                "authHeader": true,
                "compat": {
                    "supportsDeveloperRole": false,
                    "supportsReasoningEffort": false
                },
                "models": [{
                    "id": model_id,
                    "name": model_id,
                    "reasoning": false,
                    "input": ["text"],
                    "contextWindow": 262144,
                    "maxTokens": 32768,
                    "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }
                }]
            }),
        );
        write_private_json(&models_path, &models)?;
    }

    if input.make_default {
        let model_id = input
            .model_id
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| {
                "A Model ID is required to make this provider the default.".to_string()
            })?;
        let settings_path = directory.join("settings.json");
        let mut settings = read_json(&settings_path)?;
        let root = object_mut(&mut settings)?;
        root.insert("defaultProvider".to_string(), json!(input.provider_id));
        root.insert("defaultModel".to_string(), json!(model_id));
        let enabled = root.entry("enabledModels").or_insert_with(|| json!([]));
        let enabled = enabled
            .as_array_mut()
            .ok_or_else(|| "settings.json enabledModels must be an array.".to_string())?;
        let qualified = format!("{}/{}", input.provider_id, model_id);
        if !enabled
            .iter()
            .any(|value| value.as_str() == Some(&qualified))
        {
            enabled.push(json!(qualified));
        }
        write_private_json(&settings_path, &settings)?;
    }
    Ok(())
}

#[tauri::command]
fn prime_save_service_credential(service_id: String, api_key: String) -> Result<(), String> {
    if service_id != "serper" {
        return Err("Unsupported service credential.".to_string());
    }
    let reference = store_in_keychain(&service_id, api_key.trim())?;
    save_auth_reference(&service_id, reference)
}

fn executable_candidate(path: PathBuf) -> Option<PathBuf> {
    path.is_file().then_some(path)
}

fn resolve_prime_agent() -> Result<PathBuf, String> {
    if let Some(configured) = env::var_os("PRIME_AGENT_BIN") {
        return executable_candidate(PathBuf::from(configured))
            .ok_or_else(|| "PRIME_AGENT_BIN is set, but it does not point to a file.".to_string());
    }

    if let Some(paths) = env::var_os("PATH") {
        for directory in env::split_paths(&paths) {
            if let Some(path) = executable_candidate(directory.join("prime-agent")) {
                return Ok(path);
            }
        }
    }

    if let Some(home) = env::var_os("HOME") {
        let home = PathBuf::from(home);
        for candidate in [
            home.join(".local/bin/prime-agent"),
            home.join(".prime/bin/prime-agent"),
            home.join("bin/prime-agent"),
        ] {
            if let Some(path) = executable_candidate(candidate) {
                return Ok(path);
            }
        }

        let nvm_versions = home.join(".nvm/versions/node");
        if let Ok(entries) = fs::read_dir(nvm_versions) {
            let mut candidates = entries
                .filter_map(Result::ok)
                .map(|entry| entry.path().join("bin/prime-agent"))
                .collect::<Vec<_>>();
            candidates.sort();
            for candidate in candidates.into_iter().rev() {
                if let Some(path) = executable_candidate(candidate) {
                    return Ok(path);
                }
            }
        }

        for candidate in [
            home.join(".volta/bin/prime-agent"),
            home.join(".fnm/aliases/default/bin/prime-agent"),
        ] {
            if let Some(path) = executable_candidate(candidate) {
                return Ok(path);
            }
        }
    }

    Err("Prime Agent was not found. Install it with the official installer, or set PRIME_AGENT_BIN to the executable path.".to_string())
}

fn emit_lines<R: std::io::Read + Send + 'static>(app: AppHandle, reader: R, stream: &'static str) {
    thread::spawn(move || {
        let mut reader = BufReader::new(reader);
        let mut line = String::new();
        loop {
            line.clear();
            match reader.read_line(&mut line) {
                Ok(0) => break,
                Ok(_) => {
                    while line.ends_with(['\n', '\r']) {
                        line.pop();
                    }
                    if !line.is_empty() {
                        let _ = app.emit(
                            "prime-rpc-output",
                            RpcOutput {
                                stream,
                                line: line.clone(),
                            },
                        );
                    }
                }
                Err(error) => {
                    let _ = app.emit(
                        "prime-rpc-output",
                        RpcOutput {
                            stream: "stderr",
                            line: format!("Failed to read {stream}: {error}"),
                        },
                    );
                    break;
                }
            }
        }
    });
}

fn stop_process(manager: &RpcManager) {
    let process = manager.process.lock().ok().and_then(|mut slot| slot.take());
    if let Some(process) = process {
        drop(process.stdin);
        if let Ok(mut child) = process.child.lock() {
            if child.try_wait().ok().flatten().is_none() {
                let _ = child.kill();
            }
            let _ = child.wait();
        }
    }
}

#[tauri::command]
fn prime_rpc_start(
    app: AppHandle,
    manager: tauri::State<RpcManager>,
    cwd: String,
) -> Result<RuntimeInfo, String> {
    let cwd_path = Path::new(&cwd)
        .canonicalize()
        .map_err(|error| format!("Cannot open project folder: {error}"))?;
    if !cwd_path.is_dir() {
        return Err("The selected project path is not a directory.".to_string());
    }

    let binary = resolve_prime_agent()?;
    let mut slot = manager
        .process
        .lock()
        .map_err(|_| "Prime Agent process state is unavailable.".to_string())?;
    if slot.is_some() {
        return Err("Prime Agent RPC is already running.".to_string());
    }

    let mut search_paths = binary
        .parent()
        .map(Path::to_path_buf)
        .into_iter()
        .collect::<Vec<_>>();
    if let Some(paths) = env::var_os("PATH") {
        search_paths.extend(env::split_paths(&paths));
    }
    let process_path = env::join_paths(search_paths)
        .map_err(|error| format!("Could not prepare the Prime Agent PATH: {error}"))?;

    let mut child = Command::new(&binary)
        .args(["--mode", "rpc"])
        .current_dir(&cwd_path)
        .env("PATH", process_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Could not start Prime Agent: {error}"))?;

    let pid = child.id();
    let stdin = child
        .stdin
        .take()
        .ok_or("Prime Agent stdin was unavailable.")?;
    let stdout = child
        .stdout
        .take()
        .ok_or("Prime Agent stdout was unavailable.")?;
    let stderr = child
        .stderr
        .take()
        .ok_or("Prime Agent stderr was unavailable.")?;
    let child = Arc::new(Mutex::new(child));

    *slot = Some(RpcProcess {
        pid,
        child: Arc::clone(&child),
        stdin: Arc::new(Mutex::new(stdin)),
    });
    drop(slot);

    emit_lines(app.clone(), stdout, "stdout");
    emit_lines(app.clone(), stderr, "stderr");

    let process_state = Arc::clone(&manager.process);
    thread::spawn(move || loop {
        let status = child
            .lock()
            .ok()
            .and_then(|mut child| child.try_wait().ok().flatten());
        if let Some(status) = status {
            if let Ok(mut slot) = process_state.lock() {
                if slot.as_ref().is_some_and(|process| process.pid == pid) {
                    *slot = None;
                }
            }
            let _ = app.emit(
                "prime-rpc-exit",
                RpcExit {
                    pid,
                    code: status.code(),
                },
            );
            break;
        }
        thread::sleep(Duration::from_millis(150));
    });

    Ok(RuntimeInfo {
        binary_path: binary.to_string_lossy().into_owned(),
        cwd: cwd_path.to_string_lossy().into_owned(),
        pid,
    })
}

#[tauri::command]
fn prime_rpc_send(manager: tauri::State<RpcManager>, command: Value) -> Result<(), String> {
    let stdin = {
        let slot = manager
            .process
            .lock()
            .map_err(|_| "Prime Agent process state is unavailable.".to_string())?;
        slot.as_ref()
            .map(|process| Arc::clone(&process.stdin))
            .ok_or("Prime Agent RPC is not running.")?
    };

    let mut bytes = serde_json::to_vec(&command)
        .map_err(|error| format!("Could not serialize RPC command: {error}"))?;
    bytes.push(b'\n');
    let mut writer = stdin
        .lock()
        .map_err(|_| "Prime Agent stdin is unavailable.".to_string())?;
    writer
        .write_all(&bytes)
        .and_then(|_| writer.flush())
        .map_err(|error| format!("Could not send RPC command: {error}"))
}

#[tauri::command]
fn prime_rpc_stop(manager: tauri::State<RpcManager>) {
    stop_process(&manager);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(RpcManager::default())
        .invoke_handler(tauri::generate_handler![
            prime_rpc_start,
            prime_rpc_send,
            prime_rpc_stop,
            prime_config_status,
            prime_save_provider,
            prime_save_service_credential
        ])
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::Destroyed) {
                stop_process(&window.state::<RpcManager>());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Prime Agent Desktop");
}
