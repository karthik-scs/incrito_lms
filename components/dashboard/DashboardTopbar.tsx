"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Coins, MessageSquare, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Tooltip } from "@/components/ui/Tooltip";
import { apiJson } from "@/lib/authClient";
import { NotificationDropdown } from "./NotificationDropdown";
import { ProfileMenu } from "./ProfileMenu";
import favicon from "@/app/assets/incrito_favicon.jpg";

/** Sticky icon row pinned to the top of the content area — see AdminLayout. */
export function DashboardTopbar({
  userName,
  role,
  avatarUrl,
}: {
  userName: string;
  role: string;
  avatarUrl?: string | null;
}) {
  const [totalPoints, setTotalPoints] = useState<number | null>(null);

  useEffect(() => {
    if (role !== "Student") return;
    apiJson<{ totalPoints: number }>("/api/me/points").then((res) => {
      if (res.ok) setTotalPoints(res.data.totalPoints);
    });
  }, [role]);

  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface px-4 lg:px-8 py-3">
      {/* Mobile: logo icon */}
      <div className="lg:hidden shrink-0">
        <Image src={favicon} alt="incrito" width={32} height={32} className="rounded-md" />
      </div>

      {/* Spacer to push icons right on desktop */}
      <div className="flex-1" />

      {/* Mobile: only theme toggle */}
      <div className="lg:hidden shrink-0">
        <ThemeToggle />
      </div>

      {/* Desktop: full icon row */}
      <div className="hidden lg:flex items-center gap-2">
        {role === "Student" && totalPoints !== null && (
          <Tooltip label="Total Incrito Points earned across all your courses and cohorts">
            <span className="flex items-center gap-1.5 bg-accent-light text-accent rounded-full px-3 py-1.5 text-xs font-semibold">
              <Coins size={13} />
              {totalPoints.toLocaleString()} IP
            </span>
          </Tooltip>
        )}
        <Tooltip label="Chat">
          <Link
            href="/chat"
            className="p-2 rounded-md text-text-muted hover:bg-surface-secondary hover:text-text-primary transition-colors inline-flex"
          >
            <MessageSquare size={18} />
          </Link>
        </Tooltip>
        <Tooltip label="Settings">
          <Link
            href={role === "Admin" ? "/admin/settings" : "/settings"}
            className="p-2 rounded-md text-text-muted hover:bg-surface-secondary hover:text-text-primary transition-colors inline-flex"
          >
            <Settings size={18} />
          </Link>
        </Tooltip>
        <NotificationDropdown />
        <ThemeToggle />
        <ProfileMenu userName={userName} role={role} avatarUrl={avatarUrl} />
      </div>
    </div>
  );
}
