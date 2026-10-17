import React, { useState, useEffect } from "react";
import { Modal, Button, Input, Textarea, StatusText, Tabs } from "./ui";
import { AppIcon } from "./AppIcon";
import { Memory, MemoryCategory, MemorySettings } from "../types";

interface MemoryWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MemoryWorkspaceModal: React.FC<MemoryWorkspaceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [settings, setSettings] = useState<MemorySettings>({
    enabled: true,
    autoSuggest: true,
    requireConsent: false,
  });
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<MemoryCategory>("preference");
  const [newTags, setNewTags] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMemories();
      fetchSettings();
    }
  }, [isOpen]);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/memories");
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (e) {
      console.error("Failed to load memories:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/memories/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error("Failed to load memory settings:", e);
    }
  };

  const handleToggleAutoSuggest = async () => {
    const updated = { ...settings, autoSuggest: !settings.autoSuggest };
    setSettings(updated);
    try {
      await fetch("/api/memories/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      showFeedback(`Auto-suggest ${updated.autoSuggest ? "enabled" : "disabled"}`);
    } catch (e) {
      console.error("Failed to save memory settings:", e);
    }
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      const tagsArray = newTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newContent.trim(),
          category: newCategory,
          tags: tagsArray,
          confidence: 1.0,
          sourceType: "manual",
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setMemories((prev) => [created, ...prev]);
        setNewContent("");
        setNewTags("");
        setIsCreating(false);
        showFeedback("Memory stored persistently");
      }
    } catch (err) {
      console.error("Failed to store memory:", err);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMemories((prev) => prev.map((m) => (m.id === id ? updated : m)));
        setEditingId(null);
        showFeedback("Memory updated");
      }
    } catch (err) {
      console.error("Failed to update memory:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/memories/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
        showFeedback("Memory removed");
      }
    } catch (err) {
      console.error("Failed to delete memory:", err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Clear all stored memories? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/memories/clear", { method: "POST" });
      if (res.ok) {
        setMemories([]);
        showFeedback("All memories cleared");
      }
    } catch (err) {
      console.error("Failed to clear memories:", err);
    }
  };

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const filteredMemories = memories.filter((m) => {
    const matchesCategory = categoryFilter === "all" || m.category === categoryFilter;
    const matchesSearch =
      !search.trim() ||
      m.content.toLowerCase().includes(search.toLowerCase()) ||
      (m.tags && m.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Persistent Personal Memory"
      description="Verified database memories recalled across chats and sessions"
      icon={<AppIcon name="brain" size={18} />}
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          {memories.length > 0 && (
            <Button size="sm" variant="danger" onClick={handleClearAll}>
              Clear All Memories
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} className="ml-auto">
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {feedback && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-2">
            <AppIcon name="check" size={14} />
            <span>{feedback}</span>
          </div>
        )}

        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Input
              placeholder="Search memories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<AppIcon name="search" size={14} />}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={settings.autoSuggest ? "secondary" : "quiet"}
              onClick={handleToggleAutoSuggest}
            >
              Auto-Suggest: {settings.autoSuggest ? "ON" : "OFF"}
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<AppIcon name="plus" size={14} />}
              onClick={() => setIsCreating(true)}
            >
              Add Memory
            </Button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <Tabs
          options={[
            { id: "all", label: "All", count: memories.length },
            { id: "preference", label: "Preferences" },
            { id: "project", label: "Projects" },
            { id: "instruction", label: "Instructions" },
            { id: "context", label: "Context" },
          ]}
          activeId={categoryFilter}
          onChange={setCategoryFilter}
          variant="segmented"
        />

        {/* Create Memory Form Drawer */}
        {isCreating && (
          <form
            onSubmit={handleCreateMemory}
            className="p-4 rounded-xl border border-[var(--claude-border)] bg-[var(--claude-bg)] space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--claude-text)]">
                Record New Memory
              </span>
              <Button size="sm" variant="quiet" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                className="bg-[var(--claude-surface)] border border-[var(--claude-border)] rounded-xl px-3 py-2 text-xs text-[var(--claude-text)] focus:border-[var(--claude-accent)] outline-hidden"
              >
                <option value="preference">User Preference</option>
                <option value="project">Ongoing Project</option>
                <option value="instruction">Explicit Instruction</option>
                <option value="context">Background Context</option>
              </select>

              <Input
                placeholder="Tags (comma separated, e.g. react, design)"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
              />
            </div>

            <Textarea
              rows={2}
              placeholder="What should OmniMind remember across sessions? (e.g., Always use TypeScript, concise summaries)"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <Button size="sm" variant="primary" type="submit" disabled={!newContent.trim()}>
                Save Memory
              </Button>
            </div>
          </form>
        )}

        {/* Memories List */}
        <div className="space-y-2.5">
          {loading ? (
            <div className="text-center py-12 text-xs text-[var(--claude-text-muted)] font-mono">
              Loading memories...
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[var(--claude-border)] rounded-xl text-xs text-[var(--claude-text-muted)]">
              No memories recorded in this category. Say "Remember that..." in chat or click "Add Memory" above.
            </div>
          ) : (
            filteredMemories.map((mem) => (
              <div
                key={mem.id}
                className="p-3.5 rounded-xl border border-[var(--claude-border)] bg-[var(--claude-bg)] flex flex-col gap-2 transition-colors hover:border-[var(--claude-border-subtle)] group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-[var(--claude-text-muted)]">
                    <span className="font-mono capitalize text-[var(--claude-accent)] font-medium">
                      {mem.category}
                    </span>
                    <span>·</span>
                    <span className="font-mono text-[11px]">
                      {new Date(mem.updatedAt).toLocaleDateString()}
                    </span>
                    {mem.sourceType === "explicit" && (
                      <>
                        <span>·</span>
                        <StatusText status="active" label="Explicit" showDot={false} />
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="quiet"
                      icon={<AppIcon name="edit" size={13} />}
                      onClick={() => {
                        setEditingId(mem.id);
                        setEditContent(mem.content);
                      }}
                      title="Edit"
                    />
                    <Button
                      size="sm"
                      variant="quiet"
                      icon={<AppIcon name="trash" size={13} />}
                      onClick={() => handleDelete(mem.id)}
                      title="Delete"
                    />
                  </div>
                </div>

                {editingId === mem.id ? (
                  <div className="space-y-2 pt-1">
                    <Textarea
                      rows={2}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="quiet" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" variant="primary" onClick={() => handleSaveEdit(mem.id)}>
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--claude-text)] leading-relaxed">
                    {mem.content}
                  </p>
                )}

                {mem.tags && mem.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--claude-text-muted)] font-mono">
                    {mem.tags.map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
