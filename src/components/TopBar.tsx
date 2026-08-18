import { Activity, ChevronDown, Folder, GitBranch, Settings, Terminal } from "lucide-react";
import type { Project } from "../types";

type TopBarProps = { project: Project };

export function TopBar({ project }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="top-project"><Folder size={16} /><strong>{project.name}</strong><ChevronDown size={15} /></div>
      <div className="top-branch"><GitBranch size={16} /><span>{project.branch}</span><ChevronDown size={15} /></div>
      <div className="top-spacer" />
      <div className="running-state"><i />3 agents running</div>
      <button aria-label="Activity" type="button"><Activity size={17} /></button>
      <button aria-label="Terminal" type="button"><Terminal size={17} /></button>
      <button aria-label="Settings" type="button"><Settings size={17} /></button>
    </header>
  );
}
