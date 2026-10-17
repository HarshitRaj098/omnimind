import React, { useRef, useEffect, useState } from "react";
import { Button } from "./ui";
import { AppIcon } from "./AppIcon";

interface Attachment {
  name: string;
  mimeType: string;
  data: string;
}

interface MessageInputProps {
  input: string;
  setInput: (v: string) => void;
  onSend: (attachments?: Attachment[], webSearch?: boolean) => void;
  onStop: () => void;
  isGenerating: boolean;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  agentMode: boolean;
  setAgentMode: (v: boolean) => void;
  onOpenVoiceModal: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  input,
  setInput,
  onSend,
  onStop,
  isGenerating,
  agentMode,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [webSearch] = useState(true);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
  }, [input]);

  const submit = () => {
    if ((!input.trim() && attachments.length === 0) || isGenerating) return;
    onSend(attachments, webSearch);
    setAttachments([]);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    setAttachmentError(null);

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") {
          setAttachmentError(`Couldn't read ${file.name}. Please try again.`);
          return;
        }
        setAttachments((previous) => [
          ...previous,
          {
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            data: reader.result as string,
          },
        ]);
      };
      reader.onerror = () => {
        setAttachmentError(`Couldn't read ${file.name}. Please try again.`);
      };
      reader.readAsDataURL(file);
    });

    event.target.value = "";
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4 sm:px-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        accept="image/*,.pdf,.txt,.docx,.xlsx,.zip"
        className="hidden"
      />

      <div className="rounded-3xl border border-[var(--claude-border)] bg-[var(--claude-surface)] transition-colors focus-within:border-[var(--claude-text-muted)]">
        {attachmentError && (
          <p role="alert" className="px-4 pt-3 text-xs text-rose-500">
            {attachmentError}
          </p>
        )}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {attachments.map((attachment, index) => (
              <div
                key={`${attachment.name}-${index}`}
                className="flex max-w-full items-center gap-2 rounded-xl bg-[var(--claude-bg)] px-3 py-2 text-xs text-[var(--claude-text-secondary)]"
              >
                <span className="truncate max-w-[220px]">{attachment.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachments((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                  aria-label={`Remove attachment ${attachment.name}`}
                  className="rounded px-1 text-[var(--claude-text-muted)] hover:text-rose-500 focus-visible:outline-2 focus-visible:outline-[var(--claude-accent)]"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 px-3 py-3 sm:px-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach a file"
            title="Attach a file"
            className="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--claude-text-muted)] transition-colors hover:bg-[var(--claude-border-subtle)] hover:text-[var(--claude-text)] focus-visible:outline-2 focus-visible:outline-[var(--claude-accent)]"
          >
            <AppIcon name="attach" size={18} />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={agentMode ? "What should I take care of?" : "Message OmniMind"}
            aria-label="Message"
            className="max-h-[180px] min-h-9 w-full resize-none bg-transparent py-2 text-sm leading-6 text-[var(--claude-text)] placeholder:text-[var(--claude-text-muted)] focus:outline-none custom-scrollbar"
          />

          {isGenerating ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              title="Stop generating"
              className="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--claude-text)] text-[var(--claude-bg)] transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-[var(--claude-accent)]"
            >
              <AppIcon name="stop" size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!input.trim() && attachments.length === 0}
              aria-label="Send message"
              title="Send message"
              className="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--claude-accent)] text-white transition-colors hover:bg-[var(--claude-accent-hover)] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--claude-accent)]"
            >
              <AppIcon name="send" size={15} />
            </button>
          )}
        </div>
      </div>
      <p className="pt-2 text-center text-[11px] text-[var(--claude-text-muted)]">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
};
