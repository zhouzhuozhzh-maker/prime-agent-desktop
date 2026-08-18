import { ArrowUp } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useLayoutEffect, useRef, useState } from "react";

type ComposerProps = {
  onSend: (message: string) => void;
  placeholder?: string;
  modeLabel?: string;
  disabled?: boolean;
};

export function Composer({ onSend, placeholder = "Steer the agent", modeLabel = "Default", disabled = false }: ComposerProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 112)}px`;
  }, [message]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = message.trim();
    if (!value) return;
    onSend(value);
    setMessage("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        aria-label="Steer the agent"
        disabled={disabled}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        ref={textareaRef}
        rows={1}
        value={message}
      />
      <div className="composer-meta"><span>{modeLabel}</span><small>↵ send · ⇧↵ new line</small></div>
      <button aria-label="Send" className="send-button" disabled={disabled || !message.trim()} type="submit"><ArrowUp size={18} /></button>
    </form>
  );
}
