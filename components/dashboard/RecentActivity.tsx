import { Award, BookOpen, UserPlus } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

type ActivityItem = { type: "enrollment" | "certificate" | "course"; text: string; at: string };

const ICON_BY_TYPE = {
  enrollment: UserPlus,
  certificate: Award,
  course: BookOpen,
} as const;

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function RecentActivity({ data }: { data: ActivityItem[] }) {
  return (
    <DashboardCard title="Recent Activity" className="h-full">
      <div className="flex flex-col gap-4 h-64 overflow-y-auto">
        {data.length === 0 && <p className="text-sm text-text-muted">No recent activity yet.</p>}
        {data.map((item, index) => {
          const Icon = ICON_BY_TYPE[item.type];
          return (
            <div key={index} className="flex items-start gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-light text-accent shrink-0">
                <Icon size={14} />
              </span>
              <div>
                <p className="text-sm text-text-primary">{item.text}</p>
                <p className="text-xs text-text-muted mt-0.5">{timeAgo(item.at)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
