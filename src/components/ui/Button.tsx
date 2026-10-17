import React from "react";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "secondary",
  size = "md",
  icon,
  iconRight,
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center justify-center font-medium transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--claude-accent)] disabled:opacity-50 disabled:cursor-not-allowed shrink-0";

  const sizeClasses: Record<ButtonSize, string> = {
    sm: "h-7 px-2.5 text-xs gap-1.5 rounded-lg",
    md: "h-8.5 px-3 text-xs gap-2 rounded-xl",
    lg: "h-10 px-4 text-sm gap-2.5 rounded-xl",
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--claude-accent)] hover:bg-[var(--claude-accent-hover)] text-white shadow-xs active:scale-[0.99]",
    secondary:
      "bg-transparent hover:bg-[var(--claude-border)]/40 text-[var(--claude-text)] border border-[var(--claude-border)] shadow-xs",
    quiet:
      "bg-transparent hover:bg-[var(--claude-border)]/40 text-[var(--claude-text-secondary)] hover:text-[var(--claude-text)] border-transparent",
    danger:
      "bg-transparent hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 border border-rose-500/20",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin w-3.5 h-3.5 text-current shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      ) : icon ? (
        <span className="shrink-0 inline-flex items-center justify-center">{icon}</span>
      ) : null}
      {children && <span className="truncate">{children}</span>}
      {iconRight && !loading && (
        <span className="shrink-0 inline-flex items-center justify-center">{iconRight}</span>
      )}
    </button>
  );
};
