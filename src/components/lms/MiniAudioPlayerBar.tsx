"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { PLAYER } from "@/lib/lms/audio/playerIdentity";
import { playerFocus, playerIconButton } from "@/lib/lms/audio/playerStyles";
import PlayerPlayButton from "./PlayerPlayButton";
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

  if (!track || isFullViewActive) return null;

  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const reopen = () => {
    router.push(`/student/courses/${track.courseId}?lessonId=${track.lessonId}`);
  };

  return (
    <div
      role="region"
      aria-label="Audio player"
      // Same monochrome identity as the full player (player-* tokens): white glass, ink progress
      // edge, the glowing play button. Neutral upward shadow so it floats over the page like the
      // full player card.
      className="fixed inset-x-0 bottom-0 z-[85] border-t border-player-border bg-player-surface/95 shadow-[0_-10px_30px_-14px_rgba(17,17,17,0.18)] backdrop-blur supports-[backdrop-filter]:bg-player-surface/85"
    >
      <div className="h-[3px] w-full bg-player-track">
        <div
          className="h-full rounded-r-full bg-player-ink transition-[width] duration-200 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex h-[68px] items-center gap-3 px-4">
        <button
          type="button"
          onClick={reopen}
          className={`group flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left ${playerFocus}`}
          aria-label={`Reopen ${track.title}`}
        >
          {/* Lightweight waveform (few bars, ~30fps cap, still when paused) — this bar mostly
              sits in peripheral vision. The full player's visualizer unmounts when this one
              mounts and vice versa (isFullViewActive), so only one loop ever runs. */}
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-player-raised shadow-player-panel ring-1 ring-inset ring-player-border transition-transform duration-150 ease-player group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
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
                color={PLAYER.ink}
                className="h-full w-full px-2"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-bold !text-player-text">{track.title}</div>
            <div className="truncate text-[11px] tabular-nums !text-player-textMuted">
              {track.courseTitle ? `${track.courseTitle} · ` : ""}
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </button>

        {/* Same glowing play button as the full player (glow, playing pulse/sheen, cross-fade). */}
        <PlayerPlayButton size="sm" isPlaying={isPlaying} isBusy={isLoading} disabled={isLoading} onClick={toggle} />

        <button
          type="button"
          onClick={close}
          aria-label="Close player"
          className={`h-9 w-9 shrink-0 ${playerIconButton}`}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
