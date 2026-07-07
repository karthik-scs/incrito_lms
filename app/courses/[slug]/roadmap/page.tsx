"use client";

import { useEffect, useState, useCallback } from "react";
import { useEvent } from "@/hooks/useEvent";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarDays, Crown } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ModuleAccordion, type RoadmapModule } from "@/components/courses/ModuleAccordion";
import { CourseTabs } from "@/components/courses/CourseTabs";
import { CompletionRing } from "@/components/progress/CompletionRing";
import { Badge } from "@/components/ui/Badge";
import { apiJson } from "@/lib/authClient";

type Roadmap = {
  course: { slug: string; title: string; description: string | null };
  cohort: { id: string; name: string } | null;
  plan: "ICAP" | "INTENSIVE_PRO";
  totalLessons: number;
  completedLessons: number;
  completionPercentage: number;
  modules: RoadmapModule[];
};

export default function CourseRoadmapPage() {
  const params = useParams<{ slug: string }>();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await apiJson<Roadmap>(`/api/me/courses/${params.slug}/roadmap`);
    if (result.ok) setRoadmap(result.data);
    else setError(result.message);
    setLoading(false);
  }, [params.slug]);

  useEffect(() => { load(); }, [load]);

  // Refresh when a lesson is completed or a live class goes live/ends.
  useEvent("progress", load);
  useEvent("live_class", load);

  return (
    <AdminLayout>
      {loading && <p className="text-sm text-text-secondary">Loading…</p>}
      {error && <p className="text-sm text-error">{error}</p>}

      {roadmap && (
        <>
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

          <div className="mt-6 flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-text-primary">Course Roadmap</h1>
                {roadmap.plan === "INTENSIVE_PRO" ? (
                  <Badge variant="premium" size="md">
                    <Crown size={13} className="mr-1 inline" />
                    Intensive Pro
                  </Badge>
                ) : (
                  <span className="text-xs font-medium bg-surface-secondary text-text-secondary rounded-full px-2.5 py-1">
                    ICAP plan
                  </span>
                )}
              </div>
              <p className="text-sm text-text-secondary mt-1">
                Track your learning journey. Lessons will be unlocked after live sessions.
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-text-secondary">Your Progress</p>
                <p className="text-sm font-semibold text-accent">{roadmap.completionPercentage}% complete</p>
              </div>
              <CompletionRing
                percentage={roadmap.completionPercentage}
                label={`${roadmap.completedLessons} / ${roadmap.totalLessons}`}
              />
              <Link
                href="/calendar"
                className="inline-flex items-center gap-1.5 bg-surface border border-border text-text-primary rounded-md px-4 py-2 text-sm font-medium hover:bg-surface-secondary transition-colors"
              >
                <CalendarDays size={16} />
                View Calendar
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {roadmap.modules.length === 0 && (
              <p className="text-sm text-text-muted py-12 text-center bg-surface border border-border rounded-2xl">
                This course doesn't have any modules yet.
              </p>
            )}
            {roadmap.modules.map((module, index) => (
              <ModuleAccordion key={module.id} module={module} courseSlug={roadmap.course.slug} defaultOpen={index < 2} />
            ))}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
