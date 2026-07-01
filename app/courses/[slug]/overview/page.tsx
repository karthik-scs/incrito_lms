"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BarChart2, BookOpen, Calendar, CheckCircle2, Clock, HelpCircle, PlayCircle, Trophy, Users } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { CourseTabs } from "@/components/courses/CourseTabs";
import { CompletionRing } from "@/components/progress/CompletionRing";
import { Badge } from "@/components/ui/Badge";
import { apiJson } from "@/lib/authClient";

type Roadmap = {
  course: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    mentor: { firstName: string; lastName: string };
  };
  cohort: { id: string; name: string };
  enrolledAt: string;
  totalLessons: number;
  completedLessons: number;
  totalDurationMinutes: number;
  completionPercentage: number;
  modules: {
    lessons: { id: string; title: string; completed: boolean; type: string; liveClass: { startTime: string; status: string } | null }[];
  }[];
};

type LeaderboardEntry = { userId: string; points: number; rank: number; user: { firstName: string; lastName: string } };
type ActivityEvent = { type: string; label: string; at: string };

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function CourseOverviewPage() {
  const params = useParams<{ slug: string }>();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const roadmapRes = await apiJson<Roadmap>(`/api/me/courses/${params.slug}/roadmap`);
      if (!roadmapRes.ok) {
        setError(roadmapRes.message);
        setLoading(false);
        return;
      }
      setRoadmap(roadmapRes.data);

      const [leaderboardRes, activityRes] = await Promise.all([
        apiJson<LeaderboardEntry[]>(`/api/leaderboard?cohortId=${roadmapRes.data.cohort.id}`),
        apiJson<ActivityEvent[]>(`/api/me/courses/${roadmapRes.data.course.id}/activity`),
      ]);
      if (leaderboardRes.ok) setLeaderboard(leaderboardRes.data.slice(0, 3));
      if (activityRes.ok) setActivity(activityRes.data);
      setLoading(false);
    }
    load();
  }, [params.slug]);

  if (loading) {
    return (
      <AdminLayout>
        <p className="text-sm text-text-secondary">Loading…</p>
      </AdminLayout>
    );
  }

  if (error || !roadmap) {
    return (
      <AdminLayout>
        <p className="text-sm text-error">{error ?? "Course not found."}</p>
      </AdminLayout>
    );
  }

  const allLessons = roadmap.modules.flatMap((m) => m.lessons);
  const nextLesson = allLessons.find((l) => !l.completed) ?? allLessons[allLessons.length - 1];
  const upcomingSessions = allLessons
    .filter((l) => l.type === "LIVE" && l.liveClass?.status === "SCHEDULED")
    .sort((a, b) => new Date(a.liveClass!.startTime).getTime() - new Date(b.liveClass!.startTime).getTime())
    .slice(0, 3);

  return (
    <AdminLayout>
      <nav className="text-sm text-text-secondary flex items-center gap-1.5">
        <Link href="/courses" className="text-accent hover:text-accent-dark">
          My Courses
        </Link>
        <span>›</span>
        <span className="text-text-primary">{roadmap.course.title}</span>
      </nav>

      <div className="mt-4">
        <CourseTabs courseSlug={roadmap.course.slug} active="overview" certificateLocked={roadmap.completionPercentage < 100} />
      </div>

      <div className="mt-6 flex items-start justify-between gap-6 flex-wrap">
        <div className="flex items-start gap-4">
          <span className="flex items-center justify-center w-16 h-16 rounded-xl bg-accent-light text-accent shrink-0">
            <BookOpen size={28} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">{roadmap.course.title}</h1>
            <p className="text-sm text-text-secondary mt-1">
              {roadmap.course.description ?? "Continue your learning journey and track your progress."}
            </p>
          </div>
        </div>

        {nextLesson && (
          <Link
            href={`/courses/${roadmap.course.slug}/learn/${nextLesson.id}`}
            className="inline-flex items-center gap-1.5 bg-accent text-accent-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-accent-dark transition-colors shrink-0"
          >
            <PlayCircle size={16} />
            Continue Learning
          </Link>
        )}
      </div>

      <div className="mt-4 flex items-center gap-8 flex-wrap text-sm">
        <span className="flex items-center gap-1.5 text-text-secondary">
          <Users size={14} className="text-accent" />
          Instructor <span className="text-text-primary font-medium">{roadmap.course.mentor.firstName} {roadmap.course.mentor.lastName}</span>
        </span>
        <span className="flex items-center gap-1.5 text-text-secondary">
          <Calendar size={14} className="text-accent" />
          Enrolled On <span className="text-text-primary font-medium">{new Date(roadmap.enrolledAt).toLocaleDateString()}</span>
        </span>
        <span className="flex items-center gap-1.5 text-text-secondary">
          <Clock size={14} className="text-accent" />
          Total Duration <span className="text-text-primary font-medium">{formatDuration(roadmap.totalDurationMinutes)}</span>
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="text-base font-semibold text-text-primary">Course Analytics</h2>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-border-light rounded-xl p-4 flex flex-col items-center">
              <p className="text-sm font-semibold text-text-primary self-start flex items-center gap-1.5">
                <BarChart2 size={14} className="text-accent" />
                Progress
              </p>
              <CompletionRing percentage={roadmap.completionPercentage} label={`${roadmap.completionPercentage}%`} size={88} />
              <p className="text-xs text-text-secondary mt-2">
                {roadmap.completedLessons} of {roadmap.totalLessons} lessons
              </p>
            </div>

            <div className="border border-border-light rounded-xl p-4">
              <p className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                <Trophy size={14} className="text-accent" />
                Leaderboard
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {leaderboard.length === 0 && <p className="text-xs text-text-muted">No scores yet.</p>}
                {leaderboard.map((entry) => (
                  <div key={entry.userId} className="flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-accent-light text-accent text-xs font-semibold flex items-center justify-center">
                      {entry.rank}
                    </span>
                    <span className="flex-1 truncate text-text-primary">
                      {entry.user.firstName} {entry.user.lastName}
                    </span>
                    <span className="text-text-secondary text-xs">{entry.points} IP</span>
                  </div>
                ))}
              </div>
              <Link href={`/courses/${roadmap.course.slug}/leaderboard`} className="text-xs text-accent hover:text-accent-dark font-medium mt-3 inline-block">
                View Full Leaderboard
              </Link>
            </div>

            <div className="border border-border-light rounded-xl p-4">
              <p className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                <HelpCircle size={14} className="text-accent" />
                Quizzes
              </p>
              <p className="text-2xl font-bold text-text-primary mt-3">{activity.filter((a) => a.type === "assessment_attempted").length}</p>
              <p className="text-xs text-text-secondary mt-1">Attempted so far</p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-text-primary">Recent Activity</h2>
          <div className="mt-3 flex flex-col gap-3">
            {activity.length === 0 && <p className="text-sm text-text-muted">No activity yet.</p>}
            {activity.map((event, index) => (
              <div key={index} className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-accent-light text-accent shrink-0 mt-0.5">
                  <CheckCircle2 size={13} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-text-primary">{event.label}</p>
                  <p className="text-xs text-text-muted mt-0.5">{new Date(event.at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-surface border border-border rounded-2xl p-6">
        <h2 className="text-base font-semibold text-text-primary flex items-center gap-1.5">
          <Clock size={16} className="text-accent" />
          Upcoming Live Sessions
        </h2>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {upcomingSessions.length === 0 && <p className="text-sm text-text-muted">No upcoming sessions scheduled.</p>}
          {upcomingSessions.map((lesson) => (
            <div key={lesson.id} className="border border-border-light rounded-xl p-3">
              <Badge variant="info">Live Class</Badge>
              <p className="text-sm font-medium text-text-primary mt-2">{lesson.title}</p>
              <p className="text-xs text-text-secondary mt-1 flex items-center gap-1.5">
                <Calendar size={11} />
                {new Date(lesson.liveClass!.startTime).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
