"use client";

type Side = "top" | "bottom" | "right";

const POSITION_CLASSES: Record<Side, string> = {
  bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
  top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
  right: "left-full ml-2 top-1/2 -translate-y-1/2",
};

export function Tooltip({
  label,
  children,
  side = "bottom",
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  side?: Side;
  className?: string;
}) {
  return (
    <span className={`relative inline-flex group ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-overlay-dark px-2 py-1 text-xs font-medium text-white opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 ${POSITION_CLASSES[side]}`}
      >
        {label}
      </span>
    </span>
  );
}
