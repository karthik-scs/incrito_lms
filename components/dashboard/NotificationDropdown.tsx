"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Award, Bell, Check, MessageSquare, Radio, Sparkles, Video, X } from "lucide-react";
import { apiJson } from "@/lib/authClient";

type NotificationMetadata = {
  courseSlug?: string;
  lessonId?: string;
  postId?: string;
  action?: "join" | "watch" | "view_certificate" | "view_discussion";
};

type Notification = {
  id: string;
  type: "ENROLLMENT" | "CLASS_SCHEDULED" | "CLASS_REMINDER" | "ASSIGNMENT_GRADED" | "CERTIFICATE_ISSUED" | "ANNOUNCEMENT";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata: NotificationMetadata | null;
};

const TYPE_ICON: Record<Notification["type"], typeof Bell> = {
  ENROLLMENT: Sparkles,
  CLASS_SCHEDULED: Video,
  CLASS_REMINDER: Radio,
  ASSIGNMENT_GRADED: Check,
  CERTIFICATE_ISSUED: Award,
  ANNOUNCEMENT: MessageSquare,
};

function ctaFor(notification: Notification): { label: string; href: string } | null {
  const meta = notification.metadata;
  if (!meta?.courseSlug) return null;

  switch (meta.action) {
    case "join":
      return meta.lessonId ? { label: "Join", href: `/courses/${meta.courseSlug}/learn/${meta.lessonId}` } : null;
    case "watch":
      return meta.lessonId ? { label: "Watch", href: `/courses/${meta.courseSlug}/learn/${meta.lessonId}` } : null;
    case "view_certificate":
      return { label: "View", href: `/courses/${meta.courseSlug}/certificate` };
    case "view_discussion":
      return { label: "View", href: `/courses/${meta.courseSlug}/discussion` };
    default:
      return null;
  }
}

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationDropdown({ mobileMode = false }: { mobileMode?: boolean }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  async function load() {
    const result = await apiJson<{ notifications: Notification[]; unreadCount: number }>("/api/notifications");
    if (result.ok) {
      setNotifications(result.data.notifications);
      setUnreadCount(result.data.unreadCount);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      // In mobile mode the portal backdrop handles closing — skip this handler to avoid
      // the portal content (rendered outside containerRef) immediately closing the panel.
      if (mobileMode) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMode]);

  async function handleMarkRead(id: string) {
    const wasUnread = notifications.find((n) => n.id === id)?.isRead === false;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    await apiJson(`/api/notifications/${id}/read`, { method: "PATCH" });
  }

  async function handleDismiss(id: string) {
    const wasUnread = notifications.find((n) => n.id === id)?.isRead === false;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    await apiJson(`/api/notifications/${id}`, { method: "DELETE" });
  }

  async function handleMarkAllRead() {
    setNotifications([]);
    setUnreadCount(0);
    await apiJson("/api/notifications/read-all", { method: "PATCH" });
  }

  /** Shared notification list content used by both desktop dropdown and mobile overlay */
  function NotificationList() {
    return (
      <>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-surface">
          <p className="text-sm font-semibold text-text-primary">Notifications</p>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="text-xs text-accent hover:text-accent-dark font-medium">
              Mark all as read
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="text-sm text-text-muted py-8 text-center">No notifications yet.</p>
        ) : (
          <div className="divide-y divide-border-light">
            {notifications.map((notification) => {
              const Icon = TYPE_ICON[notification.type];
              const cta = ctaFor(notification);
              return (
                <div
                  key={notification.id}
                  className={`flex items-start gap-2.5 px-4 py-3 ${notification.isRead ? "" : "bg-accent-muted"}`}
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-light text-accent shrink-0 mt-0.5">
                    <Icon size={14} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{notification.title}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{notification.message}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-text-muted">{timeAgo(notification.createdAt)}</span>
                      {cta && (
                        <Link href={cta.href} onClick={() => setOpen(false)} className="text-xs text-accent hover:text-accent-dark font-medium">
                          {cta.label}
                        </Link>
                      )}
                      {!notification.isRead && (
                        <button onClick={() => handleMarkRead(notification.id)} className="text-xs text-text-muted hover:text-text-primary font-medium">
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                  <button onClick={() => handleDismiss(notification.id)} aria-label="Dismiss" className="text-text-muted hover:text-error shrink-0">
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      {mobileMode ? (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Notifications"
          className="relative flex items-center justify-center w-11 h-11 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-error text-error-foreground text-[10px] font-semibold leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Notifications"
          className="relative p-2 rounded-md text-text-muted hover:bg-surface-secondary hover:text-text-primary transition-colors"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-error text-error-foreground text-[10px] font-semibold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Mobile: portal rendered on document.body to escape any parent stacking context
          (backdrop-blur on MobileBottomNav would otherwise trap fixed children) */}
      {mobileMode && open && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[999] bg-black/50" onClick={() => setOpen(false)} />
          <div className="fixed z-[1000] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "calc(100dvh - 160px)" }}>
            <NotificationList />
          </div>
        </>,
        document.body
      )}

      {/* Desktop: anchored dropdown */}
      {!mobileMode && open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[28rem] overflow-y-auto bg-surface border border-border rounded-xl shadow-sm z-50">
          <NotificationList />
        </div>
      )}
    </div>
  );
}
