"use client";

import { useEffect, useState } from "react";
import { Calendar, Check, Clock, Crown, Plus, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiJson } from "@/lib/authClient";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Student = { id: string; firstName: string; lastName: string; avatarUrl: string | null };

type GroupCallRequest = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  student: Student;
};

type GroupCallSlot = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  maxMembers: number;
  topic: string | null;
  meetingUrl: string | null;
  status: "OPEN" | "FULL" | "CANCELLED" | "COMPLETED";
  mentor: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  cohort: { id: string; name: string } | null;
  requests: GroupCallRequest[];
};

type CohortOption = { id: string; name: string; status: string };

const STATUS_VARIANT: Record<string, "success" | "info" | "muted" | "neutral"> = {
  OPEN: "success",
  FULL: "info",
  CANCELLED: "muted",
  COMPLETED: "neutral",
};

function formatDT(iso: string) {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// ── Create slot modal (mentor) ────────────────────────────────────────────────

function CreateSlotModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [maxMembers, setMaxMembers] = useState(5);
  const [topic, setTopic] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiJson<CohortOption[]>("/api/group-calls/my-cohorts").then((r) => {
      if (r.ok) setCohorts(r.data);
    });
  }, []);

  async function submit() {
    if (!scheduledAt) { setError("Pick a date and time"); return; }
    if (maxMembers < 2) { setError("Max members must be at least 2"); return; }
    setBusy(true);
    const result = await apiJson("/api/group-calls", {
      method: "POST",
      body: JSON.stringify({
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: duration,
        maxMembers,
        topic: topic || undefined,
        meetingUrl: meetingUrl || undefined,
        cohortId: cohortId || undefined,
      }),
    });
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    onCreated();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="New Group Session">
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-xs font-medium text-text-secondary">Date & time</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="mt-1 w-full text-sm bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-text-secondary">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-1 w-full text-sm bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>1 hour</option>
              <option value={90}>90 min</option>
              <option value={120}>2 hours</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary">Max members</label>
            <input
              type="number"
              min={2}
              max={50}
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
              className="mt-1 w-full text-sm bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Cohort (optional)</label>
          <select
            value={cohortId}
            onChange={(e) => setCohortId(e.target.value)}
            className="mt-1 w-full text-sm bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">All my cohorts</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="text-xs text-text-muted mt-0.5">Limit this session to students in a specific cohort.</p>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Topic (optional)</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What will you discuss?"
            className="mt-1 w-full text-sm bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary">Meeting URL (optional)</label>
          <input
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            placeholder="https://meet.google.com/..."
            className="mt-1 w-full text-sm bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
        <div className="flex gap-2 justify-end mt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create session"}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Mentor's slot card with request management ────────────────────────────────

