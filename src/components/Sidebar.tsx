import {
  BookOpen,
  Settings,
  GitBranch,
  ChevronUp,
  Folder,
  LayoutGrid,
  MessageSquarePlus,
  Plus,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "../types";
import { BrandMark } from "./BrandMark";

type SidebarProps = {
  projects: Project[];
  selectedProject: string;
  onSelectProject: (id: string) => void;
  onAddProject: () => void;
  onNewTask: () => void;
  onOpenSettings: () => void;
  onReconnect: () => void;
  runtimeLabel: string;
  runtimeDetail: string;
  runtimeStatus: "disconnected" | "connecting" | "idle" | "running" | "waiting" | "error";
};

export function Sidebar({ projects, selectedProject, onSelectProject, onAddProject, onNewTask, onOpenSettings, onReconnect, runtimeLabel, runtimeDetail, runtimeStatus }: SidebarProps) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const visibleProjects = useMemo(() => projects.filter((project) => `${project.name} ${project.branch}`.toLowerCase().includes(query.trim().toLowerCase())), [projects, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <aside className="sidebar">
      <div className="brand-row">
        <BrandMark />
        <span>Prime Agent</span>
      </div>

      <div className="sidebar-body">
        <nav aria-label="Workspace" className="rail-nav">
          <button aria-label="Projects" className="rail-button active" type="button"><LayoutGrid size={17} /></button>
          <button aria-label="New task" className="rail-button" onClick={onNewTask} type="button"><MessageSquarePlus size={17} /></button>
          <button aria-label="Models and resources" className="rail-button" onClick={onOpenSettings} type="button"><Settings size={17} /></button>
        </nav>

        <div className="project-pane">
          <label className="search-box">
            <Search size={14} />
            <input aria-label="Search projects" onChange={(event) => setQuery(event.target.value)} placeholder="Search projects…" ref={searchRef} value={query} />
            <kbd>⌘K</kbd>
          </label>

          <div className="pane-heading">
            <span>Projects</span>
            <button aria-label="Add project" onClick={onAddProject} type="button"><Plus size={15} /></button>
          </div>

          <div className="project-list">
            {visibleProjects.map((project) => (
              <button
                className={`project-row ${selectedProject === project.id ? "selected" : ""}`}
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                type="button"
              >
                <Folder size={15} />
                <span className="project-copy">
                  <strong>{project.name}</strong>
                  <small><GitBranch size={11} />{project.branch}</small>
                </span>
              </button>
            ))}
            {visibleProjects.length === 0 && <p className="project-empty">No matching projects</p>}
          </div>

          <button className={`runtime-card state-${runtimeStatus}`} onClick={runtimeStatus === "error" ? onReconnect : onOpenSettings} type="button">
            <span><i /> {runtimeLabel}</span>
            <small title={runtimeDetail}>{runtimeDetail}</small>
            <ChevronUp size={15} />
          </button>
        </div>
      </div>

      <div className="sidebar-footer">
        <a aria-label="Prime Agent documentation" href="https://github.com/PrimeIntellect-ai/prime-agent" rel="noreferrer" target="_blank"><BookOpen size={17} /></a>
        <span className="footer-label">Local-first agent</span>
        <button aria-label="Settings" onClick={onOpenSettings} type="button"><Settings size={17} /></button>
      </div>
    </aside>
  );
}
