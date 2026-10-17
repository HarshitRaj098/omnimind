import React, { useState } from "react";
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
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onOpenSettings: () => void;
  onOpenMemory: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onRename,
  isOpen,
  setIsOpen,
  onOpenSettings,
  onOpenMemory,
}) => {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="px-1 font-semibold text-sm tracking-tight">OmniMind</h1>
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
            onClick={onNewChat}
          >
            New Chat
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <Input
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<AppIcon name="search" size={13} />}
          />
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-[var(--claude-text-muted)] text-xs px-4">
              {search ? "No matching conversations" : "No recent conversations."}
            </div>
          ) : (
            filtered.map((c) => {
              const isActive = c.id === activeId;
              const isEditing = editingId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelect(c.id);
                    if (window.innerWidth < 768) setIsOpen(false);
                  }}
                  className={`
                    group relative flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs transition-colors
                    ${
                      isActive
                        ? "bg-[var(--claude-border)]/40 text-[var(--claude-text)] font-semibold"
                        : "text-[var(--claude-text-secondary)] hover:bg-[var(--claude-border)]/30 hover:text-[var(--claude-text)]"
                    }
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
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
                      <span className="truncate flex-1">{c.title}</span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="hidden group-hover:flex group-focus-within:flex items-center gap-1 shrink-0 ml-2">
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
            onClick={onOpenMemory}
          >
            Persistent Memory
          </Button>

          <Button
            variant="quiet"
            className="w-full justify-start text-xs"
            onClick={onOpenSettings}
          >
            Settings &amp; Persona
          </Button>
        </div>
      </aside>
    </>
  );
};
