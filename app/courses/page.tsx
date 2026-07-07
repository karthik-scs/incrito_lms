"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Award, BarChart3, Clock, Grid3x3, List } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { CompletionRing } from "@/components/progress/CompletionRing";
import { MyCourseCard, type MyCourseCardData } from "@/components/courses/MyCourseCard";
import { apiJson } from "@/lib/authClient";

type MyCourse = MyCourseCardData & {
  enrollmentId: string;
  cohortId: string;
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  status: string;
  lastActivityAt: string | null;
};

const SORT_OPTIONS = [
  { value: "recent", label: "Recent Activity" },
  { value: "progress", label: "Progress" },
  { value: "title", label: "Title (A-Z)" },
];

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<MyCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [sort, setSort] = useState("recent");
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const result = await apiJson<MyCourse[]>("/api/me/courses");
      if (result.ok) setCourses(result.data);
      else setError(result.message);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const rows = courses.filter((c) => (activeTab === "completed" ? c.isComplete : !c.isComplete));
    const sorted = [...rows];
    if (sort === "recent")
      sorted.sort((a, b) => {
        if (!a.lastActivityAt && !b.lastActivityAt) return 0;
        if (!a.lastActivityAt) return 1;
        if (!b.lastActivityAt) return -1;
        return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
      });
    else if (sort === "progress") sorted.sort((a, b) => b.progressPercent - a.progressPercent);
    else if (sort === "title") sorted.sort((a, b) => a.courseTitle.localeCompare(b.courseTitle));
    return sorted;
  }, [courses, activeTab, sort]);

  const activeCount = courses.filter((c) => !c.isComplete).length;
  const completedCount = courses.filter((c) => c.isComplete).length;

  const overallPercent = courses.length
    ? Math.round(courses.reduce((sum, c) => sum + c.progressPercent, 0) / courses.length)
    : 0;
  const totalLessonsCompleted = courses.reduce((sum, c) => sum + c.completedLessons, 0);

  return (
    <AdminLayout>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">My Courses</h1>
          <p className="text-sm text-text-secondary mt-1">Track your learning progress and continue where you left off.</p>

          <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-6 border-b border-border -mb-px">
              <button
                onClick={() => setActiveTab("active")}
                className={`flex items-center gap-1.5 pb-3 text-sm font-medium border-b-2 ${
                  activeTab === "active" ? "border-accent text-accent" : "border-transparent text-text-secondary"
                }`}
              >
                Active
                <Badge variant={activeTab === "active" ? "accent" : "neutral"}>{activeCount}</Badge>
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`flex items-center gap-1.5 pb-3 text-sm font-medium border-b-2 ${
                  activeTab === "completed" ? "border-accent text-accent" : "border-transparent text-text-secondary"
                }`}
              >
                Completed
                <Badge variant={activeTab === "completed" ? "accent" : "neutral"}>{completedCount}</Badge>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-48">
                <Select value={sort} onChange={setSort} options={SORT_OPTIONS} />
              </div>
              <button
                onClick={() => setView("grid")}
                aria-label="Grid view"
                className={`p-2 rounded-md border ${view === "grid" ? "bg-accent-light border-accent text-accent" : "border-border text-text-muted"}`}
              >
                <Grid3x3 size={16} />
              </button>
              <button
                onClick={() => setView("list")}
                aria-label="List view"
                className={`p-2 rounded-md border ${view === "list" ? "bg-accent-light border-accent text-accent" : "border-border text-text-muted"}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>

          {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}
          {error && <p className="mt-6 text-sm text-error">{error}</p>}

          {!loading && !error && filtered.length === 0 ? (
            <p className="text-sm text-text-muted py-12 text-center">No courses here yet.</p>
          ) : view === "grid" ? (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filtered.map((course) => (
                <MyCourseCard key={course.enrollmentId} course={course} />
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-3">
              {filtered.map((course) => (
                <div key={course.enrollmentId} className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-20 h-14 rounded-lg bg-accent-light shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{course.courseTitle}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{course.nextLessonTitle ?? "Course completed"}</p>
                    <div className="h-1.5 rounded-full bg-border-light overflow-hidden mt-2 max-w-xs">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${course.progressPercent}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/courses/${course.courseSlug}/roadmap?cohortId=${course.cohortId}`}
                      className="bg-surface border border-border text-text-primary rounded-md px-3 py-1.5 text-xs font-medium hover:bg-surface-secondary"
                    >
                      Roadmap
                    </Link>
                    {course.nextLessonId && (
                      <Link
                        href={`/courses/${course.courseSlug}/learn/${course.nextLessonId}`}
                        className="bg-accent text-accent-foreground rounded-md px-3 py-1.5 text-xs font-medium hover:bg-accent-dark"
                      >
                        Resume
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent-light text-accent shrink-0">
                <Clock size={16} />
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">Learn at your pace</p>
                <p className="text-xs text-text-secondary mt-0.5">Access course content anytime, anywhere.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent-light text-accent shrink-0">
                <BarChart3 size={16} />
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">Track your progress</p>
                <p className="text-xs text-text-secondary mt-0.5">Stay updated with your learning journey.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent-light text-accent shrink-0">
                <Award size={16} />
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">Earn certificates</p>
                <p className="text-xs text-text-secondary mt-0.5">Get recognized for your achievements.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-surface border border-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-text-primary">Your Progress</h2>
            <div className="mt-4 flex items-center gap-5">
              <CompletionRing percentage={overallPercent} label={`${overallPercent}%`} size={100} />
              <ul className="flex flex-col gap-2">
                <li className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  <span className="text-text-secondary">Active courses</span>
                  <span className="font-medium text-text-primary">{activeCount}</span>
                </li>
                <li className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-text-secondary">Completed</span>
                  <span className="font-medium text-text-primary">{completedCount}</span>
                </li>
                <li className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-info" />
                  <span className="text-text-secondary">Lessons completed</span>
                  <span className="font-medium text-text-primary">{totalLessonsCompleted}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
