import { ArrowUp, ChevronDown, Paperclip } from "lucide-react";
import { FormEvent, useState } from "react";

type ComposerProps = {
  onSend: (message: string) => void;
  placeholder?: string;
  modeLabel?: string;
  disabled?: boolean;
};

export function Composer({ onSend, placeholder = "Steer the agent", modeLabel = "Default", disabled = false }: ComposerProps) {
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
        disabled={disabled}
        placeholder={placeholder}
        value={message}
      />
      <button className="mode-button" type="button">{modeLabel} <ChevronDown size={14} /></button>
      <button aria-label="Send" className="send-button" disabled={disabled || !message.trim()} type="submit"><ArrowUp size={18} /></button>
    </form>
  );
}
