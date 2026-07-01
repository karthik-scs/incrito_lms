const VARIANT_CLASSES = {
  success: "bg-success-lightest text-success-foreground",
  info: "bg-info-lightest text-info-foreground",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
  neutral: "bg-surface-secondary text-text-secondary",
  muted: "bg-surface-muted text-text-muted",
  accent: "bg-accent-light text-accent",
  premium: "bg-premium-light text-premium-foreground",
} as const;

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
} as const;

export function Badge({
  children,
  variant = "neutral",
  size = "sm",
}: {
  children: React.ReactNode;
  variant?: keyof typeof VARIANT_CLASSES;
  size?: keyof typeof SIZE_CLASSES;
}) {
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]}`}>
      {children}
    </span>
  );
}
