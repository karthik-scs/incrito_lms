"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Plus, Users, BookOpen, X, ChevronRight, Lock, Unlock } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/DataTable";
import { Avatar } from "@/components/ui/Avatar";
import { CurriculumEditor } from "@/components/admin/CurriculumEditor";
import { apiJson } from "@/lib/authClient";

type UserOption = { id: string; firstName: string; lastName: string; email: string; role: { name: string } };

type Cohort = {
  id: string;
  name: string;
  status: string;
  unlockMode: "SEQUENTIAL" | "FREE";
  startDate: string;
  endDate: string | null;
  capacity: number | null;
  course: { id: string; title: string; slug: string };
  managers: { user: { id: string; firstName: string; lastName: string; email: string } }[];
  mentors: { user: { id: string; firstName: string; lastName: string; email: string } }[];
  _count: { enrollments: number };
};

type Enrollment = {
  id: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "DROPPED";
  enrolledAt: string;
  plan: "ICAP" | "INTENSIVE_PRO";
  user: { id: string; firstName: string; lastName: string; email: string };
};

type ProgressRow = {
  enrollmentId: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  status: string;
  completionPercentage: number;
  lastActivityAt: string | null;
};

type Post = {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  _count: { comments: number; reactions: number };
};

const PLAN_OPTIONS = [
  { value: "ICAP", label: "ICAP" },
  { value: "INTENSIVE_PRO", label: "Intensive Pro" },
];

const ENROLLMENT_STATUS_VARIANT = {
  PENDING: "neutral",
  ACTIVE: "success",
  COMPLETED: "info",
  DROPPED: "muted",
} as const;

type Tab = "curriculum" | "members" | "discussions";

