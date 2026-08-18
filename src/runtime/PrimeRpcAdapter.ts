import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { AgentEvent, ExtensionUiRequest } from "../types";
import type { AgentAdapter } from "./AgentAdapter";

type JsonObject = Record<string, unknown>;
type RuntimeInfo = { binaryPath: string; cwd: string; pid: number };
type OutputPayload = { stream: "stdout" | "stderr"; line: string };
type ExitPayload = { pid: number; code: number | null };
type PendingCommand = {
  resolve: (value: JsonObject) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

const now = () => new Date().toLocaleTimeString([], { hour12: false });
const asObject = (value: unknown): JsonObject | null =>
  typeof value === "object" && value !== null ? value as JsonObject : null;

function textFromContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.map((item) => {
    const block = asObject(item);
    return block?.type === "text" && typeof block.text === "string" ? block.text : "";
  }).filter(Boolean).join("\n");
}

function toolSummary(value: unknown): string {
  const object = asObject(value);
  if (!object) return "";
  for (const key of ["command", "path", "file_path", "query", "pattern", "url"]) {
    if (typeof object[key] === "string") return String(object[key]);
  }
  const serialized = JSON.stringify(object);
  return serialized.length > 180 ? `${serialized.slice(0, 177)}…` : serialized;
}

function resultText(value: unknown): string {
  const text = textFromContent(asObject(value)?.content);
  return text.length > 1200 ? `${text.slice(0, 1200)}…` : text;
}

export class PrimeRpcAdapter implements AgentAdapter {
  private listeners = new Set<(event: AgentEvent) => void>();
  private unlisten: UnlistenFn[] = [];
  private pending = new Map<string, PendingCommand>();
  private uiRequests = new Map<string, ExtensionUiRequest>();
  private toolStarted = new Map<string, number>();
  private requestId = 0;
  private runId = 0;
  private assistantText = "";
  private running = false;
  private connected = false;

  constructor(private readonly cwd: string) {}

