import React, { useState, useEffect } from "react";
import { Modal, Button, StatusText } from "./ui";
import { AppIcon } from "./AppIcon";

interface VoiceModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  personaName: string;
}

export const VoiceModeModal: React.FC<VoiceModeModalProps> = ({
  isOpen,
  onClose,
  personaName,
}) => {
  const [state, setState] = useState<"listening" | "thinking" | "speaking">("listening");
  const [transcript, setTranscript] = useState("Listening for your voice command...");
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setState("listening");
      setTranscript("Voice session initialized. Speak naturally...");

      const timer = setTimeout(() => {
        setState("thinking");
        setTranscript("Processing speech via Gemini Live stream...");
        setTimeout(() => {
          setState("speaking");
          setTranscript("Greetings. I am listening attentively to your commands.");
        }, 2200);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleInterrupt = () => {
    setState("listening");
    setTranscript("Speech interrupted. Listening...");
  };

  const getStatusType = () => {
    if (muted) return "neutral";
    if (state === "speaking") return "active";
    if (state === "thinking") return "pending";
    return "active";
  };

  const getStatusLabel = () => {
    if (muted) return "Microphone Muted";
    if (state === "listening") return "Listening";
    if (state === "thinking") return "Thinking";
    return "Speaking";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Live Voice Conversation"
      description={`Low-latency voice channel with ${personaName}`}
      icon={<AppIcon name="voice" size={18} />}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            size="sm"
            variant="quiet"
            icon={<AppIcon name="arrow-left" size={14} />}
            onClick={onClose}
          >
            Return to Text
          </Button>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={muted ? "primary" : "secondary"}
              icon={<AppIcon name={muted ? "mic-off" : "mic"} size={14} />}
              onClick={() => setMuted(!muted)}
            >
              {muted ? "Unmute" : "Mute"}
            </Button>
            {state === "speaking" && (
              <Button
                size="sm"
                variant="secondary"
                icon={<AppIcon name="stop" size={12} />}
                onClick={handleInterrupt}
              >
                Interrupt
              </Button>
            )}
            <Button size="sm" variant="danger" onClick={onClose}>
              End Session
            </Button>
          </div>
        </div>
      }
    >
      <div className="py-6 flex flex-col items-center text-center space-y-6">
        {/* Restrained State Card */}
        <div className="p-6 rounded-2xl bg-[var(--claude-bg)] border border-[var(--claude-border)] w-full max-w-sm flex flex-col items-center gap-3">
          <div className="p-3 rounded-xl bg-[var(--claude-surface)] border border-[var(--claude-border)] text-[var(--claude-accent)]">
            <AppIcon
              name={state === "speaking" ? "volume" : state === "thinking" ? "sparkles" : "mic"}
              size={24}
            />
          </div>

          <StatusText status={getStatusType()} label={getStatusLabel()} />

          <p className="text-xs text-[var(--claude-text-secondary)] font-mono">
            {personaName} · Low-latency Audio
          </p>
        </div>

        {/* Live Transcript Box */}
        <div className="w-full text-left space-y-1.5">
          <span className="text-[11px] font-semibold text-[var(--claude-text-muted)] uppercase tracking-wider font-mono">
            Live Transcript
          </span>
          <div className="p-4 rounded-xl bg-[var(--claude-bg)] border border-[var(--claude-border)] text-xs text-[var(--claude-text)] leading-relaxed min-h-[72px]">
            {transcript}
          </div>
        </div>
      </div>
    </Modal>
  );
};
