"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar, type SidebarRole } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { useAuth } from "@/components/providers/AuthProvider";

const COLLAPSE_STORAGE_KEY = "incrito:sidebar-collapsed";
const VALID_ROLES: SidebarRole[] = ["Student", "Mentor", "Cohort Manager", "Admin"];

function canAccessPath(role: SidebarRole, pathname: string): boolean {
  // Role-specific route namespaces — strict ownership
  if (pathname.startsWith("/mentor/")) return role === "Mentor";
  if (pathname.startsWith("/cohort-manager/")) return role === "Cohort Manager";

  if (!pathname.startsWith("/admin")) return true;
  if (role === "Admin") return true;

  if (role === "Mentor") {
    return (
      pathname === "/admin/announcements" ||
      // Course detail only (/admin/courses/[slug]) — list is at /mentor/courses
      (pathname.startsWith("/admin/courses/") && pathname !== "/admin/courses") ||
      // Cohort detail only (/admin/cohorts/[id]) — list is at /cohorts
      (pathname.startsWith("/admin/cohorts/") && pathname.split("/").filter(Boolean).length > 2)
    );
  }
  if (role === "Cohort Manager") {
    return (
      pathname === "/admin/announcements" ||
      // Course detail only (/admin/courses/[slug]) — list is at /cohort-manager/courses
      (pathname.startsWith("/admin/courses/") && pathname !== "/admin/courses") ||
      // /admin/cohorts/[id] — individual cohort detail, not the list page
      (pathname.startsWith("/admin/cohorts/") && pathname.split("/").filter(Boolean).length > 2)
    );
  }
  return false; // Student has no admin routes
}

function roleHome(role: SidebarRole): string {
  return role === "Admin" ? "/admin/dashboard" : "/dashboard";
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true");
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const role: SidebarRole = VALID_ROLES.includes(user.role as SidebarRole)
      ? (user.role as SidebarRole)
      : "Student";
    if (!canAccessPath(role, pathname)) {
      router.replace(roleHome(role));
    }
  }, [loading, user, pathname, router]);

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

  if (!canAccessPath(role, pathname)) {
    return null;
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Desktop sidebar */}
      <Sidebar
        role={role}
        userName={userName}
        avatarUrl={user.avatarUrl}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          role={role}
          userName={userName}
          avatarUrl={user.avatarUrl}
          collapsed={false}
          mobileOpen={mobileOpen}
          onNavClick={() => setMobileOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopbar userName={userName} role={role} avatarUrl={user.avatarUrl} />
        <main className="flex-1 overflow-y-auto px-4 py-4 lg:px-8 lg:py-6 pb-20 lg:pb-6">{children}</main>
      </div>

      <MobileBottomNav
        onOpenMenu={() => setMobileOpen(true)}
        role={role}
      />
    </div>
  );
}