  async connect(): Promise<void> {
    const outputUnlisten = await listen<OutputPayload>("prime-rpc-output", ({ payload }) => this.handleOutput(payload));
    const exitUnlisten = await listen<ExitPayload>("prime-rpc-exit", ({ payload }) => {
      this.connected = false;
      this.running = false;
      this.rejectPending(`Prime Agent exited${payload.code === null ? "" : ` with code ${payload.code}`}.`);
      this.emit({ type: "status", value: "idle" });
      this.emit({ type: "runtime-error", message: `Prime Agent stopped${payload.code === null ? "." : ` (exit ${payload.code}).`}` });
    });
    this.unlisten.push(outputUnlisten, exitUnlisten);

    try {
      const runtime = await invoke<RuntimeInfo>("prime_rpc_start", { cwd: this.cwd });
      this.connected = true;
      const state = await this.command("get_state");
      const data = asObject(state.data);
      const model = asObject(data?.model);
      const modelLabel = model && model.provider !== "unknown" && model.id !== "unknown" && typeof model.provider === "string" && typeof model.id === "string"
        ? `${model.provider}/${model.id}`
        : "RPC";
      const configured = modelLabel !== "RPC";
      this.emit({ type: "connected", version: modelLabel, configured });
      this.emit({ type: "status", value: data?.isStreaming ? "running" : "idle" });
      this.emit({
        type: "timeline",
        event: {
          id: `runtime-${runtime.pid}`,
          time: now(),
          type: "checkpoint",
          title: "Prime Agent connected",
          detail: runtime.cwd,
          meta: configured ? modelLabel : "Model setup required",
          status: "success",
        },
      });
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.rejectPending("Prime Agent RPC disconnected.");
    await invoke("prime_rpc_stop").catch(() => undefined);
    this.unlisten.splice(0).forEach((dispose) => dispose());
  }

  async sendPrompt(prompt: string): Promise<void> {
    if (!this.connected) throw new Error("Prime Agent RPC is not connected.");
    this.emit({ type: "timeline", event: { id: `prompt-${Date.now()}`, time: now(), type: "user", title: "You", detail: prompt } });
    await this.command("prompt", { message: prompt, ...(this.running ? { streamingBehavior: "steer" } : {}) });
  }

  async approve(id: string): Promise<void> {
    const request = this.uiRequests.get(id);
    if (!request) throw new Error("This Prime Agent request is no longer pending.");
    if (request.method === "confirm") return this.sendUiResponse(id, { confirmed: true });
    const positive = request.options?.find((option) => /allow|approve|yes|continue|proceed|accept/i.test(option));
    await this.sendUiResponse(id, { value: positive ?? request.options?.[0] ?? request.prefill ?? "" });
  }

  async reject(id: string): Promise<void> {
    const request = this.uiRequests.get(id);
    if (!request) throw new Error("This Prime Agent request is no longer pending.");
    if (request.method === "confirm") return this.sendUiResponse(id, { confirmed: false });
    const negative = request.options?.find((option) => /block|deny|reject|no|cancel/i.test(option));
    await this.sendUiResponse(id, negative ? { value: negative } : { cancelled: true });
  }

  async respond(id: string, value: string): Promise<void> {
    if (!this.uiRequests.has(id)) throw new Error("This Prime Agent request is no longer pending.");
    await this.sendUiResponse(id, { value });
  }

  subscribe(listener: (event: AgentEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async command(type: string, fields: JsonObject = {}): Promise<JsonObject> {
    const id = `desktop-${++this.requestId}`;
    const response = new Promise<JsonObject>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Prime Agent did not answer ${type} within 30 seconds.`));
      }, 30_000);
      this.pending.set(id, { resolve, reject, timer });
    });
    try {
      await invoke("prime_rpc_send", { command: { id, type, ...fields } });
    } catch (error) {
      const pending = this.pending.get(id);
      if (pending) clearTimeout(pending.timer);
      this.pending.delete(id);
      throw error;
    }
    return response;
  }

  private async sendUiResponse(id: string, fields: JsonObject) {
    await invoke("prime_rpc_send", { command: { type: "extension_ui_response", id, ...fields } });
    this.uiRequests.delete(id);
    this.emit({ type: "ui-request", request: null });
    this.emit({ type: "status", value: this.running ? "running" : "idle" });
  }

  private handleOutput(payload: OutputPayload) {
    if (payload.stream === "stderr") {
      this.emit({ type: "runtime-error", message: payload.line });
      return;
    }
    let event: JsonObject;
    try {
      event = JSON.parse(payload.line) as JsonObject;
    } catch {
      this.emit({ type: "runtime-error", message: `Invalid RPC output: ${payload.line}` });
      return;
    }

    if (event.type === "response" && typeof event.id === "string") {
      const pending = this.pending.get(event.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(event.id);
      if (event.success === false) pending.reject(new Error(String(event.error ?? "Prime Agent command failed.")));
      else pending.resolve(event);
      return;
    }
    this.handleEvent(event);
  }

  private handleEvent(event: JsonObject) {
    const type = String(event.type ?? "");
    if (type === "agent_start") {
      this.running = true;
      this.runId += 1;
      this.assistantText = "";
      this.emit({ type: "status", value: "running" });
      return;
    }
    if (type === "agent_end") {
      this.running = false;
      this.emit({ type: "status", value: "idle" });
      this.emit({ type: "timeline", event: { id: `complete-${this.runId}`, time: now(), type: "checkpoint", title: "Agent run complete", status: "success" } });
      return;
    }
    if (type === "message_update") {
      const update = asObject(event.assistantMessageEvent);
      if (update?.type === "text_delta" && typeof update.delta === "string") {
        this.assistantText += update.delta;
        this.emit({
          type: "timeline",
          operation: "replace",
          event: { id: `assistant-${this.runId}`, time: now(), type: "thought", title: "Prime Agent", detail: this.assistantText, status: "running" },
        });
      }
      return;
    }
    if (type === "message_end") {
      const message = asObject(event.message);
      if (message?.role === "assistant") {
        const text = textFromContent(message.content) || this.assistantText;
        if (text) this.emit({ type: "timeline", operation: "replace", event: { id: `assistant-${this.runId}`, time: now(), type: "thought", title: "Prime Agent", detail: text, status: "success" } });
      }
      return;
    }
    if (type === "tool_execution_start" && typeof event.toolCallId === "string") {
      this.toolStarted.set(event.toolCallId, Date.now());
      this.emit({ type: "timeline", event: { id: `tool-${event.toolCallId}`, time: now(), type: "tool", title: String(event.toolName ?? "tool"), meta: toolSummary(event.args), status: "running" } });
      return;
    }
    if ((type === "tool_execution_update" || type === "tool_execution_end") && typeof event.toolCallId === "string") {
      const started = this.toolStarted.get(event.toolCallId);
      const ended = type === "tool_execution_end";
      const elapsed = started ? `${((Date.now() - started) / 1000).toFixed(1)}s` : undefined;
      this.emit({
        type: "timeline",
        operation: "replace",
        event: {
          id: `tool-${event.toolCallId}`,
          time: now(),
          type: "tool",
          title: String(event.toolName ?? "tool"),
          meta: toolSummary(event.args),
          detail: resultText(ended ? event.result : event.partialResult),
          duration: elapsed,
          status: ended ? (event.isError ? "failed" : "success") : "running",
        },
      });
      if (ended) this.toolStarted.delete(event.toolCallId);
      return;
    }
    if (type === "extension_ui_request") {
      this.handleUiRequest(event);
      return;
    }
    if (["compaction_start", "auto_retry_start", "extension_error"].includes(type)) {
      const title = type === "compaction_start" ? "Compacting context" : type === "auto_retry_start" ? "Retrying model request" : "Extension error";
      this.emit({ type: "timeline", event: { id: `${type}-${Date.now()}`, time: now(), type: "checkpoint", title, detail: String(event.errorMessage ?? event.error ?? ""), status: type === "extension_error" ? "failed" : "running" } });
    }
  }

  private handleUiRequest(event: JsonObject) {
    const method = String(event.method ?? "");
    if (method === "notify") {
      this.emit({ type: "timeline", event: { id: `notice-${event.id}`, time: now(), type: "checkpoint", title: String(event.message ?? "Prime Agent notification"), status: event.notifyType === "error" ? "failed" : "success" } });
      return;
    }
    if (!["select", "confirm", "input", "editor"].includes(method) || typeof event.id !== "string") return;
    const request: ExtensionUiRequest = {
      id: event.id,
      method: method as ExtensionUiRequest["method"],
      title: String(event.title ?? "Prime Agent needs your input"),
      message: typeof event.message === "string" ? event.message : undefined,
      options: Array.isArray(event.options) ? event.options.map(String) : undefined,
      placeholder: typeof event.placeholder === "string" ? event.placeholder : undefined,
      prefill: typeof event.prefill === "string" ? event.prefill : undefined,
    };
    this.uiRequests.set(request.id, request);
    this.emit({ type: "ui-request", request });
    this.emit({ type: "status", value: "waiting" });
    this.emit({
      type: "timeline",
      event: {
        id: `approval-${request.id}`,
        time: now(),
        type: "approval",
        title: request.title,
        detail: request.message ?? (request.method === "select" ? "Choose how Prime Agent should continue." : "Prime Agent is waiting for your response."),
        meta: request.options?.join(" · ") ?? request.placeholder ?? request.prefill,
        status: "pending",
      },
    });
  }

  private rejectPending(message: string) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(message));
    }
    this.pending.clear();
  }

  private emit(event: AgentEvent) {
    this.listeners.forEach((listener) => listener(event));
  }
}
