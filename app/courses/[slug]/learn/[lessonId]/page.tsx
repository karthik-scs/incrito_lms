"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, BarChart3, Calendar, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { CourseTabs } from "@/components/courses/CourseTabs";
import { LessonContent } from "@/components/lessons/LessonContent";
import { LessonSidebar } from "@/components/lessons/LessonSidebar";
import { Button } from "@/components/ui/Button";
import { apiJson } from "@/lib/authClient";
import type { RoadmapLesson, RoadmapModule } from "@/components/courses/ModuleAccordion";

type Roadmap = {
  course: { slug: string; title: string; description: string | null };
  completionPercentage: number;
  modules: (RoadmapModule & { lessons: (RoadmapLesson & { moduleId: string; contentUrl: string | null; content: string | null; resources: { id: string; title: string; fileType: string; fileUrl: string }[] })[] })[];
};

function formatDuration(minutes: number | null) {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function LearnLessonPage() {
  const params = useParams<{ slug: string; lessonId: string }>();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const result = await apiJson<Roadmap>(`/api/me/courses/${params.slug}/roadmap`);
    if (result.ok) setRoadmap(result.data);
    else setError(result.message);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

  const allLessons = useMemo(() => roadmap?.modules.flatMap((m) => m.lessons) ?? [], [roadmap]);
  const lesson = allLessons.find((l) => l.id === params.lessonId);
  const lessonIndex = allLessons.findIndex((l) => l.id === params.lessonId);
  const previousLesson = lessonIndex > 0 ? allLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex >= 0 && lessonIndex < allLessons.length - 1 ? allLessons[lessonIndex + 1] : null;

  async function handleMarkComplete() {
    if (!lesson) return;
    setCompleting(true);
    const result = await apiJson(`/api/lessons/${lesson.id}/complete`, { method: "POST" });
    setCompleting(false);
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    await load();
  }

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

  if (!lesson) {
    return (
      <AdminLayout>
        <p className="text-sm text-text-secondary">Lesson not found.</p>
        <Link href={`/courses/${params.slug}/roadmap`} className="text-sm text-accent hover:text-accent-dark mt-2 inline-block">
          Back to roadmap
        </Link>
      </AdminLayout>
    );
  }

  if (lesson.lockedByPlan) {
    return (
      <AdminLayout>
        <div className="bg-surface border border-border rounded-2xl p-10 text-center">
          <p className="text-base font-semibold text-text-primary">This lesson is part of the Intensive Pro plan</p>
          <p className="text-sm text-text-secondary mt-1">Upgrade your plan to unlock this lesson.</p>
          <Link href={`/courses/${params.slug}/roadmap`} className="text-sm text-accent hover:text-accent-dark mt-4 inline-block">
            Back to roadmap
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const canMarkComplete = lesson.type !== "LIVE" || lesson.liveClass?.status === "COMPLETED";

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
        <CourseTabs courseSlug={roadmap.course.slug} active="roadmap" certificateLocked={roadmap.completionPercentage < 100} />
      </div>

      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{lesson.title}</h1>
          <p className="text-sm text-text-secondary mt-1">{roadmap.course.title}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div>
          <LessonContent lesson={lesson} />

          <div className="mt-4 flex items-center gap-3">
            {previousLesson ? (
              <Link
                href={`/courses/${roadmap.course.slug}/learn/${previousLesson.id}`}
                className="inline-flex items-center gap-1.5 bg-surface border border-border text-text-primary rounded-md px-4 py-2 text-sm font-medium hover:bg-surface-secondary"
              >
                <ArrowLeft size={14} />
                Previous
              </Link>
            ) : (
              <span />
            )}

            {canMarkComplete && !lesson.completed && (
              <Button onClick={handleMarkComplete} disabled={completing} className="ml-auto">
                <CheckCircle2 size={16} />
                {completing ? "Marking…" : "Mark as Complete"}
              </Button>
            )}

            {nextLesson && (
              <Link
                href={`/courses/${roadmap.course.slug}/learn/${nextLesson.id}`}
                className={`inline-flex items-center gap-1.5 bg-surface border border-border text-text-primary rounded-md px-4 py-2 text-sm font-medium hover:bg-surface-secondary ${
                  canMarkComplete && !lesson.completed ? "" : "ml-auto"
                }`}
              >
                Next
                <ArrowRight size={14} />
              </Link>
            )}
          </div>

          <div className="mt-6 bg-surface border border-border rounded-2xl p-5">
            <h2 className="text-base font-semibold text-text-primary">About This Lesson</h2>
            {roadmap.course.description && <p className="text-sm text-text-secondary mt-2">{roadmap.course.description}</p>}

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-surface-secondary rounded-lg p-3">
                <Clock size={14} className="text-accent" />
                <p className="text-xs text-text-secondary mt-1">Duration</p>
                <p className="text-sm font-medium text-text-primary">{formatDuration(lesson.durationMinutes)}</p>
              </div>
              <div className="bg-surface-secondary rounded-lg p-3">
                <BarChart3 size={14} className="text-accent" />
                <p className="text-xs text-text-secondary mt-1">Type</p>
                <p className="text-sm font-medium text-text-primary">{lesson.type}</p>
              </div>
              <div className="bg-surface-secondary rounded-lg p-3">
                <Calendar size={14} className="text-accent" />
                <p className="text-xs text-text-secondary mt-1">Lesson</p>
                <p className="text-sm font-medium text-text-primary">
                  {lessonIndex + 1} of {allLessons.length}
                </p>
              </div>
              <div className="bg-surface-secondary rounded-lg p-3">
                <TrendingUp size={14} className="text-accent" />
                <p className="text-xs text-text-secondary mt-1">Course Progress</p>
                <p className="text-sm font-medium text-text-primary">{roadmap.completionPercentage}% Complete</p>
              </div>
            </div>
          </div>
        </div>

        <LessonSidebar moduleId={lesson.moduleId} lessonId={lesson.id} resources={lesson.resources} />
      </div>
    </AdminLayout>
  );
}
