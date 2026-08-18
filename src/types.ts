export type Project = {
  id: string;
  name: string;
  branch: string;
  status: "active" | "idle";
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
  | { type: "connected"; version: string }
  | { type: "timeline"; event: TimelineEvent }
  | { type: "status"; value: "idle" | "running" | "waiting" };
