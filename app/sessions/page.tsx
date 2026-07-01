"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Radio, Users, Video } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/Badge";
import { BookingPanel } from "@/components/bookings/BookingPanel";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiJson } from "@/lib/authClient";

type SessionEvent = {
  id: string;
  type: "LIVE_CLASS";
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  joinUrl: string | null;
  isLiveNow: boolean;
  cohort: { id: string; name: string } | null;
  course: { id: string; title: string; slug: string } | null;
  mentor: { id: string; firstName: string; lastName: string };
};

type Tab = "upcoming" | "past" | "bookings";

const STATUS_VARIANT: Record<string, "info" | "error" | "success" | "muted"> = {
  SCHEDULED: "info",
  LIVE: "error",
  COMPLETED: "success",
  CANCELLED: "muted",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function SessionsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("upcoming");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const from = new Date();
      from.setDate(from.getDate() - 90);
      const to = new Date();
      to.setDate(to.getDate() + 90);
      const result = await apiJson<SessionEvent[]>(`/api/me/calendar?from=${from.toISOString()}&to=${to.toISOString()}`);
      if (result.ok) setEvents(result.data);
      setLoading(false);
    }
    load();
  }, []);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const upcoming = events.filter((e) => new Date(e.endTime) >= now).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const past = events
      .filter((e) => new Date(e.endTime) < now)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    return { upcoming, past };
  }, [events]);

  const visible = tab === "upcoming" ? upcoming : past;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold text-text-primary">Sessions</h1>
      <p className="text-sm text-text-secondary mt-1">Live classes and 1:1 mentor sessions.</p>

      <div className="mt-6 flex items-center gap-1 bg-surface-secondary rounded-md p-1 w-fit">
        <button
          onClick={() => setTab("upcoming")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            tab === "upcoming" ? "bg-surface text-accent shadow-sm" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Upcoming ({upcoming.length})
        </button>
        <button
          onClick={() => setTab("past")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            tab === "past" ? "bg-surface text-accent shadow-sm" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Past ({past.length})
        </button>
        <button
          onClick={() => setTab("bookings")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            tab === "bookings" ? "bg-surface text-accent shadow-sm" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          1:1 Bookings
        </button>
      </div>

      {tab === "bookings" ? (
        <BookingPanel />
      ) : (
        <>
          {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}

          {!loading && visible.length === 0 && (
            <p className="mt-6 text-sm text-text-muted py-12 text-center bg-surface border border-border rounded-2xl">
              No {tab === "upcoming" ? "upcoming" : "past"} sessions.
            </p>
          )}

          {!loading && visible.length > 0 && (
            <div className="mt-6 flex flex-col gap-3">
              {visible.map((event) => (
                <div key={event.id} className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-4">
                  <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-light text-accent shrink-0">
                    <Video size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-text-primary">{event.title}</p>
                      <Badge variant={STATUS_VARIANT[event.status] ?? "muted"}>{event.status}</Badge>
                      {event.isLiveNow && <Badge variant="error">LIVE</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-muted flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {formatDateTime(event.startTime)}
                      </span>
                      {event.cohort && (
                        <span className="flex items-center gap-1">
                          <Users size={11} />
                          {event.cohort.name}
                        </span>
                      )}
                      {event.course && <span>{event.course.title}</span>}
                    </div>
                  </div>
                  {event.isLiveNow && event.joinUrl && (
                    <a
                      href={event.joinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 bg-accent text-accent-foreground rounded-md px-3 py-1.5 text-xs font-medium animate-pulse shrink-0"
                    >
                      <Radio size={12} />
                      Join
                    </a>
                  )}
                  {event.course && user?.role === "Mentor" && (
                    <Link
                      href={`/admin/courses/${event.course.slug}`}
                      className="text-xs text-accent hover:text-accent-dark font-medium shrink-0"
                    >
                      Manage
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
