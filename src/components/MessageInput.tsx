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
  selectedModel,
  onSelectModel,
  agentMode,
  setAgentMode,
  onOpenVoiceModal,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [webSearch, setWebSearch] = useState(true);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if ((input.trim() || attachments.length > 0) && !isGenerating) {
        onSend(attachments, webSearch);
        setAttachments([]);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            data: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-4 pb-5">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        accept="image/*,.pdf,.txt,.docx,.xlsx,.zip"
        className="hidden"
      />

      <div
        className={`relative bg-[var(--claude-bg)] border rounded-xl transition-all ${
          agentMode
            ? "border-[var(--claude-accent)]"
            : "border-[var(--claude-border)] focus-within:border-[var(--claude-text-muted)]"
        }`}
      >


        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3.5 pt-2.5">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-[var(--claude-bg)] border border-[var(--claude-border)] rounded-xl px-2.5 py-1 text-xs"
              >
                <AppIcon name="file" size={13} className="text-[var(--claude-accent)]" />
                <span className="truncate max-w-[130px] text-[var(--claude-text)]">{att.name}</span>
                <button
                  onClick={() => removeAttachment(idx)}
                  aria-label={`Remove attachment ${att.name}`}
                  className="text-[var(--claude-text-muted)] hover:text-rose-500 p-0.5 rounded"
                >
                  <AppIcon name="close" size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea & Controls */}
        <div className="flex items-end gap-2 px-3 py-2">
          <Button
            size="sm"
            variant="quiet"
            icon={<AppIcon name="attach" size={16} />}
            onClick={() => fileInputRef.current?.click()}
            title="Attach documents, ZIPs, or images"
          />

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              agentMode
                ? "Instruct the autonomous agent on a multi-step objective..."
                : "Message OmniMind..."
            }
            className="w-full bg-transparent text-[var(--claude-text)] placeholder-[var(--claude-text-muted)] text-xs sm:text-sm focus:outline-hidden resize-none max-h-[180px] leading-relaxed py-1.5 custom-scrollbar"
          />

          {isGenerating ? (
            <Button
              size="sm"
              variant="secondary"
              icon={<AppIcon name="stop" size={12} />}
              onClick={onStop}
              title="Stop generation"
            />
          ) : (
            <Button
              size="sm"
              variant="primary"
              disabled={!input.trim() && attachments.length === 0}
              icon={<AppIcon name="send" size={14} />}
              onClick={() => {
                if (input.trim() || attachments.length > 0) {
                  onSend(attachments, webSearch);
                  setAttachments([]);
                }
              }}
              title="Send message (Enter)"
            />
          )}
        </div>
      </div>
    </div>
  );
};
