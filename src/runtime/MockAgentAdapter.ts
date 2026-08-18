import type { AgentEvent } from "../types";
import type { AgentAdapter } from "./AgentAdapter";

export class MockAgentAdapter implements AgentAdapter {
  private listeners = new Set<(event: AgentEvent) => void>();

  async connect() {
    this.emit({ type: "connected", version: "demo-runtime" });
  }

  async disconnect() {
    this.emit({ type: "status", value: "idle" });
  }

  async sendPrompt(prompt: string) {
    this.emit({ type: "status", value: "running" });
    this.emit({
      type: "timeline",
      event: {
        id: `prompt-${Date.now()}`,
        time: new Date().toLocaleTimeString([], { hour12: false }),
        type: "user",
        title: "You",
        detail: prompt,
      },
    });
  }

  async approve(_id: string) {
    this.emit({ type: "status", value: "running" });
  }

  async reject(_id: string) {
    this.emit({ type: "status", value: "waiting" });
  }

  subscribe(listener: (event: AgentEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: AgentEvent) {
    this.listeners.forEach((listener) => listener(event));
  }
}
