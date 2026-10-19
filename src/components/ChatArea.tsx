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
  onOpenTasks: () => void;
  onOpenMemory: () => void;
  onResolveAction: (actionId: string, confirm: boolean) => void;
  onDeleteConversation?: (id: string) => Promise<boolean> | void;
  onDeleteMessage?: (messageId: string) => Promise<boolean> | void;
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
  onOpenApps,
  onOpenTasks,
  onResolveAction,
  onDeleteConversation,
  onDeleteMessage,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [confirmDeleteHeader, setConfirmDeleteHeader] = useState(false);
  const [isDeletingHeader, setIsDeletingHeader] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

  useEffect(() => {
    setConfirmDeleteHeader(false);
  }, [conversation?.id]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setIsAtBottom(
      container.scrollHeight - container.scrollTop - container.clientHeight < 96
    );
  };

  useEffect(() => {
    if (isAtBottom) {
      // Smooth scrolling on every streamed token repeatedly restarts the animation
      // and makes long responses feel laggy. Keep streaming scrolls immediate.
      messagesEndRef.current?.scrollIntoView({
        behavior: isGenerating ? "auto" : "smooth",
        block: "end",
      });
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

  // Cache sanitized Markdown by source text so a new streamed token does not
  // force every unchanged historical message through marked + DOMPurify again.
  const markdownCacheRef = useRef<Map<string, string>>(new Map());

  const renderMarkdown = (content: string) => {
    const cache = markdownCacheRef.current;
    const cached = cache.get(content);
    if (cached !== undefined) {
      // Refresh insertion order for a small LRU cache.
      cache.delete(content);
      cache.set(content, cached);
      return { __html: cached };
    }

    let html: string;
    try {
      html = DOMPurify.sanitize(marked.parse(content || "") as string);
    } catch {
      html = DOMPurify.sanitize(content || "");
    }

    cache.set(content, html);
    if (cache.size > 100) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
    return { __html: html };
  };

  const hasMessages = Boolean(conversation?.messages.length);

  const handleExportConversation = () => {
    if (!conversation?.messages.length) return;

    const escapeMarkdown = (value: string) =>
      value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

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
    ].join("\n");

    const blob = new Blob([transcript], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeTitle = (conversation.title || "omnimind-conversation")
      .replace(/[^a-z0-9-_ ]/gi, "")
      .trim()
      .replace(/\s+/g, "-")
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
        <Button
          size="sm"
          variant="quiet"
          className="!px-2"
          icon={<AppIcon name="apps" size={15} />}
          onClick={onOpenApps}
          aria-label="Open connected apps"
          title="Connected apps"
        />
        <Button
          size="sm"
          variant="quiet"
          className="!px-2"
          icon={<AppIcon name="calendar" size={15} />}
          onClick={onOpenTasks}
          aria-label="Open scheduled tasks"
          title="Scheduled tasks"
        />
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
        {conversation?.id && onDeleteConversation && (
          confirmDeleteHeader ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[var(--claude-surface)] border border-rose-500/40 shadow-xs">
              <span className="text-xs text-rose-500 font-semibold">Delete chat?</span>
              <button
                type="button"
                disabled={isDeletingHeader}
                onClick={async () => {
                  setIsDeletingHeader(true);
                  try {
                    await onDeleteConversation(conversation.id);
                  } finally {
                    setIsDeletingHeader(false);
                    setConfirmDeleteHeader(false);
                  }
                }}
                className="px-2 py-0.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded transition-colors"
                aria-label="Confirm delete chat"
              >
                {isDeletingHeader ? "..." : "Delete"}
              </button>
              <button
                type="button"
                disabled={isDeletingHeader}
                onClick={() => setConfirmDeleteHeader(false)}
                className="px-1.5 py-0.5 text-xs text-[var(--claude-text-muted)] hover:text-[var(--claude-text)] bg-[var(--claude-border)] rounded transition-colors"
                aria-label="Cancel"
              >
                Cancel
              </button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="quiet"
              icon={<AppIcon name="trash" size={14} className="text-[var(--claude-text-muted)] hover:text-rose-500" />}
              onClick={() => setConfirmDeleteHeader(true)}
              aria-label="Delete this conversation"
              title="Delete this conversation"
            >
              Delete
            </Button>
          )
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
            <div className="mt-7 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Prompt starters">
              {[
                { title: "Learn something", prompt: "Explain a difficult topic to me from first principles, with a simple example." },
                { title: "Write or improve", prompt: "Help me write something clear and polished. Ask what I need if necessary." },
                { title: "Debug my code", prompt: "Help me debug my code. Start by identifying likely causes, then suggest a minimal fix." },
                { title: "Plan a project", prompt: "Help me turn a project idea into a practical plan with milestones and next actions." },
              ].map((starter) => (
                <button
                  key={starter.title}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => onSendMessage(starter.prompt)}
                  className="rounded-xl border border-[var(--claude-border)] bg-[var(--claude-surface)] px-4 py-3 text-left text-sm text-[var(--claude-text-secondary)] transition-colors hover:border-[var(--claude-accent)] hover:text-[var(--claude-text)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="block font-medium text-[var(--claude-text)]">{starter.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--claude-text-muted)]">{starter.prompt}</span>
                </button>
              ))}
            </div>
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

                    {!isUser && msg.pendingActions?.map((action) => (
                      <section key={action.id} className="mt-4 rounded-xl border border-[var(--claude-border)] bg-[var(--claude-surface)] p-4" aria-label="Action confirmation">
                        <div className="flex items-start gap-3">
                          <AppIcon name="shield" size={18} />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold">{action.summary}</h3>
                            <p className="mt-1 text-xs leading-5 text-[var(--claude-text-muted)] whitespace-pre-wrap break-words">{action.details}</p>
                            {action.status === "pending" ? (
                              <>
                                <p className="mt-3 text-xs font-medium">Nothing has happened yet. Confirm only if these details are correct.</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Button size="sm" onClick={() => onResolveAction(action.id, true)}>Confirm and execute</Button>
                                  <Button size="sm" variant="quiet" onClick={() => onResolveAction(action.id, false)}>Cancel</Button>
                                </div>
                              </>
                            ) : (
                              <p className="mt-3 text-xs font-medium" role="status">
                                {action.status === "confirmed" ? "Action completed after confirmation." : action.status === "cancelled" ? "Cancelled. No external changes were made." : "Action failed. Check the error and connected-app permissions."}
                              </p>
                            )}
                            {action.result && action.status !== "pending" && <p className="mt-2 text-xs text-[var(--claude-text-muted)] break-words">{action.result}</p>}
                          </div>
                        </div>
                      </section>
                    ))}

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
                        {onDeleteMessage && (
                          <button
                            type="button"
                            disabled={deletingMessageId === msg.id}
                            onClick={async () => {
                              setDeletingMessageId(msg.id);
                              try {
                                await onDeleteMessage(msg.id);
                              } finally {
                                setDeletingMessageId(null);
                              }
                            }}
                            className="rounded-md px-1.5 py-1 text-[var(--claude-text-muted)] hover:bg-[var(--claude-border-subtle)] hover:text-rose-500 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--claude-accent)]"
                            title="Delete message"
                            aria-label="Delete message"
                          >
                            <AppIcon name="trash" size={13} />
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
            <AppIcon name="chevron-down" size={13} />
            Latest message
          </button>
        )}
      </div>
    </section>
  );
};
