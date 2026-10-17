import React, { useEffect } from "react";
import { AppIcon } from "../AppIcon";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  maxWidth = "2xl",
  children,
  footer,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
    "2xl": "max-w-4xl",
    "3xl": "max-w-5xl",
    "4xl": "max-w-6xl",
    "5xl": "max-w-7xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative z-10 w-full ${maxWidthClasses[maxWidth]} bg-[var(--claude-surface)] border border-[var(--claude-border)] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[88vh] text-[var(--claude-text)] transition-all`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--claude-border)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="p-2 rounded-xl bg-[var(--claude-border-subtle)] text-[var(--claude-accent)] shrink-0 flex items-center justify-center">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2
                id="modal-title"
                className="font-semibold text-sm sm:text-base text-[var(--claude-text)] truncate tracking-tight"
              >
                {title}
              </h2>
              {description && (
                <p className="text-xs text-[var(--claude-text-muted)] truncate mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[var(--claude-text-muted)] hover:text-[var(--claude-text)] hover:bg-[var(--claude-border-subtle)] rounded-lg transition-colors ml-2 shrink-0"
            title="Close"
          >
            <AppIcon name="close" size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="px-5 sm:px-6 py-3.5 border-t border-[var(--claude-border)] bg-[var(--claude-sidebar)]/50 shrink-0 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
