import { AlertCircle, CheckCircle2 } from "lucide-react";

type Variant = "error" | "success";

const VARIANT_STYLES: Record<Variant, string> = {
  error: "bg-error/10 text-error",
  success: "bg-success-lightest text-success-foreground",
};

const VARIANT_ICON: Record<Variant, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle2,
};

/** Badge-style inline notice — used for flow-guard errors (e.g. "complete signup first") and similar one-line notices. */
export function InlineAlert({ variant = "error", children }: { variant?: Variant; children: React.ReactNode }) {
  const Icon = VARIANT_ICON[variant];
  return (
    <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${VARIANT_STYLES[variant]}`}>
      <Icon size={16} className="shrink-0" />
      {children}
    </div>
  );
}
