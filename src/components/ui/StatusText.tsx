import React from "react";

export type StatusType = "active" | "inactive" | "pending" | "error" | "neutral";

export interface StatusTextProps {
  status: StatusType;
  label: string;
  showDot?: boolean;
  className?: string;
}

export const StatusText: React.FC<StatusTextProps> = ({
  status,
  label,
  showDot = true,
  className = "",
}) => {
  const dotColor: Record<StatusType, string> = {
    active: "bg-emerald-600",
    inactive: "bg-[var(--claude-text-muted)]",
    pending: "bg-amber-600",
    error: "bg-rose-600",
    neutral: "bg-[var(--claude-text-muted)]",
  };

  const textColor: Record<StatusType, string> = {
    active: "text-emerald-700 dark:text-emerald-400 font-medium",
    inactive: "text-[var(--claude-text-muted)]",
    pending: "text-amber-700 dark:text-amber-400 font-medium",
    error: "text-rose-700 dark:text-rose-400 font-medium",
    neutral: "text-[var(--claude-text-secondary)]",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs select-none ${textColor[status]} ${className}`}>
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor[status]}`}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </span>
  );
};
