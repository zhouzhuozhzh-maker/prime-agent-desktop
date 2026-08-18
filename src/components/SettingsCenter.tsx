import { invoke } from "@tauri-apps/api/core";
import { ArrowUpRight, Check, ChevronRight, Cloud, Database, Github, KeyRound, Search, Server, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [filter, setFilter] = useState<"all" | "configured">("all");
  const [snapshot, setSnapshot] = useState<ConfigSnapshot>(emptySnapshot);
  const [selected, setSelected] = useState<ProviderDefinition | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [serperKey, setSerperKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"info" | "success" | "error">("info");
  const [baseline, setBaseline] = useState({ modelId: "", baseUrl: "", makeDefault: false });
  const searchRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  async function refresh(): Promise<ConfigSnapshot> {
    if (!isTauri) {
      const preview = { ...emptySnapshot, configuredProviders: ["volcengine-agent-plan"], defaultProvider: "volcengine-agent-plan", defaultModel: "doubao-seed-2.0-pro", skillDirectoryCount: 1 };
      setSnapshot(preview);
      return preview;
    }
    try {
      const next = await invoke<ConfigSnapshot>("prime_config_status");
      setSnapshot(next);
      return next;
    } catch (error) {
      setMessage(readableError(error));
      setMessageKind("error");
      return emptySnapshot;
    }
  }

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setLoading(true);
    void refresh().then((next) => {
      const initial = providers.find((provider) => provider.id === next.defaultProvider) ?? providers[0];
      selectProvider(initial, next);
      setLoading(false);
      window.requestAnimationFrame(() => searchRef.current?.focus());
    });
    return () => previousFocus.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && settingsRef.current) {
        const focusable = Array.from(settingsRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const visibleProviders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return providers.filter((provider) => {
      if (filter === "configured" && !snapshot.configuredProviders.includes(provider.id)) return false;
      return !normalized || [provider.name, provider.description, provider.region, provider.envVar].some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [filter, query, snapshot.configuredProviders]);

  const providerDirty = Boolean(apiKey.trim()) || modelId !== baseline.modelId || baseUrl !== baseline.baseUrl || makeDefault !== baseline.makeDefault;
  const selectedConfigured = selected ? snapshot.configuredProviders.includes(selected.id) : false;

  if (!open) return null;

  function selectProvider(provider: ProviderDefinition, currentSnapshot = snapshot) {
    const initialModelId = currentSnapshot.defaultProvider === provider.id ? currentSnapshot.defaultModel ?? provider.custom?.modelId ?? "" : provider.custom?.modelId ?? "";
    const initialBaseUrl = provider.custom?.baseUrl ?? "";
    const initialDefault = currentSnapshot.defaultProvider === provider.id;
    setSelected(provider);
    setApiKey("");
    setModelId(initialModelId);
    setBaseUrl(initialBaseUrl);
    setMakeDefault(initialDefault);
    setBaseline({ modelId: initialModelId, baseUrl: initialBaseUrl, makeDefault: initialDefault });
    setMessage("");
  }

  async function saveProvider() {
    if (!selected) return;
    if (!isTauri) {
      setMessage("Saving is available in the desktop app. This browser build is an interactive preview.");
      setMessageKind("info");
      return;
    }
    const alreadyConfigured = snapshot.configuredProviders.includes(selected.id);
    if (!apiKey.trim() && !alreadyConfigured) {
      setMessage("Enter an API key. It will only be stored in macOS Keychain.");
      setMessageKind("error");
      return;
    }
    if (makeDefault && !modelId.trim()) {
      setMessage("A model ID is required when setting a default provider.");
      setMessageKind("error");
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
      setMessage("Saved securely. Prime Agent is reconnecting with this configuration.");
      setMessageKind("success");
      const next = await refresh();
      selectProvider(selected, next);
      setMessage("Saved securely. Prime Agent is reconnecting with this configuration.");
      setMessageKind("success");
      onConfigurationChanged();
    } catch (error) {
      setMessage(readableError(error));
      setMessageKind("error");
    } finally {
      setSaving(false);
    }
  }

  async function saveSerper() {
    if (!isTauri) {
      setMessage("Resource configuration is available in the desktop app. This browser build is an interactive preview.");
      setMessageKind("info");
      return;
    }
    if (!serperKey.trim()) {
      setMessage("Enter a Serper API key.");
      setMessageKind("error");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await invoke("prime_save_service_credential", { serviceId: "serper", apiKey: serperKey.trim() });
      setSerperKey("");
      setMessage("Web search is enabled. New sessions will load Serper automatically.");
      setMessageKind("success");
      await refresh();
      onConfigurationChanged();
    } catch (error) {
      setMessage(readableError(error));
      setMessageKind("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby="settings-title" aria-modal="true" className="settings-center" ref={settingsRef} role="dialog">
        <header className="settings-header">
          <div><span className="eyebrow">RUNTIME CONFIG</span><h1 id="settings-title">Models & resources</h1><p>Configure Prime Agent without putting secrets in project files.</p></div>
          <button aria-label="Close settings" onClick={onClose} type="button"><X size={19} /></button>
        </header>
        <nav className="settings-tabs">
          <button className={tab === "providers" ? "active" : ""} onClick={() => setTab("providers")} type="button"><Cloud size={16} />Model providers <i>{providers.length}</i></button>
          <button className={tab === "resources" ? "active" : ""} onClick={() => setTab("resources")} type="button"><Database size={16} />Agent resources <i>5</i></button>
        </nav>

        {tab === "providers" ? (
          <div className="settings-body provider-layout">
            <div className="provider-browser">
              <div className="provider-tools"><label className="settings-search"><Search size={15} /><input aria-label="Search providers" onChange={(event) => setQuery(event.target.value)} placeholder="Search providers" ref={searchRef} value={query} /></label><div className="provider-filters" aria-label="Provider filters"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")} type="button">All</button><button className={filter === "configured" ? "active" : ""} onClick={() => setFilter("configured")} type="button">Configured</button></div></div>
              <div className="provider-list">
                {loading && <p className="provider-list-state">Loading provider status…</p>}
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
                {!loading && visibleProviders.length === 0 && <p className="provider-list-state">No providers match this filter.</p>}
              </div>
            </div>

            <div className="provider-detail">
              {selected ? (
                <>
                  <div className="detail-heading"><span className="provider-monogram large">{selected.name.slice(0, 2).toUpperCase()}</span><div><span>{selected.badge ?? "PRIME AGENT NATIVE"}</span><h2>{selected.name}</h2><p>{selected.description}</p></div></div>
                  <div className="secure-note"><KeyRound size={16} /><div><strong>Keychain protected</strong><p>Your API key stays in macOS Keychain. Prime Agent stores only a secure reference.</p></div></div>
                  <label className="field-label">API Key <span>{snapshot.configuredProviders.includes(selected.id) ? "Configured — leave blank to keep it" : "Required"}</span><input autoComplete="off" onChange={(event) => setApiKey(event.target.value)} placeholder={snapshot.configuredProviders.includes(selected.id) ? "••••••••  Keep existing key" : "Paste API key"} type="password" value={apiKey} /></label>
                  {selected.custom && <label className="field-label">Base URL <input onChange={(event) => setBaseUrl(event.target.value)} spellCheck={false} value={baseUrl} /></label>}
                  <label className="field-label">Model ID <span>{selected.custom ? "Use the ID shown in your provider console" : "Required only when making this the default"}</span><input onChange={(event) => setModelId(event.target.value)} placeholder="e.g. provider model id" spellCheck={false} value={modelId} /></label>
                  <label className="default-check"><input checked={makeDefault} onChange={(event) => setMakeDefault(event.target.checked)} type="checkbox" />Make this the default provider after saving</label>
                  <div className="detail-actions"><button className="primary-button" disabled={saving || (!providerDirty && selectedConfigured) || (!selectedConfigured && !apiKey.trim())} onClick={() => void saveProvider()} type="button">{saving ? "Saving…" : !providerDirty && selectedConfigured ? "Configuration saved" : "Save configuration"}</button><a href={selected.docs} rel="noreferrer" target="_blank">Official docs <ArrowUpRight size={13} /></a></div>
                </>
              ) : (
                <div className="detail-empty"><Sparkles size={25} /><h2>Choose a provider</h2><p>火山引擎与 BytePlus 已置顶。选择一项后可安全保存 Key、Base URL 和默认模型。</p><div><b>{snapshot.configuredProviders.length}</b><span>configured</span><b>{snapshot.defaultModel ? "1" : "0"}</b><span>active model</span></div></div>
              )}
              {message && <p aria-live="polite" className={`settings-message message-${messageKind}`} role={messageKind === "error" ? "alert" : "status"}>{message}</p>}
            </div>
          </div>
        ) : (
          <div className="settings-body resources-layout">
            <section className="resource-hero"><div><span className="eyebrow">RECOMMENDED</span><h2>Give the agent fresh information</h2><p>Reasoning works without search, but news, prices, documentation changes, and other time-sensitive facts need a live source. Prime Agent supports Serper natively.</p></div><Search size={34} /></section>
            <div className="resource-grid">
              <article className="resource-card resource-featured"><div className="resource-title"><span><Search size={17} /></span><div><strong>Serper web search</strong><small>Prime Agent bundled skill</small></div><i className={snapshot.serperConfigured ? "ready" : "recommended"}>{snapshot.serperConfigured ? "READY" : "RECOMMENDED"}</i></div><p>Google results flow into the agent's IPython toolchain for tasks that depend on current information.</p><label className="resource-key"><input autoComplete="off" onChange={(event) => setSerperKey(event.target.value)} placeholder={snapshot.serperConfigured ? "••••••••  Update key" : "Serper API Key"} type="password" value={serperKey} /><button disabled={saving || !serperKey.trim()} onClick={() => void saveSerper()} type="button">{snapshot.serperConfigured ? "Update" : "Enable"}</button></label><a href="https://serper.dev" rel="noreferrer" target="_blank">Get a key <ArrowUpRight size={12} /></a></article>
              <ResourceCard icon={<Server size={17} />} name="MCP connections" status={snapshot.mcpServerCount ? `${snapshot.mcpServerCount} CONNECTED` : "OPTIONAL"} text="Connect databases, search, browsers, and business apps. OAuth MCP connections remain manageable through Prime Agent /login." />
              <ResourceCard icon={<Sparkles size={17} />} name="Skills" status={snapshot.skillDirectoryCount ? "AVAILABLE" : "BUILT-IN"} text="Loads project, user, and bundled Prime Agent skills, including compatible .agents/skills directories." />
              <ResourceCard icon={<Github size={17} />} name="GitHub CLI" status={snapshot.githubConfigured ? "READY" : "OPTIONAL"} text="Read repositories, issues, pull requests, and Actions. Sign in with gh locally to access private repositories." />
              <ResourceCard icon={<Database size={17} />} name="Local IPython runtime" status="BUILT-IN" text="Prime Agent tools, subagents, and Python-backed skills share a persistent local runtime with no extra setup." />
            </div>
            {message && <p aria-live="polite" className={`settings-message resource-message message-${messageKind}`} role={messageKind === "error" ? "alert" : "status"}>{message}</p>}
          </div>
        )}
      </section>
    </div>
  );
}

function ResourceCard({ icon, name, status, text }: { icon: React.ReactNode; name: string; status: string; text: string }) {
  return <article className="resource-card"><div className="resource-title"><span>{icon}</span><div><strong>{name}</strong><small>Agent capability</small></div><i className={status.includes("READY") || status === "AVAILABLE" || status === "BUILT-IN" ? "ready" : "optional"}>{status}</i></div><p>{text}</p></article>;
}
