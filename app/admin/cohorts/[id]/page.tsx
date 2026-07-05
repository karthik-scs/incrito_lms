"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/DataTable";
import { apiJson } from "@/lib/authClient";

type UserOption = { id: string; firstName: string; lastName: string; email: string; role: { name: string } };

type Cohort = {
  id: string;
  name: string;
  status: string;
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

const PLAN_OPTIONS = [
  { value: "ICAP", label: "ICAP" },
  { value: "INTENSIVE_PRO", label: "Intensive Pro" },
];

type ProgressRow = {
  enrollmentId: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  status: string;
  completionPercentage: number;
  lastActivityAt: string | null;
};

const ENROLLMENT_STATUS_VARIANT = {
  PENDING: "neutral",
  ACTIVE: "success",
  COMPLETED: "info",
  DROPPED: "muted",
} as const;

export default function CohortDetailPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const params = useParams<{ id: string }>();
  const cohortId = params.id;

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newMentorId, setNewMentorId] = useState("");
  const [newManagerId, setNewManagerId] = useState("");
  const [newStudentId, setNewStudentId] = useState("");
  const [newStudentPlan, setNewStudentPlan] = useState<"ICAP" | "INTENSIVE_PRO">("ICAP");
  const [mentorError, setMentorError] = useState<string | null>(null);
  const [managerError, setManagerError] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);

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

  useEffect(() => {
    load();
  }, [cohortId]);

  async function handleAddMentor() {
    if (!newMentorId) return;
    setMentorError(null);
    const result = await apiJson<Cohort>(`/api/cohorts/${cohortId}/mentors`, {
      method: "POST",
      body: JSON.stringify({ userId: newMentorId }),
    });
    if (!result.ok) {
      setMentorError(result.message);
      return;
    }
    setCohort(result.data);
    setNewMentorId("");
  }

  async function handleRemoveMentor(userId: string) {
    const result = await apiJson<Cohort>(`/api/cohorts/${cohortId}/mentors/${userId}`, { method: "DELETE" });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    setCohort(result.data);
  }

  async function handleAddManager() {
    if (!newManagerId) return;
    setManagerError(null);
    const result = await apiJson<Cohort>(`/api/cohorts/${cohortId}/managers`, {
      method: "POST",
      body: JSON.stringify({ userId: newManagerId }),
    });
    if (!result.ok) {
      setManagerError(result.message);
      return;
    }
    setCohort(result.data);
    setNewManagerId("");
  }

  async function handleRemoveManager(userId: string) {
    const result = await apiJson<Cohort>(`/api/cohorts/${cohortId}/managers/${userId}`, { method: "DELETE" });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    setCohort(result.data);
  }

  async function handleEnroll() {
    if (!newStudentId) return;
    setEnrollError(null);
    const result = await apiJson<Enrollment>("/api/enrollments", {
      method: "POST",
      body: JSON.stringify({ userId: newStudentId, cohortId, plan: newStudentPlan }),
    });
    if (!result.ok) {
      setEnrollError(result.message);
      return;
    }
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
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    setEnrollments((prev) => prev.map((e) => (e.id === enrollmentId ? result.data : e)));
  }

  async function handleUnenroll(enrollmentId: string) {
    if (!window.confirm("Remove this enrollment?")) return;
    const result = await apiJson(`/api/enrollments/${enrollmentId}`, { method: "DELETE" });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
    setCohort((prev) => (prev ? { ...prev, _count: { enrollments: Math.max(0, prev._count.enrollments - 1) } } : prev));
  }

  const mentorOptions = useMemo(() => {
    const assignedIds = new Set(cohort?.mentors.map((m) => m.user.id));
    return users.filter((u) => u.role.name === "Mentor" && !assignedIds.has(u.id)).map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }));
  }, [users, cohort]);

  const managerOptions = useMemo(() => {
    const assignedIds = new Set(cohort?.managers.map((m) => m.user.id));
    return users
      .filter((u) => u.role.name === "Cohort Manager" && !assignedIds.has(u.id))
      .map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }));
  }, [users, cohort]);

  const studentOptions = useMemo(() => {
    const enrolledIds = new Set(enrollments.map((e) => e.user.id));
    return users.filter((u) => u.role.name === "Student" && !enrolledIds.has(u.id)).map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }));
  }, [users, enrollments]);

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
          <div className="mt-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-text-primary">{cohort.name}</h1>
              <p className="text-sm text-text-secondary mt-1">{cohort.course.title}</p>
            </div>
            <Badge variant={cohort.status === "ACTIVE" ? "success" : "info"}>{cohort.status}</Badge>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h2 className="text-base font-semibold text-text-primary">Mentors</h2>
              <p className="text-sm text-text-secondary mt-1">Mentors teaching this cohort.</p>

              <div className="mt-4 flex flex-col gap-2">
                {cohort.mentors.length === 0 && <p className="text-sm text-text-muted">No mentors assigned yet.</p>}
                {cohort.mentors.map((m) => (
                  <div key={m.user.id} className="flex items-center justify-between bg-surface-secondary rounded-md px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {m.user.firstName} {m.user.lastName}
                      </p>
                      <p className="text-xs text-text-muted">{m.user.email}</p>
                    </div>
                    <button onClick={() => handleRemoveMentor(m.user.id)} aria-label="Remove mentor" className="text-text-muted hover:text-error p-1">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <div className="flex-1">
                  <Select value={newMentorId} onChange={setNewMentorId} options={mentorOptions} placeholder="Select a mentor" />
                </div>
                <Button onClick={handleAddMentor} disabled={!newMentorId}>
                  <Plus size={16} />
                  Add
                </Button>
              </div>
              {mentorError && <p className="mt-2 text-sm text-error">{mentorError}</p>}
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6">
              <h2 className="text-base font-semibold text-text-primary">Cohort Managers</h2>
              <p className="text-sm text-text-secondary mt-1">One or more managers responsible for this cohort.</p>

              <div className="mt-4 flex flex-col gap-2">
                {cohort.managers.length === 0 && <p className="text-sm text-text-muted">No managers assigned yet.</p>}
                {cohort.managers.map((m) => (
                  <div key={m.user.id} className="flex items-center justify-between bg-surface-secondary rounded-md px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {m.user.firstName} {m.user.lastName}
                      </p>
                      <p className="text-xs text-text-muted">{m.user.email}</p>
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleRemoveManager(m.user.id)} aria-label="Remove manager" className="text-text-muted hover:text-error p-1">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {isAdmin && (
                <>
                  <div className="mt-4 flex gap-2">
                    <div className="flex-1">
                      <Select value={newManagerId} onChange={setNewManagerId} options={managerOptions} placeholder="Select a manager" />
                    </div>
                    <Button onClick={handleAddManager} disabled={!newManagerId}>
                      <Plus size={16} />
                      Add
                    </Button>
                  </div>
                  {managerError && <p className="mt-2 text-sm text-error">{managerError}</p>}
                </>
              )}
            </div>
          </div>

          <div className="mt-6 bg-surface border border-border rounded-2xl p-6">
            <h2 className="text-base font-semibold text-text-primary">Cohort Details</h2>
            <dl className="mt-4 grid grid-cols-3 gap-y-3 text-sm">
              <dt className="text-text-secondary">Start date</dt>
              <dd className="text-text-primary col-span-2">{new Date(cohort.startDate).toLocaleDateString()}</dd>
              <dt className="text-text-secondary">End date</dt>
              <dd className="text-text-primary col-span-2">{cohort.endDate ? new Date(cohort.endDate).toLocaleDateString() : "—"}</dd>
              <dt className="text-text-secondary">Enrolled</dt>
              <dd className="text-text-primary col-span-2">
                {cohort._count.enrollments}
                {cohort.capacity ? ` / ${cohort.capacity}` : ""}
              </dd>
            </dl>
          </div>

          <div className="mt-6 bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-text-primary">Enrolled Students</h2>
                <p className="text-sm text-text-secondary mt-1">Students assigned to this cohort.</p>
              </div>
              <div className="flex gap-2">
                <div className="w-56">
                  <Select value={newStudentId} onChange={setNewStudentId} options={studentOptions} placeholder="Select a student" />
                </div>
                <div className="w-40">
                  <Select value={newStudentPlan} onChange={(v) => setNewStudentPlan(v as "ICAP" | "INTENSIVE_PRO")} options={PLAN_OPTIONS} />
                </div>
                <Button onClick={handleEnroll} disabled={!newStudentId}>
                  <Plus size={16} />
                  Enroll
                </Button>
              </div>
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
                      <div>
                        <p className="font-medium">
                          {row.user.firstName} {row.user.lastName}
                        </p>
                        <p className="text-text-muted text-xs">{row.user.email}</p>
                      </div>
                    ),
                  },
                  {
                    header: "Status",
                    cell: (row) => <Badge variant={ENROLLMENT_STATUS_VARIANT[row.status]}>{row.status}</Badge>,
                  },
                  {
                    header: "Plan",
                    cell: (row) => (
                      <div className="w-36">
                        <Select
                          value={row.plan}
                          onChange={(v) => handlePlanChange(row.id, v as "ICAP" | "INTENSIVE_PRO")}
                          options={PLAN_OPTIONS}
                        />
                      </div>
                    ),
                  },
                  {
                    header: "Enrolled on",
                    cell: (row) => new Date(row.enrolledAt).toLocaleDateString(),
                  },
                  {
                    header: "",
                    className: "text-right",
                    cell: (row) => (
                      <button onClick={() => handleUnenroll(row.id)} className="text-sm text-error hover:opacity-80 font-medium">
                        Remove
                      </button>
                    ),
                  },
                ]}
              />
            </div>
          </div>

          <div className="mt-6 bg-surface border border-border rounded-2xl p-6">
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
                        <p className="font-medium">
                          {row.user.firstName} {row.user.lastName}
                        </p>
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
        </>
      )}
    </AdminLayout>
  );
}
