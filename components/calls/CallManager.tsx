"use client";

/**
 * WebRTC 1:1 call manager — polling-based signaling via DB.
 *
 * Uses "complete ICE" (waits for ICE gathering to finish before sending the
 * SDP) rather than trickle ICE.  This is the correct strategy for
 * polling-based signaling: the offer/answer SDP already contains every
 * candidate, so no separate /ice endpoint or candidate-timing race exists.
 *
 * Usage:
 *   const callRef = useRef<CallManagerHandle>(null);
 *   <CallManager ref={callRef} />
 *   callRef.current?.startCall(userId, "VIDEO");
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { apiJson } from "@/lib/authClient";

// ── Types ─────────────────────────────────────────────────────────────────────

type CallType = "AUDIO" | "VIDEO";
type CallStatus = "RINGING" | "ACTIVE" | "ENDED" | "MISSED" | "DECLINED";

type CallPerson = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

type CallSession = {
  id: string;
  callType: CallType;
  status: CallStatus;
  callerId: string;
  calleeId: string;
  offerSdp: string | null;
  answerSdp: string | null;
  caller: CallPerson;
  callee?: CallPerson;
};

// ── ICE helper ────────────────────────────────────────────────────────────────

/**
 * Wait until the browser has finished gathering ICE candidates (up to 5 s).
 * After this resolves, pc.localDescription.sdp contains all candidates —
 * no separate trickle-ICE exchange is needed.
 */
function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 5000): Promise<void> {
  return new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") { resolve(); return; }
    const done = () => { resolve(); };
    pc.addEventListener("icegatheringstatechange", function handler() {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", handler);
        done();
      }
    });
    setTimeout(done, timeoutMs); // fallback — send whatever we have
  });
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

async function addLocalTracks(pc: RTCPeerConnection, callType: CallType): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: callType === "VIDEO",
  });
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  return stream;
}

// ── Phase machine ─────────────────────────────────────────────────────────────

type Phase =
  | { tag: "idle" }
  | { tag: "outgoing"; session: CallSession }
  | { tag: "incoming"; session: CallSession }
  | { tag: "active"; session: CallSession; startedAt: number };

// ── Sub-components ────────────────────────────────────────────────────────────

function Timer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const s = String(elapsed % 60).padStart(2, "0");
  return <span className="text-sm text-white/60 tabular-nums">{m}:{s}</span>;
}

function PersonDisplay({ person, label }: { person: CallPerson; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {label && <p className="text-xs text-white/50 uppercase tracking-wider">{label}</p>}
      <Avatar name={`${person.firstName} ${person.lastName}`} avatarUrl={person.avatarUrl} size={80} />
      <p className="text-base font-semibold text-white">{person.firstName} {person.lastName}</p>
    </div>
  );
}

