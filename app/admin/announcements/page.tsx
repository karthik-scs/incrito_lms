"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Megaphone, Plus, Trash2, Users } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { apiJson } from "@/lib/authClient";
import { useAuth } from "@/components/providers/AuthProvider";

type Audience = "ALL" | "STUDENTS" | "MENTORS" | "COHORT_MANAGERS";

type MyCohort = { id: string; name: string };

type Announcement = {
  id: string;
  title: string;
  content: string;
  audience: Audience;
  cohortId: string | null;
  cohort: { id: string; name: string } | null;
  createdAt: string;
  recipientCount: number;
  createdBy: { id: string; firstName: string; lastName: string };
};

const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: "ALL", label: "Everyone" },
  { value: "STUDENTS", label: "Students only" },
  { value: "MENTORS", label: "Mentors only" },
  { value: "COHORT_MANAGERS", label: "Cohort Managers only" },
];

const AUDIENCE_LABEL: Record<Audience, string> = {
  ALL: "Everyone",
  STUDENTS: "Students",
  MENTORS: "Mentors",
  COHORT_MANAGERS: "Cohort Managers",
};

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const isScopedRole = user?.role === "Mentor" || user?.role === "Cohort Manager";
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [myCohorts, setMyCohorts] = useState<MyCohort[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<Audience>("ALL");
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const [announcementsRes, cohortsRes] = await Promise.all([
      apiJson<Announcement[]>("/api/announcements"),
      isScopedRole ? apiJson<{ id: string; name: string; mentors: { user: { id: string } }[]; managers: { user: { id: string } }[] }[]>("/api/cohorts") : Promise.resolve({ ok: false as const, message: "" }),
    ]);
    if (announcementsRes.ok) setAnnouncements(announcementsRes.data);
    if (cohortsRes.ok && user) {
      const mine = cohortsRes.data.filter((c) =>
        user.role === "Mentor"
          ? c.mentors.some((m) => m.user.id === user.id)
          : c.managers.some((m) => m.user.id === user.id)
      );
      setMyCohorts(mine.map((c) => ({ id: c.id, name: c.name })));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setTitle("");
    setContent("");
    setAudience("ALL");
    setSelectedCohortId("");
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    const result = await apiJson("/api/announcements", {
      method: "POST",
      body: JSON.stringify({ title, content, audience, cohortId: selectedCohortId || undefined }),
    });
    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setModalOpen(false);
    await load();
  }

  async function handleDelete(a: Announcement) {
    if (!window.confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    await apiJson(`/api/announcements/${a.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Announcements</h1>
          <p className="text-sm text-text-secondary mt-1">
            {isAdmin
              ? "Broadcast updates to students, mentors and cohort managers."
              : "Send announcements to your assigned cohort members."}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          New Announcement
        </Button>
      </div>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}

      <div className="mt-6 flex flex-col gap-3">
        {!loading && announcements.length === 0 && (
          <div className="bg-surface border border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-3">
            <Megaphone size={32} className="text-text-muted" />
            <p className="text-sm text-text-secondary">No announcements sent yet.</p>
          </div>
        )}
        {announcements.map((a) => (
          <div key={a.id} className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-text-primary">{a.title}</h2>
                  {a.cohort ? (
                    <Badge variant="info">{a.cohort.name}</Badge>
                  ) : (
                    <Badge variant="accent">{AUDIENCE_LABEL[a.audience]}</Badge>
                  )}
                </div>
                <p className="text-sm text-text-secondary mt-1.5 whitespace-pre-wrap">{a.content}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-text-muted">
                  <span>By {a.createdBy.firstName} {a.createdBy.lastName}</span>
                  <span>·</span>
                  <span>{timeAgo(a.createdAt)}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Users size={11} /> {a.recipientCount} recipients</span>
                </div>
              </div>
              <button onClick={() => handleDelete(a)} aria-label="Delete announcement" className="text-text-muted hover:text-error rounded-md p-1.5 shrink-0">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Announcement">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Message</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={4}
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-none"
            />
          </div>
          {isAdmin && (
            <div>
              <label className="text-sm font-medium text-text-secondary">Send to</label>
              <div className="mt-1">
                <Select value={audience} onChange={(v) => setAudience(v as Audience)} options={AUDIENCE_OPTIONS} />
              </div>
            </div>
          )}
          {isScopedRole && (
            <div>
              <label className="text-sm font-medium text-text-secondary">Cohort</label>
              <div className="mt-1">
                <Select
                  value={selectedCohortId}
                  onChange={setSelectedCohortId}
                  options={[
                    { value: "", label: "All my cohorts" },
                    ...myCohorts.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />
              </div>
              <p className="text-xs text-text-muted mt-1">
                {selectedCohortId ? "Announcement will be sent only to students in the selected cohort." : "Announcement will be sent to students in all your assigned cohorts."}
              </p>
            </div>
          )}
          {formError && <p className="text-sm text-error">{formError}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send announcement"}</Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
