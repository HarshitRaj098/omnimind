import React, { useState } from "react";
import { Modal, Button, Input, StatusText } from "./ui";
import { AppIcon } from "./AppIcon";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string | null;
  conversationTitle: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  conversationTitle,
}) => {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revoked, setRevoked] = useState(false);

  if (!isOpen || !conversationId) return null;

  const handleGenerateShare = async () => {
    setLoading(true);
    setRevoked(false);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/share`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setShareUrl(data.shareUrl);
        setShareId(data.shareId);
      }
    } catch (e) {
      console.error("Share error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRevoke = async () => {
    if (!shareId) return;
    try {
      const res = await fetch(`/api/share/${shareId}/revoke`, { method: "POST" });
      if (res.ok) {
        setRevoked(true);
        setShareUrl(null);
      }
    } catch (e) {
      console.error("Revoke error:", e);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Conversation Snapshot"
      description="Create a secure, read-only public snapshot of this chat thread"
      icon={<AppIcon name="share" size={18} />}
      maxWidth="md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-[var(--claude-bg)] border border-[var(--claude-border)] text-xs space-y-1">
          <div className="font-semibold text-[var(--claude-text)] truncate">
            "{conversationTitle}"
          </div>
          <div className="text-[11px] text-[var(--claude-text-muted)] leading-relaxed">
            Snapshots are static and tamper-proof. System prompts, API keys, and private files are permanently excluded.
          </div>
        </div>

        {!shareUrl && !revoked && (
          <Button
            variant="primary"
            className="w-full"
            loading={loading}
            onClick={handleGenerateShare}
          >
            Create Shareable Link
          </Button>
        )}

        {shareUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="font-mono text-xs"
                icon={<AppIcon name="link" size={14} />}
              />
              <Button
                variant={copied ? "primary" : "secondary"}
                onClick={handleCopy}
                icon={<AppIcon name={copied ? "check" : "copy"} size={14} />}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <StatusText status="active" label="Link is active & read-only" />
              <Button size="sm" variant="danger" onClick={handleRevoke}>
                Revoke Link
              </Button>
            </div>
          </div>
        )}

        {revoked && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AppIcon name="alert" size={16} className="shrink-0" />
            <span>This share link has been revoked and is no longer accessible.</span>
          </div>
        )}
      </div>
    </Modal>
  );
};
