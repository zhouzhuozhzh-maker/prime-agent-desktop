import { invoke } from "@tauri-apps/api/core";
import { ArrowUpRight, Check, ChevronRight, Cloud, Database, Github, KeyRound, Search, Server, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { providers, type ProviderDefinition } from "../data/providers";

type ConfigSnapshot = {
  configuredProviders: string[];
  defaultProvider?: string;
  defaultModel?: string;
  serperConfigured: boolean;
  mcpServerCount: number;
  githubConfigured: boolean;
  skillDirectoryCount: number;
};

type SettingsCenterProps = {
  open: boolean;
  onClose: () => void;
  onConfigurationChanged: () => void;
};

const emptySnapshot: ConfigSnapshot = {
  configuredProviders: [],
  serperConfigured: false,
  mcpServerCount: 0,
  githubConfigured: false,
  skillDirectoryCount: 0,
};
const isTauri = "__TAURI_INTERNALS__" in window;

function readableError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function SettingsCenter({ open, onClose, onConfigurationChanged }: SettingsCenterProps) {
  const [tab, setTab] = useState<"providers" | "resources">("providers");
  const [query, setQuery] = useState("");
  const [snapshot, setSnapshot] = useState<ConfigSnapshot>(emptySnapshot);
  const [selected, setSelected] = useState<ProviderDefinition | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [serperKey, setSerperKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    if (!isTauri) {
      setSnapshot({ ...emptySnapshot, configuredProviders: ["volcengine-agent-plan"], defaultProvider: "volcengine-agent-plan", defaultModel: "doubao-seed-2.0-pro", skillDirectoryCount: 1 });
      return;
    }
    try {
      setSnapshot(await invoke<ConfigSnapshot>("prime_config_status"));
    } catch (error) {
      setMessage(readableError(error));
    }
  }

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const visibleProviders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return providers;
    return providers.filter((provider) => [provider.name, provider.description, provider.region, provider.envVar].some((value) => value?.toLowerCase().includes(normalized)));
  }, [query]);

  if (!open) return null;

  function selectProvider(provider: ProviderDefinition) {
    setSelected(provider);
    setApiKey("");
    setModelId(provider.custom?.modelId ?? "");
    setBaseUrl(provider.custom?.baseUrl ?? "");
    setMakeDefault(Boolean(provider.custom));
    setMessage("");
  }

  async function saveProvider() {
    if (!selected) return;
    if (!isTauri) {
      setMessage("配置写入仅在桌面应用中可用；当前是交互预览。");
      return;
    }
    const alreadyConfigured = snapshot.configuredProviders.includes(selected.id);
    if (!apiKey.trim() && !alreadyConfigured) {
      setMessage("请输入 API Key；密钥只会写入 macOS 钥匙串。");
      return;
    }
    if (makeDefault && !modelId.trim()) {
      setMessage("设为默认 Provider 时需要填写 Model ID。");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await invoke("prime_save_provider", {
        input: {
          providerId: selected.id,
          apiKey: apiKey.trim() || null,
          modelId: modelId.trim() || null,
          baseUrl: selected.custom ? baseUrl.trim() : null,
          custom: Boolean(selected.custom),
          makeDefault,
        },
      });
      setApiKey("");
      setMessage("已安全保存。Prime Agent 会用新配置重新连接。");
      await refresh();
      onConfigurationChanged();
    } catch (error) {
      setMessage(readableError(error));
    } finally {
      setSaving(false);
    }
  }

  async function saveSerper() {
    if (!isTauri) {
      setMessage("联网资源配置仅在桌面应用中可用；当前是交互预览。");
      return;
    }
    if (!serperKey.trim()) {
      setMessage("请输入 Serper API Key。");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await invoke("prime_save_service_credential", { serviceId: "serper", apiKey: serperKey.trim() });
      setSerperKey("");
      setMessage("联网搜索已启用，新会话会自动加载 Serper。");
      await refresh();
      onConfigurationChanged();
    } catch (error) {
      setMessage(readableError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-label="Prime Agent settings" aria-modal="true" className="settings-center" role="dialog">
        <header className="settings-header">
          <div><span className="eyebrow">RUNTIME CONFIG</span><h1>Models & resources</h1><p>Configure Prime Agent without putting secrets in project files.</p></div>
          <button aria-label="Close settings" onClick={onClose} type="button"><X size={19} /></button>
        </header>
        <nav className="settings-tabs">
          <button className={tab === "providers" ? "active" : ""} onClick={() => setTab("providers")} type="button"><Cloud size={16} />Model providers <i>{providers.length}</i></button>
          <button className={tab === "resources" ? "active" : ""} onClick={() => setTab("resources")} type="button"><Database size={16} />Agent resources <i>5</i></button>
        </nav>

        {tab === "providers" ? (
          <div className="settings-body provider-layout">
            <div className="provider-browser">
              <label className="settings-search"><Search size={15} /><input aria-label="Search providers" onChange={(event) => setQuery(event.target.value)} placeholder="Search providers" value={query} /></label>
              <div className="provider-list">
                {visibleProviders.map((provider, index) => {
                  const configured = snapshot.configuredProviders.includes(provider.id);
                  const active = snapshot.defaultProvider === provider.id;
                  return (
                    <button className={`provider-card ${selected?.id === provider.id ? "selected" : ""} ${index < 4 ? "featured" : ""}`} key={provider.id} onClick={() => selectProvider(provider)} type="button">
                      <span className="provider-monogram">{provider.name.slice(0, 2).toUpperCase()}</span>
                      <span className="provider-card-copy"><strong>{provider.name}</strong><small>{provider.region} · {provider.envVar ?? "OpenAI compatible"}</small></span>
                      <span className="provider-state">{active ? <b>DEFAULT</b> : configured ? <i><Check size={11} /> READY</i> : provider.badge ? <em>{provider.badge}</em> : null}<ChevronRight size={15} /></span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="provider-detail">
              {selected ? (
                <>
                  <div className="detail-heading"><span className="provider-monogram large">{selected.name.slice(0, 2).toUpperCase()}</span><div><span>{selected.badge ?? "PRIME AGENT NATIVE"}</span><h2>{selected.name}</h2><p>{selected.description}</p></div></div>
                  <div className="secure-note"><KeyRound size={16} /><div><strong>Keychain protected</strong><p>API Key 存入 macOS 钥匙串，Prime Agent 配置只保留安全引用。</p></div></div>
                  <label className="field-label">API Key <span>{snapshot.configuredProviders.includes(selected.id) ? "已配置，留空可保留" : "必填"}</span><input autoComplete="off" onChange={(event) => setApiKey(event.target.value)} placeholder={snapshot.configuredProviders.includes(selected.id) ? "••••••••  Keep existing key" : "Paste API key"} type="password" value={apiKey} /></label>
                  {selected.custom && <label className="field-label">Base URL <input onChange={(event) => setBaseUrl(event.target.value)} spellCheck={false} value={baseUrl} /></label>}
                  <label className="field-label">Model ID <span>{selected.custom ? "可按控制台修改" : "仅在设为默认时需要"}</span><input onChange={(event) => setModelId(event.target.value)} placeholder="e.g. provider model id" spellCheck={false} value={modelId} /></label>
                  <label className="default-check"><input checked={makeDefault} onChange={(event) => setMakeDefault(event.target.checked)} type="checkbox" />保存后设为当前默认 Provider</label>
                  <div className="detail-actions"><button className="primary-button" disabled={saving} onClick={() => void saveProvider()} type="button">{saving ? "Saving…" : "Save configuration"}</button><a href={selected.docs} rel="noreferrer" target="_blank">Official docs <ArrowUpRight size={13} /></a></div>
                </>
              ) : (
                <div className="detail-empty"><Sparkles size={25} /><h2>Choose a provider</h2><p>火山引擎与 BytePlus 已置顶。选择一项后可安全保存 Key、Base URL 和默认模型。</p><div><b>{snapshot.configuredProviders.length}</b><span>configured</span><b>{snapshot.defaultModel ? "1" : "0"}</b><span>active model</span></div></div>
              )}
              {message && <p className="settings-message">{message}</p>}
            </div>
          </div>
        ) : (
          <div className="settings-body resources-layout">
            <section className="resource-hero"><div><span className="eyebrow">RECOMMENDED</span><h2>Give the agent fresh information</h2><p>模型推理本身不依赖联网搜索；但新闻、价格、文档版本和实时事实需要搜索资源。Prime Agent 原生使用 Serper。</p></div><Search size={34} /></section>
            <div className="resource-grid">
              <article className="resource-card resource-featured"><div className="resource-title"><span><Search size={17} /></span><div><strong>Serper web search</strong><small>Prime Agent bundled skill</small></div><i className={snapshot.serperConfigured ? "ready" : "recommended"}>{snapshot.serperConfigured ? "READY" : "RECOMMENDED"}</i></div><p>Google 搜索结果会直接进入 Agent 的 IPython 工具链，适合需要最新信息的任务。</p><label className="resource-key"><input autoComplete="off" onChange={(event) => setSerperKey(event.target.value)} placeholder={snapshot.serperConfigured ? "••••••••  Update key" : "Serper API Key"} type="password" value={serperKey} /><button disabled={saving} onClick={() => void saveSerper()} type="button">{snapshot.serperConfigured ? "Update" : "Enable"}</button></label><a href="https://serper.dev" rel="noreferrer" target="_blank">Get a key <ArrowUpRight size={12} /></a></article>
              <ResourceCard icon={<Server size={17} />} name="MCP connections" status={snapshot.mcpServerCount ? `${snapshot.mcpServerCount} CONNECTED` : "OPTIONAL"} text="连接数据库、搜索、浏览器和企业 SaaS。当前可继续通过 Prime Agent /login 管理 OAuth MCP。" />
              <ResourceCard icon={<Sparkles size={17} />} name="Skills" status={snapshot.skillDirectoryCount ? "AVAILABLE" : "BUILT-IN"} text="自动加载项目、用户与 Prime Agent 内置 skills；也兼容 .agents/skills 目录。" />
              <ResourceCard icon={<Github size={17} />} name="GitHub CLI" status={snapshot.githubConfigured ? "READY" : "OPTIONAL"} text="用于读取仓库、Issue、PR 和 Actions。需要本机 gh 登录后才能访问私有仓库。" />
              <ResourceCard icon={<Database size={17} />} name="Local IPython runtime" status="BUILT-IN" text="Prime Agent 的工具、子 Agent 与 Python-backed skills 共用持久运行时，无需额外配置。" />
            </div>
            {message && <p className="settings-message resource-message">{message}</p>}
          </div>
        )}
      </section>
    </div>
  );
}

function ResourceCard({ icon, name, status, text }: { icon: React.ReactNode; name: string; status: string; text: string }) {
  return <article className="resource-card"><div className="resource-title"><span>{icon}</span><div><strong>{name}</strong><small>Agent capability</small></div><i className={status.includes("READY") || status === "AVAILABLE" || status === "BUILT-IN" ? "ready" : "optional"}>{status}</i></div><p>{text}</p></article>;
}
