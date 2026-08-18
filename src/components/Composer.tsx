import { ArrowUp, ChevronDown, Paperclip } from "lucide-react";
import { FormEvent, useState } from "react";

type ComposerProps = { onSend: (message: string) => void };

export function Composer({ onSend }: ComposerProps) {
  const [message, setMessage] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = message.trim();
    if (!value) return;
    onSend(value);
    setMessage("");
  }

  return (
    <form className="composer" onSubmit={submit}>
      <button aria-label="Attach file" type="button"><Paperclip size={17} /></button>
      <input
        aria-label="Steer the agent"
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Steer the agent"
        value={message}
      />
      <button className="mode-button" type="button">Default <ChevronDown size={14} /></button>
      <button aria-label="Send" className="send-button" disabled={!message.trim()} type="submit"><ArrowUp size={18} /></button>
    </form>
  );
}