function MentorSlotCard({ slot, onRefresh }: { slot: GroupCallSlot; onRefresh: () => void }) {
  const confirmed = slot.requests.filter((r) => r.status === "CONFIRMED");
  const pending = slot.requests.filter((r) => r.status === "PENDING");

  async function confirm(requestId: string) {
    await apiJson(`/api/group-calls/${slot.id}/requests/${requestId}/confirm`, { method: "PATCH" });
    onRefresh();
  }
  async function decline(requestId: string) {
    await apiJson(`/api/group-calls/${slot.id}/requests/${requestId}/decline`, { method: "PATCH" });
    onRefresh();
  }
  async function cancelSlot() {
    if (!window.confirm("Cancel this session? All confirmed students will be notified.")) return;
    await apiJson(`/api/group-calls/${slot.id}`, { method: "DELETE" });
    onRefresh();
  }
  async function markComplete() {
    await apiJson(`/api/group-calls/${slot.id}`, { method: "PATCH", body: JSON.stringify({ status: "COMPLETED" }) });
    onRefresh();
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-text-primary">{slot.topic ?? "Group Session"}</p>
            <Badge variant={STATUS_VARIANT[slot.status]}>{slot.status}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-text-muted flex-wrap">
            <span className="flex items-center gap-1"><Calendar size={11} />{formatDT(slot.scheduledAt)}</span>
            <span className="flex items-center gap-1"><Clock size={11} />{slot.durationMinutes} min</span>
            <span className="flex items-center gap-1">
              <Users size={11} />{confirmed.length} / {slot.maxMembers} confirmed
            </span>
            {slot.cohort && <Badge variant="neutral" size="sm">{slot.cohort.name}</Badge>}
          </div>
          {slot.meetingUrl && (
            <a href={slot.meetingUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs text-accent font-medium hover:underline">
              Meeting link →
            </a>
          )}

        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {slot.status === "OPEN" || slot.status === "FULL" ? (
            <>
              <button
                onClick={markComplete}
                className="text-xs font-medium text-accent hover:text-accent-dark px-2 py-1 rounded-md hover:bg-surface-secondary"
              >
                Mark done
              </button>
              <button
                onClick={cancelSlot}
                className="text-xs font-medium text-text-muted hover:text-error px-2 py-1 rounded-md hover:bg-surface-secondary"
              >
                Cancel
              </button>
            </>
          ) : null}
        </div>
      </div>

      {(pending.length > 0 || confirmed.length > 0) && (
        <div className="mt-4 border-t border-border pt-4 flex flex-col gap-2">
          {pending.length > 0 && (
            <>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Pending ({pending.length})</p>
              {pending.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-surface-secondary rounded-lg px-3 py-2">
                  <p className="text-sm text-text-primary">{r.student.firstName} {r.student.lastName}</p>
                  {(slot.status === "OPEN" || slot.status === "FULL") && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => confirm(r.id)} className="text-xs font-medium text-success hover:text-success/80 px-2 py-1 rounded-md hover:bg-surface">
                        <Check size={13} />
                      </button>
                      <button onClick={() => decline(r.id)} className="text-xs font-medium text-text-muted hover:text-error px-2 py-1 rounded-md hover:bg-surface">
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
          {confirmed.length > 0 && (
            <>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mt-2">Confirmed ({confirmed.length})</p>
              {confirmed.map((r) => (
                <div key={r.id} className="flex items-center bg-surface-secondary rounded-lg px-3 py-2">
                  <p className="text-sm text-text-primary">{r.student.firstName} {r.student.lastName}</p>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Student's view of available slots ────────────────────────────────────────

function StudentSlotCard({ slot, onRefresh }: { slot: GroupCallSlot; onRefresh: () => void }) {
  const myRequest = slot.requests[0]; // already filtered to studentId
  const confirmed = slot.requests.filter((r) => r.status === "CONFIRMED").length;

  async function join() {
    const result = await apiJson(`/api/group-calls/${slot.id}/join`, { method: "POST" });
    if (!result.ok) { window.alert(result.message); return; }
    onRefresh();
  }
  async function cancel() {
    await apiJson(`/api/group-calls/${slot.id}/join`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-text-primary">{slot.topic ?? "Group Session"}</p>
            <Badge variant={STATUS_VARIANT[slot.status]}>{slot.status}</Badge>
            <Badge variant="premium" size="sm"><Crown size={10} className="mr-0.5 inline" /> Intensive Pro</Badge>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            with {slot.mentor.firstName} {slot.mentor.lastName}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-text-muted flex-wrap">
            <span className="flex items-center gap-1"><Calendar size={11} />{formatDT(slot.scheduledAt)}</span>
            <span className="flex items-center gap-1"><Clock size={11} />{slot.durationMinutes} min</span>
            <span className="flex items-center gap-1"><Users size={11} />{confirmed} / {slot.maxMembers} spots taken</span>
            {slot.cohort && <Badge variant="neutral" size="sm">{slot.cohort.name}</Badge>}
          </div>
          {myRequest?.status === "CONFIRMED" && slot.meetingUrl && (
            <a href={slot.meetingUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs text-accent font-medium hover:underline">
              Join meeting →
            </a>
          )}
        </div>
        <div className="shrink-0">
          {!myRequest || myRequest.status === "CANCELLED" ? (
            <Button
              onClick={join}
              disabled={slot.status === "FULL"}
              className="px-3 py-1.5 text-xs"
            >
              {slot.status === "FULL" ? "Full" : "Join session"}
            </Button>
          ) : myRequest.status === "PENDING" ? (
            <div className="flex items-center gap-2">
              <Badge variant="info">Requested</Badge>
              <button onClick={cancel} className="text-text-muted hover:text-error p-1"><X size={14} /></button>
            </div>
          ) : myRequest.status === "CONFIRMED" ? (
            <div className="flex items-center gap-2">
              <Badge variant="success">Confirmed</Badge>
              <button onClick={cancel} className="text-text-muted hover:text-error p-1"><X size={14} /></button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function GroupCallPanel() {
  const { user } = useAuth();
  const isMentor = user?.role === "Mentor" || user?.role === "Cohort Manager";
  const [slots, setSlots] = useState<GroupCallSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  async function load() {
    setLoading(true);
    const endpoint = isMentor ? "/api/group-calls/my-slots" : "/api/group-calls/available";
    const result = await apiJson<GroupCallSlot[]>(endpoint);
    if (result.ok) setSlots(result.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [isMentor]);

  const upcoming = slots.filter((s) => s.status !== "CANCELLED" && s.status !== "COMPLETED");
  const past = slots.filter((s) => s.status === "CANCELLED" || s.status === "COMPLETED");

  return (
    <div className="flex flex-col gap-5 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Group Sessions</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {isMentor
              ? "Create sessions for multiple premium students at once."
              : "Join group sessions hosted by your mentor (Intensive Pro required)."}
          </p>
        </div>
        {isMentor && (
          <Button onClick={() => setCreateOpen(true)} className="px-3 py-1.5 text-xs">
            <Plus size={13} /> New session
          </Button>
        )}
      </div>

      {loading && <p className="text-sm text-text-muted">Loading…</p>}

      {!loading && upcoming.length === 0 && (
        <p className="text-sm text-text-muted text-center py-10 bg-surface border border-border rounded-2xl">
          {isMentor ? "No group sessions yet — create one above." : "No upcoming group sessions available."}
        </p>
      )}

      {upcoming.map((slot) =>
        isMentor
          ? <MentorSlotCard key={slot.id} slot={slot} onRefresh={load} />
          : <StudentSlotCard key={slot.id} slot={slot} onRefresh={load} />
      )}

      {past.length > 0 && (
        <>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mt-2">Past sessions</p>
          {past.map((slot) =>
            isMentor
              ? <MentorSlotCard key={slot.id} slot={slot} onRefresh={load} />
              : <StudentSlotCard key={slot.id} slot={slot} onRefresh={load} />
          )}
        </>
      )}

      {createOpen && (
        <CreateSlotModal onClose={() => setCreateOpen(false)} onCreated={load} />
      )}
    </div>
  );
}
