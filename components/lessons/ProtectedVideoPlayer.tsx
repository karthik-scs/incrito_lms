"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiJson } from "@/lib/authClient";
import Hls from "hls.js";

/**
 * Content protection stack:
 * - AES-128 HLS encryption: video is pre-encrypted; decryption key served only to authenticated,
 *   IP-matched holders of a short-lived stream token. Copying the URL to another machine → 401.
 * - Falls back to the stream proxy (MP4) while HLS packaging is in progress.
 * - Moving watermark: "incrito · name · mobile" — traceable to the viewer.
 * - Auto-pause + blur when the browser tab loses focus.
 */

const CONTENT_URL_REFRESH_MS = 8 * 60 * 1000;
const WATERMARK_REPOSITION_MS = 15_000;

type ContentUrlResult = {
  url: string;
  type: "hls" | "mp4";
  hlsProcessing?: boolean;
};

export function ProtectedVideoPlayer({ fetchUrl, posterUrl }: { fetchUrl: string; posterUrl?: string | null }) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [content, setContent] = useState<ContentUrlResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [watermarkPos, setWatermarkPos] = useState({ top: "8%", left: "8%" });

  // Attach or detach HLS.js whenever the content URL/type changes.
  const attachHls = useCallback((result: ContentUrlResult) => {
    const video = videoRef.current;
    if (!video) return;

    // Tear down any previous HLS instance.
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (result.type === "hls") {
      if (Hls.isSupported()) {
        const hls = new Hls({
          // The manifest URL already contains the stream token; HLS.js will append it to the
          // key URI too (the key URI is built with the same token server-side).
          // No special credential config needed — token is in the query string.
          enableWorker: true,
          lowLatencyMode: false,
        });
        hls.loadSource(result.url);
        hls.attachMedia(video);
        hlsRef.current = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS — pass the manifest URL directly.
        video.src = result.url;
      } else {
        setError("Your browser does not support HLS playback.");
      }
    } else {
      // Plain MP4 via stream proxy.
      video.src = result.url;
    }
  }, []);

  // Fetch content URL + refresh periodically.
  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      const result = await apiJson<ContentUrlResult>(fetchUrl);
      if (cancelled) return;
      if (result.ok) {
        setError(null);
        setContent(result.data);
        attachHls(result.data);

        // HLS packaging in progress — retry in 10 s so we switch to HLS once it's ready.
        if (result.data.hlsProcessing) {
          retryTimer = setTimeout(load, 10_000);
        }
      } else {
        setError(result.message);
      }
    }

    load();
    const interval = setInterval(load, CONTENT_URL_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (retryTimer) clearTimeout(retryTimer);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [fetchUrl, attachHls]);

  // Pause + blur when tab is hidden (skip during fullscreen to avoid false triggers).
  useEffect(() => {
    function onVisibilityChange() {
      if (document.fullscreenElement) return;
      const isHidden = document.visibilityState === "hidden";
      setHidden(isHidden);
      if (isHidden) videoRef.current?.pause();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Roving watermark.
  useEffect(() => {
    const interval = setInterval(() => {
      setWatermarkPos({ top: `${8 + Math.random() * 70}%`, left: `${8 + Math.random() * 70}%` });
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

  if (!content) {
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
      {content.hlsProcessing && content.type === "mp4" && (
        <div className="absolute top-2 right-2 z-30 bg-black/60 text-white/70 text-xs px-2 py-1 rounded">
          Encrypting video…
        </div>
      )}

      <video
        ref={videoRef}
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full"
        poster={posterUrl ?? undefined}
      >
        Your browser doesn&apos;t support embedded video.
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
