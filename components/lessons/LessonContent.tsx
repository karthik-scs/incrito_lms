"use client";

import { useEffect, useState } from "react";
import { Calendar, Radio, Users, Video } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { YouTubePlayer } from "@/components/lessons/YouTubePlayer";
import { ZoomMeetingEmbed } from "@/components/lessons/ZoomMeetingEmbed";
import { ProtectedVideoPlayer } from "@/components/lessons/ProtectedVideoPlayer";
import { extractYouTubeId } from "@/lib/youtube";
import type { LessonLiveClass } from "@/components/courses/ModuleAccordion";

type Lesson = {
  id: string;
  title: string;
  type: "VIDEO" | "TEXT" | "PDF" | "LIVE";
  contentUrl: string | null;
  thumbnailUrl?: string | null;
  content: string | null;
  liveClass: LessonLiveClass | null;
};

function useCountdown(targetIso: string) {
  const [remainingMs, setRemainingMs] = useState(() => new Date(targetIso).getTime() - Date.now());
  useEffect(() => {
    const interval = setInterval(() => setRemainingMs(new Date(targetIso).getTime() - Date.now()), 1000);
    return () => clearInterval(interval);
  }, [targetIso]);
  return remainingMs;
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "Starting now";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function LiveSession({ lessonId, liveClass, title }: { lessonId: string; liveClass: NonNullable<Lesson["liveClass"]>; title: string }) {
  const remainingMs = useCountdown(liveClass.startTime);
  const isLiveNow = liveClass.isLiveNow;
  const cancelled = liveClass.status === "CANCELLED";

  if (isLiveNow && !cancelled) {
    return <ZoomMeetingEmbed lessonId={lessonId} joinUrl={liveClass.joinUrl} title={title} />;
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-secondary aspect-video flex flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex items-center justify-center w-16 h-16 rounded-full bg-accent-light text-accent">
        <Video size={28} />
      </span>

      {cancelled ? <Badge variant="muted">Cancelled</Badge> : <Badge variant="info">Scheduled</Badge>}

      <div>
        <p className="text-lg font-semibold text-text-primary">{title}</p>
        <p className="text-sm text-text-secondary mt-1 flex items-center justify-center gap-1.5">
          <Calendar size={14} />
          {new Date(liveClass.startTime).toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
        {liveClass.mentor && (
          <p className="text-sm text-text-secondary mt-1 flex items-center justify-center gap-1.5">
            <Users size={14} />
            Hosted by {liveClass.mentor.firstName} {liveClass.mentor.lastName}
          </p>
        )}
      </div>

      {!cancelled && <p className="text-sm text-text-muted">Starts in {formatCountdown(remainingMs)}</p>}

      {!cancelled && liveClass.joinUrl && (
        <a
          href={liveClass.joinUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent-dark font-medium text-sm transition-colors"
        >
          <Radio size={14} />
          Join Meeting
        </a>
      )}
    </div>
  );
}

export function LessonContent({ lesson }: { lesson: Lesson }) {
  const liveClass = lesson.liveClass;
  const showAsLive = lesson.type === "LIVE" && liveClass && liveClass.status !== "COMPLETED";

  if (showAsLive) {
    return <LiveSession lessonId={lesson.id} liveClass={liveClass} title={lesson.title} />;
  }

  if (lesson.type === "LIVE") {
    if (liveClass?.hasRecording) {
      return <ProtectedVideoPlayer fetchUrl={`/api/lessons/${lesson.id}/live-class/recording-url`} posterUrl={lesson.thumbnailUrl} />;
    }
    return (
      <div className="rounded-2xl border border-border bg-surface-secondary aspect-video flex items-center justify-center">
        <p className="text-sm text-text-muted">No recording is available for this session yet.</p>
      </div>
    );
  }

  if (lesson.type === "PDF" && lesson.contentUrl) {
    return (
      <div className="rounded-2xl border border-border overflow-hidden aspect-video">
        <iframe src={lesson.contentUrl} title={lesson.title} className="w-full h-full" />
      </div>
    );
  }

  if (lesson.type === "TEXT") {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 min-h-[200px]">
        <p className="text-sm text-text-primary whitespace-pre-wrap">{lesson.content || "No content yet."}</p>
      </div>
    );
  }

  if (lesson.contentUrl) {
    const youTubeId = extractYouTubeId(lesson.contentUrl);
    if (youTubeId) {
      return <YouTubePlayer videoId={youTubeId} title={lesson.title} posterUrl={lesson.thumbnailUrl} />;
    }

    // VIDEO-lesson content today is always a pasted external URL (the admin curriculum page has
    // no "upload a video file" control for this field, unlike thumbnails/recordings) — only an
    // S3-uploaded asset (our own `/api/files/...` redirect URL) goes through the protected,
    // signed-URL endpoint; a genuinely external link is served directly, since there's nothing of
    // ours to protect or sign.
    if (lesson.contentUrl.includes("/api/files/")) {
      return <ProtectedVideoPlayer fetchUrl={`/api/lessons/${lesson.id}/content-url`} posterUrl={lesson.thumbnailUrl} />;
    }

    return (
      <video controls className="w-full aspect-video rounded-2xl bg-overlay-dark" src={lesson.contentUrl} poster={lesson.thumbnailUrl ?? undefined}>
        Your browser doesn't support embedded video.
      </video>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-secondary aspect-video flex items-center justify-center">
      <p className="text-sm text-text-muted">No content available for this lesson yet.</p>
    </div>
  );
}
