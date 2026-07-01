import Link from "next/link";
import { BookOpen, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export type MyCourseCardData = {
  courseSlug: string;
  courseTitle: string;
  cohortName: string;
  thumbnailUrl: string | null;
  progressPercent: number;
  nextLessonTitle: string | null;
  nextLessonId: string | null;
  isComplete: boolean;
};

export function MyCourseCard({ course }: { course: MyCourseCardData }) {
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col">
      <div className="relative aspect-[16/9] bg-accent-light flex items-center justify-center">
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt={course.courseTitle} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <BookOpen size={32} className="text-accent" />
        )}
        <button
          aria-label="More options"
          className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-md bg-surface/90 text-text-secondary hover:text-text-primary"
        >
          <MoreVertical size={14} />
        </button>
        <span className="absolute bottom-3 left-3">
          <Badge variant="accent">{course.cohortName}</Badge>
        </span>
      </div>

      <div className="p-5 flex flex-col gap-3 flex-1">
        <h3 className="text-base font-semibold text-text-primary">{course.courseTitle}</h3>

        <div>
          <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
            <span>Progress: {course.progressPercent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-border-light overflow-hidden">
            <div className="h-full rounded-full bg-accent" style={{ width: `${course.progressPercent}%` }} />
          </div>
        </div>

        <div className="flex-1">
          <p className="text-xs text-text-secondary">{course.isComplete ? "Status" : "Next Lesson"}</p>
          <p className="text-sm font-medium text-text-primary mt-0.5">
            {course.isComplete ? "Course completed" : course.nextLessonTitle ?? "—"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/courses/${course.courseSlug}/roadmap`}
            className="flex-1 text-center bg-surface border border-border text-text-primary rounded-md px-4 py-2 text-sm font-medium hover:bg-surface-secondary transition-colors"
          >
            Roadmap
          </Link>
          {course.nextLessonId && (
            <Link
              href={`/courses/${course.courseSlug}/learn/${course.nextLessonId}`}
              className="flex-1 text-center bg-accent text-accent-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-accent-dark transition-colors"
            >
              {course.isComplete ? "Review" : "Resume"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
