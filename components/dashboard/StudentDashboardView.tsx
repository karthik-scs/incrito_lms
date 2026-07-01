import Link from "next/link";
import { Award, BookOpen, Calendar, CheckCircle2, Radio, Video } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type Course = {
  enrollmentId: string;
  cohortId: string;
  cohortName: string;
  courseSlug: string;
  courseTitle: string;
  thumbnailUrl: string | null;
  progressPercent: number;
  nextLessonId: string | null;
  isComplete: boolean;
};

type LiveEvent = {
  lessonId: string;
  title: string;
  courseSlug: string;
  liveClass: { startTime: string; status: string; isLiveNow: boolean };
};

type Notification = { id: string; title: string; message: string; createdAt: string };

export function StudentDashboardView({
  stats,
  courses,
  upcomingLive,
  notifications,
}: {
  stats: { enrolledCourses: number; completedCourses: number; upcomingLiveClasses: number; certificatesEarned: number };
  courses: Course[];
  upcomingLive: LiveEvent[];
  notifications: Notification[];
}) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={BookOpen} label="Enrolled Courses" value={String(stats.enrolledCourses)} accent="accent" />
        <StatCard icon={CheckCircle2} label="Completed" value={String(stats.completedCourses)} accent="success" />
        <StatCard icon={Video} label="Upcoming Live Classes" value={String(stats.upcomingLiveClasses)} accent="info" />
        <StatCard icon={Award} label="Certificates Earned" value={String(stats.certificatesEarned)} accent="warning" />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardCard title="Continue Learning">
            {courses.length === 0 && <p className="text-sm text-text-muted py-4 text-center">You're not enrolled in any courses yet.</p>}
            <div className="flex flex-col gap-3">
              {courses.map((course) => (
                <div key={course.enrollmentId} className="flex items-center gap-4 rounded-lg border border-border p-3">
                  <div className="w-16 h-16 rounded-md bg-surface-secondary overflow-hidden shrink-0">
                    {course.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={course.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary truncate">{course.courseTitle}</p>
                      <Badge variant="accent">{course.cohortName}</Badge>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-surface-secondary overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${course.progressPercent}%` }} />
                    </div>
                    <p className="text-xs text-text-muted mt-1">{course.progressPercent}% complete</p>
                  </div>
                  <Link
                    href={
                      course.isComplete
                        ? `/courses/${course.courseSlug}/certificate`
                        : course.nextLessonId
                          ? `/courses/${course.courseSlug}/learn/${course.nextLessonId}`
                          : `/courses/${course.courseSlug}/roadmap`
                    }
                  >
                    <Button variant="secondary" className="px-3 py-1.5 text-xs shrink-0">
                      {course.isComplete ? "View Certificate" : "Resume"}
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
                <span
                  className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${
                    event.liveClass.isLiveNow ? "bg-error/10 text-error" : "bg-accent-light text-accent"
                  }`}
                >
                  {event.liveClass.isLiveNow ? <Radio size={15} className="animate-pulse" /> : <Calendar size={15} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">{event.title}</p>
                  <p className="text-xs text-text-muted">
                    {new Date(event.liveClass.startTime).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {event.liveClass.isLiveNow && (
                  <Link href={`/courses/${event.courseSlug}/learn/${event.lessonId}`}>
                    <Badge variant="error">● Live</Badge>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      <div className="mt-6">
        <DashboardCard title="Recent Notifications">
          {notifications.length === 0 && <p className="text-sm text-text-muted py-4 text-center">You're all caught up.</p>}
          <div className="flex flex-col gap-3">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="text-text-primary font-medium">{n.title}</p>
                  <p className="text-text-secondary">{n.message}</p>
                </div>
                <span className="text-xs text-text-muted shrink-0">{new Date(n.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </>
  );
}
