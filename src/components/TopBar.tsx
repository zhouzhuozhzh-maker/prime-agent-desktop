import { Activity, ChevronDown, Folder, GitBranch, Settings, Terminal } from "lucide-react";
import type { Project } from "../types";

type TopBarProps = {
  onOpenSettings: () => void;
  project: Project;
  runtimeStatus: "disconnected" | "connecting" | "idle" | "running" | "waiting" | "error";
};

export function TopBar({ onOpenSettings, project, runtimeStatus }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="top-project"><Folder size={16} /><strong>{project.name}</strong><ChevronDown size={15} /></div>
      <div className="top-branch"><GitBranch size={16} /><span>{project.branch}</span><ChevronDown size={15} /></div>
      <div className="top-spacer" />
      <div className={`running-state state-${runtimeStatus}`}><i />{runtimeStatus === "running" ? "Prime Agent running" : runtimeStatus === "waiting" ? "Waiting for you" : runtimeStatus === "connecting" ? "Connecting…" : runtimeStatus === "error" ? "Runtime error" : runtimeStatus === "idle" ? "Prime Agent ready" : "Disconnected"}</div>
      <button aria-label="Activity" type="button"><Activity size={17} /></button>
      <button aria-label="Terminal" type="button"><Terminal size={17} /></button>
      <button aria-label="Settings" onClick={onOpenSettings} type="button"><Settings size={17} /></button>
    </header>
  );
}
