"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiJson } from "@/lib/authClient";

/**
 * Deterrence-level content protection:
 * - Short-lived signed S3 URL refreshed every 8 min (raw URL never exposed)
 * - Browser download / PiP / remote-playback affordances disabled
 * - Moving watermark: "incrito · name · mobile" — traceable to the viewer
 * - Auto-pause + blur when the browser tab loses focus / is hidden
 *   (defeats screen-recording while alt-tabbing away)
 */

const SIGNED_URL_REFRESH_MS = 8 * 60 * 1000;
const WATERMARK_REPOSITION_MS = 15000;

export function ProtectedVideoPlayer({ fetchUrl, posterUrl }: { fetchUrl: string; posterUrl?: string | null }) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [watermarkPos, setWatermarkPos] = useState({ top: "8%", left: "8%" });

  // Signed URL fetch + refresh
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

  // Pause + blur when tab is hidden; resume when visible again
  useEffect(() => {
    function onVisibilityChange() {
      const isHidden = document.visibilityState === "hidden";
      setHidden(isHidden);
      if (isHidden) {
        videoRef.current?.pause();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Roving watermark
  useEffect(() => {
    const interval = setInterval(() => {
      setWatermarkPos({
        top: `${8 + Math.random() * 70}%`,
        left: `${8 + Math.random() * 70}%`,
      });
    }, WATERMARK_REPOSITION_MS);
    return () => clearInterval(interval);
  }, []);

  const watermarkText = user
    ? `incrito · ${user.firstName} ${user.lastName}${user.mobileNumber ? ` · ${user.mobileNumber}` : ` · ${user.email}`}`
    : "incrito";

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
    <div
      className="relative rounded-2xl overflow-hidden bg-overlay-dark aspect-video"
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        ref={videoRef}
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

      {/* Blur overlay while tab is hidden */}
      {hidden && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20">
          <p className="text-white text-sm font-medium select-none">
            Playback paused — return to this tab to continue
          </p>
        </div>
      )}

      {/* Roving identity watermark */}
      <div
        className="absolute pointer-events-none select-none text-white/40 text-xs font-medium px-2 py-1 bg-black/15 rounded transition-all duration-1000 ease-in-out whitespace-nowrap z-10"
        style={{ top: watermarkPos.top, left: watermarkPos.left }}
      >
        {watermarkText}
      </div>
    </div>
  );
}
