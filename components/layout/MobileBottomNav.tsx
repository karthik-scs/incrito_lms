"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, MessageCircle, Settings } from "lucide-react";
import { NotificationDropdown } from "@/components/dashboard/NotificationDropdown";

export function MobileBottomNav({
  onOpenMenu,
  role,
}: {
  onOpenMenu: () => void;
  role: string;
  userName?: string;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const settingsHref = role === "Admin" ? "/admin/settings" : "/settings";
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border flex items-center justify-around px-2 py-2">
      {/* Menu */}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="flex items-center justify-center w-11 h-11 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Chat */}
      <Link
        href="/chat"
        aria-label="Chat"
        className={`flex items-center justify-center w-11 h-11 rounded-xl transition-colors ${
          isActive("/chat")
            ? "text-accent bg-accent-light"
            : "text-text-muted hover:text-text-primary hover:bg-surface-secondary"
        }`}
      >
        <MessageCircle size={20} />
      </Link>

      {/* Notifications */}
      <div className="flex items-center justify-center w-11 h-11">
        <NotificationDropdown mobileMode />
      </div>

      {/* Settings */}
      <Link
        href={settingsHref}
        aria-label="Settings"
        className={`flex items-center justify-center w-11 h-11 rounded-xl transition-colors ${
          isActive(settingsHref)
            ? "text-accent bg-accent-light"
            : "text-text-muted hover:text-text-primary hover:bg-surface-secondary"
        }`}
      >
        <Settings size={20} />
      </Link>
    </nav>
  );
}
