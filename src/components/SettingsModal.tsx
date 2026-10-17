import React, { useState, useEffect } from "react";
import { Modal, Button, Textarea, StatusText } from "./ui";
import { AppIcon } from "./AppIcon";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    model: string;
    temperature: number;
    systemInstruction: string;
    defaultPersona: string;
    customPersonaInstructions?: string;
    activeMode: "normal" | "dragon" | "quiet" | "affectionate";
    theme: string;
  };
  onSave: (settings: any) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [formData, setFormData] = useState(settings);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    setFormData(settings);
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setHasApiKey(data.hasApiKey))
      .catch(() => setHasApiKey(false));
  }, [settings, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const personaOptions = [
    {
      id: "dragon_queen",
      name: "Dragon Queen (Default)",
      desc: "Regal presence, strategic intelligence, fierce confidence, and warm playful loyalty.",
    },
    {
      id: "default_assistant",
      name: "Default Assistant",
      desc: "Neutral, composed, and balanced general AI partner.",
    },
    {
      id: "dark",
      name: "Dark",
      desc: "Irreverent, mischievous, and sharp dry humor.",
    },
    {
      id: "sarcastic",
      name: "Sarcastic",
      desc: "Witty, ironic observations paired with high technical precision.",
    },
    {
      id: "brutally_direct",
      name: "Brutally Direct",
      desc: "Concise, candid, and critical. Cuts through fluff with zero flattery.",
    },
    {
      id: "philosophical",
      name: "Philosophical",
      desc: "Reflective, analytical exploration from first principles.",
    },
    {
      id: "playful",
      name: "Playful",
      desc: "Lively, energetic, witty, and optimistic tone.",
    },
    {
      id: "custom",
      name: "Custom",
      desc: "User-defined persona guidelines and behavioral nuances.",
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assistant Settings & Persona"
      description="Configure behavioral identity, inference parameters, and system guidelines"
      icon={<AppIcon name="crown" size={18} />}
      maxWidth="lg"
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Save Changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Persona Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--claude-text)] flex items-center gap-2">
              <AppIcon name="user" size={14} className="text-[var(--claude-accent)]" />
              <span>Persona Profile</span>
            </label>
            <span className="text-[11px] text-[var(--claude-text-muted)] font-mono">
              Active: {personaOptions.find((p) => p.id === formData.defaultPersona)?.name || "Dragon Queen"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {personaOptions.map((p) => {
              const isSelected = formData.defaultPersona === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setFormData({ ...formData, defaultPersona: p.id })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? "bg-[var(--claude-accent)]/10 border-[var(--claude-accent)] shadow-xs"
                      : "bg-[var(--claude-bg)] border-[var(--claude-border)] hover:border-[var(--claude-border-subtle)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${
                        isSelected ? "text-[var(--claude-accent)]" : "text-[var(--claude-text)]"
                      }`}
                    >
                      {p.name}
                    </span>
                    {isSelected && (
                      <AppIcon
                        name="check"
                        size={14}
                        className="text-[var(--claude-accent)] shrink-0"
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--claude-text-muted)] leading-relaxed line-clamp-2">
                    {p.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {formData.defaultPersona === "custom" && (
          <Textarea
            label="Custom Persona Instructions"
            helperText="Provide specific tone, boundary, and stylistic instructions for OmniMind."
            rows={3}
            value={formData.customPersonaInstructions || ""}
            onChange={(e) =>
              setFormData({ ...formData, customPersonaInstructions: e.target.value })
            }
            placeholder="e.g., Speak concisely with dry humor. Favor bulleted technical summaries."
          />
        )}

        {/* Default Model Selector */}
        <div className="space-y-2 pt-4 border-t border-[var(--claude-border)]">
          <label className="text-xs font-semibold text-[var(--claude-text)] flex items-center gap-2">
            <AppIcon name="sparkles" size={14} className="text-[var(--claude-accent)]" />
            <span>Default Gemini Model</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "Fast & search grounded" },
              { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", desc: "Flagship intelligence" },
              { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", desc: "Deep reasoning & STEM" },
            ].map((m) => {
              const isSelected = formData.model === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setFormData({ ...formData, model: m.id })}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[var(--claude-accent)]/10 border-[var(--claude-accent)] shadow-xs"
                      : "bg-[var(--claude-bg)] border-[var(--claude-border)] hover:border-[var(--claude-border-subtle)]"
                  }`}
                >
                  <div className="text-xs font-semibold text-[var(--claude-text)] mb-0.5">{m.name}</div>
                  <div className="text-[10px] text-[var(--claude-text-muted)]">{m.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Temperature & System Instruction */}
        <div className="space-y-4 pt-4 border-t border-[var(--claude-border)]">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-[var(--claude-text)]">
                Sampling Temperature
              </label>
              <p className="text-[11px] text-[var(--claude-text-muted)]">
                Higher values yield more expressive variance; lower values are more deterministic.
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-[var(--claude-text)] bg-[var(--claude-bg)] px-2.5 py-1 rounded-lg border border-[var(--claude-border)]">
              {formData.temperature}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={formData.temperature}
            onChange={(e) =>
              setFormData({ ...formData, temperature: parseFloat(e.target.value) })
            }
            className="w-full accent-[var(--claude-accent)] cursor-pointer"
          />

          <Textarea
            label="Base System Instruction"
            helperText="Foundational guidelines prefixed to all conversation turns."
            rows={3}
            value={formData.systemInstruction}
            onChange={(e) => setFormData({ ...formData, systemInstruction: e.target.value })}
          />
        </div>

        {/* API Key Status */}
        <div className="pt-4 border-t border-[var(--claude-border)] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AppIcon name="shield" size={15} className="text-[var(--claude-text-muted)]" />
            <span className="text-[var(--claude-text-secondary)]">Environment API Key</span>
          </div>
          <StatusText
            status={hasApiKey ? "active" : "error"}
            label={hasApiKey ? "GEMINI_API_KEY Configured" : "No API Key Detected"}
          />
        </div>
      </form>
    </Modal>
  );
};