function CtrlBtn({
  onClick,
  active,
  icon,
  label,
  danger = false,
}: {
  onClick: () => void;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex items-center justify-center w-14 h-14 rounded-full transition-colors ${
        danger
          ? "bg-error text-white hover:bg-error/80"
          : active
          ? "bg-white/20 text-white hover:bg-white/30"
          : "bg-white/10 text-white/40 hover:bg-white/20"
      }`}
    >
      {icon}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export type CallManagerHandle = {
  startCall: (
    calleeId: string,
    name: string,
    avatarUrl: string | null,
    callType: CallType
  ) => void;
};

export const CallManager = forwardRef<CallManagerHandle>(function CallManager(_props, ref) {
  const [phase, setPhase] = useState<Phase>({ tag: "idle" });
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [connecting, setConnecting] = useState(false); // gathering ICE

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  function cleanup() {
    stopPolling();
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setMuted(false);
    setCamOff(false);
    setConnecting(false);
    setPhase({ tag: "idle" });
  }

  async function endSignal(sessionId: string) {
    await apiJson(`/api/calls/${sessionId}/end`, { method: "POST" });
  }

  function hangUp(sessionId?: string) {
    if (sessionId) void endSignal(sessionId);
    cleanup();
  }

  // ── Attach local stream to video element when it mounts ───────────────────────

  useEffect(() => {
    if (phase.tag !== "active") return;
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  });

  // ── Callee: poll for incoming calls when idle ─────────────────────────────────

  useEffect(() => {
    if (phase.tag !== "idle") return;
    const id = setInterval(async () => {
      const r = await apiJson<CallSession | null>("/api/calls/incoming");
      if (r.ok && r.data) {
        setPhase({ tag: "incoming", session: r.data });
      }
    }, 2000);
    return () => clearInterval(id);
  }, [phase.tag]);

  // ── Caller flow ───────────────────────────────────────────────────────────────

  const startCall = useCallback(
    async (
      calleeId: string,
      _name: string,
      _avatarUrl: string | null,
      callType: CallType
    ) => {
      if (phase.tag !== "idle") return;
      setConnecting(true);

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      // Capture remote tracks into a MediaStream before any tracks arrive
      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      pc.ontrack = (e) => {
        e.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t));
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      };

      // Acquire local media
      let localStream: MediaStream;
      try {
        localStream = await addLocalTracks(pc, callType);
      } catch {
        pc.close();
        pcRef.current = null;
        setConnecting(false);
        window.alert("Could not access your camera/microphone — check browser permissions.");
        return;
      }
      localStreamRef.current = localStream;

      // Create offer and wait for all ICE candidates to be gathered
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      const offerSdp = pc.localDescription?.sdp ?? offer.sdp!;

      const initResult = await apiJson<CallSession>("/api/calls", {
        method: "POST",
        body: JSON.stringify({ calleeId, callType, offerSdp }),
      });

      if (!initResult.ok) {
        pc.close();
        pcRef.current = null;
        localStream.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        setConnecting(false);
        window.alert(initResult.message);
        return;
      }

      const session = initResult.data;
      setConnecting(false);
      setPhase({ tag: "outgoing", session });

      // Poll until callee answers or declines
      pollRef.current = setInterval(async () => {
        const r = await apiJson<CallSession>(`/api/calls/${session.id}`);
        if (!r.ok) return;
        const s = r.data;

        if (s.status === "DECLINED" || s.status === "MISSED" || s.status === "ENDED") {
          cleanup();
          return;
        }

        if (s.status === "ACTIVE" && s.answerSdp && !pc.remoteDescription) {
          stopPolling();
          try {
            await pc.setRemoteDescription(
              new RTCSessionDescription({ type: "answer", sdp: s.answerSdp })
            );
          } catch {
            cleanup();
            return;
          }
          setPhase({ tag: "active", session: s, startedAt: Date.now() });

          // Keep polling only to detect far-end hang-up
          pollRef.current = setInterval(async () => {
            const r2 = await apiJson<CallSession>(`/api/calls/${session.id}`);
            if (r2.ok && (r2.data.status === "ENDED" || r2.data.status === "DECLINED")) {
              cleanup();
            }
          }, 3000);
        }
      }, 2000);
    },
    [phase.tag] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useImperativeHandle(ref, () => ({ startCall }), [startCall]);

  // ── Callee: accept ────────────────────────────────────────────────────────────

  async function acceptCall(session: CallSession) {
    setPhase({ tag: "idle" }); // hide banner while connecting
    setConnecting(true);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;
    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t));
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    };

    let localStream: MediaStream;
    try {
      localStream = await addLocalTracks(pc, session.callType);
    } catch {
      pc.close();
      pcRef.current = null;
      setConnecting(false);
      await apiJson(`/api/calls/${session.id}/decline`, { method: "POST" });
      return;
    }
    localStreamRef.current = localStream;

    // Set remote offer, create answer, wait for ICE
    await pc.setRemoteDescription(
      new RTCSessionDescription({ type: "offer", sdp: session.offerSdp! })
    );
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIceGathering(pc);

    const answerSdp = pc.localDescription?.sdp ?? answer.sdp!;

    await apiJson(`/api/calls/${session.id}/accept`, {
      method: "POST",
      body: JSON.stringify({ answerSdp }),
    });

    // Fetch full session for display names
    const fullR = await apiJson<CallSession>(`/api/calls/${session.id}`);
    const activeSession = fullR.ok ? fullR.data : session;

    setConnecting(false);
    setPhase({ tag: "active", session: activeSession, startedAt: Date.now() });

    // Poll only to detect far-end hang-up
    pollRef.current = setInterval(async () => {
      const r = await apiJson<CallSession>(`/api/calls/${session.id}`);
      if (r.ok && (r.data.status === "ENDED" || r.data.status === "DECLINED")) {
        cleanup();
      }
    }, 3000);
  }

  async function declineCall(session: CallSession) {
    await apiJson(`/api/calls/${session.id}/decline`, { method: "POST" });
    setPhase({ tag: "idle" });
  }

  // ── Mic / camera toggles ──────────────────────────────────────────────────────

  function toggleMic() {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = muted; });
    setMuted((v) => !v);
  }

  function toggleCam() {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = camOff; });
    setCamOff((v) => !v);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  // Connecting spinner (gathering ICE / waiting for media)
  if (connecting) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        <p className="text-sm text-white/60">Connecting…</p>
      </div>
    );
  }

  if (phase.tag === "idle") return null;

  // ── Incoming call banner ──────────────────────────────────────────────────────

  if (phase.tag === "incoming") {
    const caller = phase.session.caller;
    const callType = phase.session.callType;
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-surface border border-border rounded-2xl shadow-2xl p-5 flex flex-col items-center gap-4 w-64 animate-in slide-in-from-bottom-4">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Incoming {callType === "VIDEO" ? "video" : "audio"} call
        </p>
        <Avatar
          name={`${caller.firstName} ${caller.lastName}`}
          avatarUrl={caller.avatarUrl}
          size={64}
        />
        <p className="text-sm font-semibold text-text-primary">
          {caller.firstName} {caller.lastName}
        </p>
        <div className="flex items-center gap-5">
          <button
            onClick={() => declineCall(phase.session)}
            title="Decline"
            className="flex items-center justify-center w-12 h-12 rounded-full bg-error text-white hover:bg-error/80 transition-colors"
          >
            <PhoneOff size={20} />
          </button>
          <button
            onClick={() => acceptCall(phase.session)}
            title="Accept"
            className="flex items-center justify-center w-12 h-12 rounded-full bg-success text-white hover:bg-success/80 transition-colors animate-pulse"
          >
            <Phone size={20} />
          </button>
        </div>
      </div>
    );
  }

  // ── Outgoing — waiting for answer ─────────────────────────────────────────────

  if (phase.tag === "outgoing") {
    const callee = phase.session.callee ?? phase.session.caller;
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-6">
        <PersonDisplay person={callee} label="Calling…" />
        <p className="text-xs text-white/40">Waiting for {callee.firstName} to answer</p>
        <button
          onClick={() => hangUp(phase.session.id)}
          title="Cancel call"
          className="flex items-center justify-center w-14 h-14 rounded-full bg-error text-white hover:bg-error/80 transition-colors mt-4"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    );
  }

  // ── Active call ───────────────────────────────────────────────────────────────

  const { session, startedAt } = phase;
  const isVideo = session.callType === "VIDEO";
  const other =
    session.callee ?? session.caller;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Remote stream / avatar */}
      <div className="flex-1 relative flex items-center justify-center bg-neutral-900">
        {isVideo ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <PersonDisplay person={other} />
        )}

        {/* Local video PiP (video calls only) */}
        {isVideo && (
          <div className="absolute bottom-4 right-4 w-32 aspect-video rounded-xl overflow-hidden border-2 border-white/20 bg-black">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Timer */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <Timer startedAt={startedAt} />
        </div>
      </div>

      {/* Controls */}
      <div className="bg-black/90 px-6 py-5 flex items-center justify-center gap-5">
        <CtrlBtn
          onClick={toggleMic}
          active={!muted}
          icon={muted ? <MicOff size={22} /> : <Mic size={22} />}
          label={muted ? "Unmute" : "Mute"}
        />
        {isVideo && (
          <CtrlBtn
            onClick={toggleCam}
            active={!camOff}
            icon={camOff ? <VideoOff size={22} /> : <Video size={22} />}
            label={camOff ? "Turn camera on" : "Turn camera off"}
          />
        )}
        <CtrlBtn
          onClick={() => hangUp(session.id)}
          active
          icon={<PhoneOff size={22} />}
          label="End call"
          danger
        />
      </div>
    </div>
  );
});
