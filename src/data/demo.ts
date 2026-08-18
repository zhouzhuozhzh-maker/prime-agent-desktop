import type {
  AgentNode,
  MemoryEntry,
  Project,
  RefineEntry,
  ScheduleEntry,
  TimelineEvent,
} from "../types";

export const projects: Project[] = [
  { id: "dashboard", name: "acme-dashboard", branch: "main", status: "active" },
  { id: "api", name: "acme-api", branch: "main", status: "idle" },
  { id: "mobile", name: "acme-mobile", branch: "develop", status: "idle" },
  { id: "infra", name: "infra", branch: "main", status: "idle" },
  { id: "docs", name: "acme-docs", branch: "main", status: "idle" },
];

export const agents: AgentNode[] = [
  { id: "orchestrator", name: "Orchestrator", detail: "Coordinating the repair", status: "live", depth: 0 },
  { id: "analyst", name: "Test Analyst", detail: "Analyzing failure patterns", status: "live", depth: 1 },
  { id: "engineer", name: "Code Engineer", detail: "Applying test and code changes", status: "live", depth: 1 },
  { id: "verifier", name: "Verifier", detail: "Re-running tests and verifying", status: "live", depth: 1 },
];

export const initialTimeline: TimelineEvent[] = [
  { id: "user", time: "10:32:11", type: "user", title: "You", detail: "Fix the flaky billing tests" },
  {
    id: "thought",
    time: "10:32:14",
    type: "thought",
    title: "Orchestrator",
    detail:
      "Analyzed 28 failing runs. Root cause appears to be a race condition in invoice finalization and time-dependent assertions. Stabilize time, persist the invoice before assertions, then verify idempotency.",
    status: "running",
  },
  { id: "read", time: "10:32:21", type: "tool", title: "read_file", meta: "server/tests/billing/invoice.test.ts", duration: "3.1s", status: "success" },
  { id: "grep", time: "10:32:37", type: "tool", title: "grep", meta: "finalizeInvoice | capturePayment", duration: "1.2s", status: "success" },
  { id: "tests", time: "10:33:02", type: "tool", title: "run_tests", meta: "server/tests/billing", duration: "18.4s · 5 failed", status: "failed" },
  { id: "diff", time: "10:33:15", type: "diff", title: "Code change", meta: "server/tests/billing/invoice.test.ts", status: "success" },
  { id: "approval", time: "10:34:08", type: "approval", title: "Permission required", detail: "Run test suite with external HTTP calls", meta: "npm run test:e2e -- --grep billing", status: "pending" },
  { id: "checkpoint", time: "10:34:08", type: "checkpoint", title: "Checkpoint created", detail: "fix/flaky-billing-tests-1", meta: "a1b2c3d", status: "success" },
];

export const memories: MemoryEntry[] = [
  {
    id: "memory-1",
    time: "10:33",
    title: "Flaky billing tests root cause",
    detail: "Invoice finalization assertions were racing persistence. Wait for the persisted invoice before checking totals.",
    context: "server/tests/billing/invoice.test.ts",
  },
  {
    id: "memory-2",
    time: "Yesterday",
    title: "Billing tests use a fixed clock",
    detail: "Use the project clock helper instead of Date.now() in billing scenarios.",
    context: "server/tests/setup/time.ts",
  },
];

export const refinements: RefineEntry[] = [
  { id: "r1", time: "10:33", type: "memory", title: "Invoice persistence ordering", detail: "Remember the required persistence barrier before billing assertions.", additions: 18, removals: 12 },
  { id: "r2", time: "10:32", type: "prompt", title: "Billing verifier", detail: "Require five clean retries before calling a flaky test fixed.", additions: 3, removals: 2 },
  { id: "r3", time: "10:31", type: "skill", title: "Stable test clocks", detail: "Prefer the repository clock helper over local time stubs.", additions: 10, removals: 0 },
];

export const schedules: ScheduleEntry[] = [
  { id: "nightly", title: "Nightly test suite", cron: "0 2 * * *", enabled: true },
  { id: "smoke", title: "E2E billing smoke", cron: "*/15 * * * *", enabled: true },
];
