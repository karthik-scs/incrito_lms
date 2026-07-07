"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiJson, getAccessToken } from "@/lib/authClient";

type Resource = { id: string; title: string; fileUrl: string; fileType: string };

const SIGNED_URL_REFRESH_MS = 8 * 60 * 1000;
const WATERMARK_REPOSITION_MS = 15000;

/** Watermark label built from user identity — same format as ProtectedVideoPlayer. */
function useWatermarkText() {
  const { user } = useAuth();
  if (!user) return "incrito";
  const contact = user.mobileNumber ?? user.email;
  return `incrito · ${user.firstName} ${user.lastName} · ${contact}`;
}

/** Signed-URL video player with identity watermark + tab-visibility pause. */
function ProtectedResourceVideo({ resourceId }: { resourceId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [watermarkPos, setWatermarkPos] = useState({ top: "8%", left: "8%" });
  const watermarkText = useWatermarkText();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await apiJson<{ url: string }>(`/api/resources/${resourceId}/signed-url`);
      if (!cancelled && res.ok) setSrc(res.data.url);
    }
    load();
    const iv = setInterval(load, SIGNED_URL_REFRESH_MS);
    return () => { cancelled = true; clearInterval(iv); };
  }, [resourceId]);

  useEffect(() => {
    function onVisibility() {
      const isHidden = document.visibilityState === "hidden";
      setHidden(isHidden);
      if (isHidden) videoRef.current?.pause();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setWatermarkPos({ top: `${8 + Math.random() * 70}%`, left: `${8 + Math.random() * 70}%` });
    }, WATERMARK_REPOSITION_MS);
    return () => clearInterval(iv);
  }, []);

  if (!src) {
    return (
      <div className="aspect-video bg-surface-secondary flex items-center justify-center rounded-lg">
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
      <video
        ref={videoRef}
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        className="w-full h-full"
        src={src}
      />
      {hidden && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20">
          <p className="text-white text-sm font-medium select-none">Playback paused — return to this tab to continue</p>
        </div>
      )}
      <div
        className="absolute pointer-events-none select-none text-white/40 text-xs font-medium px-2 py-1 bg-black/15 rounded transition-all duration-1000 whitespace-nowrap z-10"
        style={{ top: watermarkPos.top, left: watermarkPos.left }}
      >
        {watermarkText}
      </div>
    </div>
  );
}

/** Image viewer — fetches signed URL so the raw S3 key is never exposed. */
function WatermarkedImage({ resourceId, title }: { resourceId: string; title: string }) {
  const watermarkText = useWatermarkText();
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    apiJson<{ url: string }>(`/api/resources/${resourceId}/signed-url`).then((r) => {
      if (r.ok) setSrc(r.data.url);
    });
  }, [resourceId]);

  if (!src) {
    return (
      <div className="aspect-video bg-surface-secondary flex items-center justify-center rounded-lg">
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-surface-secondary rounded-lg overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={title} className="w-full h-full object-contain select-none" draggable={false} />
      <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center">
        <span
          className="text-black/20 dark:text-white/20 font-bold text-sm whitespace-nowrap"
          style={{ transform: "rotate(-35deg)", letterSpacing: "0.05em" }}
        >
          {watermarkText}
        </span>
      </div>
    </div>
  );
}

/** DOCX/EXCEL viewer — fetches signed URL first so we pass a clean S3 URL (not our DB URL) to Google Viewer. */
function SecureDocViewer({ resourceId, title }: { resourceId: string; title: string }) {
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  useEffect(() => {
    apiJson<{ url: string }>(`/api/resources/${resourceId}/signed-url`).then((r) => {
      if (r.ok) {
        setViewerUrl(`https://docs.google.com/viewer?url=${encodeURIComponent(r.data.url)}&embedded=true`);
      }
    });
  }, [resourceId]);

  if (!viewerUrl) {
    return (
      <div className="aspect-video bg-surface-secondary flex items-center justify-center rounded-lg">
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <iframe
      src={viewerUrl}
      title={title}
      className="w-full border-0 rounded-lg"
      style={{ height: "70vh" }}
    />
  );
}

/** PDF viewer via the server-side watermark proxy — never exposes the raw S3 URL. */
function WatermarkedPdf({ resourceId, title }: { resourceId: string; title: string }) {
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);

  useEffect(() => {
    // Build a URL the browser can load as an <iframe> src.
    // The access token is added as a query param because iframes can't send
    // custom Authorization headers. The API validates it the same way.
    import("@/lib/authClient").then(({ getAccessToken }) => {
      const token = getAccessToken();
      if (token) {
        setProxyUrl(`/api/resources/${resourceId}/watermarked-pdf?token=${encodeURIComponent(token)}`);
      }
    });
  }, [resourceId]);

  if (!proxyUrl) {
    return (
      <div className="aspect-video bg-surface-secondary flex items-center justify-center rounded-lg">
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <iframe
      src={proxyUrl}
      title={title}
      className="w-full rounded-lg border-0"
      style={{ height: "70vh" }}
    />
  );
}

export function ResourceViewer({
  resource,
  open,
  onClose,
}: {
  resource: Resource | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!resource) return null;

  return (
    <Modal open={open} onClose={onClose} title={resource.title} maxWidth="max-w-3xl">
      {resource.fileType === "IMAGE" && (
        <WatermarkedImage resourceId={resource.id} title={resource.title} />
      )}

      {resource.fileType === "VIDEO" && (
        <ProtectedResourceVideo resourceId={resource.id} />
      )}

      {resource.fileType === "PDF" && (
        <WatermarkedPdf resourceId={resource.id} title={resource.title} />
      )}

      {(resource.fileType === "DOCX" || resource.fileType === "EXCEL") && (
        <SecureDocViewer resourceId={resource.id} title={resource.title} />
      )}

      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-text-muted">Content is protected — watermarked with your identity.</p>
        {(resource.fileType === "DOCX" || resource.fileType === "EXCEL") && (
          <a
            href={`/api/resources/${resource.id}/download?token=${encodeURIComponent(getAccessToken() ?? "")}`}
            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-dark font-medium"
            target="_blank"
            rel="noreferrer"
          >
            <Download size={12} />
            Download
          </a>
        )}
      </div>
    </Modal>
  );
}
