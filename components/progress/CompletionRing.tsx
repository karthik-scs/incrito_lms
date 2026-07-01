export function CompletionRing({
  percentage,
  label,
  size = 88,
}: {
  percentage: number;
  label: string;
  size?: number;
}) {
  const clamped = Math.min(100, Math.max(0, percentage));

  return (
    <div
      style={{
        width: size,
        height: size,
        background: `conic-gradient(var(--color-accent) ${clamped * 3.6}deg, var(--color-border-light) 0deg)`,
      }}
      className="rounded-full flex items-center justify-center"
    >
      <div
        style={{ width: size - 12, height: size - 12 }}
        className="rounded-full bg-surface flex items-center justify-center text-sm font-semibold text-text-primary"
      >
        {label}
      </div>
    </div>
  );
}
