import React, { useEffect, useRef, useState } from "react";
import { ConversationSummary } from "../types";
import { Button, Input } from "./ui";
import { AppIcon } from "./AppIcon";

interface SidebarProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onOpenSettings: () => void;
  onOpenMemory: () => void;
}

interface ConversationSearchResult extends ConversationSummary {
  snippet: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onRename,
  onTogglePin,
  isOpen,
  setIsOpen,
  onOpenSettings,
  onOpenMemory,
}) => {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ConversationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    const query = search.trim();
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(false);
      return;
    }

    let cancelled = false;
    setSearchResults([]);
    setIsSearching(true);
    setSearchError(false);
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search/conversations?q=${encodeURIComponent(query)}`
        );
        if (!response.ok) throw new Error("Conversation search failed");
        const results = await response.json();
        if (!cancelled) setSearchResults(results);
      } catch (error) {
        if (!cancelled) {
          setSearchResults([]);
          setSearchError(true);
        }
        console.error("Failed to search conversations:", error);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [search]);

  const filtered = search.trim() ? searchResults : conversations;

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }

      if (event.key === "Escape" && document.activeElement === searchInputRef.current) {
        if (search) {
          setSearch("");
          setHighlightedIndex(-1);
        } else {
          searchInputRef.current?.blur();
        }
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [search]);

  const selectConversation = (id: string) => {
    onSelect(id);
    setHighlightedIndex(-1);
    if (window.innerWidth < 768) setIsOpen(false);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && filtered.length > 0) {
      event.preventDefault();
      setHighlightedIndex((current) => current < filtered.length - 1 ? current + 1 : 0);
    } else if (event.key === "ArrowUp" && filtered.length > 0) {
      event.preventDefault();
      setHighlightedIndex((current) => current > 0 ? current - 1 : filtered.length - 1);
    } else if (event.key === "Enter" && highlightedIndex >= 0 && filtered[highlightedIndex]) {
      event.preventDefault();
      selectConversation(filtered[highlightedIndex].id);
    }
  };

  const startRename = (c: ConversationSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const saveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this conversation?")) {
      onDelete(id);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-[var(--claude-sidebar)] border-r border-[var(--claude-border)] flex flex-col
        transition-transform duration-200 ease-in-out text-[var(--claude-text)]
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-r-0"}
      `}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-[var(--claude-border)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-7 h-7 rounded-lg bg-[var(--claude-accent)] flex items-center justify-center text-white shadow-xs">
              <AppIcon name="sparkles" size={14} />
            </div>
            <div>
              <h1 className="font-semibold text-xs tracking-tight">OmniMind AI</h1>
              <p className="text-[10px] text-[var(--claude-text-muted)] font-mono">
                Persona &amp; Knowledge
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="quiet"
            icon={<AppIcon name="close" size={14} />}
            onClick={() => setIsOpen(false)}
            className="md:hidden"
            title="Close Sidebar"
          />
        </div>

        {/* New Chat */}
        <div className="p-3">
          <Button
            variant="primary"
            className="w-full"
            icon={<AppIcon name="plus" size={14} />}
            onClick={onNewChat}
          >
            New Chat
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <Input
            ref={searchInputRef}
            placeholder="Search chats... (Ctrl K)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setHighlightedIndex(-1);
            }}
            onKeyDown={handleSearchKeyDown}
            icon={<AppIcon name="search" size={13} />}
          />
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-[var(--claude-text-muted)] text-xs px-4">
              {isSearching
                ? "Searching conversations..."
                : searchError
                  ? "Search failed. Check your connection and try again."
                  : search
                    ? "No matching conversations"
                    : "No recent conversations."}
            </div>
          ) : (
            filtered.map((c) => {
              const isActive = c.id === activeId;
              const isEditing = editingId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`
                    group relative flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs transition-colors
                    ${
                      isActive
                        ? "bg-[var(--claude-border)]/40 text-[var(--claude-text)] font-semibold"
                        : filtered[highlightedIndex]?.id === c.id
                          ? "bg-[var(--claude-border)]/30 text-[var(--claude-text)] ring-1 ring-[var(--claude-accent)]/40"
                          : "text-[var(--claude-text-secondary)] hover:bg-[var(--claude-border)]/30 hover:text-[var(--claude-text)]"
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <AppIcon
                      name="message"
                      size={14}
                      className={isActive ? "text-[var(--claude-accent)] shrink-0" : "text-[var(--claude-text-muted)] shrink-0"}
                    />

                    {isEditing ? (
                      <div
                        className="flex items-center gap-1 flex-1 pr-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          autoFocus
                          className="w-full bg-[var(--claude-bg)] border border-[var(--claude-accent)] rounded-lg px-1.5 py-0.5 text-xs text-[var(--claude-text)] outline-hidden"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRename(c.id, e as any);
                            if (e.key === "Escape") cancelRename(e as any);
                          }}
                        />
                        <button
                          onClick={(e) => saveRename(c.id, e)}
                          className="p-0.5 text-emerald-600 hover:text-emerald-500"
                        >
                          <AppIcon name="check" size={13} />
                        </button>
                        <button
                          onClick={cancelRename}
                          className="p-0.5 text-[var(--claude-text-muted)]"
                        >
                          <AppIcon name="close" size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{c.title}</span>
                        {search.trim() && "snippet" in c && typeof c.snippet === "string" && (
                          <span className="mt-0.5 block truncate text-[10px] font-normal text-[var(--claude-text-muted)]">
                            {c.snippet}
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(c.id, !Boolean(c.pinned));
                        }}
                        className="p-1 text-[var(--claude-text-muted)] hover:text-[var(--claude-text)] rounded-lg hover:bg-[var(--claude-border)] text-[10px]"
                        title={c.pinned ? "Unpin conversation" : "Pin conversation"}
                        aria-label={c.pinned ? "Unpin conversation" : "Pin conversation"}
                      >
                        {c.pinned ? "Unpin" : "Pin"}
                      </button>
                      <button
                        onClick={(e) => startRename(c, e)}
                        className="p-1 text-[var(--claude-text-muted)] hover:text-[var(--claude-text)] rounded-lg hover:bg-[var(--claude-border)]"
                        title="Rename"
                      >
                        <AppIcon name="edit" size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(c.id, e)}
                        className="p-1 text-[var(--claude-text-muted)] hover:text-rose-500 rounded-lg hover:bg-[var(--claude-border)]"
                        title="Delete"
                      >
                        <AppIcon name="trash" size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-[var(--claude-border)] space-y-1 shrink-0">
          <Button
            variant="quiet"
            className="w-full justify-start text-xs"
            icon={<AppIcon name="brain" size={15} className="text-[var(--claude-accent)]" />}
            onClick={onOpenMemory}
          >
            Persistent Memory
          </Button>

          <Button
            variant="quiet"
            className="w-full justify-start text-xs"
            icon={<AppIcon name="settings" size={15} />}
            onClick={onOpenSettings}
          >
            Settings &amp; Persona
          </Button>
        </div>
      </aside>
    </>
  );
};
