import Link from "next/link";

export type CohortCardData = {
  id: string;
  name: string;
  courseTitle: string;
  status: "ACTIVE" | "UPCOMING" | "COMPLETED" | "CANCELLED" | "ARCHIVED";
  startDate: string;
  endDate?: string | null;
  enrolledCount: number;
  capacity?: number | null;
  managerNames?: string[];
};

const STATUS_STYLES: Record<CohortCardData["status"], string> = {
  UPCOMING: "bg-info-lightest text-info-foreground",
  ACTIVE: "bg-success-lightest text-success-foreground",
  COMPLETED: "bg-surface-muted text-text-muted",
  CANCELLED: "bg-surface-muted text-text-muted",
  ARCHIVED: "bg-surface-muted text-text-muted",
};

export function CohortCard({ cohort }: { cohort: CohortCardData }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[cohort.status]}`}>
          {cohort.status}
        </span>
        <span className="text-xs text-text-muted">
          {cohort.enrolledCount}
          {cohort.capacity ? ` / ${cohort.capacity}` : ""} enrolled
        </span>
      </div>

      <div>
        <h3 className="text-base font-semibold text-text-primary">{cohort.name}</h3>
        <p className="text-sm text-text-secondary">{cohort.courseTitle}</p>
      </div>

      <p className="text-xs text-text-muted">
        {cohort.startDate}
        {cohort.endDate ? ` – ${cohort.endDate}` : ""}
      </p>

      {cohort.managerNames && cohort.managerNames.length > 0 && (
        <p className="text-xs text-text-secondary">Cohort Manager{cohort.managerNames.length > 1 ? "s" : ""}: {cohort.managerNames.join(", ")}</p>
      )}

      <Link
        href={`/cohorts/${cohort.id}`}
        className="bg-surface border border-border text-text-primary rounded-md px-4 py-2 text-sm font-medium text-center hover:bg-surface-secondary transition-colors"
      >
        View Cohort
      </Link>
    </div>
  );
}
