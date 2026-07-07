"use client";

import { useEffect, useState, useCallback } from "react";
import { useEvent } from "@/hooks/useEvent";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAuth } from "@/components/providers/AuthProvider";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { StudentDashboardView } from "@/components/dashboard/StudentDashboardView";
import { MentorDashboardView } from "@/components/dashboard/MentorDashboardView";
import { CohortManagerDashboardView } from "@/components/dashboard/CohortManagerDashboardView";
import { apiJson } from "@/lib/authClient";

type DashboardResponse =
  | ({ role: "Student" } & React.ComponentProps<typeof StudentDashboardView>)
  | ({ role: "Mentor" } & React.ComponentProps<typeof MentorDashboardView>)
  | ({ role: "Cohort Manager" } & React.ComponentProps<typeof CohortManagerDashboardView>);

const SUBTITLE: Record<DashboardResponse["role"], string> = {
  Student: "Here's where you left off.",
  Mentor: "Here's what's happening across your cohorts.",
  "Cohort Manager": "Here's how your cohorts are doing.",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    apiJson<DashboardResponse>("/api/me/dashboard").then((res) => {
      if (res.ok) setData(res.data);
      else setError(res.message);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh stats when lessons are completed or enrollments change.
  useEvent("progress", load);
  useEvent("enrollment", load);

  return (
    <AdminLayout>
      <WelcomeBanner greetingName={user?.firstName ?? ""} subtitle={data ? SUBTITLE[data.role] : "Loading…"} />

      <div className="mt-8">
        {error && <p className="text-sm text-error">{error}</p>}
        {!data && !error && <p className="text-sm text-text-secondary">Loading…</p>}
        {data?.role === "Student" && <StudentDashboardView {...data} />}
        {data?.role === "Mentor" && <MentorDashboardView {...data} />}
        {data?.role === "Cohort Manager" && <CohortManagerDashboardView {...data} />}
      </div>
    </AdminLayout>
  );
}
