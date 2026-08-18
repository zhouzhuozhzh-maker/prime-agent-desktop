import type { AgentEvent } from "../types";

export interface AgentAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendPrompt(prompt: string): Promise<void>;
  approve(id: string): Promise<void>;
  reject(id: string): Promise<void>;
  subscribe(listener: (event: AgentEvent) => void): () => void;
}
