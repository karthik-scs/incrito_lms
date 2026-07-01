"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Radio, Video } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Tooltip } from "@/components/ui/Tooltip";
import { apiJson } from "@/lib/authClient";

type CalendarEvent = {
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

type ViewMode = "day" | "week" | "month";

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function startOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [cohortFilter, setCohortFilter] = useState("");
  const [mentorFilter, setMentorFilter] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Fetch a generous ±35 day window around the anchor — covers day/week/month views without
      // needing a separate fetch per view, since this is a light query and views are just
      // different client-side slices of the same event list.
      const from = new Date(anchorDate);
      from.setDate(from.getDate() - 35);
      const to = new Date(anchorDate);
      to.setDate(to.getDate() + 35);
      const result = await apiJson<CalendarEvent[]>(
        `/api/me/calendar?from=${from.toISOString()}&to=${to.toISOString()}`
      );
      if (result.ok) setEvents(result.data);
      setLoading(false);
    }
    load();
  }, [anchorDate]);

  const filtered = useMemo(
    () =>
      events.filter(
        (e) => (!cohortFilter || e.cohort?.id === cohortFilter) && (!mentorFilter || e.mentor.id === mentorFilter)
      ),
    [events, cohortFilter, mentorFilter]
  );

  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000)),
    [weekStart]
  );

  const monthCells = useMemo(() => {
    const monthStart = startOfMonth(anchorDate);
    const gridStart = startOfWeek(monthStart);
    return Array.from({ length: 42 }, (_, i) => new Date(gridStart.getTime() + i * 24 * 60 * 60 * 1000));
  }, [anchorDate]);

  function eventsOnDay(day: Date) {
    return filtered
      .filter((e) => new Date(e.startTime).toDateString() === day.toDateString())
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  const today = new Date();
  const todaysEvents = eventsOnDay(today).filter((e) => new Date(e.startTime) >= today || e.isLiveNow);
  const upcomingThisWeekCount = filtered.filter((e) => {
    const start = new Date(e.startTime);
    return start >= weekDays[0] && start < new Date(weekDays[6].getTime() + 24 * 60 * 60 * 1000) && start >= new Date();
  }).length;

  const cohortOptions = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach((e) => e.cohort && map.set(e.cohort.id, e.cohort.name));
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [events]);
  const mentorOptions = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach((e) => map.set(e.mentor.id, `${e.mentor.firstName} ${e.mentor.lastName}`));
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [events]);

  const nextLive = filtered.find((e) => e.isLiveNow) ?? filtered.find((e) => new Date(e.startTime) > new Date());

  function goToday() {
    setAnchorDate(new Date());
  }

  function navigate(direction: 1 | -1) {
    setAnchorDate((prev) => {
      const next = new Date(prev);
      if (view === "day") next.setDate(next.getDate() + direction);
      else if (view === "week") next.setDate(next.getDate() + direction * 7);
      else next.setMonth(next.getMonth() + direction);
      return next;
    });
  }

  function headerLabel() {
    if (view === "day") return anchorDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    if (view === "month") return `${MONTH_LABELS[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`;
    return `${weekDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }

  function EventPill({ event }: { event: CalendarEvent }) {
    return (
      <Link
        href={event.course ? `/courses/${event.course.slug}/learn/${event.id}` : "#"}
        className={`block rounded-md px-2 py-1.5 text-xs ${
          event.isLiveNow ? "bg-error/10 text-error" : "bg-info-lightest text-info-foreground"
        }`}
      >
        <p className="font-medium truncate flex items-center gap-1">
          {event.isLiveNow && <Radio size={10} className="animate-pulse" />}
          {event.title}
        </p>
        <p className="text-[10px] opacity-80">{formatTime(event.startTime)}</p>
      </Link>
    );
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold text-text-primary">Calendar</h1>
      <p className="text-sm text-text-secondary mt-1">View and manage your live classes and sessions.</p>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <div className="w-44">
                <Select value={cohortFilter} onChange={setCohortFilter} options={cohortOptions} placeholder="All Cohorts" />
              </div>
              <div className="w-44">
                <Select value={mentorFilter} onChange={setMentorFilter} options={mentorOptions} placeholder="All Mentors" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-surface-secondary rounded-md p-0.5">
                {(["day", "week", "month"] as ViewMode[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                      view === v ? "bg-surface text-accent shadow-sm" : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <button
                onClick={goToday}
                className="bg-surface border border-border text-text-primary rounded-md px-3 py-1.5 text-xs font-medium hover:bg-surface-secondary"
              >
                Today
              </button>
              <button onClick={() => navigate(-1)} aria-label="Previous" className="p-1.5 rounded-md border border-border text-text-muted hover:bg-surface-secondary">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => navigate(1)} aria-label="Next" className="p-1.5 rounded-md border border-border text-text-muted hover:bg-surface-secondary">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <p className="text-sm font-medium text-text-primary mb-3">{headerLabel()}</p>

          {loading && <p className="text-sm text-text-secondary">Loading…</p>}

          {!loading && view === "week" && (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const isToday = day.toDateString() === today.toDateString();
                return (
                  <div key={day.toISOString()} className="bg-surface border border-border rounded-xl p-2 min-h-[200px]">
                    <p className={`text-xs font-medium text-center ${isToday ? "text-accent" : "text-text-secondary"}`}>
                      {DAY_LABELS[day.getDay()]}
                    </p>
                    <p className={`text-sm font-semibold text-center ${isToday ? "text-accent" : "text-text-primary"}`}>
                      {day.getDate()}
                    </p>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {eventsOnDay(day).map((event) => <EventPill key={event.id} event={event} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && view === "day" && (
            <div className="bg-surface border border-border rounded-xl p-4 min-h-[300px]">
              <div className="flex flex-col gap-2">
                {eventsOnDay(anchorDate).length === 0 && (
                  <p className="text-sm text-text-muted py-12 text-center">No sessions scheduled this day.</p>
                )}
                {eventsOnDay(anchorDate).map((event) => (
                  <div key={event.id} className="flex items-center gap-3 bg-surface-secondary rounded-lg px-3 py-3">
                    <div className="text-xs font-semibold text-text-secondary w-20 shrink-0">{formatTime(event.startTime)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate flex items-center gap-1.5">
                        {event.isLiveNow && <Radio size={11} className="text-error animate-pulse" />}
                        {event.title}
                      </p>
                      {event.cohort && <p className="text-xs text-text-muted mt-0.5">{event.cohort.name}</p>}
                    </div>
                    {event.course && (
                      <Link
                        href={`/courses/${event.course.slug}/learn/${event.id}`}
                        className={`text-xs font-medium rounded-md px-2.5 py-1.5 shrink-0 ${
                          event.isLiveNow ? "bg-accent text-accent-foreground" : "bg-surface border border-border text-text-muted"
                        }`}
                      >
                        Join
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && view === "month" && (
            <div>
              <div className="grid grid-cols-7 gap-px bg-border rounded-t-xl overflow-hidden">
                {DAY_LABELS.map((label) => (
                  <div key={label} className="bg-surface-secondary text-center text-xs font-medium text-text-secondary py-1.5">
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-border rounded-b-xl overflow-hidden">
                {monthCells.map((day) => {
                  const isToday = day.toDateString() === today.toDateString();
                  const inMonth = day.getMonth() === anchorDate.getMonth();
                  const dayEvents = eventsOnDay(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[88px] p-1.5 ${inMonth ? "bg-surface" : "bg-surface-secondary"}`}
                    >
                      <p className={`text-xs font-medium ${isToday ? "text-accent" : inMonth ? "text-text-primary" : "text-text-muted"}`}>
                        {day.getDate()}
                      </p>
                      <div className="mt-1 flex flex-col gap-0.5">
                        {dayEvents.slice(0, 2).map((event) => (
                          <Link
                            key={event.id}
                            href={event.course ? `/courses/${event.course.slug}/learn/${event.id}` : "#"}
                            className="block text-[10px] truncate rounded px-1 py-0.5 bg-info-lightest text-info-foreground"
                          >
                            {event.title}
                          </Link>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-[10px] text-text-muted px-1">+{dayEvents.length - 2} more</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-6 text-xs text-text-secondary">
            <span className="flex items-center gap-1.5">
              <Video size={12} className="text-info" />
              Live Classes
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-surface border border-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-text-primary">Today's Schedule</h2>
            <div className="mt-3 flex flex-col gap-2">
              {todaysEvents.length === 0 && <p className="text-sm text-text-muted">Nothing scheduled today.</p>}
              {todaysEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-2 bg-surface-secondary rounded-lg px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{event.title}</p>
                    <p className="text-xs text-text-muted">
                      {formatTime(event.startTime)} – {formatTime(event.endTime)}
                    </p>
                  </div>
                  {event.course && (
                    <Link
                      href={`/courses/${event.course.slug}/learn/${event.id}`}
                      className={`text-xs font-medium rounded-md px-2.5 py-1.5 shrink-0 ${
                        event.isLiveNow
                          ? "bg-accent text-accent-foreground"
                          : "bg-surface border border-border text-text-muted cursor-not-allowed"
                      }`}
                    >
                      Join
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-text-primary">Upcoming This Week</h2>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="info">Live Classes</Badge>
              <span className="text-sm font-medium text-text-primary">{upcomingThisWeekCount}</span>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-text-primary">Quick Actions</h2>
            <div className="mt-3 flex flex-col gap-2">
              {nextLive?.course ? (
                <Link
                  href={`/courses/${nextLive.course.slug}/learn/${nextLive.id}`}
                  className="text-sm text-accent hover:text-accent-dark font-medium flex items-center gap-1.5"
                >
                  <Radio size={14} />
                  Join Live Class
                </Link>
              ) : (
                <span className="text-sm text-text-muted flex items-center gap-1.5">
                  <Radio size={14} />
                  No upcoming live class
                </span>
              )}
              <Tooltip label="Calendar export isn't wired to a provider yet.">
                <span className="text-sm text-text-muted cursor-not-allowed">Export Calendar</span>
              </Tooltip>
              <Tooltip label="Google Calendar sync isn't wired yet.">
                <span className="text-sm text-text-muted cursor-not-allowed">Sync with Google Calendar</span>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
