"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { loadYouTubeApi, type YTPlayer } from "@/lib/youtubeApiLoader";

const SKIP_SECONDS = 30;
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Custom-controlled YouTube player with zero YouTube branding visible at any point — including
 * while paused, which is the part a `playerVars`-only approach can't fix.
 *
 * YouTube draws its own branded title/channel-name/share-icon/suggested-videos card any time the
 * player ISN'T actively playing — before the first play, while paused, and when a video ends —
 * and none of that is controllable via `controls`, `modestbranding`, or `rel`; it's the embed's
 * own paused/idle state, not a hover overlay or a part of the playing-state control bar. There is
 * no parameter that removes it, so this player never shows the real iframe during those states at
 * all: the iframe sits at `opacity-0` (still mounted, so the API keeps controlling it) whenever
 * `playing` is false, and this app's own cover — solid color or the lesson's thumbnail, this app's
 * own play button, the lesson title — is shown in its place. The instant playback actually starts,
 * the cover hides and the real (now branding-free, since YouTube only shows its idle card when
 * *not* playing) video becomes visible.
 *
 * On top of that: `controls: 0` (+ modestbranding/rel/fs/iv_load_policy/cc_load_policy) suppresses
 * YouTube's bottom bar during active playback, the iframe is scaled 118% inside an
 * `overflow-hidden` crop container (pushes anything still drawn at the very edges of the frame
 * outside the visible box), and the iframe stays `pointer-events-none` so mouse input never
 * reaches YouTube's page — every click lands on this app's own controls.
 */
export function YouTubePlayer({
  videoId,
  title,
  posterUrl,
}: {
  videoId: string;
  title: string;
  posterUrl?: string | null;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [speed, setSpeed] = useState(1);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);

  useEffect(() => {
    let destroyed = false;

    loadYouTubeApi().then((YT) => {
      if (destroyed || !mountRef.current) return;

      playerRef.current = new YT.Player(mountRef.current, {
        videoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            setReady(true);
            setDuration(event.target.getDuration());
            setVolume(event.target.getVolume());
          },
          onStateChange: (event) => {
            setPlaying(event.data === YT.PlayerState.PLAYING);
            setEnded(event.data === YT.PlayerState.ENDED);
          },
        },
      });
    });

    return () => {
      destroyed = true;
      if (pollRef.current) clearInterval(pollRef.current);
      playerRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    if (!ready) return;
    pollRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player || seeking) return;
      setCurrentTime(player.getCurrentTime());
      const liveDuration = player.getDuration();
      if (liveDuration) setDuration(liveDuration);
    }, 500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [ready, seeking]);

  function togglePlay() {
    const player = playerRef.current;
    if (!player) return;
    if (playing) {
      player.pauseVideo();
      return;
    }
    if (ended) player.seekTo(0, true);
    player.playVideo();
  }

  function skip(deltaSeconds: number) {
    const player = playerRef.current;
    if (!player) return;
    const next = Math.min(Math.max(player.getCurrentTime() + deltaSeconds, 0), duration || Infinity);
    player.seekTo(next, true);
    setCurrentTime(next);
  }

  function toggleMute() {
    const player = playerRef.current;
    if (!player) return;
    if (player.isMuted()) {
      player.unMute();
      setMuted(false);
    } else {
      player.mute();
      setMuted(true);
    }
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value);
    setVolume(value);
    const player = playerRef.current;
    if (!player) return;
    player.setVolume(value);
    if (value === 0 && !muted) {
      player.mute();
      setMuted(true);
    } else if (value > 0 && muted) {
      player.unMute();
      setMuted(false);
    }
  }

  function handleSpeedChange(rate: number) {
    playerRef.current?.setPlaybackRate(rate);
    setSpeed(rate);
    setSpeedMenuOpen(false);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    setCurrentTime(Number(e.target.value));
  }

  function commitSeek(e: React.SyntheticEvent<HTMLInputElement>) {
    const target = Number(e.currentTarget.value);
    const player = playerRef.current;
    player?.seekTo(target, true);
    if (!playing) player?.playVideo();
    setSeeking(false);
  }

  function handleFullscreen() {
    containerRef.current?.requestFullscreen?.().catch(() => null);
  }

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const showCover = !playing;

  return (
    <div ref={containerRef} className="relative rounded-2xl overflow-hidden bg-overlay-dark aspect-video group">
      {/* Crop wrapper: clips the iframe's own edges outside the visible box. */}
      <div
        className={`absolute inset-0 overflow-hidden transition-opacity duration-150 ${showCover ? "opacity-0" : "opacity-100"}`}
      >
        <div
          ref={mountRef}
          className="absolute pointer-events-none"
          style={{ top: "-9%", left: "-9%", width: "118%", height: "118%" }}
        />
      </div>

      {/* This app's own cover — shown any time YouTube would otherwise show its branded idle
          state (before first play, paused, ended). Never the real iframe. */}
      {showCover && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-overlay-dark bg-cover bg-center"
          style={posterUrl ? { backgroundImage: `url(${posterUrl})` } : undefined}
        >
          {posterUrl && <div className="absolute inset-0 bg-overlay-dark/40" />}
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-accent text-accent-foreground">
            <Play size={26} className="ml-0.5" fill="currentColor" />
          </div>
          <p className="relative text-sm text-white/80 px-6 text-center">{ready ? title : `Loading ${title}…`}</p>
        </div>
      )}

      {/* Transparent layer over everything so clicks hit our controls, never YouTube's. */}
      <button
        type="button"
        aria-label={playing ? "Pause" : "Play"}
        onClick={togglePlay}
        className="absolute inset-0 w-full h-full"
      />

      <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onMouseDown={() => setSeeking(true)}
          onTouchStart={() => setSeeking(true)}
          onChange={handleSeek}
          onMouseUp={commitSeek}
          onTouchEnd={commitSeek}
          className="w-full h-1 accent-accent cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--color-accent) ${progressPercent}%, rgba(255,255,255,0.4) ${progressPercent}%)`,
          }}
          aria-label="Seek"
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3 text-white">
            <button type="button" onClick={() => skip(-SKIP_SECONDS)} aria-label="Back 30 seconds">
              <RotateCcw size={17} />
            </button>
            <button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button type="button" onClick={() => skip(SKIP_SECONDS)} aria-label="Forward 30 seconds">
              <RotateCw size={17} />
            </button>

            <div className="flex items-center gap-1.5 group/volume">
              <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
                {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="Volume"
                className="w-0 group-hover/volume:w-16 focus:w-16 transition-all h-1 accent-white cursor-pointer overflow-hidden"
              />
            </div>

            <span className="text-xs font-medium whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3 text-white">
            <div className="relative">
              <button
                type="button"
                onClick={() => setSpeedMenuOpen((prev) => !prev)}
                aria-label="Playback speed"
                className="text-xs font-medium px-1.5 py-0.5 rounded border border-white/40 hover:bg-white/10"
              >
                {speed}x
              </button>
              {speedMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 bg-overlay-dark border border-white/10 rounded-md py-1 w-16">
                  {SPEED_OPTIONS.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handleSpeedChange(rate)}
                      className={`block w-full text-center text-xs py-1 hover:bg-white/10 ${
                        rate === speed ? "text-accent" : "text-white"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={handleFullscreen} aria-label="Fullscreen">
              <Maximize size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
