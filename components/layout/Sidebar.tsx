"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Globe,
  GraduationCap,
  HeadphonesIcon,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Settings,
  Users,
  Video,
  X,
} from "lucide-react";
import { Logo } from "./Logo";
import { Tooltip } from "@/components/ui/Tooltip";
import { Avatar } from "@/components/ui/Avatar";
import { logout } from "@/lib/logout";
import favicon from "@/app/assets/incrito_favicon.jpg";

export type SidebarRole = "Student" | "Mentor" | "Cohort Manager" | "Admin";

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard };

const NAV_ITEMS: Record<SidebarRole, NavItem[]> = {
  Student: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "My Courses", href: "/courses", icon: BookOpen },
    { label: "Calendar", href: "/calendar", icon: Calendar },
    { label: "Community", href: "/community", icon: Users },
  ],
  Mentor: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "My Cohorts", href: "/cohorts", icon: GraduationCap },
    { label: "Courses", href: "/mentor/courses", icon: BookOpen },
    { label: "Sessions", href: "/sessions", icon: Video },
    { label: "Calendar", href: "/calendar", icon: Calendar },
    { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
    { label: "Discussions", href: "/community", icon: MessageSquare },
    { label: "Chat", href: "/chat", icon: MessageCircle },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
  "Cohort Manager": [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "My Cohorts", href: "/cohorts", icon: GraduationCap },
    { label: "Courses", href: "/cohort-manager/courses", icon: BookOpen },
    { label: "Sessions", href: "/sessions", icon: Video },
    { label: "Calendar", href: "/calendar", icon: Calendar },
    { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
    { label: "Discussions", href: "/community", icon: MessageSquare },
    { label: "Chat", href: "/chat", icon: MessageCircle },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
  Admin: [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Courses", href: "/admin/courses", icon: BookOpen },
    { label: "Cohorts", href: "/admin/cohorts", icon: GraduationCap },
    { label: "Enrollments", href: "/admin/enrollments", icon: ClipboardList },
    { label: "Community", href: "/admin/community", icon: Globe },
    { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
    { label: "Certificates", href: "/admin/certificates", icon: Award },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ],
};

export function Sidebar({
  role,
  userName,
  avatarUrl,
  collapsed = false,
  onToggleCollapse,
  onNavClick,
  mobileOpen = false,
}: {
  role: SidebarRole;
  userName: string;
  avatarUrl?: string | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavClick?: () => void;
  mobileOpen?: boolean;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role];

  return (
    <aside
      className={`flex flex-col h-screen shrink-0 border-r border-border bg-surface py-6 ${
        collapsed ? "w-20 px-2" : "w-64 px-4"
      } ${mobileOpen ? "flex" : "hidden lg:flex"}`}
    >
      <div className={`relative flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
        {collapsed ? (
          <Image src={favicon} alt="incrito" width={40} height={40} className="rounded-md" />
        ) : (
          <Logo height={26} />
        )}
        {/* Mobile close button — only visible when sidebar is open as a drawer */}
        {mobileOpen && onNavClick && (
          <button
            type="button"
            onClick={onNavClick}
            aria-label="Close menu"
            className="lg:hidden shrink-0 p-1.5 rounded-md text-text-muted hover:bg-surface-secondary hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={
              collapsed
                ? "absolute -right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-surface border border-border text-text-muted hover:bg-surface-secondary hover:text-text-primary transition-colors shadow-sm"
                : "shrink-0 p-1.5 rounded-md text-text-muted hover:bg-surface-secondary hover:text-text-primary transition-colors"
            }
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      <nav className="mt-6 flex-1 flex flex-col gap-1">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const link = (
            <Link
              href={item.href}
              onClick={onNavClick}
              className={`flex items-center rounded-md text-sm font-medium transition-colors ${
                collapsed ? "px-3 py-2.5" : "gap-3 px-3 py-2"
              } ${isActive ? "bg-accent-light text-accent" : "text-text-dark hover:bg-surface-secondary"}`}
            >
              <Icon size={collapsed ? 18 : 18} />
              {!collapsed && item.label}
            </Link>
          );

          // Collapsed: Tooltip is the flex container that centers the (content-sized,
          // padded) Link within the full row — the Link itself stays content-sized so its
          // bg-accent-light active background forms a proper padded pill, not a full-width band.
          return collapsed ? (
            <Tooltip key={item.href} label={item.label} side="right" className="w-full justify-center">
              {link}
            </Tooltip>
          ) : (
            <div key={item.href}>{link}</div>
          );
        })}
        {/* Support only for Student — Mentor/CM/Admin manage support through admin settings */}
        {role === "Student" && (collapsed ? (
          <Tooltip label="Support" side="right" className="w-full justify-center">
            <Link
              href="/support"
              onClick={onNavClick}
              className={`flex items-center rounded-md text-sm font-medium transition-colors px-3 py-2.5 ${
                pathname === "/support" ? "bg-accent-light text-accent" : "text-text-dark hover:bg-surface-secondary"
              }`}
            >
              <HeadphonesIcon size={18} />
            </Link>
          </Tooltip>
        ) : (
          <Link
            href="/support"
            onClick={onNavClick}
            className={`flex items-center gap-3 rounded-md text-sm font-medium transition-colors px-3 py-2 ${
              pathname === "/support" ? "bg-accent-light text-accent" : "text-text-dark hover:bg-surface-secondary"
            }`}
          >
            <HeadphonesIcon size={18} />
            Support
          </Link>
        ))}
      </nav>


      <div className={`flex items-center rounded-md mt-4 border-t border-border pt-4 ${collapsed ? "justify-center px-0 py-2" : "justify-between px-3 py-2"}`}>
        {collapsed ? (
          <Tooltip label="Log out" side="right" className="w-full justify-center">
            <button
              type="button"
              onClick={logout}
              aria-label="Log out"
              className="p-2 rounded-md text-text-muted hover:bg-surface-secondary hover:text-error transition-colors"
            >
              <LogOut size={20} />
            </button>
          </Tooltip>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={userName} avatarUrl={avatarUrl} size={36} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{userName}</p>
                <p className="text-xs text-text-muted">{role}</p>
              </div>
            </div>
            <Tooltip label="Log out">
              <button
                type="button"
                onClick={logout}
                aria-label="Log out"
                className="p-2 rounded-md text-text-muted hover:bg-surface-secondary hover:text-error transition-colors shrink-0"
              >
                <LogOut size={16} />
              </button>
            </Tooltip>
          </>
        )}
      </div>
    </aside>
  );
}
