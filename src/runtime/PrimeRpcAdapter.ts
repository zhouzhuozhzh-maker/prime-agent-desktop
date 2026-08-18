import type { AgentEvent } from "../types";
import type { AgentAdapter } from "./AgentAdapter";

/**
 * Protocol boundary for Prime Agent's documented RPC mode.
 *
 * The production transport will be added behind this interface without leaking
 * RPC details into React. Until then the app boots with MockAgentAdapter.
 */
export class PrimeRpcAdapter implements AgentAdapter {
  private listeners = new Set<(event: AgentEvent) => void>();

  constructor(private readonly endpoint = "ws://127.0.0.1:8766") {}

  async connect(): Promise<void> {
    throw new Error(`Prime RPC transport is not configured (${this.endpoint}).`);
  }

  async disconnect(): Promise<void> {}

  async sendPrompt(_prompt: string): Promise<void> {
    throw new Error("Connect Prime Agent RPC before sending a prompt.");
  }

  async approve(_id: string): Promise<void> {
    throw new Error("Connect Prime Agent RPC before approving a tool call.");
  }

  async reject(_id: string): Promise<void> {
    throw new Error("Connect Prime Agent RPC before rejecting a tool call.");
  }

  subscribe(listener: (event: AgentEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
