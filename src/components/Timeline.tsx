import {
  Bookmark,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleUserRound,
  Code2,
  Copy,
  FileCode2,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";
import type { TimelineEvent } from "../types";
import { DiffView } from "./DiffView";

type TimelineProps = {
  events: TimelineEvent[];
  approvalState: "pending" | "approved" | "rejected";
  diffExpanded: boolean;
  onToggleDiff: () => void;
  onApprove: () => void;
  onReject: () => void;
};

function EventIcon({ event }: { event: TimelineEvent }) {
  if (event.type === "user") return <CircleUserRound size={16} />;
  if (event.type === "thought") return <Sparkles size={16} />;
  if (event.type === "tool") return <Wrench size={15} />;
  if (event.type === "diff") return <FileCode2 size={15} />;
  if (event.type === "approval") return <ShieldAlert size={15} />;
  return <Bookmark size={15} />;
}

export function Timeline({
  events,
  approvalState,
  diffExpanded,
  onToggleDiff,
  onApprove,
  onReject,
}: TimelineProps) {
  return (
    <div className="timeline">
      {events.map((event) => (
        <article className={`timeline-event event-${event.type}`} key={event.id}>
          <time>{event.time}</time>
          <div className={`timeline-node ${event.status ?? ""}`}>
            {event.type === "user" ? <CircleUserRound size={14} /> : <span />}
          </div>
          <div className="event-content">
            {event.type === "diff" ? (
              <div className="diff-card">
                <button className="diff-title" onClick={onToggleDiff} type="button">
                  <span><EventIcon event={event} /><strong>{event.title}</strong><small>{event.meta}</small></span>
                  <span className="diff-stats"><b>+18</b><em>−12</em><i>View file</i>{diffExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
                </button>
                {diffExpanded && <DiffView />}
              </div>
            ) : event.type === "approval" ? (
              <div className={`approval-card approval-${approvalState}`}>
                <div className="approval-heading"><EventIcon event={event} /><strong>{approvalState === "pending" ? event.title : approvalState === "approved" ? "Permission approved" : "Permission rejected"}</strong></div>
                <p>{event.detail}</p>
                <div className="command-line"><Code2 size={14} /><code>{event.meta}</code><Copy size={13} /></div>
                {approvalState === "pending" ? (
                  <div className="approval-actions">
                    <button className="primary-button" onClick={onApprove} type="button">Approve</button>
                    <button className="secondary-button" onClick={onReject} type="button">Reject</button>
                  </div>
                ) : (
                  <div className="approval-result"><Check size={14} /> Decision recorded in the session audit log</div>
                )}
              </div>
            ) : (
              <div className={`event-row ${event.type === "thought" ? "event-thought-copy" : ""}`}>
                <div className="event-heading"><EventIcon event={event} /><strong>{event.title}</strong>{event.meta && <code>{event.meta}</code>}</div>
                {event.detail && <p>{event.detail}</p>}
                {event.duration && <span className={`duration duration-${event.status}`}>{event.duration}{event.status === "success" && <CheckCircle2 size={13} />}</span>}
                {event.type === "checkpoint" && <span className="checkpoint-status">All checks passing <CheckCircle2 size={14} /></span>}
              </div>
            )}
          </div>
        </article>
      ))}
      <div className="timeline-fade" />
    </div>
  );
}
