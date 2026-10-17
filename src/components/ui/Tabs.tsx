import React from "react";

export interface TabOption<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps<T extends string = string> {
  options: TabOption<T>[];
  activeId: T;
  onChange: (id: T) => void;
  variant?: "underline" | "segmented";
  className?: string;
}

export function Tabs<T extends string = string>({
  options,
  activeId,
  onChange,
  variant = "underline",
  className = "",
}: TabsProps<T>) {
  if (variant === "segmented") {
    return (
      <div
        role="tablist"
        className={`flex items-center gap-1 p-1 bg-[var(--claude-sidebar)] border border-[var(--claude-border)] rounded-xl ${className}`}
      >
        {options.map((opt) => {
          const isActive = opt.id === activeId;
          return (
            <button
              key={opt.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(opt.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors select-none ${
                isActive
                  ? "bg-[var(--claude-surface)] text-[var(--claude-text)] shadow-xs font-semibold"
                  : "text-[var(--claude-text-muted)] hover:text-[var(--claude-text)]"
              }`}
            >
              {opt.icon && <span className="shrink-0">{opt.icon}</span>}
              <span>{opt.label}</span>
              {typeof opt.count === "number" && (
                <span className="text-[10px] opacity-75 font-mono">({opt.count})</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      className={`flex items-center gap-6 border-b border-[var(--claude-border)] px-1 ${className}`}
    >
      {options.map((opt) => {
        const isActive = opt.id === activeId;
        return (
          <button
            key={opt.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.id)}
            className={`flex items-center gap-1.5 py-3 text-xs font-medium border-b-2 -mb-px transition-colors select-none ${
              isActive
                ? "border-[var(--claude-accent)] text-[var(--claude-accent)] font-semibold"
                : "border-transparent text-[var(--claude-text-muted)] hover:text-[var(--claude-text)]"
            }`}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
            {typeof opt.count === "number" && (
              <span className="text-[10px] text-[var(--claude-text-muted)] font-mono ml-0.5">
                ({opt.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
