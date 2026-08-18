use serde::Serialize;
use serde_json::Value;
use std::{
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
            prime_rpc_stop
        ])
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::Destroyed) {
                stop_process(&window.state::<RpcManager>());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Prime Agent Desktop");
}
