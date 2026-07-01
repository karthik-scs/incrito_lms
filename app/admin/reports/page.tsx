"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, BarChart3, Download, GraduationCap, IndianRupee, Users } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { StatCard } from "@/components/dashboard/StatCard";
import { apiJson } from "@/lib/authClient";

type CourseRow = {
  id: string;
  title: string;
  category: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  enrollments: number;
  avgCompletion: number;
  certificatesIssued: number;
  revenue: number;
};

type CohortRow = {
  id: string;
  name: string;
  courseTitle: string;
  status: "ACTIVE" | "UPCOMING" | "COMPLETED" | "CANCELLED" | "ARCHIVED";
  startDate: string;
  endDate: string | null;
  enrolled: number;
  avgCompletion: number;
};

const COURSE_STATUS_VARIANT = { DRAFT: "neutral", PUBLISHED: "success", ARCHIVED: "muted" } as const;
const COHORT_STATUS_VARIANT = {
  ACTIVE: "success",
  UPCOMING: "info",
  COMPLETED: "neutral",
  CANCELLED: "error",
  ARCHIVED: "muted",
} as const;

/** Builds a CSV from an array of objects and triggers a real browser download — no backend export service needed for flat tabular data already in hand. */
function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [courseRes, cohortRes] = await Promise.all([
        apiJson<CourseRow[]>("/api/reports/courses"),
        apiJson<CohortRow[]>("/api/reports/cohorts"),
      ]);
      if (courseRes.ok) setCourses(courseRes.data);
      if (cohortRes.ok) setCohorts(cohortRes.data);
      setLoading(false);
    }
    load();
  }, []);

  const summary = useMemo(() => {
    const totalEnrollments = courses.reduce((sum, c) => sum + c.enrollments, 0);
    const totalRevenue = courses.reduce((sum, c) => sum + c.revenue, 0);
    const totalCertificates = courses.reduce((sum, c) => sum + c.certificatesIssued, 0);
    const weightedCompletion = courses.reduce((sum, c) => sum + c.avgCompletion * c.enrollments, 0);
    const avgCompletion = totalEnrollments ? Math.round(weightedCompletion / totalEnrollments) : 0;
    return { totalEnrollments, totalRevenue, totalCertificates, avgCompletion };
  }, [courses]);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold text-text-primary">Reports</h1>
      <p className="text-sm text-text-secondary mt-1">Platform-wide analytics and exportable reports.</p>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}

      {!loading && (
        <>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Total Enrollments" value={summary.totalEnrollments.toLocaleString()} icon={Users} accent="accent" />
            <StatCard label="Average Completion" value={`${summary.avgCompletion}%`} icon={GraduationCap} accent="info" />
            <StatCard label="Certificates Issued" value={summary.totalCertificates.toLocaleString()} icon={Award} accent="success" />
            <StatCard label="Total Revenue" value={`₹${summary.totalRevenue.toLocaleString()}`} icon={IndianRupee} accent="warning" />
          </div>

          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <BarChart3 size={16} className="text-accent" />
              Course Performance
            </h2>
            <button
              onClick={() =>
                downloadCsv(
                  "course-report.csv",
                  courses.map((c) => ({
                    Title: c.title,
                    Category: c.category,
                    Status: c.status,
                    Enrollments: c.enrollments,
                    "Avg Completion %": c.avgCompletion,
                    "Certificates Issued": c.certificatesIssued,
                    "Revenue (INR)": c.revenue,
                  }))
                )
              }
              disabled={courses.length === 0}
              className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
          <div className="mt-3 bg-surface border border-border rounded-2xl">
            <DataTable
              rows={courses}
              rowKey={(row) => row.id}
              emptyMessage="No courses yet."
              columns={[
                { header: "Course", cell: (row) => <span className="font-medium">{row.title}</span> },
                { header: "Category", cell: (row) => <span className="text-text-secondary">{row.category}</span> },
                { header: "Status", cell: (row) => <Badge variant={COURSE_STATUS_VARIANT[row.status]}>{row.status}</Badge> },
                { header: "Enrollments", cell: (row) => <span className="text-text-secondary">{row.enrollments}</span> },
                { header: "Avg Completion", cell: (row) => <span className="text-text-secondary">{row.avgCompletion}%</span> },
                { header: "Certificates", cell: (row) => <span className="text-text-secondary">{row.certificatesIssued}</span> },
                { header: "Revenue", cell: (row) => <span className="text-text-secondary">₹{row.revenue.toLocaleString()}</span> },
              ]}
            />
          </div>

          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <GraduationCap size={16} className="text-accent" />
              Cohort Performance
            </h2>
            <button
              onClick={() =>
                downloadCsv(
                  "cohort-report.csv",
                  cohorts.map((c) => ({
                    Cohort: c.name,
                    Course: c.courseTitle,
                    Status: c.status,
                    "Start Date": new Date(c.startDate).toLocaleDateString(),
                    Enrolled: c.enrolled,
                    "Avg Completion %": c.avgCompletion,
                  }))
                )
              }
              disabled={cohorts.length === 0}
              className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
          <div className="mt-3 bg-surface border border-border rounded-2xl">
            <DataTable
              rows={cohorts}
              rowKey={(row) => row.id}
              emptyMessage="No cohorts yet."
              columns={[
                { header: "Cohort", cell: (row) => <span className="font-medium">{row.name}</span> },
                { header: "Course", cell: (row) => <span className="text-text-secondary">{row.courseTitle}</span> },
                { header: "Status", cell: (row) => <Badge variant={COHORT_STATUS_VARIANT[row.status]}>{row.status}</Badge> },
                { header: "Start Date", cell: (row) => <span className="text-text-secondary">{new Date(row.startDate).toLocaleDateString()}</span> },
                { header: "Enrolled", cell: (row) => <span className="text-text-secondary">{row.enrolled}</span> },
                { header: "Avg Completion", cell: (row) => <span className="text-text-secondary">{row.avgCompletion}%</span> },
              ]}
            />
          </div>
        </>
      )}
    </AdminLayout>
  );
}
