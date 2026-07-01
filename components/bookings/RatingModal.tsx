"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiJson } from "@/lib/authClient";

type Props = {
  bookingId: string;
  mentorId: string;
  mentorName: string;
  onClose: () => void;
  onRated: () => void;
};

export function RatingModal({ bookingId, mentorId, mentorName, onClose, onRated }: Props) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (rating === 0) { setError("Please select a rating"); return; }
    setBusy(true);
    const result = await apiJson("/api/mentor-ratings", {
      method: "POST",
      body: JSON.stringify({ mentorId, bookingId, rating, comment: comment.trim() || undefined }),
    });
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    onRated();
    onClose();
  }

  const display = hovered || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Rate your session with {mentorName}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary"><X size={16} /></button>
        </div>

        <div className="flex items-center gap-1.5 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={28}
                className={star <= display ? "fill-premium text-premium" : "text-border"}
              />
            </button>
          ))}
        </div>

        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience (optional)…"
          className="w-full text-sm bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none mb-3"
        />

        {error && <p className="text-xs text-error mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm text-text-muted px-3 py-1.5">Skip</button>
          <Button onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit rating"}</Button>
        </div>
      </div>
    </div>
  );
}
