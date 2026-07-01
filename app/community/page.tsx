"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, MessageSquare, Users } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/Badge";
import { apiJson } from "@/lib/authClient";
import { useAuth } from "@/components/providers/AuthProvider";

type MyCourse = {
  cohortId: string;
  cohortName: string;
  courseSlug: string;
  courseTitle: string;
};

type Community = {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  _count: { members: number; posts: number };
};

type CohortWithCourse = {
  id: string;
  name: string;
  course: { slug: string; title: string };
  mentors: { user: { id: string } }[];
  managers: { user: { id: string } }[];
};

export default function CommunityPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "Admin";

  const [courses, setCourses] = useState<MyCourse[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

    async function load() {
      setLoading(true);
      const isStaff = user!.role === "Mentor" || user!.role === "Cohort Manager";
      const [commRes, coursesRes] = await Promise.all([
        apiJson<Community[]>("/api/communities"),
        // Mentor/Cohort Manager aren't `Enrollment`-based — `/api/me/courses` would always return
        // empty for them, hiding every cohort discussion they're actually attached to. Derive their
        // course list from the cohorts they mentor/manage instead.
        isStaff ? apiJson<CohortWithCourse[]>("/api/cohorts") : apiJson<{ cohortId: string; cohortName: string; courseSlug: string; courseTitle: string }[]>("/api/me/courses"),
      ]);
      if (commRes.ok) setCommunities(commRes.data);
      if (coursesRes.ok) {
        if (isStaff) {
          const myCohorts = (coursesRes.data as CohortWithCourse[]).filter((c) =>
            user!.role === "Mentor" ? c.mentors.some((m) => m.user.id === user!.id) : c.managers.some((m) => m.user.id === user!.id)
          );
          setCourses(myCohorts.map((c) => ({ cohortId: c.id, cohortName: c.name, courseSlug: c.course.slug, courseTitle: c.course.title })));
        } else {
          setCourses(coursesRes.data as MyCourse[]);
        }
      }
      setLoading(false);
    }
    load();
  }, [authLoading, user]);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold text-text-primary">Community</h1>
      <p className="text-sm text-text-secondary mt-1">
        {isAdmin ? "All communities — standard cohort discussions and premium communities." : "Your communities and cohort discussions."}
      </p>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}

      {!loading && (
        <div className="mt-6 space-y-8">
          {/* Premium communities */}
          {communities.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Lock size={14} className="text-accent" />
                <h2 className="text-sm font-semibold text-text-primary">Premium Communities</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {communities.map((c) => (
                  <Link
                    key={c.id}
                    href={`/community/${c.id}`}
                    className="bg-surface border border-border rounded-2xl overflow-hidden hover:bg-surface-secondary transition-colors"
                  >
                    {c.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.coverUrl} alt={c.name} className="w-full h-24 object-cover" />
                    ) : (
                      <div className="w-full h-24 bg-accent-light flex items-center justify-center">
                        <MessageSquare size={24} className="text-accent" />
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-sm font-semibold text-text-primary">{c.name}</p>
                      {c.description && <p className="text-xs text-text-secondary mt-1 line-clamp-2">{c.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                        <span className="flex items-center gap-1"><Users size={11} />{c._count.members}</span>
                        <span className="flex items-center gap-1"><MessageSquare size={11} />{c._count.posts} posts</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Cohort discussions — only shown to users with enrolled courses */}
          {courses.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={14} className="text-text-secondary" />
                <h2 className="text-sm font-semibold text-text-primary">Course Discussions</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courses.map((course) => (
                  <Link
                    key={course.cohortId}
                    href={`/courses/${course.courseSlug}/discussion`}
                    className="bg-surface border border-border rounded-2xl p-4 flex items-start gap-3 hover:bg-surface-secondary transition-colors"
                  >
                    <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-surface-secondary text-text-muted shrink-0">
                      <MessageSquare size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{course.courseTitle}</p>
                      <div className="mt-1">
                        <Badge variant="accent">{course.cohortName}</Badge>
                      </div>
                      <p className="text-xs text-accent mt-1.5 font-medium">View Discussion →</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {communities.length === 0 && courses.length === 0 && (
            <p className="text-sm text-text-muted py-16 text-center bg-surface border border-border rounded-2xl">
              You haven't been added to any community yet.
            </p>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
