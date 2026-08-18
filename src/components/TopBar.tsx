import { ChevronDown, Folder, GitBranch, Plus, RotateCcw, Settings } from "lucide-react";
import type { Project } from "../types";

type TopBarProps = {
  onNewTask: () => void;
  onOpenSettings: () => void;
  onReconnect: () => void;
  project: Project;
  runtimeStatus: "disconnected" | "connecting" | "idle" | "running" | "waiting" | "error";
};

export function TopBar({ onNewTask, onOpenSettings, onReconnect, project, runtimeStatus }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="top-project"><Folder size={16} /><strong>{project.name}</strong><ChevronDown size={15} /></div>
      <div className="top-branch"><GitBranch size={16} /><span>{project.branch}</span><ChevronDown size={15} /></div>
      <div className="top-spacer" />
      <div className={`running-state state-${runtimeStatus}`}><i />{runtimeStatus === "running" ? "Prime Agent running" : runtimeStatus === "waiting" ? "Waiting for you" : runtimeStatus === "connecting" ? "Connecting…" : runtimeStatus === "error" ? "Runtime error" : runtimeStatus === "idle" ? "Prime Agent ready" : "Disconnected"}</div>
      {runtimeStatus === "error" && <button className="top-action" onClick={onReconnect} type="button"><RotateCcw size={15} /><span>Reconnect</span></button>}
      <button className="top-action" onClick={onNewTask} type="button"><Plus size={16} /><span>New task</span></button>
      <button aria-label="Settings" onClick={onOpenSettings} type="button"><Settings size={17} /></button>
    </header>
  );
}
