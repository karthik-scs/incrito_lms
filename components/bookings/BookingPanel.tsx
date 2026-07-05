"use client";

import { useEffect, useState } from "react";
import { Calendar, Check, Clock, Plus, Star, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RatingModal } from "@/components/bookings/RatingModal";
import { apiJson } from "@/lib/authClient";
import { useAuth } from "@/components/providers/AuthProvider";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type AvailabilitySlot = { id: string; dayOfWeek: number; startTime: string; endTime: string };

type Booking = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  topic: string | null;
  notes: string | null;
  meetingUrl: string | null;
  mentor?: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  student?: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  cohort?: { id: string; name: string } | null;
  rating?: { rating: number; comment: string | null } | null;
};

const STATUS_VARIANT: Record<string, "info" | "success" | "error" | "muted" | "neutral"> = {
  PENDING: "info",
  CONFIRMED: "success",
  CANCELLED: "muted",
  COMPLETED: "neutral",
};

function formatDT(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// ── Availability manager (Mentor only) ─────────────────────────────────────────

function AvailabilityManager() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiJson<AvailabilitySlot[]>("/api/bookings/availability").then((r) => { if (r.ok) setSlots(r.data); });
  }, []);

  function addSlot() {
    setSlots((prev) => [...prev, { id: crypto.randomUUID(), dayOfWeek: 1, startTime: "09:00", endTime: "10:00" }]);
  }

  function updateSlot(id: string, field: keyof AvailabilitySlot, value: string | number) {
    setSlots((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s));
  }

  function removeSlot(id: string) {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  }

  async function save() {
    setSaving(true);
    const result = await apiJson("/api/bookings/availability", {
      method: "PUT",
      body: JSON.stringify({ slots: slots.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })) }),
    });
    setSaving(false);
    if (result.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">My Availability</h3>
          <p className="text-xs text-text-muted mt-0.5">Students can request sessions during these slots.</p>
        </div>
        <button onClick={addSlot} className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-dark">
          <Plus size={13} /> Add slot
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {slots.length === 0 && <p className="text-xs text-text-muted text-center py-4">No availability set.</p>}
        {slots.map((slot) => (
          <div key={slot.id} className="flex items-center gap-2 flex-wrap">
            <select value={slot.dayOfWeek} onChange={(e) => updateSlot(slot.id, "dayOfWeek", Number(e.target.value))}
              className="text-xs bg-surface-secondary border border-border rounded-md px-2 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent">
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
            <input type="time" value={slot.startTime} onChange={(e) => updateSlot(slot.id, "startTime", e.target.value)}
              className="text-xs bg-surface-secondary border border-border rounded-md px-2 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent" />
            <span className="text-xs text-text-muted">to</span>
            <input type="time" value={slot.endTime} onChange={(e) => updateSlot(slot.id, "endTime", e.target.value)}
              className="text-xs bg-surface-secondary border border-border rounded-md px-2 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent" />
            <button onClick={() => removeSlot(slot.id)} className="text-text-muted hover:text-error p-1">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={save} disabled={saving} className="px-3 py-1.5 text-xs">
          {saved ? <><Check size={13} /> Saved</> : saving ? "Saving…" : "Save availability"}
        </Button>
      </div>
    </div>
  );
}

// ── Book a session modal ────────────────────────────────────────────────────────

export function BookModal({ mentorId, mentorName, onClose, onBooked }: {
  mentorId: string; mentorName: string; onClose: () => void; onBooked: () => void;
}) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(30);
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!scheduledAt) { setError("Pick a date and time"); return; }
    setBusy(true);
    const result = await apiJson("/api/bookings", {
      method: "POST",
      body: JSON.stringify({ mentorId, scheduledAt: new Date(scheduledAt).toISOString(), durationMinutes: duration, topic: topic || undefined, notes: notes || undefined }),
    });
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    onBooked();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text-primary">Book a session with {mentorName}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary"><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-text-secondary">Date & time</label>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} min={new Date().toISOString().slice(0, 16)}
              className="mt-1 w-full text-sm bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary">Duration</label>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-1 w-full text-sm bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent">
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary">Topic (optional)</label>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What do you want to discuss?"
              className="mt-1 w-full text-sm bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary">Notes (optional)</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any preparation notes…"
              className="mt-1 w-full text-sm bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none" />
          </div>
          {error && <p className="text-xs text-error">{error}</p>}
          <div className="flex gap-2 justify-end mt-1">
            <button onClick={onClose} className="text-sm text-text-muted hover:text-text-secondary px-3 py-1.5">Cancel</button>
            <Button onClick={submit} disabled={busy}>{busy ? "Booking…" : "Request session"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Confirm modal (Mentor) ─────────────────────────────────────────────────────

function ConfirmModal({ booking, onClose, onDone }: { booking: Booking; onClose: () => void; onDone: () => void }) {
  const [meetingUrl, setMeetingUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    await apiJson(`/api/bookings/${booking.id}/confirm`, {
      method: "PATCH",
      body: JSON.stringify({ meetingUrl: meetingUrl || undefined }),
    });
    setBusy(false);
    onDone();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Confirm session</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary"><X size={16} /></button>
        </div>
        <p className="text-xs text-text-secondary mb-3">Optionally add a meeting link (Zoom, Google Meet, etc.).</p>
        <input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/..."
          className="w-full text-sm bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent mb-4" />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm text-text-muted px-3 py-1.5">Cancel</button>
          <Button onClick={confirm} disabled={busy}>{busy ? "Confirming…" : "Confirm"}</Button>
        </div>
      </div>
    </div>
  );
}

// ── Booking list ────────────────────────────────────────────────────────────────

export function BookingList({ showBookButton = false, mentorId, mentorName }: {
  showBookButton?: boolean;
  mentorId?: string;
  mentorName?: string;
}) {
  const { user } = useAuth();
  const isMentor = user?.role === "Mentor" || user?.role === "Admin" || user?.role === "Cohort Manager";
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBook, setShowBook] = useState(false);
  const [confirming, setConfirming] = useState<Booking | null>(null);
  const [rating, setRating] = useState<Booking | null>(null);

  async function load() {
    setLoading(true);
    const result = await apiJson<Booking[]>("/api/bookings");
    if (result.ok) setBookings(result.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function cancel(id: string) {
    if (!window.confirm("Cancel this booking?")) return;
    await apiJson(`/api/bookings/${id}/cancel`, { method: "PATCH", body: JSON.stringify({}) });
    load();
  }

  async function markComplete(id: string) {
    await apiJson(`/api/bookings/${id}/complete`, { method: "PATCH" });
    load();
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">
          {isMentor ? "Session Requests" : "My Booked Sessions"}
        </h3>
        {showBookButton && mentorId && mentorName && (
          <Button className="px-3 py-1.5 text-xs" onClick={() => setShowBook(true)}>
            <Calendar size={13} /> Book session
          </Button>
        )}
      </div>

      {loading && <p className="text-xs text-text-muted">Loading…</p>}
      {!loading && bookings.length === 0 && (
        <p className="text-xs text-text-muted text-center py-6">No bookings yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {bookings.map((b) => {
          const person = isMentor ? b.student : b.mentor;
          return (
            <div key={b.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface-secondary px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-text-primary">
                    {person ? `${person.firstName} ${person.lastName}` : "—"}
                  </p>
                  <Badge variant={STATUS_VARIANT[b.status] ?? "neutral"}>{b.status}</Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-text-muted flex-wrap">
                  <span className="flex items-center gap-1"><Calendar size={11} />{formatDT(b.scheduledAt)}</span>
                  <span className="flex items-center gap-1"><Clock size={11} />{b.durationMinutes} min</span>
                  {b.topic && <span>{b.topic}</span>}
                </div>
                {b.meetingUrl && b.status === "CONFIRMED" && (
                  <a href={b.meetingUrl} target="_blank" rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs text-accent font-medium hover:underline">
                    Join meeting →
                  </a>
                )}
                {b.rating && (
                  <div className="mt-1.5 flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={11} className={i < b.rating!.rating ? "fill-premium text-premium" : "text-border"} />
                    ))}
                    {b.rating.comment && <span className="text-xs text-text-muted ml-1">"{b.rating.comment}"</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isMentor && b.status === "PENDING" && (
                  <>
                    <button onClick={() => setConfirming(b)}
                      className="text-xs font-medium text-success hover:text-success/80 px-2 py-1 rounded-md hover:bg-surface">
                      Confirm
                    </button>
                    <button onClick={() => cancel(b.id)}
                      className="text-xs font-medium text-text-muted hover:text-error px-2 py-1 rounded-md hover:bg-surface">
                      Decline
                    </button>
                  </>
                )}
                {isMentor && b.status === "CONFIRMED" && (
                  <button onClick={() => markComplete(b.id)}
                    className="text-xs font-medium text-accent hover:text-accent-dark px-2 py-1 rounded-md hover:bg-surface">
                    Mark done
                  </button>
                )}
                {!isMentor && (b.status === "PENDING" || b.status === "CONFIRMED") && (
                  <button onClick={() => cancel(b.id)}
                    className="text-text-muted hover:text-error p-1"><X size={14} /></button>
                )}
                {!isMentor && b.status === "COMPLETED" && !b.rating && (
                  <button onClick={() => setRating(b)}
                    className="text-xs font-medium text-premium hover:text-premium/80 px-2 py-1 rounded-md hover:bg-surface flex items-center gap-1">
                    <Star size={11} /> Rate
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showBook && mentorId && mentorName && (
        <BookModal mentorId={mentorId} mentorName={mentorName} onClose={() => setShowBook(false)} onBooked={load} />
      )}
      {confirming && (
        <ConfirmModal booking={confirming} onClose={() => setConfirming(null)} onDone={load} />
      )}
      {rating && rating.mentor && (
        <RatingModal
          bookingId={rating.id}
          mentorId={rating.mentor.id}
          mentorName={`${rating.mentor.firstName} ${rating.mentor.lastName}`}
          onClose={() => setRating(null)}
          onRated={load}
        />
      )}
    </div>
  );
}

// ── Full booking panel (used on /sessions page for mentors) ────────────────────

export function BookingPanel() {
  const { user } = useAuth();
  const isMentor = user?.role === "Mentor" || user?.role === "Cohort Manager";

  return (
    <div className="flex flex-col gap-5 mt-6">
      {isMentor && <AvailabilityManager />}
      <BookingList />
    </div>
  );
}
