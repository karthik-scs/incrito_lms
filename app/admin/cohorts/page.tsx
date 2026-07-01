"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  Users,
  UsersRound,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Avatar } from "@/components/ui/Avatar";
import { CompletionRing } from "@/components/progress/CompletionRing";
import { apiJson } from "@/lib/authClient";

type CourseOption = { id: string; title: string; category: { id: string; name: string } | null };
type UserOption = { id: string; firstName: string; lastName: string; role: { name: string }; avatarUrl?: string | null };
type CohortStatus = "ACTIVE" | "UPCOMING" | "COMPLETED" | "CANCELLED" | "ARCHIVED";

type Cohort = {
  id: string;
  name: string;
  status: CohortStatus;
  startDate: string;
  endDate: string | null;
  capacity: number | null;
  courseId: string;
  course: { id: string; title: string; slug: string; category: { id: string; name: string } | null };
  managers: { user: { id: string; firstName: string; lastName: string; avatarUrl?: string | null } }[];
  mentors: { user: { id: string; firstName: string; lastName: string } }[];
  _count: { enrollments: number };
  avgCompletionPercentage: number;
  atRiskCount: number;
};

type Stats = { totalEnrolled: number; activeCohorts: number; upcomingCohorts: number; avgGradeRate: number; atRiskStudents: number };

const STATUS_VARIANT: Record<CohortStatus, "success" | "info" | "neutral" | "error" | "muted" | "accent"> = {
  ACTIVE: "accent",
  UPCOMING: "info",
  COMPLETED: "success",
  CANCELLED: "error",
  ARCHIVED: "muted",
};

const STATUS_LABEL: Record<CohortStatus, string> = {
  ACTIVE: "Active",
  UPCOMING: "Upcoming",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
};

