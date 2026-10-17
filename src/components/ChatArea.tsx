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

  const quickPrompts = [
    {
      title: "Write React Component",
      prompt: "Write a modern, accessible Tailwind modal component in React TypeScript.",
    },
    {
      title: "Summarize Complex Topic",
      prompt: "Explain how large language models use self-attention mechanisms in simple terms.",
    },
    {
      title: "Brainstorm Product Ideas",
      prompt: "Give me 5 innovative SaaS product ideas powered by AI for developers.",
    },
    {
      title: "Debug Python Code",
      prompt: "How do I fix asynchronous concurrency deadlocks in Python asyncio?",
    },
  ];

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
          <div className="max-w-2xl mx-auto h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--claude-accent)] flex items-center justify-center text-white shadow-xs mb-4">
              <AppIcon name="sparkles" size={22} />
            </div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight mb-2">
              How can I assist your work today?
            </h3>
            <p className="text-xs text-[var(--claude-text-muted)] max-w-md mb-8 leading-relaxed">
              Powered by Gemini, persistent cross-session memory, and the regal Dragon Queen persona.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {quickPrompts.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(item.prompt)}
                  className="flex flex-col text-left p-3.5 rounded-xl bg-[var(--claude-surface)] border border-[var(--claude-border)] hover:border-[var(--claude-accent)] transition-all group shadow-2xs"
                >
                  <span className="font-semibold text-xs text-[var(--claude-text)] group-hover:text-[var(--claude-accent)] transition-colors mb-1">
                    {item.title}
                  </span>
                  <span className="text-[11px] text-[var(--claude-text-muted)] line-clamp-2 leading-relaxed">
                    {item.prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-7 pb-8">
            {conversation.messages.map((msg, index) => {
              const isUser = msg.role === "user";
              const isLastModel = !isUser && index === conversation.messages.length - 1;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 sm:gap-4 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-[var(--claude-accent)] flex items-center justify-center text-white shrink-0 mt-1 shadow-xs">
                      <AppIcon name="sparkles" size={14} />
                    </div>
                  )}

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
                      <div className="mt-3 pt-2.5 border-t border-[var(--claude-border)]/60 space-y-2">
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
                              <AppIcon name="globe" size={12} className="text-[var(--claude-accent)]" />
                              Sources:
                            </span>
                            {msg.grounding.sources.map((src, i) => (
                              <a
                                key={i}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--claude-surface)] border border-[var(--claude-border)] hover:border-[var(--claude-accent)] hover:text-[var(--claude-accent)] text-[11px] text-[var(--claude-text-secondary)] transition-colors group/link"
                                title={src.title}
                              >
                                <span className="font-semibold text-[10px] text-[var(--claude-accent)]">
                                  {i + 1}
                                </span>
                                <span className="truncate max-w-[130px] sm:max-w-[180px]">
                                  {src.title || src.domain}
                                </span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message Actions */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--claude-border)]/50 text-[var(--claude-text-muted)] text-[10px]">
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="quiet"
                          icon={<AppIcon name={copiedId === msg.id ? "check" : "copy"} size={13} />}
                          onClick={() => handleCopy(msg.content, msg.id)}
                          title="Copy text"
                        />

                        {isLastModel && !isGenerating && (
                          <Button
                            size="sm"
                            variant="quiet"
                            icon={<AppIcon name="regenerate" size={13} />}
                            onClick={onRegenerate}
                            title="Regenerate"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-lg bg-[var(--claude-border)] flex items-center justify-center text-[var(--claude-text)] shrink-0 mt-1">
                      <AppIcon name="user" size={14} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Generating State */}
            {isGenerating && (
              <div className="flex gap-4 items-center text-xs text-[var(--claude-text-muted)]">
                <div className="w-7 h-7 rounded-lg bg-[var(--claude-accent)] flex items-center justify-center text-white shrink-0">
                  <AppIcon name="sparkles" size={14} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--claude-accent)] animate-pulse" />
                  <span>OmniMind is formulating a response...</span>
                </div>
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
