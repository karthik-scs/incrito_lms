const VARIANT_CLASSES = {
  primary: "bg-accent text-accent-foreground hover:bg-accent-dark",
  secondary: "bg-surface border border-border text-text-primary hover:bg-surface-secondary",
  ghost: "bg-transparent text-text-secondary hover:bg-surface-secondary",
  danger: "bg-error text-error-foreground hover:opacity-90",
} as const;

export function Button({
  children,
  variant = "primary",
  type = "button",
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  variant?: keyof typeof VARIANT_CLASSES;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
