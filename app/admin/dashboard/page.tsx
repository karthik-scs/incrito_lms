"use client";

import { useEffect, useState } from "react";
import { BookOpen, ClipboardList, GraduationCap, Users } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiJson } from "@/lib/authClient";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { StatCard } from "@/components/dashboard/StatCard";
import { UserGrowthChart } from "@/components/dashboard/UserGrowthChart";
import { EnrollmentsOverviewChart } from "@/components/dashboard/EnrollmentsOverviewChart";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { TopCoursesChart } from "@/components/dashboard/TopCoursesChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { RevenueOverviewChart } from "@/components/dashboard/RevenueOverviewChart";
import { RevenueTrendChart } from "@/components/dashboard/RevenueTrendChart";

type AdminDashboardData = {
  stats: { totalUsers: number; activeCourses: number; totalCohorts: number; totalEnrollments: number };
  userGrowth: { month: string; users: number }[];
  enrollmentsOverview: { name: string; value: number }[];
  topCourses: { course: string; enrollments: number }[];
  usersByRole: { role: string; count: number; percentage: number }[];
  revenueOverview: { source: string; revenue: number }[];
  revenueTrend: { month: string; revenue: number }[];
  totalRevenue: number;
  platformHealth: { label: string; percentage: number }[];
  activity: { type: "enrollment" | "certificate" | "course"; text: string; at: string }[];
};

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await apiJson<AdminDashboardData & { role: string }>("/api/me/dashboard");
      if (result.ok) setData(result.data);
      setLoading(false);
    }
    load();
  }, []);

  const stats = [
    { label: "Total Users", value: data?.stats.totalUsers.toLocaleString() ?? "—", icon: Users, accent: "accent" as const },
    { label: "Active Courses", value: data?.stats.activeCourses.toLocaleString() ?? "—", icon: BookOpen, accent: "info" as const },
    { label: "Total Cohorts", value: data?.stats.totalCohorts.toLocaleString() ?? "—", icon: GraduationCap, accent: "success" as const },
    { label: "Total Enrollments", value: data?.stats.totalEnrollments.toLocaleString() ?? "—", icon: ClipboardList, accent: "warning" as const },
  ];

  return (
    <AdminLayout>
      <WelcomeBanner
        greetingName={user?.firstName ?? "Admin"}
        subtitle="Here's what's happening with your platform today."
      />

      {loading && <p className="mt-8 text-sm text-text-secondary">Loading dashboard…</p>}

      {!loading && data && (
        <>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-5">
              <UserGrowthChart data={data.userGrowth} />
            </div>
            <div className="lg:col-span-4">
              <EnrollmentsOverviewChart data={data.enrollmentsOverview} />
            </div>
            <div className="lg:col-span-3 h-full">
              <QuickActions />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <div className="lg:col-span-1">
              <TopCoursesChart data={data.topCourses} />
            </div>
            <div className="lg:col-span-2">
              <RecentActivity data={data.activity} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <RevenueOverviewChart data={data.revenueOverview} />
            <RevenueTrendChart data={data.revenueTrend} />
          </div>
        </>
      )}
    </AdminLayout>
  );
}
