"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiJson } from "@/lib/authClient";

/**
 * Deterrence-level content protection, not real DRM — no web technology can fully stop someone
 * from photographing their screen or using OS-level screen capture, and this doesn't pretend to.
 * What it does: the player never receives a permanent/public file URL (only a short-lived signed
 * one, fetched on demand and refreshed before it expires), the browser's own download affordances
 * are disabled, and a watermark identifying the viewer is burned into the on-screen overlay so a
 * leak is at least traceable back to who watched it.
 */

const SIGNED_URL_REFRESH_MS = 8 * 60 * 1000;
const WATERMARK_REPOSITION_MS = 15000;

export function ProtectedVideoPlayer({ fetchUrl, posterUrl }: { fetchUrl: string; posterUrl?: string | null }) {
  const { user } = useAuth();
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watermarkPos, setWatermarkPos] = useState({ top: "8%", left: "8%" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result = await apiJson<{ url: string }>(fetchUrl);
      if (cancelled) return;
      if (result.ok) {
        setSrc(result.data.url);
        setError(null);
      } else {
        setError(result.message);
      }
    }
    load();
    const interval = setInterval(load, SIGNED_URL_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchUrl]);

  useEffect(() => {
    const interval = setInterval(() => {
      setWatermarkPos({ top: `${8 + Math.random() * 70}%`, left: `${8 + Math.random() * 70}%` });
    }, WATERMARK_REPOSITION_MS);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-surface-secondary aspect-video flex items-center justify-center">
        <p className="text-sm text-error px-6 text-center">{error}</p>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="rounded-2xl border border-border bg-surface-secondary aspect-video flex items-center justify-center">
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-overlay-dark aspect-video" onContextMenu={(e) => e.preventDefault()}>
      <video
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full"
        src={src}
        poster={posterUrl ?? undefined}
      >
        Your browser doesn't support embedded video.
      </video>
      {user && (
        <div
          className="absolute pointer-events-none select-none text-white/35 text-xs font-medium px-2 py-1 bg-black/10 rounded transition-all duration-1000 ease-in-out whitespace-nowrap"
          style={{ top: watermarkPos.top, left: watermarkPos.left }}
        >
          {user.firstName} {user.lastName} · {user.email}
        </div>
      )}
    </div>
  );
}
