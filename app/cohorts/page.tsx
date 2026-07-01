"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Users } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiJson } from "@/lib/authClient";

type CohortStatus = "ACTIVE" | "UPCOMING" | "COMPLETED" | "CANCELLED" | "ARCHIVED";

type Cohort = {
  id: string;
  name: string;
  status: CohortStatus;
  startDate: string;
  endDate: string | null;
  capacity: number | null;
  course: { id: string; title: string; slug: string; category: { id: string; name: string } | null };
  managers: { user: { id: string; firstName: string; lastName: string } }[];
  mentors: { user: { id: string; firstName: string; lastName: string } }[];
  _count: { enrollments: number };
  avgCompletionPercentage: number;
  atRiskCount: number;
};

const STATUS_VARIANT: Record<CohortStatus, "success" | "info" | "neutral" | "error" | "muted" | "accent"> = {
  ACTIVE: "accent",
  UPCOMING: "info",
  COMPLETED: "success",
  CANCELLED: "error",
  ARCHIVED: "muted",
};

const STATUS_LABEL: Record<CohortStatus, string> = {
  ACTIVE: "Active",
  UPCOMING: "Upcoming",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
};

export default function MyCohortsPage() {
  const { user } = useAuth();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const result = await apiJson<Cohort[]>("/api/cohorts");
      if (result.ok) setCohorts(result.data);
      else setError(result.message);
      setLoading(false);
    }
    load();
  }, []);

  const myCohorts = useMemo(() => {
    if (!user) return [];
    if (user.role === "Mentor") return cohorts.filter((c) => c.mentors.some((m) => m.user.id === user.id));
    if (user.role === "Cohort Manager") return cohorts.filter((c) => c.managers.some((m) => m.user.id === user.id));
    return cohorts;
  }, [cohorts, user]);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold text-text-primary">My Cohorts</h1>
      <p className="text-sm text-text-secondary mt-1">
        {user?.role === "Mentor" ? "Cohorts you're teaching." : "Cohorts you manage."}
      </p>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}
      {error && <p className="mt-6 text-sm text-error">{error}</p>}

      {!loading && !error && myCohorts.length === 0 && (
        <p className="mt-6 text-sm text-text-muted py-12 text-center bg-surface border border-border rounded-2xl">
          You haven't been assigned to any cohorts yet.
        </p>
      )}

      {!loading && myCohorts.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {myCohorts.map((cohort) => (
            <Link
              key={cohort.id}
              href={`/admin/cohorts/${cohort.id}`}
              className="bg-surface border border-border rounded-2xl p-5 flex flex-col hover:border-accent transition-colors"
            >
              <div className="flex items-center justify-between">
                {cohort.course.category ? (
                  <Badge variant="accent">{cohort.course.category.name.toUpperCase()}</Badge>
                ) : (
                  <span />
                )}
                <Badge variant={STATUS_VARIANT[cohort.status]}>{STATUS_LABEL[cohort.status]}</Badge>
              </div>

              <p className="mt-3 text-base font-semibold text-text-primary">{cohort.name}</p>
              <p className="text-sm text-text-secondary">{cohort.course.title}</p>

              <div className="flex items-center justify-between mt-4 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {cohort._count.enrollments}
                  {cohort.capacity ? `/${cohort.capacity}` : ""} students
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(cohort.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Course Progress</span>
                  <span className="font-medium text-text-primary">{cohort.avgCompletionPercentage}%</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-surface-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${cohort.avgCompletionPercentage}%` }} />
                </div>
              </div>

              {cohort.atRiskCount > 0 && (
                <p className="mt-3 text-xs text-error font-medium">{cohort.atRiskCount} student(s) at risk</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
