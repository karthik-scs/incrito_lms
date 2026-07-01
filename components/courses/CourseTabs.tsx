import Link from "next/link";
import { Lock } from "lucide-react";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "roadmap", label: "Roadmap" },
  { key: "discussion", label: "Discussion" },
  { key: "leaderboard", label: "Leaderboard" },
  { key: "certificate", label: "Certificate" },
] as const;

export function CourseTabs({
  courseSlug,
  active,
  certificateLocked,
  allowedTabs,
}: {
  courseSlug: string;
  active: (typeof TABS)[number]["key"];
  certificateLocked?: boolean;
  allowedTabs?: string[];
}) {
  const visibleTabs = allowedTabs ? TABS.filter((t) => allowedTabs.includes(t.key)) : TABS;
  return (
    <div className="border-b border-border flex items-center gap-6 overflow-x-auto">
      {visibleTabs.map((tab) => {
        const isLocked = tab.key === "certificate" && certificateLocked;
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={`/courses/${courseSlug}/${tab.key}`}
            className={`flex items-center gap-1.5 pb-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
              isActive ? "border-accent text-accent" : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
            {isLocked && <Lock size={12} />}
          </Link>
        );
      })}
    </div>
  );
}
