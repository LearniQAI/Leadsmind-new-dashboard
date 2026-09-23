"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, X, Loader2 } from "lucide-react";
import { getAccessibleAccent } from "@/lib/color/accessibleAccent";
import { useAudioPlayer, useAudioTime } from "./AudioPlayerProvider";
import LiveWaveformVisualizer from "./LiveWaveformVisualizer";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Rendered once, at the student layout level, right alongside AudioPlayerProvider — visible
// only when a track is loaded AND no matching full player is currently on screen
// (isFullViewActive), so it never double-shows controls next to the full view for the same
// track. Reopening jumps to the exact lesson via the same `?lessonId=` deep link the video
// player's own resume flow already uses — no seek jump, no reload of the audio itself (the
// <audio> element lives in the provider above the route layer, so navigating here doesn't
// touch it).
export default function MiniAudioPlayerBar() {
  const router = useRouter();
  const { track, isPlaying, isLoading, isFullViewActive, toggle, close } = useAudioPlayer();
  const { currentTime, duration } = useAudioTime();
  const accent = useMemo(() => (track?.accentHex ? getAccessibleAccent(track.accentHex) : null), [track?.accentHex]);

  if (!track || isFullViewActive) return null;

  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const reopen = () => {
    router.push(`/student/courses/${track.courseId}?lessonId=${track.lessonId}`);
  };

  return (
    <div
      role="region"
      aria-label="Audio player"
      className="fixed inset-x-0 bottom-0 z-[85] border-t border-dash-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]"
    >
      <div className="h-0.5 w-full bg-dash-border">
        <div
          className="h-full bg-dash-accent transition-[width] duration-200 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex h-[68px] items-center gap-3 px-4">
        <button
          type="button"
          onClick={reopen}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label={`Reopen ${track.title}`}
        >
          {/* Lightweight waveform (few bars, ~30fps cap, still when paused) — this bar mostly
              sits in peripheral vision. The full player's visualizer unmounts when this one
              mounts and vice versa (isFullViewActive), so only one loop ever runs. */}
          <div
            className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-dash-surface ring-1 ring-inset ring-dash-border"
            style={!track.artworkUrl && accent ? { backgroundColor: `${accent.raw}14` } : undefined}
          >
            {track.artworkUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={track.artworkUrl} alt="" className="h-full w-full object-cover" />
                {isPlaying && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-1.5 pb-1 pt-3">
                    <LiveWaveformVisualizer active variant="mini" bars={4} color="#FFFFFF" className="h-3.5 w-full" />
                  </div>
                )}
              </>
            ) : (
              <LiveWaveformVisualizer
                active
                variant="mini"
                bars={5}
                color={accent?.ui}
                className="h-full w-full px-2 text-dash-accent"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-bold !text-dash-text">{track.title}</div>
            <div className="truncate text-[11px] !text-dash-textMuted">
              {track.courseTitle ? `${track.courseTitle} · ` : ""}
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={toggle}
          disabled={isLoading}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dash-accent text-white transition-transform duration-150 hover:scale-105 active:scale-95 disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:scale-100"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin motion-reduce:animate-none" />
          ) : isPlaying ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" className="ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={close}
          aria-label="Close player"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full !text-dash-textMuted transition-colors hover:bg-dash-surface hover:!text-dash-text"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
