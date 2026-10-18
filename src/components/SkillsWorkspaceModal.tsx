import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Input, Textarea, StatusText } from "./ui";
import { AppIcon } from "./AppIcon";

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  version: string;
  author: string;
  instructions: string;
  requiredCapabilities: string[];
  createdAt: number;
}

interface SkillsWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSkillIds: string[];
  onToggleSkillActivation: (id: string) => void;
}

export const SkillsWorkspaceModal: React.FC<SkillsWorkspaceModalProps> = ({
  isOpen,
  onClose,
  activeSkillIds,
  onToggleSkillActivation,
}) => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Skill>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSkills();
    }
  }, [isOpen]);

  const fetchSkills = async () => {
    try {
      const res = await fetch("/api/skills");
      if (res.ok) {
        const data = await res.json();
        setSkills(data);
        if (data.length > 0 && !selectedSkill) {
          setSelectedSkill(data[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load skills", e);
    }
  };

  const handleToggleEnable = async (skill: Skill, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/skills/${skill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !skill.enabled }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSkills((prev) => prev.map((s) => (s.id === skill.id ? updated : s)));
        if (selectedSkill?.id === skill.id) {
          setSelectedSkill(updated);
        }
      }
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this skill?")) return;
    try {
      const res = await fetch(`/api/skills/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSkills((prev) => prev.filter((s) => s.id !== id));
        if (selectedSkill?.id === id) {
          setSelectedSkill(null);
        }
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedSkill) return;
    try {
      const res = await fetch(`/api/skills/${selectedSkill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setSkills((prev) => prev.map((s) => (s.id === selectedSkill.id ? updated : s)));
        setSelectedSkill(updated);
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleCreate = async () => {
    if (!editForm.name || !editForm.description) return;
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          category: editForm.category || "custom",
          instructions: editForm.instructions || "",
          enabled: true,
          version: "1.0.0",
          author: "User",
          requiredCapabilities: [],
        }),
      });
      if (res.ok) {
        const newSkill = await res.json();
        setSkills((prev) => [newSkill, ...prev]);
        setSelectedSkill(newSkill);
        setIsCreating(false);
        setEditForm({});
      }
    } catch (err) {
      console.error("Create error:", err);
    }
  };

  const handleExportSkill = (skill: Skill) => {
    const safeName = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "skill";
    const content = [
      "---",
      `name: ${JSON.stringify(skill.name)}`,
      `description: ${JSON.stringify(skill.description)}`,
      `category: ${JSON.stringify(skill.category)}`,
      `version: ${JSON.stringify(skill.version)}`,
      "---",
      "",
      skill.instructions || "",
      "",
    ].join("\\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeName}.SKILL.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const readSkillField = (frontmatter: string, field: string) => {
    const match = frontmatter.match(new RegExp("^" + field + ":\\s*(.+)$", "m"));
    if (!match) return "";
    const value = match[1].trim();
    try {
      return JSON.parse(value);
    } catch {
      return value.replace(/^["']|["']$/g, "");
    }
  };

  const handleImportSkill = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setActionError(null);
    try {
      if (file.size > 1024 * 1024) throw new Error("Skill files must be 1 MB or smaller.");
      const text = await file.text();
      const frontmatterMatch = text.match(/^---\\s*\\r?\\n([\\s\\S]*?)\\r?\\n---\\s*(?:\\r?\\n|$)/);
      const frontmatter = frontmatterMatch?.[1] || "";
      const instructions = frontmatterMatch ? text.slice(frontmatterMatch[0].length).trim() : text.trim();
      const name = readSkillField(frontmatter, "name") || file.name.replace(/\\.skill\\.md$/i, "").replace(/\\.md$/i, "").replace(/[-_]/g, " ");
      const description = readSkillField(frontmatter, "description") || "Imported reusable instructions";
      if (!name.trim() || !instructions.trim()) {
        throw new Error("The SKILL.md file needs a name and instruction content.");
      }
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category: readSkillField(frontmatter, "category") || "imported",
          instructions,
          enabled: true,
          version: readSkillField(frontmatter, "version") || "1.0.0",
          author: "User",
          requiredCapabilities: [],
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result?.error || "Couldn't import this skill.");
      setSkills((prev) => [result, ...prev]);
      setSelectedSkill(result);
      setIsCreating(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Couldn't import this skill.");
    }
  };

  const handleDuplicateSkill = async (skill: Skill) => {
    setActionError(null);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${skill.name} (copy)`,
          description: skill.description,
          category: skill.category,
          instructions: skill.instructions,
          enabled: true,
          version: skill.version,
          author: "User",
          requiredCapabilities: skill.requiredCapabilities || [],
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result?.error || "Couldn't duplicate this skill.");
      setSkills((prev) => [result, ...prev]);
      setSelectedSkill(result);
      setIsCreating(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Couldn't duplicate this skill.");
    }
  };

  const filtered = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reusable Skills System"
      description="Inspect, activate, and manage portable SKILL.md instruction packages"
      icon={<AppIcon name="skills" size={18} />}
      maxWidth="3xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {actionError && (
        <div role="alert" className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-500">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} aria-label="Dismiss skill error">×</button>
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-5 h-[520px]">
        {/* Left: Skills List */}
        <div className="w-full md:w-72 flex flex-col border border-[var(--claude-border)] rounded-xl bg-[var(--claude-bg)] overflow-hidden shrink-0">
          <input
            ref={importInputRef}
            type="file"
            accept=".md,.skill.md,text/markdown,text/plain"
            className="hidden"
            onChange={handleImportSkill}
            aria-label="Import SKILL.md"
          />
          <div className="p-3 border-b border-[var(--claude-border)] flex items-center justify-between gap-2">
            <Input
              placeholder="Filter skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<AppIcon name="search" size={13} />}
            />
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="sm"
                variant="secondary"
                icon={<AppIcon name="upload" size={14} />}
                onClick={() => importInputRef.current?.click()}
                title="Import SKILL.md"
              >
                Import
              </Button>
              <Button
                size="sm"
                variant="primary"
                icon={<AppIcon name="plus" size={14} />}
                onClick={() => {
                  setActionError(null);
                  setIsCreating(true);
                  setIsEditing(false);
                  setEditForm({ category: "custom", enabled: true });
                }}
                title="Create New Skill"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-[var(--claude-text-muted)] text-xs">
                No matching skills found.
              </div>
            ) : (
              filtered.map((skill) => {
                const isSelected = selectedSkill?.id === skill.id && !isCreating;
                const isActive = activeSkillIds.includes(skill.id);
                return (
                  <div
                    key={skill.id}
                    onClick={() => {
                      setSelectedSkill(skill);
                      setIsCreating(false);
                      setIsEditing(false);
                    }}
                    className={`p-2.5 rounded-xl cursor-pointer text-xs transition-colors flex flex-col gap-1 ${
                      isSelected
                        ? "bg-[var(--claude-border)]/60 text-[var(--claude-text)] font-semibold shadow-xs"
                        : "hover:bg-[var(--claude-border-subtle)] text-[var(--claude-text-secondary)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs">{skill.name}</span>
                      <StatusText
                        status={isActive ? "active" : skill.enabled ? "neutral" : "inactive"}
                        label={isActive ? "Active" : skill.enabled ? "Ready" : "Disabled"}
                        showDot={true}
                      />
                    </div>
                    <p className="text-[11px] text-[var(--claude-text-muted)] truncate font-normal">
                      {skill.description}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Skill Detail or Create/Edit Form */}
        <div className="flex-1 flex flex-col border border-[var(--claude-border)] rounded-xl bg-[var(--claude-bg)] p-4 overflow-y-auto custom-scrollbar">
          {isCreating ? (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-[var(--claude-text)]">
                Create New Skill
              </h3>
              <Input
                label="Skill Name"
                placeholder="e.g., SQL Optimizer"
                value={editForm.name || ""}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              <Input
                label="Category"
                placeholder="e.g., engineering, productivity"
                value={editForm.category || ""}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              />
              <Input
                label="Description"
                placeholder="Brief summary of when to invoke this skill"
                value={editForm.description || ""}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
              <Textarea
                label="Instruction Content (SKILL.md)"
                rows={8}
                placeholder="Specific rules, examples, or output schemas..."
                value={editForm.instructions || ""}
                onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })}
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="quiet" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleCreate}>
                  Create Skill
                </Button>
              </div>
            </div>
          ) : selectedSkill ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--claude-border)]">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--claude-text)]">
                    {selectedSkill.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--claude-text-muted)] font-mono mt-0.5">
                    <span>{selectedSkill.category}</span>
                    <span>·</span>
                    <span>v{selectedSkill.version}</span>
                    <span>·</span>
                    <span>by {selectedSkill.author}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="quiet"
                    onClick={() => handleExportSkill(selectedSkill)}
                    title="Export portable SKILL.md"
                  >
                    Export
                  </Button>
                  <Button
                    size="sm"
                    variant="quiet"
                    onClick={() => handleDuplicateSkill(selectedSkill)}
                    title="Create a copy of this skill"
                  >
                    Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant={activeSkillIds.includes(selectedSkill.id) ? "primary" : "secondary"}
                    onClick={() => onToggleSkillActivation(selectedSkill.id)}
                  >
                    {activeSkillIds.includes(selectedSkill.id) ? "Active in Chat" : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="quiet"
                    onClick={(e) => handleToggleEnable(selectedSkill, e)}
                  >
                    {selectedSkill.enabled ? "Disable" : "Enable"}
                  </Button>
                  {selectedSkill.author === "User" && (
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<AppIcon name="trash" size={13} />}
                      onClick={(e) => handleDelete(selectedSkill.id, e)}
                    />
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[var(--claude-text-secondary)] mb-1">
                  Description
                </h4>
                <p className="text-xs text-[var(--claude-text)] leading-relaxed">
                  {selectedSkill.description}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[var(--claude-text-secondary)] mb-1.5">
                  Instruction Package (SKILL.md)
                </h4>
                <div className="p-3.5 rounded-xl bg-[var(--claude-surface)] border border-[var(--claude-border)] font-mono text-[11px] text-[var(--claude-text)] whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto custom-scrollbar">
                  {selectedSkill.instructions || "No custom instructions defined."}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[var(--claude-text-muted)]">
              Select a skill to inspect or activate.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
