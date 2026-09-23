"use client";

import React, { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ChevronDown, Loader2, Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import { useAudioPlayer, useAudioTime, type AudioTrack } from '@/components/lms/AudioPlayerProvider';
// NOTE: this orchestrator deliberately does NOT call useAudioTime() itself — that hook's
// snapshot object changes on every timeupdate tick regardless of which field is read, which
// would re-render this whole tree (transcript, chapters, everything) on every tick. `duration`
// only changes at loadedmetadata, so it's read from the coarse useAudioPlayer() context instead
// (see AudioPlayerProvider's `duration` field). Only the isolated leaves (TimeReadout, Scrubber,
// SpeakerRow, TranscriptPanel, ChaptersPanel) call useAudioTime().
import { getAccessibleAccent } from '@/lib/color/accessibleAccent';
import { useAudioLessonContent } from './audio/useAudioLessonContent';
import SpeakerRow from './audio/SpeakerRow';
import Scrubber from './audio/Scrubber';
import PlaybackSpeedMenu from './audio/PlaybackSpeedMenu';
import TranscriptPanel from './audio/TranscriptPanel';
import ChaptersPanel from './audio/ChaptersPanel';
import LiveWaveformVisualizer from '@/components/lms/LiveWaveformVisualizer';

interface CourseThemeLike {
  primaryHex: string;
  gradientClass: string;
}

interface AudioDrivePlayerProps {
  assetId: string;
  contentBlockId: string;
  courseId: string;
  lessonId: string;
  title: string;
  courseTitle?: string | null;
  moduleTitle?: string | null;
  artworkUrl?: string | null;
  completionThreshold?: number | null;
  isAlreadyCompleted: boolean;
  onComplete: () => void;
  theme: CourseThemeLike;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Phase 3 Stage 2: the full premium player. Registers as the active "full view" against the
// global AudioPlayerProvider (Stage 1) so the mini player hides while this is on screen. Every
// time-sensitive piece (SpeakerRow, Scrubber, TranscriptPanel, ChaptersPanel, and the elapsed/
// total readout below) subscribes to useAudioTime() independently — a timeupdate tick re-renders
// only whichever of those actually needs it, never this whole component.
export default function AudioDrivePlayer({
  assetId,
  contentBlockId,
  courseId,
  lessonId,
  title,
  courseTitle,
  moduleTitle,
  artworkUrl,
  completionThreshold,
  isAlreadyCompleted,
  onComplete,
  theme,
}: AudioDrivePlayerProps) {
  const player = useAudioPlayer();
  const { duration } = player;
  const content = useAudioLessonContent(contentBlockId);
  // WCAG check (Phase 3 spec requirement): the raw theme accents fail AA for text (Signal
  // 3.82:1, Grove 3.30:1, Ember 2.85:1 against white — all below 4.5:1, Ember even below the
  // 3:1 UI-component floor). getAccessibleAccent derives real AA-safe variants per theme rather
  // than hardcoding a fix for just these three.
  const accent = useMemo(() => getAccessibleAccent(theme.primaryHex), [theme.primaryHex]);
  const completedRef = useRef(isAlreadyCompleted);
  const resumeToastShownRef = useRef(false);

  useEffect(() => {
    completedRef.current = isAlreadyCompleted;
  }, [isAlreadyCompleted]);

  useEffect(() => {
    return player.registerFullView(contentBlockId);
  }, [player, contentBlockId]);

  // Loads once resumePositionSeconds has resolved (or is confirmed absent) so a real saved
  // position is never raced by an immediate 0-start load.
  useEffect(() => {
    if (content.loading) return;
    const track: AudioTrack = {
      assetId, contentBlockId, courseId, lessonId, title, courseTitle, artworkUrl, completionThreshold,
      accentHex: theme.primaryHex,
    };
    player.load(track, { resumeAt: content.resumePositionSeconds ?? undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, content.loading]);

  const isActiveTrack = player.track?.assetId === assetId;
  const isPlaying = isActiveTrack && player.isPlaying;
  const isBuffering = isActiveTrack && player.isLoading && duration > 0;
  const isInitialLoading = isActiveTrack && player.isLoading && duration === 0 && !player.hasError;

  useEffect(() => {
    if (!isActiveTrack || completedRef.current) return;
    if (player.completedAssetIds.has(assetId)) {
      completedRef.current = true;
      onComplete();
    }
  }, [isActiveTrack, player.completedAssetIds, assetId, onComplete]);

  // Resume feedback — same product language the video player already uses for its own restore
  // flow (`Welcome back...` toast), so audio resume doesn't introduce a second convention.
  // Resume is automatic (not a confirmation prompt): this app's existing resume UX for video is
  // already silent-and-automatic, and an audio episode picking up where it left off is the
  // expected default in every reference product (Podcasts, Overcast, Spotify) — a prompt would
  // be friction for the common case, not a safety net.
  useEffect(() => {
    if (resumeToastShownRef.current || content.loading) return;
    if (isActiveTrack && content.resumePositionSeconds && content.resumePositionSeconds > 3) {
      resumeToastShownRef.current = true;
      toast.success(`Picking up right where you left off — ${formatTime(content.resumePositionSeconds)}.`, {
        duration: 4000,
      });
    }
  }, [isActiveTrack, content.loading, content.resumePositionSeconds]);

  if (player.hasError && isActiveTrack) {
    return (
      <div className="w-full rounded-2xl border border-dash-border bg-white p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="shrink-0 text-amber-500" size={22} />
          <div>
            <p className="text-[13px] font-bold !text-dash-text">This audio is temporarily unavailable</p>
            <p className="text-[12px] !text-dash-textMuted">Check back soon, or let your instructor know.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isInitialLoading || content.loading) {
    return (
      <div className="w-full animate-pulse rounded-2xl border border-dash-border bg-white p-5 motion-reduce:animate-none">
        <div className="flex items-center gap-4">
          {artworkUrl && <div className="h-20 w-20 shrink-0 rounded-xl bg-dash-surface" />}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded bg-dash-surface" />
            <div className="h-3 w-1/2 rounded bg-dash-surface" />
          </div>
        </div>
        <div className={`mt-4 w-full rounded-xl bg-dash-surface ${artworkUrl ? 'h-11' : 'h-[88px]'}`} />
        <div className="mx-auto mt-5 h-14 w-14 rounded-full bg-dash-surface" />
        <div className="mt-4 h-1.5 w-full rounded-full bg-dash-surface" />
      </div>
    );
  }

  // Scoped to this player's own subtree (not a window listener) — space toggles play/pause,
  // left/right skip ±10s, matching the skip buttons' own increment. Skipped when focus is on a
  // form control (a focused <button> already handles Space/Enter natively; double-handling it
  // here would double-toggle) or on the scrubber itself (role="slider" already owns arrow keys).
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isActiveTrack) return;
    const target = e.target as HTMLElement;
    const isFormControl = ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(target.tagName) || target.isContentEditable;
    const isSlider = target.getAttribute('role') === 'slider';
    if (e.key === ' ' && !isFormControl) {
      e.preventDefault();
      player.toggle();
    } else if (e.key === 'ArrowRight' && !isSlider && !isFormControl) {
      e.preventDefault();
      player.skip(10);
    } else if (e.key === 'ArrowLeft' && !isSlider && !isFormControl) {
      e.preventDefault();
      player.skip(-10);
    }
  };

  return (
    <div className="w-full space-y-3" onKeyDown={handleKeyDown}>
      <div className="rounded-2xl border border-dash-border bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {/* Artwork + header */}
        <div className="flex items-center gap-4">
          {artworkUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artworkUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover shadow-sm" />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[16px] font-bold !text-dash-text">{title}</h3>
            {(courseTitle || moduleTitle) && (
              <p className="truncate text-[12px] font-medium !text-dash-textMuted">
                {courseTitle}
                {courseTitle && moduleTitle ? ' · ' : ''}
                {moduleTitle}
              </p>
            )}
          </div>
        </div>

        {/* Live waveform — shown for every audio block, zero authoring. Without artwork it IS the
            visual identity (tall hero band on a faint accent wash, replacing the old static
            gradient tile); with real artwork it steps down to a slim band so it adds life without
            competing with the image. Bars use the AA-safe `ui` accent, same as the scrubber. */}
        <div
          className={`mt-4 rounded-xl ${artworkUrl ? 'px-1' : 'px-3 py-2'}`}
          style={artworkUrl ? undefined : { backgroundColor: `${accent.raw}0F` }}
        >
          <LiveWaveformVisualizer
            active={isActiveTrack}
            color={accent.ui}
            bars={artworkUrl ? 56 : 48}
            className={`w-full ${artworkUrl ? 'h-11' : 'h-[72px]'}`}
          />
        </div>

        {/* Speaker row */}
        {content.speakers.length > 0 && (
          <div className="mt-5 flex justify-center">
            <SpeakerRow speakers={content.speakers} segments={content.segments} accent={accent} />
          </div>
        )}

        {/* Controls */}
        <div className="mt-5 flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={() => player.skip(-10)}
            disabled={!isActiveTrack}
            aria-label="Back 10 seconds"
            className="relative flex h-10 w-10 items-center justify-center rounded-full !text-dash-textMuted transition-colors duration-150 hover:bg-dash-surface hover:!text-dash-text disabled:opacity-40"
          >
            <RotateCcw size={20} />
            <span className="pointer-events-none absolute text-[8px] font-bold">10</span>
          </button>

          <button
            type="button"
            onClick={player.toggle}
            disabled={!isActiveTrack}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-md transition-transform duration-150 hover:scale-105 active:scale-95 disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:scale-100"
            style={{ backgroundColor: accent.text }}
          >
            {isBuffering ? (
              <Loader2 size={22} className="animate-spin motion-reduce:animate-none" />
            ) : isPlaying ? (
              <Pause size={22} fill="currentColor" />
            ) : (
              <Play size={22} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => player.skip(10)}
            disabled={!isActiveTrack}
            aria-label="Forward 10 seconds"
            className="relative flex h-10 w-10 items-center justify-center rounded-full !text-dash-textMuted transition-colors duration-150 hover:bg-dash-surface hover:!text-dash-text disabled:opacity-40"
          >
            <RotateCw size={20} />
            <span className="pointer-events-none absolute text-[8px] font-bold">10</span>
          </button>
        </div>

        {/* Scrubber + time + speed */}
        <div className="mt-4 space-y-1.5">
          <Scrubber accent={accent} />
          <div className="flex items-center justify-between">
            <TimeReadout />
            <PlaybackSpeedMenu accent={accent} />
          </div>
        </div>

        {!isAlreadyCompleted && (
          <p className="mt-1 text-center text-[10px] !text-dash-textMuted">
            Marks complete automatically at {completionThreshold ?? 90}% listened.
          </p>
        )}
      </div>

      {/* Chapters + Transcript — two columns on desktop, accordions on mobile */}
      {(content.chapters.length > 0 || content.transcript.length > 0) && (
        <>
          <div className="hidden gap-3 md:grid md:grid-cols-[220px_1fr]">
            {content.chapters.length > 0 && (
              <ChaptersPanel chapters={content.chapters} accent={accent} />
            )}
            {content.transcript.length > 0 && (
              <TranscriptPanel transcript={content.transcript} speakers={content.speakers} accent={accent} />
            )}
          </div>

          <div className="space-y-2 md:hidden">
            {content.chapters.length > 0 && (
              <details className="group rounded-2xl border border-dash-border bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[12px] font-bold !text-dash-text">
                  Chapters
                  <ChevronDown size={14} className="transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
                </summary>
                <div className="px-2 pb-2">
                  <ChaptersPanel chapters={content.chapters} accent={accent} className="border-0 p-0" />
                </div>
              </details>
            )}
            {content.transcript.length > 0 && (
              <details className="group rounded-2xl border border-dash-border bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[12px] font-bold !text-dash-text">
                  Transcript
                  <ChevronDown size={14} className="transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
                </summary>
                <div className="px-2 pb-2">
                  <TranscriptPanel transcript={content.transcript} speakers={content.speakers} accent={accent} className="border-0" />
                </div>
              </details>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TimeReadout() {
  const { currentTime, duration } = useAudioTime();
  return (
    <span className="font-mono text-[11px] tabular-nums !text-dash-textMuted">
      {formatTime(currentTime)} / {formatTime(duration)}
    </span>
  );
}
