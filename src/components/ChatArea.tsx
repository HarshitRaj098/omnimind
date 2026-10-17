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
  onRegenerate,
  onRetry,
  onDismissError,
  onToggleSidebar,
  isSidebarOpen,
  error,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setIsAtBottom(
      container.scrollHeight - container.scrollTop - container.clientHeight < 96
    );
  };

  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [conversation?.messages, isGenerating, isAtBottom]);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => current === id ? null : current), 1600);
    } catch (error) {
      console.error("Unable to copy message:", error);
    }
  };

  const renderMarkdown = (content: string) => {
    try {
      const rawHtml = marked.parse(content || "");
      return { __html: DOMPurify.sanitize(rawHtml as string) };
    } catch {
      return { __html: DOMPurify.sanitize(content || "") };
    }
  };

  const hasMessages = Boolean(conversation?.messages.length);

  const handleExportConversation = () => {
    if (!conversation?.messages.length) return;

    const escapeMarkdown = (value: string) =>
      value.replace(/\\r\\n/g, "\\n").replace(/\\r/g, "\\n");

    const transcript = [
      `# ${conversation.title || "OmniMind conversation"}`,
      "",
      `Exported: ${new Date().toLocaleString()}`,
      "",
      ...conversation.messages.flatMap((message) => [
        `## ${message.role === "user" ? "You" : "OmniMind"}`,
        `_${new Date(message.timestamp).toLocaleString()}_`,
        "",
        escapeMarkdown(message.content),
        ...(message.grounding?.sources?.length
          ? [
              "",
              "Sources:",
              ...message.grounding.sources.map(
                (source) => `- [${source.title || source.domain || source.url}](${source.url})`
              ),
            ]
          : []),
        "",
      ]),
    ].join("\\n");

    const blob = new Blob([transcript], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeTitle = (conversation.title || "omnimind-conversation")
      .replace(/[^a-z0-9-_ ]/gi, "")
      .trim()
      .replace(/\\s+/g, "-")
      .slice(0, 80) || "omnimind-conversation";
    anchor.href = url;
    anchor.download = `${safeTitle}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="flex-1 flex flex-col min-h-0 bg-[var(--claude-bg)] text-[var(--claude-text)] overflow-hidden">
      <header className="h-12 px-3 sm:px-5 flex items-center gap-2 shrink-0">
        {!isSidebarOpen && (
          <Button
            size="sm"
            variant="quiet"
            icon={<AppIcon name="sidebar" size={16} />}
            onClick={onToggleSidebar}
            aria-label="Open conversation history"
            title="Open conversation history"
          />
        )}
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--claude-text-secondary)]">
          {conversation?.title || "OmniMind"}
        </h2>
        {hasMessages && (
          <Button
            size="sm"
            variant="quiet"
            onClick={handleExportConversation}
            aria-label="Export conversation as Markdown"
            title="Export conversation as Markdown"
          >
            Export
          </Button>
        )}
      </header>

      <div ref={scrollContainerRef} onScroll={handleScroll} className="relative flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {!hasMessages ? (
          <div className="min-h-full flex flex-col items-center justify-center px-6 pb-12 text-center">
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-[var(--claude-text)]">
              What can I help with?
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-[var(--claude-text-muted)]">
              Ask a question, explore an idea, or share a file to get started.
            </p>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 pt-5 pb-10 space-y-8">
            {conversation!.messages.map((msg: Message, index) => {
              const isUser = msg.role === "user";
              const isLastModel = !isUser && index === conversation!.messages.length - 1;

              return (
                <article key={msg.id} className={isUser ? "flex justify-end" : "min-w-0"}>
                  <div className={isUser
                    ? "group relative max-w-[90%] sm:max-w-[82%] rounded-3xl bg-[var(--claude-sidebar)] px-4 py-3 text-sm leading-6"
                    : "group relative min-w-0 max-w-none text-[var(--claude-text)] text-[15px] leading-7"
                  }>
                    {isUser ? (
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    ) : (
                      <div
                        className="markdown-body"
                        dangerouslySetInnerHTML={renderMarkdown(msg.content)}
                      />
                    )}

                    {!isUser && msg.grounding && (
                      (msg.grounding.sources?.length || msg.grounding.queries?.length) ? (
                        <div className="mt-4 border-t border-[var(--claude-border)] pt-3 text-xs text-[var(--claude-text-muted)]">
                          {msg.grounding.queries?.length ? (
                            <p className="mb-2">Searched: {msg.grounding.queries.join(" · ")}</p>
                          ) : null}
                          {msg.grounding.sources?.length ? (
                            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                              {msg.grounding.sources.map((source, sourceIndex) => (
                                <a
                                  key={source.url || sourceIndex}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline decoration-[var(--claude-border)] underline-offset-4 hover:text-[var(--claude-accent)]"
                                  title={source.title}
                                >
                                  {source.title || source.domain || `Source ${sourceIndex + 1}`}
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null
                    )}

                    <div className="mt-2 flex min-h-7 items-center gap-2 text-[11px] text-[var(--claude-text-muted)]">
                      <time dateTime={new Date(msg.timestamp).toISOString()} className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </time>
                      <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.content, msg.id)}
                          aria-label={copiedId === msg.id ? "Copied message" : "Copy message"}
                          title={copiedId === msg.id ? "Copied" : "Copy"}
                          className="rounded-md px-2 py-1 hover:bg-[var(--claude-border-subtle)] hover:text-[var(--claude-text)] focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--claude-accent)]"
                        >
                          {copiedId === msg.id ? "Copied" : "Copy"}
                        </button>
                        {isLastModel && !isGenerating && (
                          <button
                            type="button"
                            onClick={onRegenerate}
                            className="rounded-md px-2 py-1 hover:bg-[var(--claude-border-subtle)] hover:text-[var(--claude-text)] focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--claude-accent)]"
                            title="Regenerate response"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {isGenerating && (
              <div className="py-1 text-sm text-[var(--claude-text-muted)]" role="status" aria-live="polite">
                Thinking…
              </div>
            )}

            {error && (
              <div className="flex flex-wrap items-center gap-3 border-t border-[var(--claude-border)] pt-3 text-sm text-rose-500" role="alert">
                <p className="min-w-0 flex-1">{error}</p>
                {onRetry && (
                  <button type="button" onClick={onRetry} className="underline underline-offset-4 hover:no-underline">
                    Retry
                  </button>
                )}
                {onDismissError && (
                  <button type="button" onClick={onDismissError} className="underline underline-offset-4 hover:no-underline">
                    Dismiss
                  </button>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
        {!isAtBottom && hasMessages && (
          <button
            type="button"
            onClick={() => {
              setIsAtBottom(true);
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
            }}
            className="sticky bottom-4 left-1/2 z-10 mx-auto -mt-12 flex items-center gap-2 rounded-full border border-[var(--claude-border)] bg-[var(--claude-surface)] px-3 py-2 text-xs text-[var(--claude-text)] shadow-lg hover:bg-[var(--claude-border-subtle)]"
            aria-label="Jump to latest message"
          >
            <AppIcon name="arrow-down" size={13} />
            Latest message
          </button>
        )}
      </div>
    </section>
  );
};
