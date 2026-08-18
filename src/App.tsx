import { Bookmark, Copy, List, MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Composer } from "./components/Composer";
import { Inspector, type InspectorTab } from "./components/Inspector";
import { Sidebar } from "./components/Sidebar";
import { Timeline } from "./components/Timeline";
import { TopBar } from "./components/TopBar";
import { agents, initialTimeline, memories, projects, refinements, schedules as initialSchedules } from "./data/demo";
import { MockAgentAdapter } from "./runtime/MockAgentAdapter";
import type { ScheduleEntry, TimelineEvent } from "./types";

const adapter = new MockAgentAdapter();

export function App() {
  const [selectedProject, setSelectedProject] = useState("dashboard");
  const [activeTab, setActiveTab] = useState<InspectorTab>("agents");
  const [timeline, setTimeline] = useState<TimelineEvent[]>(initialTimeline);
  const [approvalState, setApprovalState] = useState<"pending" | "approved" | "rejected">("pending");
  const [diffExpanded, setDiffExpanded] = useState(true);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>(initialSchedules);

  const project = useMemo(
    () => projects.find((item) => item.id === selectedProject) ?? projects[0],
    [selectedProject],
  );

  useEffect(() => {
    const unsubscribe = adapter.subscribe((event) => {
      if (event.type === "timeline") setTimeline((current) => [...current, event.event]);
    });
    void adapter.connect();
    return () => {
      unsubscribe();
      void adapter.disconnect();
    };
  }, []);

  function toggleSchedule(id: string) {
    setSchedules((items) => items.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item));
  }

  function handleApprove() {
    setApprovalState("approved");
    void adapter.approve("approval");
  }

  function handleReject() {
    setApprovalState("rejected");
    void adapter.reject("approval");
  }

  return (
    <main className="app-shell">
      <Sidebar projects={projects} selectedProject={selectedProject} onSelectProject={setSelectedProject} />
      <section className="workspace">
        <TopBar project={project} />
        <div className="workspace-columns">
          <section className="task-panel">
            <header className="task-header">
              <div><h1>Fix the flaky billing tests</h1><button aria-label="Copy task link" type="button"><Copy size={14} /></button></div>
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
                onToggleDiff={() => setDiffExpanded((value) => !value)}
              />
            </div>
            <Composer onSend={(message) => void adapter.sendPrompt(message)} />
          </section>
          <Inspector
            activeTab={activeTab}
            agents={agents}
            memories={memories}
            onTabChange={setActiveTab}
            onToggleSchedule={toggleSchedule}
            refinements={refinements}
            schedules={schedules}
          />
        </div>
      </section>
    </main>
  );
}