export default function CohortDetailPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const params = useParams<{ id: string }>();
  const cohortId = params.id;

  const [tab, setTab] = useState<Tab>("curriculum");
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newMentorId, setNewMentorId] = useState("");
  const [newManagerId, setNewManagerId] = useState("");
  const [newStudentId, setNewStudentId] = useState("");
  const [newStudentPlan, setNewStudentPlan] = useState<"ICAP" | "INTENSIVE_PRO">("ICAP");
  const [mentorError, setMentorError] = useState<string | null>(null);
  const [managerError, setManagerError] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [unlockSaving, setUnlockSaving] = useState(false);

  const isCM = user?.role === "Cohort Manager";
  const isMentor = user?.role === "Mentor";
  const canManageCurriculum =
    isAdmin ||
    (cohort?.mentors.some((m) => m.user.id === user?.id) ?? false) ||
    (cohort?.managers.some((m) => m.user.id === user?.id) ?? false);
  const canManageMembers = isAdmin || isCM;

  async function load() {
    setLoading(true);
    setError(null);
    const [cohortRes, enrollmentsRes, usersRes, progressRes] = await Promise.all([
      apiJson<Cohort>(`/api/cohorts/${cohortId}`),
      apiJson<Enrollment[]>(`/api/enrollments?cohortId=${cohortId}`),
      apiJson<UserOption[]>("/api/users"),
      apiJson<ProgressRow[]>(`/api/cohorts/${cohortId}/progress`),
    ]);

    if (cohortRes.ok) setCohort(cohortRes.data);
    else setError(cohortRes.message);

    if (enrollmentsRes.ok) setEnrollments(enrollmentsRes.data);
    if (usersRes.ok) setUsers(usersRes.data);
    if (progressRes.ok) setProgressRows(progressRes.data);

    setLoading(false);
  }

  async function loadDiscussions() {
    const res = await apiJson<Post[]>(`/api/discussions?cohortId=${cohortId}`);
    if (res.ok) setPosts(res.data);
  }

  useEffect(() => { load(); }, [cohortId]);

  useEffect(() => {
    if (tab === "discussions") loadDiscussions();
  }, [tab]);

  async function handleUnlockModeChange(newMode: "SEQUENTIAL" | "FREE") {
    if (!cohort) return;
    setUnlockSaving(true);
    const result = await apiJson<Cohort>(`/api/cohorts/${cohortId}`, {
      method: "PATCH",
      body: JSON.stringify({ unlockMode: newMode }),
    });
    setUnlockSaving(false);
    if (result.ok) setCohort(result.data);
  }

  async function handleAddMentor() {
    if (!newMentorId) return;
    setMentorError(null);
    const result = await apiJson<Cohort>(`/api/cohorts/${cohortId}/mentors`, {
      method: "POST",
      body: JSON.stringify({ userId: newMentorId }),
    });
    if (!result.ok) { setMentorError(result.message); return; }
    setCohort(result.data);
    setNewMentorId("");
  }

  async function handleRemoveMentor(userId: string) {
    const result = await apiJson<Cohort>(`/api/cohorts/${cohortId}/mentors/${userId}`, { method: "DELETE" });
    if (!result.ok) { window.alert(result.message); return; }
    setCohort(result.data);
  }

  async function handleAddManager() {
    if (!newManagerId) return;
    setManagerError(null);
    const result = await apiJson<Cohort>(`/api/cohorts/${cohortId}/managers`, {
      method: "POST",
      body: JSON.stringify({ userId: newManagerId }),
    });
    if (!result.ok) { setManagerError(result.message); return; }
    setCohort(result.data);
    setNewManagerId("");
  }

  async function handleRemoveManager(userId: string) {
    const result = await apiJson<Cohort>(`/api/cohorts/${cohortId}/managers/${userId}`, { method: "DELETE" });
    if (!result.ok) { window.alert(result.message); return; }
    setCohort(result.data);
  }

  async function handleEnroll() {
    if (!newStudentId) return;
    setEnrollError(null);
    const result = await apiJson<Enrollment>("/api/enrollments", {
      method: "POST",
      body: JSON.stringify({ userId: newStudentId, cohortId, plan: newStudentPlan }),
    });
    if (!result.ok) { setEnrollError(result.message); return; }
    setEnrollments((prev) => [result.data, ...prev]);
    setNewStudentId("");
    setNewStudentPlan("ICAP");
    setCohort((prev) => (prev ? { ...prev, _count: { enrollments: prev._count.enrollments + 1 } } : prev));
  }

  async function handlePlanChange(enrollmentId: string, plan: "ICAP" | "INTENSIVE_PRO") {
    const result = await apiJson<Enrollment>(`/api/enrollments/${enrollmentId}/plan`, {
      method: "PATCH",
      body: JSON.stringify({ plan }),
    });
    if (!result.ok) { window.alert(result.message); return; }
    setEnrollments((prev) => prev.map((e) => (e.id === enrollmentId ? result.data : e)));
  }

  async function handleUnenroll(enrollmentId: string) {
    if (!window.confirm("Remove this enrollment?")) return;
    const result = await apiJson(`/api/enrollments/${enrollmentId}`, { method: "DELETE" });
    if (!result.ok) { window.alert(result.message); return; }
    setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
    setCohort((prev) => (prev ? { ...prev, _count: { enrollments: Math.max(0, prev._count.enrollments - 1) } } : prev));
  }

  const mentorOptions = useMemo(() => {
    const assignedIds = new Set(cohort?.mentors.map((m) => m.user.id));
    return users.filter((u) => u.role.name === "Mentor" && !assignedIds.has(u.id)).map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }));
  }, [users, cohort]);

  const managerOptions = useMemo(() => {
    const assignedIds = new Set(cohort?.managers.map((m) => m.user.id));
    return users.filter((u) => u.role.name === "Cohort Manager" && !assignedIds.has(u.id)).map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }));
  }, [users, cohort]);

  const studentOptions = useMemo(() => {
    const enrolledIds = new Set(enrollments.map((e) => e.user.id));
    return users.filter((u) => u.role.name === "Student" && !enrolledIds.has(u.id)).map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }));
  }, [users, enrollments]);

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "curriculum", label: "Curriculum", icon: BookOpen },
    { key: "members", label: "Members", icon: Users },
    { key: "discussions", label: "Discussions", icon: MessageSquare },
  ];

  return (
    <AdminLayout>
      <Link
        href={isAdmin ? "/admin/cohorts" : "/cohorts"}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        Back to Cohorts
      </Link>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}
      {error && <p className="mt-6 text-sm text-error">{error}</p>}

      {cohort && (
        <>
          {/* Header */}
          <div className="mt-4 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-text-primary">{cohort.name}</h1>
              <Link href={`/admin/courses/${cohort.course.slug}`} className="text-sm text-accent hover:text-accent-dark mt-0.5 inline-flex items-center gap-1">
                {cohort.course.title}
                <ChevronRight size={12} />
              </Link>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={cohort.status === "ACTIVE" ? "success" : "info"}>{cohort.status}</Badge>
              <span className="text-xs text-text-muted">{cohort._count.enrollments} students</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex gap-1 border-b border-border">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === key
                    ? "border-accent text-accent"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* ─── Curriculum Tab ─── */}
          {tab === "curriculum" && (
            <div className="mt-6 flex flex-col gap-6">
              {/* Unlock mode card */}
              <div className="bg-surface border border-border rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-text-primary">Navigation Mode</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Controls whether students must complete each lesson in order, or can navigate freely.
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    disabled={!canManageCurriculum || unlockSaving}
                    onClick={() => handleUnlockModeChange("FREE")}
                    className={`flex-1 flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                      cohort.unlockMode === "FREE"
                        ? "border-accent bg-accent-light"
                        : "border-border bg-surface-secondary hover:border-border-dark"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Unlock size={18} className={cohort.unlockMode === "FREE" ? "text-accent" : "text-text-muted"} />
                    <div>
                      <p className="text-sm font-medium text-text-primary">Free navigation</p>
                      <p className="text-xs text-text-muted mt-0.5">Students can open any lesson at any time.</p>
                    </div>
                  </button>
                  <button
                    disabled={!canManageCurriculum || unlockSaving}
                    onClick={() => handleUnlockModeChange("SEQUENTIAL")}
                    className={`flex-1 flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                      cohort.unlockMode === "SEQUENTIAL"
                        ? "border-accent bg-accent-light"
                        : "border-border bg-surface-secondary hover:border-border-dark"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Lock size={18} className={cohort.unlockMode === "SEQUENTIAL" ? "text-accent" : "text-text-muted"} />
                    <div>
                      <p className="text-sm font-medium text-text-primary">Sequential</p>
                      <p className="text-xs text-text-muted mt-0.5">Next lesson unlocks only after the current one is done.</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Curriculum editor */}
              <div className="bg-surface border border-border rounded-2xl p-6">
                <h2 className="text-base font-semibold text-text-primary mb-4">Modules & Lessons</h2>
                <CurriculumEditor
                  cohortId={cohortId}
                  courseId={cohort.course.id}
                  canManage={canManageCurriculum}
                />
              </div>
            </div>
          )}

          {/* ─── Members Tab ─── */}
          {tab === "members" && (
            <div className="mt-6 flex flex-col gap-6">
              {/* Mentors */}
              <div className="bg-surface border border-border rounded-2xl p-6">
                <h2 className="text-base font-semibold text-text-primary">Mentors</h2>
                <p className="text-sm text-text-secondary mt-1">Mentors teaching this cohort.</p>

                <div className="mt-4 flex flex-col gap-2">
                  {cohort.mentors.length === 0 && <p className="text-sm text-text-muted">No mentors assigned yet.</p>}
                  {cohort.mentors.map((m) => (
                    <div key={m.user.id} className="flex items-center justify-between bg-surface-secondary rounded-md px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={`${m.user.firstName} ${m.user.lastName}`} size={32} />
                        <div>
                          <p className="text-sm font-medium text-text-primary">{m.user.firstName} {m.user.lastName}</p>
                          <p className="text-xs text-text-muted">{m.user.email}</p>
                        </div>
                      </div>
                      {canManageMembers && (
                        <button onClick={() => handleRemoveMentor(m.user.id)} aria-label="Remove mentor" className="text-text-muted hover:text-error p-1">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {canManageMembers && (
                  <>
                    <div className="mt-4 flex gap-2">
                      <div className="flex-1">
                        <Select value={newMentorId} onChange={setNewMentorId} options={mentorOptions} placeholder="Select a mentor" />
                      </div>
                      <Button onClick={handleAddMentor} disabled={!newMentorId}>
                        <Plus size={16} /> Add
                      </Button>
                    </div>
                    {mentorError && <p className="mt-2 text-sm text-error">{mentorError}</p>}
                  </>
                )}
              </div>

              {/* Cohort Managers — admin-only */}
              {isAdmin && (
                <div className="bg-surface border border-border rounded-2xl p-6">
                  <h2 className="text-base font-semibold text-text-primary">Cohort Managers</h2>
                  <p className="text-sm text-text-secondary mt-1">Managers responsible for this cohort.</p>

                  <div className="mt-4 flex flex-col gap-2">
                    {cohort.managers.length === 0 && <p className="text-sm text-text-muted">No managers assigned yet.</p>}
                    {cohort.managers.map((m) => (
                      <div key={m.user.id} className="flex items-center justify-between bg-surface-secondary rounded-md px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Avatar name={`${m.user.firstName} ${m.user.lastName}`} size={32} />
                          <div>
                            <p className="text-sm font-medium text-text-primary">{m.user.firstName} {m.user.lastName}</p>
                            <p className="text-xs text-text-muted">{m.user.email}</p>
                          </div>
                        </div>
                        <button onClick={() => handleRemoveManager(m.user.id)} aria-label="Remove manager" className="text-text-muted hover:text-error p-1">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <div className="flex-1">
                      <Select value={newManagerId} onChange={setNewManagerId} options={managerOptions} placeholder="Select a manager" />
                    </div>
                    <Button onClick={handleAddManager} disabled={!newManagerId}>
                      <Plus size={16} /> Add
                    </Button>
                  </div>
                  {managerError && <p className="mt-2 text-sm text-error">{managerError}</p>}
                </div>
              )}

              {/* Students */}
              <div className="bg-surface border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-base font-semibold text-text-primary">Enrolled Students</h2>
                    <p className="text-sm text-text-secondary mt-1">Students assigned to this cohort.</p>
                  </div>
                  {canManageMembers && (
                    <div className="flex gap-2 flex-wrap">
                      <div className="w-48">
                        <Select value={newStudentId} onChange={setNewStudentId} options={studentOptions} placeholder="Select a student" />
                      </div>
                      <div className="w-36">
                        <Select value={newStudentPlan} onChange={(v) => setNewStudentPlan(v as "ICAP" | "INTENSIVE_PRO")} options={PLAN_OPTIONS} />
                      </div>
                      <Button onClick={handleEnroll} disabled={!newStudentId}>
                        <Plus size={16} /> Enroll
                      </Button>
                    </div>
                  )}
                </div>
                {enrollError && <p className="mt-2 text-sm text-error">{enrollError}</p>}

                <div className="mt-4">
                  <DataTable
                    rows={enrollments}
                    rowKey={(row) => row.id}
                    emptyMessage="No students enrolled yet."
                    columns={[
                      {
                        header: "Student",
                        cell: (row) => (
                          <div className="flex items-center gap-2">
                            <Avatar name={`${row.user.firstName} ${row.user.lastName}`} size={28} />
                            <div>
                              <p className="font-medium">{row.user.firstName} {row.user.lastName}</p>
                              <p className="text-text-muted text-xs">{row.user.email}</p>
                            </div>
                          </div>
                        ),
                      },
                      {
                        header: "Status",
                        cell: (row) => <Badge variant={ENROLLMENT_STATUS_VARIANT[row.status]}>{row.status}</Badge>,
                      },
                      {
                        header: "Plan",
                        cell: (row) =>
                          canManageMembers ? (
                            <div className="w-36">
                              <Select
                                value={row.plan}
                                onChange={(v) => handlePlanChange(row.id, v as "ICAP" | "INTENSIVE_PRO")}
                                options={PLAN_OPTIONS}
                              />
                            </div>
                          ) : (
                            <span className="text-sm text-text-secondary">{row.plan}</span>
                          ),
                      },
                      {
                        header: "Enrolled on",
                        cell: (row) => new Date(row.enrolledAt).toLocaleDateString(),
                      },
                      ...(canManageMembers
                        ? [{
                            header: "",
                            className: "text-right",
                            cell: (row: Enrollment) => (
                              <button onClick={() => handleUnenroll(row.id)} className="text-sm text-error hover:opacity-80 font-medium">
                                Remove
                              </button>
                            ),
                          }]
                        : []),
                    ]}
                  />
                </div>
              </div>

              {/* Progress */}
              <div className="bg-surface border border-border rounded-2xl p-6">
                <h2 className="text-base font-semibold text-text-primary">Student Progress</h2>
                <p className="text-sm text-text-secondary mt-1">Lesson-completion progress for every enrolled student.</p>

                <div className="mt-4">
                  <DataTable
                    rows={progressRows}
                    rowKey={(row) => row.enrollmentId}
                    emptyMessage="No enrolled students yet."
                    columns={[
                      {
                        header: "Student",
                        cell: (row) => (
                          <div>
                            <p className="font-medium">{row.user.firstName} {row.user.lastName}</p>
                            <p className="text-text-muted text-xs">{row.user.email}</p>
                          </div>
                        ),
                      },
                      {
                        header: "Progress",
                        cell: (row) => (
                          <div className="flex items-center gap-2 w-40">
                            <div className="h-1.5 flex-1 rounded-full bg-border-light overflow-hidden">
                              <div className="h-full rounded-full bg-accent" style={{ width: `${row.completionPercentage}%` }} />
                            </div>
                            <span className="text-xs text-text-secondary shrink-0">{row.completionPercentage}%</span>
                          </div>
                        ),
                      },
                      {
                        header: "Last activity",
                        cell: (row) => (row.lastActivityAt ? new Date(row.lastActivityAt).toLocaleDateString() : "—"),
                      },
                    ]}
                  />
                </div>
              </div>

              {/* Cohort details */}
              <div className="bg-surface border border-border rounded-2xl p-6">
                <h2 className="text-base font-semibold text-text-primary">Cohort Details</h2>
                <dl className="mt-4 grid grid-cols-3 gap-y-3 text-sm">
                  <dt className="text-text-secondary">Start date</dt>
                  <dd className="text-text-primary col-span-2">{new Date(cohort.startDate).toLocaleDateString()}</dd>
                  <dt className="text-text-secondary">End date</dt>
                  <dd className="text-text-primary col-span-2">{cohort.endDate ? new Date(cohort.endDate).toLocaleDateString() : "—"}</dd>
                  <dt className="text-text-secondary">Capacity</dt>
                  <dd className="text-text-primary col-span-2">{cohort.capacity ?? "—"}</dd>
                  <dt className="text-text-secondary">Enrolled</dt>
                  <dd className="text-text-primary col-span-2">
                    {cohort._count.enrollments}
                    {cohort.capacity ? ` / ${cohort.capacity}` : ""}
                  </dd>
                </dl>
              </div>
            </div>
          )}

          {/* ─── Discussions Tab ─── */}
          {tab === "discussions" && (
            <div className="mt-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">Cohort Discussions</h2>
                  <p className="text-sm text-text-secondary mt-0.5">Posts and discussions for this cohort.</p>
                </div>
                <Link
                  href={`/courses/${cohort.course.slug}/discussion?cohortId=${cohortId}`}
                  className="text-sm text-accent hover:text-accent-dark flex items-center gap-1"
                >
                  Open full discussions
                  <ChevronRight size={14} />
                </Link>
              </div>

              {posts.length === 0 && (
                <div className="bg-surface border border-border rounded-2xl p-12 flex flex-col items-center text-center gap-2">
                  <MessageSquare size={28} className="text-text-muted" />
                  <p className="text-sm text-text-secondary">No discussions yet for this cohort.</p>
                </div>
              )}

              {posts.map((post) => (
                <div key={post.id} className="bg-surface border border-border rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={`${post.author.firstName} ${post.author.lastName}`} avatarUrl={post.author.avatarUrl} size={32} />
                      <div>
                        <p className="text-sm font-medium text-text-primary">{post.author.firstName} {post.author.lastName}</p>
                        <p className="text-xs text-text-muted">{new Date(post.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {post.isPinned && <Badge variant="accent">Pinned</Badge>}
                  </div>
                  <p className="text-sm font-semibold text-text-primary mt-3">{post.title}</p>
                  <p className="text-sm text-text-secondary mt-1 line-clamp-3">{post.content}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
                    <span>{post._count.reactions} reactions</span>
                    <span>{post._count.comments} comments</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
