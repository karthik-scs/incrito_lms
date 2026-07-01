import Link from "next/link";
import { AlertTriangle, Calendar, GraduationCap, TrendingUp, Users } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";

type Cohort = {
  id: string;
  name: string;
  status: string;
  course: { title: string; slug: string };
  _count: { enrollments: number };
  capacity: number | null;
  avgCompletionPercentage: number;
  atRiskCount: number;
};

type LiveEvent = { lessonId: string; title: string; courseTitle: string; liveClass: { startTime: string; isLiveNow: boolean } };

type Enrollment = {
  id: string;
  enrolledAt: string;
  status: string;
  user: { firstName: string; lastName: string; avatarUrl: string | null };
  cohort: { name: string };
};

export function CohortManagerDashboardView({
  stats,
  cohorts,
  upcomingLive,
  recentEnrollments,
}: {
  stats: { myCohorts: number; totalEnrolled: number; atRiskStudents: number; avgCompletion: number };
  cohorts: Cohort[];
  upcomingLive: LiveEvent[];
  recentEnrollments: Enrollment[];
}) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={GraduationCap} label="My Cohorts" value={String(stats.myCohorts)} accent="accent" />
        <StatCard icon={Users} label="Total Enrolled" value={String(stats.totalEnrolled)} accent="info" />
        <StatCard icon={AlertTriangle} label="At-Risk Students" value={String(stats.atRiskStudents)} accent="warning" />
        <StatCard icon={TrendingUp} label="Avg. Completion" value={`${stats.avgCompletion}%`} accent="success" />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardCard title="My Cohorts">
            {cohorts.length === 0 && <p className="text-sm text-text-muted py-4 text-center">You're not managing any cohorts yet.</p>}
            <div className="flex flex-col gap-3">
              {cohorts.map((cohort) => (
                <div key={cohort.id} className="flex items-center gap-4 rounded-lg border border-border p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary truncate">{cohort.name}</p>
                      <Badge variant="neutral">{cohort.status}</Badge>
                      {cohort.atRiskCount > 0 && <Badge variant="error">{cohort.atRiskCount} at risk</Badge>}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{cohort.course.title}</p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-surface-secondary overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${cohort.avgCompletionPercentage}%` }} />
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      {cohort._count.enrollments}
                      {cohort.capacity ? `/${cohort.capacity}` : ""} students · {cohort.avgCompletionPercentage}% avg completion
                    </p>
                  </div>
                  <Link href={`/admin/cohorts/${cohort.id}`}>
                    <Button variant="secondary" className="px-3 py-1.5 text-xs shrink-0">
                      Manage
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>

        <DashboardCard title="Upcoming Live Classes">
          {upcomingLive.length === 0 && <p className="text-sm text-text-muted py-4 text-center">No live classes scheduled.</p>}
          <div className="flex flex-col gap-3">
            {upcomingLive.map((event) => (
              <div key={event.lessonId} className="flex items-center gap-3">
                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-accent-light text-accent shrink-0">
                  <Calendar size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">{event.title}</p>
                  <p className="text-xs text-text-muted">{event.courseTitle}</p>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      <div className="mt-6">
        <DashboardCard title="Recent Enrollments">
          {recentEnrollments.length === 0 && <p className="text-sm text-text-muted py-4 text-center">No enrollments yet.</p>}
          <div className="flex flex-col gap-3">
            {recentEnrollments.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-3">
                  <Avatar name={`${e.user.firstName} ${e.user.lastName}`} avatarUrl={e.user.avatarUrl} size={32} />
                  <div>
                    <p className="text-text-primary font-medium">
                      {e.user.firstName} {e.user.lastName}
                    </p>
                    <p className="text-text-secondary text-xs">{e.cohort.name}</p>
                  </div>
                </div>
                <span className="text-xs text-text-muted shrink-0">{new Date(e.enrolledAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </>
  );
}
