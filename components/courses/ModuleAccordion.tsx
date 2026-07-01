"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Check, ChevronDown, ChevronUp, Clock, Crown, FileText, Lock, PlayCircle, Radio } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export type LessonLiveClass = {
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
  /** Never the raw S3 key/URL — only whether a recording exists and is currently watchable. The
   *  actual playback URL is fetched on demand, short-lived, by `ProtectedVideoPlayer`. */
  hasRecording: boolean;
  joinUrl: string | null;
  isLiveNow: boolean;
  mentor?: { firstName: string; lastName: string };
};

export type RoadmapLesson = {
  id: string;
  title: string;
  type: "VIDEO" | "TEXT" | "PDF" | "LIVE";
  durationMinutes: number | null;
  completed: boolean;
  lockedByPlan?: boolean;
  liveClass: LessonLiveClass | null;
};

export type RoadmapModule = {
  id: string;
  title: string;
  status: "completed" | "in-progress" | "locked";
  lockedByPlan?: boolean;
  lessons: RoadmapLesson[];
};

function formatDuration(minutes: number | null) {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatSchedule(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const dayLabel = isSameDay(start, tomorrow)
    ? "Tomorrow"
    : start.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const timeFmt = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${dayLabel}, ${timeFmt(start)} – ${timeFmt(end)}`;
}

const STATUS_BADGE = {
  completed: <Badge variant="success">Completed</Badge>,
  "in-progress": <Badge variant="info">In Progress</Badge>,
  locked: null,
};

const TYPE_ICON = { VIDEO: PlayCircle, TEXT: FileText, PDF: FileText, LIVE: Calendar };

export function ModuleAccordion({
  module,
  courseSlug,
  defaultOpen = false,
}: {
  module: RoadmapModule;
  courseSlug: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isLocked = module.status === "locked";
  const completedCount = module.lessons.filter((l) => l.completed).length;

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <span
          className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
            module.status === "completed"
              ? "bg-accent text-accent-foreground"
              : module.status === "in-progress"
                ? "border-2 border-accent text-accent"
                : "bg-surface-secondary text-text-muted"
          }`}
        >
          {module.status === "completed" && <Check size={16} />}
          {module.status === "locked" && <Lock size={14} />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-text-primary">{module.title}</p>
            {module.lockedByPlan ? (
              <Badge variant="premium" size="md">
                <Crown size={13} className="mr-1 inline" />
                Intensive Pro
              </Badge>
            ) : (
              STATUS_BADGE[module.status]
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            {module.lockedByPlan ? "Upgrade to Intensive Pro to unlock" : `${completedCount}/${module.lessons.length} lessons completed`}
          </p>
        </div>
        <span className="text-text-muted shrink-0">{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4 flex flex-col gap-4">
          {module.lessons.length === 0 && <p className="text-sm text-text-muted">No lessons yet.</p>}
          {module.lessons.map((lesson) => {
            const isLive = lesson.type === "LIVE";
            const isLiveNow = isLive && lesson.liveClass?.isLiveNow;
            const Icon = TYPE_ICON[lesson.type];
            const learnHref = `/courses/${courseSlug}/learn/${lesson.id}`;
            const hasRecording = lesson.liveClass?.status === "COMPLETED" && lesson.liveClass.hasRecording;

            return (
              <div key={lesson.id} className="flex items-center gap-3">
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 ${
                    lesson.completed ? "bg-accent text-accent-foreground" : "border-2 border-dashed border-border-light"
                  }`}
                >
                  {lesson.completed && <Check size={12} />}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className="text-text-muted shrink-0" />
                    <p
                      className={`text-sm font-medium truncate ${
                        isLocked || lesson.lockedByPlan ? "text-text-muted" : "text-text-primary"
                      }`}
                    >
                      {lesson.title}
                    </p>
                    {isLiveNow && <Badge variant="info">LIVE</Badge>}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                    {isLive && lesson.liveClass ? (
                      formatSchedule(lesson.liveClass.startTime, lesson.liveClass.endTime)
                    ) : (
                      <>
                        <Clock size={11} />
                        {formatDuration(lesson.durationMinutes)}
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {lesson.lockedByPlan ? (
                    <span
                      title="Upgrade to Intensive Pro to unlock"
                      className="inline-flex items-center gap-1.5 bg-premium-light text-premium-foreground rounded-md px-3 py-1.5 text-sm font-medium cursor-not-allowed"
                    >
                      <Crown size={13} />
                      Intensive Pro
                    </span>
                  ) : isLive ? (
                    isLiveNow ? (
                      <Link
                        href={learnHref}
                        className="inline-flex items-center gap-1.5 bg-accent text-accent-foreground rounded-md px-3 py-1.5 text-xs font-medium animate-pulse"
                      >
                        <Radio size={12} />
                        Live
                      </Link>
                    ) : hasRecording ? (
                      <Link
                        href={learnHref}
                        className="inline-flex items-center bg-surface border border-border text-text-primary rounded-md px-3 py-1.5 text-xs font-medium hover:bg-surface-secondary transition-colors"
                      >
                        Watch Recording
                      </Link>
                    ) : (
                      <>
                        <Badge variant="neutral">
                          {lesson.liveClass?.status === "COMPLETED" ? "Processing" : "Upcoming"}
                        </Badge>
                        <span className="inline-flex items-center gap-1.5 bg-surface-secondary text-text-muted rounded-md px-3 py-1.5 text-xs font-medium cursor-not-allowed">
                          Watch Recording
                          <Lock size={11} />
                        </span>
                      </>
                    )
                  ) : isLocked ? (
                    <span className="inline-flex items-center gap-1.5 bg-surface-secondary text-text-muted rounded-md px-3 py-1.5 text-xs font-medium cursor-not-allowed">
                      Locked
                      <Lock size={11} />
                    </span>
                  ) : (
                    <Link
                      href={learnHref}
                      className="inline-flex items-center bg-surface border border-border text-text-primary rounded-md px-3 py-1.5 text-xs font-medium hover:bg-surface-secondary transition-colors"
                    >
                      {lesson.completed ? "Review" : "Start Lesson"}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
