import React, { useState, useEffect } from "react";
import { Button, StatusText } from "./ui";
import { AppIcon } from "./AppIcon";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface SharedConversationViewProps {
  shareId: string;
  onBackToApp: () => void;
}

export const SharedConversationView: React.FC<SharedConversationViewProps> = ({
  shareId,
  onBackToApp,
}) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/share/${shareId}`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Shared conversation not found or link has expired");
        }
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [shareId]);

  const renderMarkdown = (content: string) => {
    try {
      const rawHtml = marked.parse(content || "");
      return { __html: DOMPurify.sanitize(rawHtml as string) };
    } catch {
      return { __html: content };
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--claude-bg)] text-[var(--claude-text-muted)] text-xs font-mono">
        Loading conversation snapshot...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[var(--claude-bg)] text-[var(--claude-text)] p-4">
        <div className="bg-[var(--claude-surface)] border border-[var(--claude-border)] rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-[var(--claude-border-subtle)] text-[var(--claude-accent)] flex items-center justify-center mx-auto">
            <AppIcon name="lock" size={24} />
          </div>
          <h2 className="text-base font-semibold tracking-tight">Access Restricted or Revoked</h2>
          <p className="text-xs text-[var(--claude-text-muted)] leading-relaxed">{error}</p>
          <Button variant="primary" onClick={onBackToApp} className="w-full">
            Open OmniMind AI
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[var(--claude-bg)] text-[var(--claude-text)] overflow-hidden font-sans">
      {/* Header */}
      <header className="h-14 border-b border-[var(--claude-border)] bg-[var(--claude-surface)]/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            icon={<AppIcon name="arrow-left" size={14} />}
            onClick={onBackToApp}
          >
            Open Assistant
          </Button>
          <div className="h-4 w-px bg-[var(--claude-border)] hidden sm:block" />
          <h1 className="text-xs font-semibold truncate max-w-sm sm:max-w-md">
            {data.conversation.title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <StatusText status="active" label="Read-Only Snapshot" />
        </div>
      </header>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="p-4 rounded-xl bg-[var(--claude-surface)] border border-[var(--claude-border)] flex items-center justify-between text-xs text-[var(--claude-text-muted)]">
            <span>Model: {data.conversation.model || "Gemini"}</span>
            <span>Created: {new Date(data.sharedAt).toLocaleDateString()}</span>
          </div>

          {data.conversation.messages.map((m: any) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex gap-3 sm:gap-4 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-[var(--claude-accent)] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <AppIcon name="sparkles" size={16} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed border ${
                    isUser
                      ? "bg-[var(--claude-surface)] border-[var(--claude-border)] text-[var(--claude-text)]"
                      : "bg-[var(--claude-surface)] border-[var(--claude-border)] text-[var(--claude-text)] shadow-xs"
                  }`}
                >
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none break-words"
                    dangerouslySetInnerHTML={renderMarkdown(m.content)}
                  />
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-[var(--claude-border-subtle)] text-[var(--claude-text-secondary)] flex items-center justify-center shrink-0">
                    <AppIcon name="user" size={16} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
