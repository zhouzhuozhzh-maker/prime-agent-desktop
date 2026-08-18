import {
  Bot,
  Brain,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  GitCommitHorizontal,
  Network,
  Plus,
  Sparkles,
} from "lucide-react";
import type { AgentNode, MemoryEntry, RefineEntry, ScheduleEntry } from "../types";

export type InspectorTab = "agents" | "memory" | "refine" | "schedule";

type InspectorProps = {
  activeTab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  agents: AgentNode[];
  memories: MemoryEntry[];
  refinements: RefineEntry[];
  schedules: ScheduleEntry[];
  onToggleSchedule: (id: string) => void;
};

const tabs: Array<{ id: InspectorTab; label: string }> = [
  { id: "agents", label: "Agent tree" },
  { id: "memory", label: "Memory" },
  { id: "refine", label: "Refine" },
  { id: "schedule", label: "Schedule" },
];

function AgentTree({ agents }: { agents: AgentNode[] }) {
  return (
    <section className="inspector-section agent-section">
      <div className="section-heading"><h2>Agent tree</h2><span><i />3 live</span></div>
      <div className="agent-tree">
        {agents.map((agent) => (
          <div className={`agent-row depth-${agent.depth}`} key={agent.id}>
            <span className="tree-connector" />
            {agent.depth === 0 ? <Sparkles size={16} /> : <Network size={16} />}
            <span className="agent-copy"><strong>{agent.name}</strong><small>{agent.detail}</small></span>
            <span className={`live-dot ${agent.status}`} title={agent.status} />
          </div>
        ))}
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
        <button className="section-link" type="button">View full ledger <ExternalLink size={13} /></button>
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
        <button className="section-link" type="button">View all schedules <ExternalLink size={13} /></button>
      </div>
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
            <MemoryList memories={memories} />
            <RefineList entries={refinements} />
            <ScheduleList schedules={schedules} onToggle={onToggleSchedule} />
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
