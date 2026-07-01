import Link from "next/link";

export type CourseCardData = {
  slug: string;
  title: string;
  thumbnailUrl?: string | null;
  mentorName: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  moduleCount: number;
};

const STATUS_STYLES: Record<CourseCardData["status"], string> = {
  DRAFT: "bg-surface-secondary text-text-secondary",
  PUBLISHED: "bg-success-lightest text-success-foreground",
  ARCHIVED: "bg-surface-muted text-text-muted",
};

export function CourseCard({ course }: { course: CourseCardData }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
      <div className="aspect-video rounded-md bg-surface-secondary overflow-hidden flex items-center justify-center">
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-text-muted text-sm">No thumbnail</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[course.status]}`}>
          {course.status}
        </span>
        <span className="text-xs text-text-muted">{course.moduleCount} modules</span>
      </div>

      <div>
        <h3 className="text-base font-semibold text-text-primary">{course.title}</h3>
        <p className="text-sm text-text-secondary">{course.mentorName}</p>
      </div>

      <Link
        href={`/courses/${course.slug}`}
        className="bg-accent text-accent-foreground rounded-md px-4 py-2 text-sm font-medium text-center hover:bg-accent-dark transition-colors"
      >
        View Course
      </Link>
    </div>
  );
}
