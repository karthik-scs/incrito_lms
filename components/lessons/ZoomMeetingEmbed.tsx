"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Radio } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthProvider";
import { apiJson } from "@/lib/authClient";

type SignatureResponse =
  | { configured: false }
  | { configured: true; signature: string; sdkKey: string; meetingNumber: string; passcode: string | null; role: 0 | 1 };

/**
 * Real in-app Zoom embedding via @zoom/meetingsdk's Component View — only works once the
 * ZoomAccount this session was scheduled under has a Meeting SDK key/secret configured (separate
 * credentials from the Server-to-Server OAuth app that auto-schedules meetings; see
 * Settings → Live Class API). Falls back to a plain "Join in new tab" button, honestly labeled,
 * when that's not configured rather than pretending to embed something that can't actually load.
 */
export function ZoomMeetingEmbed({ lessonId, joinUrl, title }: { lessonId: string; joinUrl: string | null; title: string }) {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [signatureData, setSignatureData] = useState<SignatureResponse | null>(null);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    apiJson<SignatureResponse>(`/api/lessons/${lessonId}/zoom-signature`).then((res) => {
      if (res.ok) setSignatureData(res.data);
    });
  }, [lessonId]);

  async function handleJoin() {
    if (!signatureData?.configured || !containerRef.current) return;
    setJoining(true);
    setError(null);

    try {
      const { default: ZoomMtgEmbedded } = await import("@zoom/meetingsdk/embedded");
      const client = ZoomMtgEmbedded.createClient();
      await client.init({ zoomAppRoot: containerRef.current, language: "en-US" });
      await client.join({
        sdkKey: signatureData.sdkKey,
        signature: signatureData.signature,
        meetingNumber: signatureData.meetingNumber,
        password: signatureData.passcode ?? "",
        userName: user ? `${user.firstName} ${user.lastName}` : "Guest",
      });
      setJoined(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join the meeting in-app — try the link instead.");
    } finally {
      setJoining(false);
    }
  }

  const sdkReady = signatureData?.configured === true;

  return (
    <div className="rounded-2xl border border-border bg-overlay-dark overflow-hidden">
      <div ref={containerRef} className={joined ? "min-h-[480px]" : "hidden"} />

      {!joined && (
        <div className="aspect-video flex flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="flex items-center justify-center w-16 h-16 rounded-full bg-error/10 text-error">
            <Radio size={28} className="animate-pulse" />
          </span>
          <p className="text-white font-medium">{title}</p>

          {sdkReady ? (
            <Button onClick={handleJoin} disabled={joining}>
              <Radio size={16} />
              {joining ? "Joining…" : "Join in app"}
            </Button>
          ) : (
            <>
              <Button onClick={() => joinUrl && window.open(joinUrl, "_blank")} disabled={!joinUrl}>
                <ExternalLink size={16} />
                Join Live Class
              </Button>
              <p className="text-xs text-white/50 max-w-sm">
                Opens Zoom in a new tab — in-app join needs a Meeting SDK key configured for this Zoom account in
                Settings.
              </p>
            </>
          )}
          {error && <p className="text-xs text-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
