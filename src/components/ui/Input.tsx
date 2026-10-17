import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, icon, className = "", ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold text-[var(--claude-text-secondary)]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-3 text-[var(--claude-text-muted)] pointer-events-none flex items-center justify-center">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={`w-full bg-[var(--claude-bg)] text-[var(--claude-text)] placeholder-[var(--claude-text-muted)] border rounded-xl text-xs py-2 px-3 transition-colors outline-hidden focus:border-[var(--claude-accent)] focus:ring-1 focus:ring-[var(--claude-accent)]/20 disabled:opacity-50 ${
              icon ? "pl-9" : ""
            } ${
              error
                ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
                : "border-[var(--claude-border)]"
            } ${className}`}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-[11px] text-rose-500">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-[var(--claude-text-muted)]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold text-[var(--claude-text-secondary)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full bg-[var(--claude-bg)] text-[var(--claude-text)] placeholder-[var(--claude-text-muted)] border rounded-xl text-xs p-3 transition-colors outline-hidden focus:border-[var(--claude-accent)] focus:ring-1 focus:ring-[var(--claude-accent)]/20 disabled:opacity-50 custom-scrollbar ${
            error
              ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
              : "border-[var(--claude-border)]"
          } ${className}`}
          {...props}
        />
        {error ? (
          <p className="text-[11px] text-rose-500">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-[var(--claude-text-muted)]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
