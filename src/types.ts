export type Project = {
  id: string;
  name: string;
  branch: string;
  status: "active" | "idle";
  path?: string;
};

export type AgentNode = {
  id: string;
  name: string;
  detail: string;
  status: "live" | "waiting" | "done";
  depth: number;
};

export type TimelineEvent = {
  id: string;
  time: string;
  type: "user" | "thought" | "tool" | "diff" | "approval" | "checkpoint";
  title: string;
  detail?: string;
  meta?: string;
  duration?: string;
  status?: "running" | "success" | "failed" | "pending";
};

export type ExtensionUiRequest = {
  id: string;
  method: "select" | "confirm" | "input" | "editor";
  title: string;
  message?: string;
  options?: string[];
  placeholder?: string;
  prefill?: string;
};

export type MemoryEntry = {
  id: string;
  time: string;
  title: string;
  detail: string;
  context: string;
};

export type RefineEntry = {
  id: string;
  time: string;
  type: "memory" | "skill" | "prompt";
  title: string;
  detail: string;
  additions: number;
  removals: number;
};

export type ScheduleEntry = {
  id: string;
  title: string;
  cron: string;
  enabled: boolean;
};

export type AgentEvent =
  | { type: "connected"; version: string; configured?: boolean }
  | { type: "timeline"; event: TimelineEvent; operation?: "append" | "replace" }
  | { type: "status"; value: "idle" | "running" | "waiting" }
  | { type: "ui-request"; request: ExtensionUiRequest | null }
  | { type: "runtime-error"; message: string };
