"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { apiJson } from "@/lib/authClient";

type Enrollment = {
  id: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "DROPPED";
  enrolledAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  cohort: { id: string; name: string; courseId: string; course: { title: string } };
};

type CohortOption = { id: string; name: string; course: { title: string } };

const STATUS_VARIANT = {
  PENDING: "neutral",
  ACTIVE: "success",
  COMPLETED: "info",
  DROPPED: "muted",
} as const;

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [cohortFilter, setCohortFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCohorts() {
    const result = await apiJson<CohortOption[]>("/api/cohorts");
    if (result.ok) setCohorts(result.data);
  }

  async function loadEnrollments(cohortId: string) {
    setLoading(true);
    setError(null);
    const query = cohortId ? `?cohortId=${cohortId}` : "";
    const result = await apiJson<Enrollment[]>(`/api/enrollments${query}`);
    if (result.ok) setEnrollments(result.data);
    else setError(result.message);
    setLoading(false);
  }

  useEffect(() => {
    loadCohorts();
  }, []);

  useEffect(() => {
    loadEnrollments(cohortFilter);
  }, [cohortFilter]);

  async function handleStatusChange(enrollment: Enrollment, status: Enrollment["status"]) {
    const result = await apiJson<Enrollment>(`/api/enrollments/${enrollment.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    await loadEnrollments(cohortFilter);
  }

  const cohortOptions = useMemo(
    () => cohorts.map((c) => ({ value: c.id, label: `${c.name} — ${c.course.title}` })),
    [cohorts]
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Enrollments</h1>
          <p className="text-sm text-text-secondary mt-1">All student enrollments across every cohort.</p>
        </div>
        <div className="w-64">
          <Select value={cohortFilter} onChange={setCohortFilter} options={cohortOptions} placeholder="All cohorts" />
        </div>
      </div>

      <div className="mt-6 bg-surface border border-border rounded-2xl">
        <DataTable
          rows={enrollments}
          rowKey={(row) => row.id}
          loading={loading}
          error={error}
          emptyMessage="No enrollments yet. Enroll students from a cohort's detail page."
          columns={[
            {
              header: "Student",
              cell: (row) => (
                <div>
                  <p className="font-medium">
                    {row.user.firstName} {row.user.lastName}
                  </p>
                  <p className="text-text-muted text-xs">{row.user.email}</p>
                </div>
              ),
            },
            {
              header: "Cohort",
              cell: (row) => (
                <Link href={`/admin/cohorts/${row.cohort.id}`} className="text-accent hover:text-accent-dark">
                  {row.cohort.name}
                </Link>
              ),
            },
            { header: "Course", cell: (row) => row.cohort.course.title },
            { header: "Status", cell: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge> },
            {
              header: "Enrolled on",
              cell: (row) => <span className="text-text-secondary">{new Date(row.enrolledAt).toLocaleDateString()}</span>,
            },
            {
              header: "",
              className: "text-right",
              cell: (row) => (
                <div className="w-36">
                  <Select
                    value={row.status}
                    onChange={(value) => handleStatusChange(row, value as Enrollment["status"])}
                    options={[
                      { value: "PENDING", label: "Pending" },
                      { value: "ACTIVE", label: "Active" },
                      { value: "COMPLETED", label: "Completed" },
                      { value: "DROPPED", label: "Dropped" },
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </AdminLayout>
  );
}
