import {
  Bell,
  BookOpen,
  Box,
  GitBranch,
  ChevronUp,
  Folder,
  LayoutGrid,
  MessageSquareText,
  Plus,
  Search,
} from "lucide-react";
import type { Project } from "../types";
import { BrandMark } from "./BrandMark";

type SidebarProps = {
  projects: Project[];
  selectedProject: string;
  onSelectProject: (id: string) => void;
};

export function Sidebar({ projects, selectedProject, onSelectProject }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-row">
        <BrandMark />
        <span>Prime Agent</span>
      </div>

      <div className="sidebar-body">
        <nav aria-label="Workspace" className="rail-nav">
          <button aria-label="Projects" className="rail-button active" type="button"><LayoutGrid size={17} /></button>
          <button aria-label="Sessions" className="rail-button" type="button"><MessageSquareText size={17} /></button>
          <button aria-label="Artifacts" className="rail-button" type="button"><Box size={17} /></button>
        </nav>

        <div className="project-pane">
          <label className="search-box">
            <Search size={14} />
            <input aria-label="Search projects" placeholder="Search projects…" />
            <kbd>⌘K</kbd>
          </label>

          <div className="pane-heading">
            <span>Projects</span>
            <button aria-label="Add project" type="button"><Plus size={15} /></button>
          </div>

          <div className="project-list">
            {projects.map((project) => (
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
          </div>

          <button className="runtime-card" type="button">
            <span><i /> Prime Agent v0.6.2</span>
            <small>Connected</small>
            <ChevronUp size={15} />
          </button>
        </div>
      </div>

      <div className="sidebar-footer">
        <button aria-label="Documentation" type="button"><BookOpen size={17} /></button>
        <button aria-label="Notifications" className="notification-button" type="button"><Bell size={17} /><i>2</i></button>
        <button aria-label="Profile" className="avatar" type="button">J</button>
      </div>
    </aside>
  );
}
