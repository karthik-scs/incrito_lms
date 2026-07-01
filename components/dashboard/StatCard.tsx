import type { LucideIcon } from "lucide-react";

type Accent = "accent" | "success" | "info" | "warning";

const ACCENT_STYLES: Record<Accent, string> = {
  accent: "bg-accent-light text-accent",
  success: "bg-success-lightest text-success-foreground",
  info: "bg-info-lightest text-info-foreground",
  warning: "bg-warning/10 text-warning",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  accent = "accent",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: Accent;
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex items-center gap-4">
      <span className={`flex items-center justify-center w-11 h-11 rounded-lg shrink-0 ${ACCENT_STYLES[accent]}`}>
        <Icon size={20} />
      </span>
      <div>
        <p className="text-sm text-text-secondary">{label}</p>
        <p className="text-[30px] font-semibold leading-9 text-text-primary">{value}</p>
      </div>
    </div>
  );
}
