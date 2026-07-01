"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, type SidebarRole } from "./Sidebar";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { useAuth } from "@/components/providers/AuthProvider";

const COLLAPSE_STORAGE_KEY = "incrito:sidebar-collapsed";
const VALID_ROLES: SidebarRole[] = ["Student", "Mentor", "Cohort Manager", "Admin"];

/**
 * Shared shell for every authenticated/dashboard page: a fixed-height sidebar that never scrolls
 * with the page, a sticky topbar (search/chat/settings/notifications/theme/profile), and a
 * scrollable content area below it. Only the content area (`children`) scrolls.
 *
 * Pulls the current user from `useAuth()` instead of taking `role`/`userName` props — every page
 * using this layout is implicitly auth-gated: unauthenticated visitors are redirected to /login.
 */
export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true");
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      return next;
    });
  }

  if (loading || !user) {
    return null;
  }

  const role: SidebarRole = VALID_ROLES.includes(user.role as SidebarRole) ? (user.role as SidebarRole) : "Student";
  const userName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar
        role={role}
        userName={userName}
        avatarUrl={user.avatarUrl}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopbar userName={userName} role={role} avatarUrl={user.avatarUrl} />
        <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
