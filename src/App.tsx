import { Bookmark, Copy, List, MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Composer } from "./components/Composer";
import { Inspector, type InspectorTab } from "./components/Inspector";
import { Sidebar } from "./components/Sidebar";
import { SettingsCenter } from "./components/SettingsCenter";
import { Timeline } from "./components/Timeline";
import { TopBar } from "./components/TopBar";
import { agents, initialTimeline, memories, projects, refinements, schedules as initialSchedules } from "./data/demo";
import type { AgentAdapter } from "./runtime/AgentAdapter";
import { MockAgentAdapter } from "./runtime/MockAgentAdapter";
import { PrimeRpcAdapter } from "./runtime/PrimeRpcAdapter";
import type { ExtensionUiRequest, Project, ScheduleEntry, TimelineEvent } from "./types";

type RuntimeStatus = "disconnected" | "connecting" | "idle" | "running" | "waiting" | "error";
const isTauri = "__TAURI_INTERNALS__" in window;
const savedProjectPath = isTauri ? localStorage.getItem("prime-agent-project") ?? "" : "";

function displayError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function folderName(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? "Local project";
}

export function App() {
  const [projectPath, setProjectPath] = useState(savedProjectPath);
  const [selectedProject, setSelectedProject] = useState(isTauri ? "local" : "dashboard");
  const [activeTab, setActiveTab] = useState<InspectorTab>("agents");
  const [timeline, setTimeline] = useState<TimelineEvent[]>(isTauri ? [] : initialTimeline);
  const [approvalState, setApprovalState] = useState<"pending" | "approved" | "rejected">("pending");
  const [pendingRequest, setPendingRequest] = useState<ExtensionUiRequest | null>(null);
  const [diffExpanded, setDiffExpanded] = useState(true);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>(initialSchedules);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>(isTauri && projectPath ? "connecting" : "disconnected");
  const [runtimeLabel, setRuntimeLabel] = useState(isTauri ? "Prime Agent" : "Demo runtime");
  const [runtimeDetail, setRuntimeDetail] = useState(isTauri ? "Choose a project to connect" : "Interactive preview");
  const [taskTitle, setTaskTitle] = useState(isTauri ? "New Prime Agent session" : "Fix the flaky billing tests");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [runtimeRevision, setRuntimeRevision] = useState(0);

  const projectList = useMemo<Project[]>(() => {
    if (!isTauri) return projects;
    return projectPath ? [{ id: "local", name: folderName(projectPath), branch: "working tree", status: "active", path: projectPath }] : [];
  }, [projectPath]);

  const project = useMemo(
    () => projectList.find((item) => item.id === selectedProject) ?? projectList[0] ?? { id: "empty", name: "Choose a project", branch: "—", status: "idle" as const },
    [projectList, selectedProject],
  );

  const adapter = useMemo<AgentAdapter>(() => isTauri && projectPath ? new PrimeRpcAdapter(projectPath) : new MockAgentAdapter(), [projectPath, runtimeRevision]);
  const visibleAgents = useMemo(() => isTauri ? [{
    id: "prime-agent",
    name: "Prime Agent",
    detail: runtimeStatus === "running" ? "Working in the selected project" : runtimeStatus === "waiting" ? "Waiting for your response" : runtimeStatus === "idle" ? "RPC session ready" : "Runtime unavailable",
    status: runtimeStatus === "running" ? "live" as const : runtimeStatus === "waiting" ? "waiting" as const : "done" as const,
    depth: 0,
  }] : agents, [runtimeStatus]);

  useEffect(() => {
    if (isTauri && !projectPath) return;
    let disposed = false;
    const unsubscribe = adapter.subscribe((event) => {
      if (event.type === "timeline") {
        setTimeline((current) => {
          if (event.operation !== "replace") return [...current, event.event];
          const index = current.findIndex((item) => item.id === event.event.id);
          if (index < 0) return [...current, event.event];
          return current.map((item, itemIndex) => itemIndex === index ? event.event : item);
        });
      }
      if (event.type === "connected") {
        setRuntimeLabel(`Prime Agent · ${event.version}`);
        setRuntimeDetail(event.configured === false ? "RPC connected · model setup required" : "Connected over local RPC");
        setRuntimeStatus("idle");
      }
      if (event.type === "status") setRuntimeStatus(event.value);
      if (event.type === "ui-request") {
        setPendingRequest(event.request);
        if (event.request) setApprovalState("pending");
      }
      if (event.type === "runtime-error") setRuntimeDetail(event.message);
    });
    if (isTauri) {
      setTimeline([]);
      setRuntimeStatus("connecting");
      setRuntimeDetail("Starting local RPC process…");
    }
    void adapter.connect().catch((error) => {
      if (disposed) return;
      const message = displayError(error);
      setRuntimeStatus("error");
      setRuntimeDetail(message);
      setTimeline((current) => [...current, { id: `connect-error-${Date.now()}`, time: new Date().toLocaleTimeString([], { hour12: false }), type: "checkpoint", title: "Could not connect Prime Agent", detail: message, status: "failed" }]);
    });
    return () => {
      disposed = true;
      unsubscribe();
      void adapter.disconnect();
    };
  }, [adapter, projectPath]);

  async function chooseProject() {
    if (!isTauri) return;
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true, multiple: false, title: "Choose a project for Prime Agent" });
    if (typeof selected !== "string") return;
    localStorage.setItem("prime-agent-project", selected);
    setSelectedProject("local");
    setProjectPath(selected);
    setTaskTitle("New Prime Agent session");
  }

  function toggleSchedule(id: string) {
    setSchedules((items) => items.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item));
  }

  async function handleApprove() {
    if (!pendingRequest) return;
    try {
      await adapter.approve(pendingRequest.id);
      setApprovalState("approved");
    } catch (error) {
      setRuntimeDetail(displayError(error));
    }
  }

  async function handleReject() {
    if (!pendingRequest) return;
    try {
      await adapter.reject(pendingRequest.id);
      setApprovalState("rejected");
    } catch (error) {
      setRuntimeDetail(displayError(error));
    }
  }

  async function handleRespond(value: string) {
    if (!pendingRequest) return;
    try {
      await adapter.respond(pendingRequest.id, value);
      setApprovalState("approved");
    } catch (error) {
      setRuntimeDetail(displayError(error));
    }
  }

  async function handleSend(message: string) {
    try {
      if (pendingRequest && (pendingRequest.method === "input" || pendingRequest.method === "editor")) {
        await handleRespond(message);
        return;
      }
      if (timeline.filter((event) => event.type === "user").length === 0) setTaskTitle(message.length > 58 ? `${message.slice(0, 55)}…` : message);
      await adapter.sendPrompt(message);
    } catch (error) {
      setRuntimeStatus("error");
      setRuntimeDetail(displayError(error));
    }
  }

  return (
    <main className="app-shell">
      <Sidebar
        onAddProject={() => void chooseProject()}
        onSelectProject={setSelectedProject}
        projects={projectList}
        runtimeDetail={runtimeDetail}
        runtimeLabel={runtimeLabel}
        runtimeStatus={runtimeStatus}
        selectedProject={selectedProject}
      />
      <section className="workspace">
        <TopBar onOpenSettings={() => setSettingsOpen(true)} project={project} runtimeStatus={runtimeStatus} />
        <div className="workspace-columns">
          <section className="task-panel">
            <header className="task-header">
              <div><h1>{taskTitle}</h1><button aria-label="Copy task link" type="button"><Copy size={14} /></button></div>
              <nav>
                <button aria-label="Bookmark task" type="button"><Bookmark size={16} /></button>
                <button aria-label="Task outline" type="button"><List size={16} /></button>
                <button aria-label="More task actions" type="button"><MoreHorizontal size={17} /></button>
              </nav>
            </header>
            <div className="task-scroll">
              <Timeline
                approvalState={approvalState}
                diffExpanded={diffExpanded}
                events={timeline}
                onApprove={handleApprove}
                onReject={handleReject}
                onRespond={(value) => void handleRespond(value)}
                onToggleDiff={() => setDiffExpanded((value) => !value)}
                pendingRequest={pendingRequest}
              />
            </div>
            <Composer
              disabled={isTauri && runtimeStatus !== "idle" && runtimeStatus !== "running" && !(runtimeStatus === "waiting" && pendingRequest && ["input", "editor"].includes(pendingRequest.method))}
              modeLabel={pendingRequest && ["input", "editor"].includes(pendingRequest.method) ? "Reply" : runtimeStatus === "running" ? "Steer" : "Default"}
              onSend={(message) => void handleSend(message)}
              placeholder={pendingRequest && ["input", "editor"].includes(pendingRequest.method) ? pendingRequest.placeholder ?? pendingRequest.title : runtimeStatus === "connecting" ? "Connecting to Prime Agent…" : runtimeStatus === "error" ? "Reconnect by choosing a project" : "Ask Prime Agent to work in this project"}
            />
          </section>
          <Inspector
            activeTab={activeTab}
            agents={visibleAgents}
            memories={isTauri ? [] : memories}
            onTabChange={setActiveTab}
            onToggleSchedule={toggleSchedule}
            refinements={isTauri ? [] : refinements}
            schedules={isTauri ? [] : schedules}
          />
        </div>
      </section>
      {isTauri && !projectPath && (
        <div className="onboarding-backdrop">
          <section className="onboarding-card">
            <span className="eyebrow">LOCAL RPC</span>
            <h1>Give Prime Agent a workspace</h1>
            <p>Choose a project folder. Prime Agent will run inside it with your user permissions, and this window will stream its session, tools, and requests.</p>
            <button className="primary-button" onClick={() => void chooseProject()} type="button">Choose project folder</button>
            <small>You stay in control of extension confirmation requests.</small>
          </section>
        </div>
      )}
      <SettingsCenter
        onClose={() => setSettingsOpen(false)}
        onConfigurationChanged={() => setRuntimeRevision((value) => value + 1)}
        open={settingsOpen}
      />
    </main>
  );
}
