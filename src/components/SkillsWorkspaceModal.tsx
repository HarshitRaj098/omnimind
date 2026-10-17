import React, { useState, useEffect } from "react";
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
      <div className="flex flex-col md:flex-row gap-5 h-[520px]">
        {/* Left: Skills List */}
        <div className="w-full md:w-72 flex flex-col border border-[var(--claude-border)] rounded-xl bg-[var(--claude-bg)] overflow-hidden shrink-0">
          <div className="p-3 border-b border-[var(--claude-border)] flex items-center justify-between gap-2">
            <Input
              placeholder="Filter skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<AppIcon name="search" size={13} />}
            />
            <Button
              size="sm"
              variant="primary"
              icon={<AppIcon name="plus" size={14} />}
              onClick={() => {
                setIsCreating(true);
                setIsEditing(false);
                setEditForm({ category: "custom", enabled: true });
              }}
              title="Create New Skill"
            />
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
