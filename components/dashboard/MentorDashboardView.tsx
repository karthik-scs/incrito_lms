import Link from "next/link";
import { Calendar, ClipboardList, GraduationCap, Radio, Users } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type Cohort = {
  id: string;
  name: string;
  status: string;
  course: { title: string; slug: string };
  _count: { enrollments: number };
  capacity: number | null;
  avgCompletionPercentage: number;
};

type LiveEvent = {
  id: string;
  title: string;
  startTime: string;
  hostStartUrl: string | null;
  isLiveNow: boolean;
  lesson: { id: string; title: string } | null;
};

type PendingSubmission = {
  id: string;
  submittedAt: string;
  user: { firstName: string; lastName: string };
  assignment: { title: string; maxMarks: number; course: { title: string; slug: string } };
};

export function MentorDashboardView({
  stats,
  cohorts,
  upcomingLive,
  pendingSubmissions,
}: {
  stats: { myCohorts: number; myStudents: number; upcomingLiveClasses: number; pendingGrading: number };
  cohorts: Cohort[];
  upcomingLive: LiveEvent[];
  pendingSubmissions: PendingSubmission[];
}) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={GraduationCap} label="My Cohorts" value={String(stats.myCohorts)} accent="accent" />
        <StatCard icon={Users} label="My Students" value={String(stats.myStudents)} accent="info" />
        <StatCard icon={Calendar} label="Upcoming Live Classes" value={String(stats.upcomingLiveClasses)} accent="success" />
        <StatCard icon={ClipboardList} label="Pending Grading" value={String(stats.pendingGrading)} accent="warning" />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardCard title="My Cohorts">
            {cohorts.length === 0 && <p className="text-sm text-text-muted py-4 text-center">You're not assigned to any cohorts yet.</p>}
            <div className="flex flex-col gap-3">
              {cohorts.map((cohort) => (
                <div key={cohort.id} className="flex items-center gap-4 rounded-lg border border-border p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary truncate">{cohort.name}</p>
                      <Badge variant="neutral">{cohort.status}</Badge>
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
                      View
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
              <div key={event.id} className="flex items-center gap-3">
                <span
                  className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${
                    event.isLiveNow ? "bg-error/10 text-error" : "bg-accent-light text-accent"
                  }`}
                >
                  {event.isLiveNow ? <Radio size={15} className="animate-pulse" /> : <Calendar size={15} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">{event.title}</p>
                  <p className="text-xs text-text-muted">
                    {new Date(event.startTime).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                {event.isLiveNow && event.hostStartUrl && (
                  <a href={event.hostStartUrl} target="_blank" rel="noreferrer">
                    <Badge variant="error">Host now</Badge>
                  </a>
                )}
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      <div className="mt-6">
        <DashboardCard title="Submissions Awaiting Grading">
          {pendingSubmissions.length === 0 && <p className="text-sm text-text-muted py-4 text-center">Nothing waiting on you right now.</p>}
          <div className="flex flex-col gap-3">
            {pendingSubmissions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="text-text-primary font-medium">
                    {s.user.firstName} {s.user.lastName} — {s.assignment.title}
                  </p>
                  <p className="text-text-secondary text-xs">{s.assignment.course.title}</p>
                </div>
                <Link href={`/admin/courses/${s.assignment.course.slug}`}>
                  <Button variant="secondary" className="px-3 py-1.5 text-xs shrink-0">
                    Grade
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </>
  );
}
