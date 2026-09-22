"use client";

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import { useAudioPlayer, type AudioTrack } from '@/components/lms/AudioPlayerProvider';

interface AudioDrivePlayerProps {
  assetId: string;
  contentBlockId: string;
  courseId: string;
  lessonId: string;
  title: string;
  courseTitle?: string | null;
  completionThreshold?: number | null;
  resumePositionSeconds?: number | null;
  isAlreadyCompleted: boolean;
  onComplete: () => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Stage 1 of Phase 3: this is the "full player" registered against the global
// AudioPlayerProvider — real playback/scrub/skip controls wired to the shared <audio> element
// that lives above the route layer (survives navigation into the mini player). The premium
// visual build (artwork, speaker highlighting, transcript, chapters) is Phase 3 Stage 2; this
// intentionally stays close to Phase 1's plain styling so the architecture change is reviewable
// on its own.
export default function AudioDrivePlayer({
  assetId,
  contentBlockId,
  courseId,
  lessonId,
  title,
  courseTitle,
  completionThreshold,
  resumePositionSeconds,
  isAlreadyCompleted,
  onComplete,
}: AudioDrivePlayerProps) {
  const player = useAudioPlayer();
  const completedRef = useRef(isAlreadyCompleted);
  const [scrubValue, setScrubValue] = useState<number | null>(null);

  useEffect(() => {
    completedRef.current = isAlreadyCompleted;
  }, [isAlreadyCompleted]);

  // Registers this component as the active "full view" for its block — the mini player hides
  // itself while this is true, and reappears the instant this unmounts (navigating away).
  useEffect(() => {
    return player.registerFullView(contentBlockId);
  }, [player, contentBlockId]);

  // Loads (or re-attaches to, if already the active track) this lesson's audio on mount.
  useEffect(() => {
    const track: AudioTrack = {
      assetId,
      contentBlockId,
      courseId,
      lessonId,
      title,
      courseTitle,
      completionThreshold,
    };
    player.load(track, { resumeAt: resumePositionSeconds ?? undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  const isActiveTrack = player.track?.assetId === assetId;
  const currentTime = isActiveTrack ? player.currentTime : 0;
  const duration = isActiveTrack ? player.duration : 0;
  const isPlaying = isActiveTrack && player.isPlaying;
  const isLoading = isActiveTrack && player.isLoading;

  useEffect(() => {
    if (!isActiveTrack || completedRef.current) return;
    if (player.completedAssetIds.has(assetId)) {
      completedRef.current = true;
      onComplete();
    }
  }, [isActiveTrack, player.completedAssetIds, assetId, onComplete]);

  if (player.hasError && isActiveTrack) {
    return (
      <div className="w-full rounded-2xl bg-dash-surface border border-dash-border p-6 flex items-center gap-3">
        <AlertTriangle className="text-amber-500 shrink-0" size={20} />
        <span className="text-xs !text-dash-textMuted">
          This audio is temporarily unavailable — check back soon, or let your instructor know.
        </span>
      </div>
    );
  }

  const pct = duration > 0 ? ((scrubValue ?? currentTime) / duration) * 100 : 0;

  return (
    <div className="space-y-3 w-full rounded-2xl border border-dash-border bg-white p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={player.toggle}
          disabled={!isActiveTrack || isLoading}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-dash-accent text-white transition-transform duration-150 hover:scale-105 active:scale-95 disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:scale-100"
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin motion-reduce:animate-none" />
          ) : isPlaying ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" className="ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => player.skip(-10)}
          disabled={!isActiveTrack}
          aria-label="Back 10 seconds"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full !text-dash-textMuted transition-colors hover:bg-dash-surface hover:!text-dash-text disabled:opacity-40"
        >
          <RotateCcw size={16} />
        </button>
        <button
          type="button"
          onClick={() => player.skip(10)}
          disabled={!isActiveTrack}
          aria-label="Forward 10 seconds"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full !text-dash-textMuted transition-colors hover:bg-dash-surface hover:!text-dash-text disabled:opacity-40"
        >
          <RotateCw size={16} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold !text-dash-text">{title}</div>
          <div className="text-[11px] !text-dash-textMuted">
            {formatTime(scrubValue ?? currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={scrubValue ?? currentTime}
        onChange={(e) => setScrubValue(parseFloat(e.target.value))}
        onMouseUp={() => {
          if (scrubValue != null) player.seek(scrubValue);
          setScrubValue(null);
        }}
        onTouchEnd={() => {
          if (scrubValue != null) player.seek(scrubValue);
          setScrubValue(null);
        }}
        disabled={!isActiveTrack || !duration}
        aria-label="Seek"
        className="w-full accent-[color:var(--dash-accent,#1359FF)] disabled:opacity-40"
        style={{ accentColor: '#1359FF' }}
      />

      {!isAlreadyCompleted && (
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider !text-dash-textMuted">
          <span>Listen progress</span>
          <span className="text-dash-accent">{Math.round(pct)}%</span>
        </div>
      )}
    </div>
  );
}
