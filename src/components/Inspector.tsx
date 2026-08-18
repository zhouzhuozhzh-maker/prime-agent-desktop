import {
  Brain,
  Clock3,
  FileDiff,
  GitCommitHorizontal,
  Network,
  Plus,
  Sparkles,
} from "lucide-react";
import type { AgentNode, MemoryEntry, RefineEntry, ScheduleEntry, TimelineEvent } from "../types";

export type InspectorTab = "agents" | "changes" | "memory" | "refine" | "schedule";

type InspectorProps = {
  activeTab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  agents: AgentNode[];
  memories: MemoryEntry[];
  refinements: RefineEntry[];
  schedules: ScheduleEntry[];
  onToggleSchedule: (id: string) => void;
  events: TimelineEvent[];
  onReviewChanges: () => void;
};

const tabs: Array<{ id: InspectorTab; label: string }> = [
  { id: "agents", label: "Activity" },
  { id: "changes", label: "Changes" },
  { id: "memory", label: "Memory" },
  { id: "refine", label: "Refine" },
  { id: "schedule", label: "Schedule" },
];

function AgentTree({ agents }: { agents: AgentNode[] }) {
  const liveCount = agents.filter((agent) => agent.status === "live").length;
  return (
    <section className="inspector-section agent-section">
      <div className="section-heading"><h2>Agent tree</h2><span><i />{liveCount} live</span></div>
      <div className="agent-tree">
        {agents.map((agent) => (
          <div className={`agent-row depth-${agent.depth}`} key={agent.id}>
            <span className="tree-connector" />
            {agent.depth === 0 ? <Sparkles size={16} /> : <Network size={16} />}
            <span className="agent-copy"><strong>{agent.name}</strong><small>{agent.detail}</small></span>
            <span className={`live-dot ${agent.status}`} title={agent.status} />
          </div>
        ))}
        {agents.length === 0 && <div className="empty-ledger">No active agent session</div>}
      </div>
    </section>
  );
}

function MemoryList({ memories, full = false }: { memories: MemoryEntry[]; full?: boolean }) {
  return (
    <section className="inspector-section memory-section">
      <div className="section-heading"><h2>Memory</h2><span className="mint-label">Learned today</span></div>
      <div className="ledger-list">
        {memories.slice(0, full ? memories.length : 1).map((memory) => (
          <article className="memory-card" key={memory.id}>
            <time>{memory.time}</time>
            <Plus className="memory-plus" size={14} />
            <div><strong>{memory.title}</strong><p>{memory.detail}</p><small>Context: {memory.context}</small></div>
          </article>
        ))}
        {memories.length === 0 && <div className="empty-ledger">Memory events will appear when upstream exposes them.</div>}
      </div>
    </section>
  );
}

function RefineList({ entries, full = false }: { entries: RefineEntry[]; full?: boolean }) {
  return (
    <section className="inspector-section refine-section">
      <div className="section-heading"><h2>Refine</h2>{full && <span className="mint-label">Audit ledger</span>}</div>
      <div className="refine-list">
        {entries.slice(0, full ? entries.length : 3).map((entry) => (
          <article className="refine-row" key={entry.id}>
            <time>{entry.time}</time>
            <span className="change-add">+{entry.additions}</span>
            <span className="change-remove">−{entry.removals}</span>
            <div><strong>{entry.title}</strong>{full && <small>{entry.detail}</small>}</div>
          </article>
        ))}
        {entries.length === 0 && <div className="empty-ledger">No refinement events in this session</div>}
      </div>
    </section>
  );
}

function ScheduleList({ schedules, onToggle }: { schedules: ScheduleEntry[]; onToggle: (id: string) => void }) {
  return (
    <section className="inspector-section schedule-section">
      <div className="section-heading"><h2>Schedule</h2><span className="mint-label">Next run</span></div>
      <div className="schedule-list">
        {schedules.map((schedule) => (
          <article className="schedule-row" key={schedule.id}>
            <Clock3 size={16} />
            <div><strong>{schedule.title}</strong><code>{schedule.cron}</code></div>
            <button
              aria-label={`${schedule.enabled ? "Disable" : "Enable"} ${schedule.title}`}
              className={`toggle ${schedule.enabled ? "on" : ""}`}
              onClick={() => onToggle(schedule.id)}
              type="button"
            ><i /></button>
          </article>
        ))}
        {schedules.length === 0 && <div className="empty-ledger">Schedule sync is not connected yet.</div>}
      </div>
    </section>
  );
}

function ChangesList({ events, onReview }: { events: TimelineEvent[]; onReview: () => void }) {
  const changes = events.filter((event) => event.type === "diff");
  return (
    <section className="inspector-section changes-section">
      <div className="section-heading"><h2>Session changes</h2><span className="mint-label">{changes.length} file{changes.length === 1 ? "" : "s"}</span></div>
      {changes.length > 0 ? (
        <div className="changes-list">
          {changes.map((change) => (
            <article className="change-row" key={change.id}>
              <FileDiff size={16} />
              <div><strong>{change.meta || change.title}</strong><small>{change.title}</small></div>
              <span><b>+18</b><em>−12</em></span>
            </article>
          ))}
          <button className="review-button" onClick={onReview} type="button">Review changes in timeline</button>
        </div>
      ) : <div className="changes-empty"><FileDiff size={22} /><strong>No file changes yet</strong><p>Edits made during this session will collect here for review.</p></div>}
    </section>
  );
}

export function Inspector({
  activeTab,
  onTabChange,
  agents,
  memories,
  refinements,
  schedules,
  onToggleSchedule,
  events,
  onReviewChanges,
}: InspectorProps) {
  return (
    <aside className="inspector">
      <div className="inspector-tabs">
        {tabs.map((tab) => (
          <button className={activeTab === tab.id ? "active" : ""} key={tab.id} onClick={() => onTabChange(tab.id)} type="button">
            {tab.label}
          </button>
        ))}
      </div>
      <div className="inspector-scroll">
        {activeTab === "agents" && (
          <>
            <AgentTree agents={agents} />
            {memories.length > 0 && <MemoryList memories={memories} />}
            {refinements.length > 0 && <RefineList entries={refinements} />}
            {schedules.length > 0 && <ScheduleList schedules={schedules} onToggle={onToggleSchedule} />}
          </>
        )}
        {activeTab === "changes" && (
          <>
            <div className="tab-intro"><FileDiff size={20} /><div><h2>Review before you ship</h2><p>See what changed during this run and jump back to the full diff.</p></div></div>
            <ChangesList events={events} onReview={onReviewChanges} />
          </>
        )}
        {activeTab === "memory" && (
          <>
            <div className="tab-intro"><Brain size={20} /><div><h2>Project memory</h2><p>Review what Prime Agent carries into future sessions.</p></div></div>
            <MemoryList full memories={memories} />
          </>
        )}
        {activeTab === "refine" && (
          <>
            <div className="tab-intro"><GitCommitHorizontal size={20} /><div><h2>Refine ledger</h2><p>Every durable change is explicit, reviewable, and reversible.</p></div></div>
            <RefineList entries={refinements} full />
          </>
        )}
        {activeTab === "schedule" && (
          <>
            <div className="tab-intro"><Clock3 size={20} /><div><h2>Background work</h2><p>Prime Agent keeps moving after the terminal disconnects.</p></div></div>
            <ScheduleList schedules={schedules} onToggle={onToggleSchedule} />
          </>
        )}
      </div>
    </aside>
  );
}
