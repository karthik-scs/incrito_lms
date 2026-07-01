import Link from "next/link";
import { BookOpen, Megaphone, UserPlus, FileBarChart } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

const ACTIONS = [
  { label: "Add New Course", href: "/courses/new", icon: BookOpen },
  { label: "Manage Announcements", href: "/admin/announcements", icon: Megaphone },
  { label: "Invite Users", href: "/admin/users", icon: UserPlus },
  { label: "View Reports", href: "/admin/reports", icon: FileBarChart },
];

export function QuickActions() {
  return (
    <DashboardCard title="Quick Actions" className="h-full">
      <div className="flex flex-col gap-2">
        {ACTIONS.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
          >
            <Icon size={16} className="text-accent" />
            {label}
          </Link>
        ))}
      </div>
    </DashboardCard>
  );
}
