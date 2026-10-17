import React, { useEffect, useRef, useState } from "react";
import { Message, Conversation } from "../types";
import { Button } from "./ui";
import { AppIcon } from "./AppIcon";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface ChatAreaProps {
  conversation: Conversation | null;
  isGenerating: boolean;
  onSendMessage: (text: string) => void;
  onRegenerate: () => void;
  onRetry?: () => void;
  onDismissError?: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  error: string | null;
  onShare: () => void;
  onOpenVoice: () => void;
  onOpenSkills: () => void;
  onOpenResearch: () => void;
  onOpenApps: () => void;
  onOpenMemory: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  isGenerating,
  onSendMessage,
  onRegenerate,
  onRetry,
  onDismissError,
  onToggleSidebar,
  isSidebarOpen,
  error,
  onShare,
  onOpenVoice,
  onOpenSkills,
  onOpenResearch,
  onOpenApps,
  onOpenMemory,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages, isGenerating]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderMarkdown = (content: string) => {
    try {
      const rawHtml = marked.parse(content || "");
      const cleanHtml = DOMPurify.sanitize(rawHtml as string);
      return { __html: `<div class="markdown-body">${cleanHtml}</div>` };
    } catch {
      return { __html: content };
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--claude-bg)] text-[var(--claude-text)] overflow-hidden relative">
      {/* Top Header */}
      <header className="h-14 border-b border-[var(--claude-border)] bg-[var(--claude-bg)] px-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {!isSidebarOpen && (
            <Button
              size="sm"
              variant="quiet"
              icon={<AppIcon name="sidebar" size={16} />}
              onClick={onToggleSidebar}
              title="Open Sidebar"
            />
          )}
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold truncate max-w-[180px] sm:max-w-md">
              {conversation?.title || "OmniMind AI"}
            </h2>
            {conversation?.model && (
              <span className="hidden sm:inline-flex items-center text-xs text-[var(--claude-text-muted)] font-mono">
                <span>·</span>
                <span className="ml-1.5">{conversation.model}</span>
              </span>
            )}
          </div>
        </div>


      </header>

      {/* Main Messages or Empty State */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {!conversation || conversation.messages.length === 0 ? (
          <div className="max-w-2xl mx-auto flex flex-col items-center justify-center text-center px-4 py-16">
            <h3 className="text-xl sm:text-2xl font-medium tracking-tight mb-2">
              What would you like to work on?
            </h3>
            <p className="text-sm text-[var(--claude-text-muted)] max-w-md leading-relaxed">
              Ask a question, explore an idea, or describe a task.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-7 pb-8">
            {conversation.messages.map((msg, index) => {
              const isUser = msg.role === "user";
              const isLastModel = !isUser && index === conversation.messages.length - 1;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`group relative max-w-[88%] sm:max-w-[85%] text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? "bg-[var(--claude-sidebar)] px-4 py-2 rounded-2xl"
                        : "text-[var(--claude-text)]"
                    }`}
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <div
                        className="markdown-body prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed"
                        dangerouslySetInnerHTML={renderMarkdown(msg.content)}
                      />
                    )}

                    {/* Gemini Grounding & Verified Sources Tray */}
                    {!isUser && msg.grounding && (msg.grounding.sources?.length || msg.grounding.queries?.length) && (
                      <div className="mt-3 space-y-2">
                        {msg.grounding.queries && msg.grounding.queries.length > 0 && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[var(--claude-text-muted)] font-mono">
                            <AppIcon name="search" size={12} className="text-[var(--claude-accent)]" />
                            <span>Grounded query:</span>
                            <span className="text-[var(--claude-text-secondary)] italic truncate max-w-xs sm:max-w-md">
                              "{msg.grounding.queries.join('", "')}"
                            </span>
                          </div>
                        )}

                        {msg.grounding.sources && msg.grounding.sources.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-[10px] text-[var(--claude-text-muted)] font-medium mr-1 flex items-center gap-1">
                              Sources:
                            </span>
                            {msg.grounding.sources.map((src, i) => (
                              <a
                                key={i}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-[var(--claude-text-secondary)] hover:text-[var(--claude-accent)] hover:underline underline-offset-4 transition-colors"
                                title={src.title || src.url}
                              >
                                {i + 1}. {src.title || src.domain}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {!isUser && (
                      <div className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="quiet"
                          icon={<AppIcon name={copiedId === msg.id ? "check" : "copy"} size={13} />}
                          onClick={() => handleCopy(msg.content, msg.id)}
                          title="Copy response"
                        />

                        {isLastModel && !isGenerating && (
                          <Button
                            size="sm"
                            variant="quiet"
                            icon={<AppIcon name="regenerate" size={13} />}
                            onClick={onRegenerate}
                            title="Regenerate response"
                          />
                        )}
                      </div>
                    )}
                  </div>

                </div>
              );
            })}

            {/* Generating State */}
            {isGenerating && (
              <div className="text-xs text-[var(--claude-text-muted)]" role="status" aria-live="polite">
                Generating response…
              </div>
            )}

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-center justify-between gap-3 text-rose-500 text-xs max-w-lg mx-auto">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <AppIcon name="error" size={16} className="shrink-0" />
                  <span className="leading-relaxed">{error}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {onRetry && (
                    <Button size="sm" variant="secondary" onClick={onRetry} className="text-xs">
                      Retry
                    </Button>
                  )}
                  {onDismissError && (
                    <Button size="sm" variant="quiet" onClick={onDismissError} className="text-xs">
                      Dismiss
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