const FILTER_TABS: { key: "ALL" | CohortStatus; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "UPCOMING", label: "Upcoming" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "ARCHIVED", label: "Archived" },
];

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"grid" | "list">("grid");
  const [activeFilter, setActiveFilter] = useState<"ALL" | CohortStatus>("ALL");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cohort | null>(null);
  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState("");
  const [managerIds, setManagerIds] = useState<string[]>([]);
  const [mentorIds, setMentorIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [capacity, setCapacity] = useState("");
  const [status, setStatus] = useState<CohortStatus>("UPCOMING");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    const [cohortsRes, coursesRes, usersRes, statsRes] = await Promise.all([
      apiJson<Cohort[]>("/api/cohorts"),
      apiJson<CourseOption[]>("/api/courses", { skipAuth: true }),
      apiJson<UserOption[]>("/api/users"),
      apiJson<Stats>("/api/cohorts/stats"),
    ]);

    if (cohortsRes.ok) setCohorts(cohortsRes.data);
    else setError(cohortsRes.message);

    if (coursesRes.ok) setCourses(coursesRes.data);
    if (usersRes.ok) setUsers(usersRes.data);
    if (statsRes.ok) setStats(statsRes.data);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setCourseId("");
    setManagerIds([]);
    setMentorIds([]);
    setStartDate("");
    setEndDate("");
    setCapacity("");
    setStatus("UPCOMING");
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(cohort: Cohort) {
    setEditing(cohort);
    setName(cohort.name);
    setCourseId(cohort.courseId);
    setManagerIds(cohort.managers.map((m) => m.user.id));
    setMentorIds(cohort.mentors.map((m) => m.user.id));
    setStartDate(cohort.startDate.slice(0, 10));
    setEndDate(cohort.endDate ? cohort.endDate.slice(0, 10) : "");
    setCapacity(cohort.capacity ? String(cohort.capacity) : "");
    setStatus(cohort.status);
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!editing && !courseId) {
      setFormError("Select a course for this cohort");
      return;
    }

    setSubmitting(true);

    const payload = {
      ...(editing ? {} : { courseId }),
      name,
      managerIds,
      mentorIds,
      status,
      startDate,
      endDate: endDate || undefined,
      capacity: capacity ? Number(capacity) : undefined,
    };

    const result = editing
      ? await apiJson<Cohort>(`/api/cohorts/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await apiJson<Cohort>("/api/cohorts", { method: "POST", body: JSON.stringify(payload) });

    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setModalOpen(false);
    await loadAll();
  }

  const courseOptions = useMemo(() => courses.map((c) => ({ value: c.id, label: c.title })), [courses]);
  const managerOptions = useMemo(
    () => users.filter((u) => u.role.name === "Cohort Manager").map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` })),
    [users]
  );
  const mentorOptions = useMemo(
    () => users.filter((u) => u.role.name === "Mentor").map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` })),
    [users]
  );
  const categoryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of courses) {
      if (c.category) seen.set(c.category.id, c.category.name);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ value: id, label: name }));
  }, [courses]);

  const tabCounts = useMemo(() => {
    const counts: Record<"ALL" | CohortStatus, number> = {
      ALL: cohorts.length,
      ACTIVE: 0,
      UPCOMING: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      ARCHIVED: 0,
    };
    for (const c of cohorts) counts[c.status]++;
    return counts;
  }, [cohorts]);

  const filteredCohorts = useMemo(() => {
    return cohorts.filter((c) => {
      if (activeFilter !== "ALL" && c.status !== activeFilter) return false;
      if (categoryFilter && c.course.category?.id !== categoryFilter) return false;
      if (search && !`${c.name} ${c.course.title}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [cohorts, activeFilter, categoryFilter, search]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Cohort Management</h1>
          <p className="text-sm text-text-secondary mt-1">Track course cohorts, launch upcoming enrollments, and check progress metrics.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Create Cohort
        </Button>
      </div>

      {stats && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface border border-border rounded-2xl p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Total Enrolled</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">{stats.totalEnrolled}</p>
              <p className="text-xs text-text-muted mt-1">Across non-archived cohorts</p>
            </div>
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-info-lightest text-info-foreground shrink-0">
              <Users size={18} />
            </span>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Active Cohorts</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">{stats.activeCohorts}</p>
              <p className="text-xs text-text-muted mt-1">{stats.upcomingCohorts} upcoming launches</p>
            </div>
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-light text-accent shrink-0">
              <UsersRound size={18} />
            </span>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Avg. Grade Rate</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">{stats.avgGradeRate}%</p>
              <p className="text-xs text-text-muted mt-1">Active & completed cohorts</p>
            </div>
            <CompletionRing percentage={stats.avgGradeRate} label={`${stats.avgGradeRate}%`} size={56} />
          </div>
          <div className="bg-surface border border-border rounded-2xl p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide">At-Risk Students</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">{stats.atRiskStudents}</p>
              <p className="text-xs text-text-muted mt-1">Require immediate mentorship</p>
            </div>
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-error/10 text-error shrink-0">
              <AlertTriangle size={18} />
            </span>
          </div>
        </div>
      )}

      <div className="mt-6 bg-surface border border-border rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeFilter === tab.key ? "bg-accent-light text-accent" : "text-text-secondary hover:bg-surface-secondary"
              }`}
            >
              {tab.label}
              <span
                className={`flex items-center justify-center rounded-full w-5 h-5 text-[11px] ${
                  activeFilter === tab.key ? "bg-accent text-accent-foreground" : "bg-surface-secondary text-text-muted"
                }`}
              >
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cohorts, courses…"
              className="pl-8 pr-3 py-1.5 w-56 bg-surface border border-border rounded-md text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <div className="w-44">
            <Select value={categoryFilter} onChange={setCategoryFilter} options={categoryOptions} placeholder="All Categories" />
          </div>
          <div className="flex items-center bg-surface-secondary rounded-md p-1 gap-0.5">
            <button
              onClick={() => setView("grid")}
              aria-label="Grid view"
              className={`p-1.5 rounded-md ${view === "grid" ? "bg-surface text-accent shadow-sm" : "text-text-muted"}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView("list")}
              aria-label="List view"
              className={`p-1.5 rounded-md ${view === "list" ? "bg-surface text-accent shadow-sm" : "text-text-muted"}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}
      {error && <p className="mt-6 text-sm text-error">{error}</p>}

      {!loading && !error && filteredCohorts.length === 0 && (
        <p className="mt-6 text-sm text-text-muted py-12 text-center bg-surface border border-border rounded-2xl">
          No cohorts match these filters.
        </p>
      )}

      {!loading && view === "grid" && filteredCohorts.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCohorts.map((cohort) => {
            const isUpcoming = cohort.status === "UPCOMING";
            const progressPercent = isUpcoming
              ? cohort.capacity
                ? Math.min(100, Math.round((cohort._count.enrollments / cohort.capacity) * 100))
                : 0
              : cohort.avgCompletionPercentage;
            const primaryManager = cohort.managers[0]?.user;
            const extraManagers = cohort.managers.length - 1;

            return (
              <div key={cohort.id} className="bg-surface border border-border rounded-2xl p-5 flex flex-col">
                <div className="flex items-center justify-between">
                  {cohort.course.category ? (
                    <Badge variant="accent">{cohort.course.category.name.toUpperCase()}</Badge>
                  ) : (
                    <span />
                  )}
                  <Badge variant={STATUS_VARIANT[cohort.status]}>{STATUS_LABEL[cohort.status]}</Badge>
                </div>

                <Link href={`/admin/cohorts/${cohort.id}`} className="mt-3 text-base font-semibold text-text-primary hover:text-accent">
                  {cohort.name}
                </Link>
                <p className="text-sm text-text-secondary">{cohort.course.title}</p>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2 min-w-0">
                    {primaryManager ? (
                      <>
                        <Avatar name={`${primaryManager.firstName} ${primaryManager.lastName}`} avatarUrl={primaryManager.avatarUrl} size={24} />
                        <span className="text-sm text-text-secondary truncate">
                          {primaryManager.firstName} {primaryManager.lastName}
                        </span>
                        {extraManagers > 0 && <Badge variant="muted">+{extraManagers}</Badge>}
                      </>
                    ) : (
                      <span className="text-sm text-text-muted">No manager assigned</span>
                    )}
                  </div>
                  <span className="text-xs text-text-muted flex items-center gap-1 shrink-0">
                    <Calendar size={12} />
                    {new Date(cohort.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">{isUpcoming ? "Enrollment Capacity" : "Course Progress"}</span>
                    <span className="font-medium text-text-primary">{progressPercent}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-surface-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wide">Students</p>
                    <p className="text-sm font-semibold text-text-primary mt-0.5">
                      {cohort._count.enrollments}
                      {cohort.capacity ? <span className="text-text-muted">/{cohort.capacity}</span> : null}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wide">At Risk</p>
                    <p className={`text-sm font-semibold mt-0.5 ${cohort.atRiskCount > 0 ? "text-error" : "text-text-primary"}`}>
                      {cohort.atRiskCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wide">{isUpcoming ? "Cap Limit" : "Avg Grade"}</p>
                    <p className="text-sm font-semibold text-text-primary mt-0.5">
                      {isUpcoming ? cohort.capacity ?? "—" : `${cohort.avgCompletionPercentage}%`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => openEdit(cohort)}
                  className="mt-4 self-start flex items-center gap-1.5 text-sm text-accent hover:text-accent-dark font-medium"
                >
                  <Pencil size={13} />
                  Edit Details
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!loading && view === "list" && filteredCohorts.length > 0 && (
        <div className="mt-6 bg-surface border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wide">
                <th className="px-4 py-3">Cohort</th>
                <th className="px-4 py-3">Manager(s)</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Students</th>
                <th className="px-4 py-3">At Risk</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredCohorts.map((cohort) => (
                <tr key={cohort.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/cohorts/${cohort.id}`} className="font-medium text-text-primary hover:text-accent">
                      {cohort.name}
                    </Link>
                    <p className="text-text-muted text-xs">{cohort.course.title}</p>
                  </td>
                  <td className="px-4 py-3">
                    {cohort.managers.length === 0 ? (
                      <span className="text-text-muted">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {cohort.managers.map((m) => (
                          <Badge key={m.user.id} variant="accent">
                            {m.user.firstName} {m.user.lastName}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(cohort.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[cohort.status]}>{STATUS_LABEL[cohort.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {cohort._count.enrollments}
                    {cohort.capacity ? `/${cohort.capacity}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cohort.atRiskCount > 0 ? "text-error font-medium" : "text-text-secondary"}>{cohort.atRiskCount}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(cohort)} className="text-accent hover:text-accent-dark font-medium text-xs">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Cohort" : "New Cohort"} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="cohort-name">
                Name
              </label>
              <input
                id="cohort-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary">Course</label>
              <div className="mt-1">
                {editing ? (
                  <p className="px-3 py-2 text-sm text-text-secondary bg-surface-secondary rounded-md">{editing.course.title}</p>
                ) : (
                  <Select value={courseId} onChange={setCourseId} options={courseOptions} placeholder="Select course" />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary">Category</label>
              <p className="mt-1 px-3 py-2 text-sm text-text-secondary bg-surface-secondary rounded-md">
                {(editing
                  ? editing.course.category?.name
                  : courses.find((c) => c.id === courseId)?.category?.name) ?? "Uncategorized"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary">Status</label>
              <div className="mt-1">
                <Select
                  value={status}
                  onChange={(v) => setStatus(v as CohortStatus)}
                  options={FILTER_TABS.filter((t) => t.key !== "ALL").map((t) => ({ value: t.key, label: t.label }))}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary">Cohort manager(s)</label>
              <div className="mt-1">
                <MultiSelect values={managerIds} onChange={setManagerIds} options={managerOptions} placeholder="No managers" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary">Instructor(s)</label>
              <div className="mt-1">
                <MultiSelect values={mentorIds} onChange={setMentorIds} options={mentorOptions} placeholder="No instructors" />
              </div>
            </div>
          </div>

          {editing && (
            <div>
              <label className="text-sm font-medium text-text-secondary">Enrolled members</label>
              <p className="mt-1 px-3 py-2 text-sm text-text-secondary bg-surface-secondary rounded-md">
                {editing._count.enrollments}
                {editing.capacity ? ` / ${editing.capacity}` : ""}
                {editing.capacity != null && editing._count.enrollments >= editing.capacity && " — Cohort full"}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="cohort-start">
                Start date
              </label>
              <input
                id="cohort-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="cohort-end">
                End date
              </label>
              <input
                id="cohort-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="cohort-capacity">
                Capacity
              </label>
              <input
                id="cohort-capacity"
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>

          {formError && <p className="text-sm text-error">{formError}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Save changes" : "Create cohort"}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
