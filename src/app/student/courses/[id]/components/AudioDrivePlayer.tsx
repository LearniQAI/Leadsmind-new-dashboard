"use client";

import React, { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ChevronDown, Loader2, Pause, Play } from 'lucide-react';
import { useAudioPlayer, useAudioTime, type AudioTrack } from '@/components/lms/AudioPlayerProvider';
// NOTE: this orchestrator deliberately does NOT call useAudioTime() itself — that hook's
// snapshot object changes on every timeupdate tick regardless of which field is read, which
// would re-render this whole tree (transcript, chapters, everything) on every tick. `duration`
// only changes at loadedmetadata, so it's read from the coarse useAudioPlayer() context instead
// (see AudioPlayerProvider's `duration` field). Only the isolated leaves (TimeReadout, Scrubber,
// SpeakerRow, TranscriptPanel, ChaptersPanel) call useAudioTime().
import { PLAYER } from '@/lib/lms/audio/playerIdentity';
import { useAudioLessonContent } from './audio/useAudioLessonContent';
import SpeakerRow from './audio/SpeakerRow';
import Scrubber from './audio/Scrubber';
import PlaybackSpeedMenu from './audio/PlaybackSpeedMenu';
import TranscriptPanel from './audio/TranscriptPanel';
import ChaptersPanel from './audio/ChaptersPanel';
import LiveWaveformVisualizer from '@/components/lms/LiveWaveformVisualizer';
import { SkipBackIcon, SkipForwardIcon } from '@/components/lms/PlayerIcons';
import { playerEyebrow, playerFocus, playerIconButton, playerPanel, playerPrimaryButton } from '@/lib/lms/audio/playerStyles';

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
}: AudioDrivePlayerProps) {
  const player = useAudioPlayer();
  const { duration } = player;
  const content = useAudioLessonContent(contentBlockId);
  // Colours: the player's own signature identity (playerIdentity.ts / `player-*` tokens), NOT the
  // course theme — every variant there is AA-derived and asserted by playerIdentity.test.ts.
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
    };
    player.load(track, { resumeAt: content.resumePositionSeconds ?? undefined });
    // artworkUrl is a dep so a replaced/removed image reaches the mini bar's track too — safe:
    // load() short-circuits for the same assetId (metadata update only, never touches audio.src).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, content.loading, artworkUrl]);

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
      <div className={`w-full p-5 ${playerPanel}`} role="alert">
        <div className="flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 ring-1 ring-inset ring-amber-200">
            <AlertTriangle className="text-amber-700" size={18} />
          </span>
          <div>
            <p className="text-[13px] font-bold !text-player-text">This audio is temporarily unavailable</p>
            <p className="text-[12px] !text-player-textMuted">Check back soon, or let your instructor know.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isInitialLoading || content.loading) {
    return (
      <div
        className="w-full animate-pulse rounded-2xl border border-player-border bg-player-surface p-5 shadow-player-card motion-reduce:animate-none [container-type:inline-size]"
        aria-busy="true"
        aria-label="Loading audio"
      >
        <div className="space-y-2">
          <div className="h-2.5 w-20 rounded-full bg-player-track" />
          <div className="h-4 w-2/3 rounded bg-player-raised" />
          <div className="h-3 w-1/2 rounded bg-player-raised" />
        </div>
        {/* Same geometry as the loaded layout below, so nothing jumps when metadata arrives. */}
        {artworkUrl ? (
          <div className="mt-4 flex flex-col-reverse gap-3 [@container(min-width:540px)]:grid [@container(min-width:540px)]:grid-cols-[minmax(0,65fr)_minmax(0,35fr)] [@container(min-width:540px)]:gap-4">
            <div className="h-24 rounded-xl bg-player-raised [@container(min-width:540px)]:h-auto" />
            <div className="mx-auto aspect-square w-full max-w-[18rem] rounded-xl bg-player-raised [@container(min-width:540px)]:max-w-none" />
          </div>
        ) : (
          <div className="mt-4 h-[88px] w-full rounded-xl bg-player-raised" />
        )}
        <div className="mt-5 flex items-center justify-center gap-6">
          <div className="h-11 w-11 rounded-full bg-player-raised" />
          <div className="h-14 w-14 rounded-full bg-player-track" />
          <div className="h-11 w-11 rounded-full bg-player-raised" />
        </div>
        <div className="mt-5 h-1.5 w-full rounded-full bg-player-track" />
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
      {/* The card is a size container: the split layout below responds to the card's OWN width,
          not the viewport — the same player renders in the builder's fixed 380px preview column
          (always stacked there) and in the wide student lesson column (side by side).
          It's the one element on the page that floats: lavender-white surface + violet-tinted
          lift (shadow-player-card), where every other lesson card sits flat on white. */}
      <div className="rounded-2xl border border-player-border bg-player-surface p-5 shadow-player-card [container-type:inline-size]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] !text-player-violetText">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-player-fillFrom to-player-fillTo" aria-hidden="true" />
            Audio lesson
          </span>
          <h3 className="mt-1 truncate text-[17px] font-bold leading-snug !text-player-text">{title}</h3>
          {(courseTitle || moduleTitle) && (
            <p className="truncate text-[12px] font-medium !text-player-textMuted">
              {courseTitle}
              {courseTitle && moduleTitle ? ' · ' : ''}
              {moduleTitle}
            </p>
          )}
        </div>

        {/* Live waveform — shown for every audio block, zero authoring. Bars: violet body with
            magenta tips (both AA-derived UI variants on the raised wash). */}
        {artworkUrl ? (
          // Custom per-lesson artwork: waveform left / cover art right at 65:35 once the card is
          // >= 540px wide; below that, stacked with the art on top (podcast-app order) and the
          // waveform directly above the controls it reacts to. Both are decorative (canvas is
          // aria-hidden, img alt=""), so the visual reorder has no reading-order cost.
          <div className="mt-4 flex flex-col-reverse gap-3 [@container(min-width:540px)]:grid [@container(min-width:540px)]:grid-cols-[minmax(0,65fr)_minmax(0,35fr)] [@container(min-width:540px)]:gap-4">
            {/* The canvas is absolutely positioned so it contributes nothing to layout: its
                backing-store size (CSS size x DPR) would otherwise feed back into the row height. */}
            <div className="relative h-24 rounded-xl bg-player-raised [@container(min-width:540px)]:h-auto">
              <LiveWaveformVisualizer
                active={isActiveTrack}
                color={PLAYER.violetUi}
                colorTo={PLAYER.magentaUi}
                bars={40}
                className="absolute inset-x-3 top-1/2 h-[64%] -translate-y-1/2"
              />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={artworkUrl}
              alt=""
              className="mx-auto aspect-square w-full max-w-[18rem] rounded-xl object-cover shadow-player-art ring-1 ring-inset ring-black/5 [@container(min-width:540px)]:max-w-none"
            />
          </div>
        ) : (
          // No artwork: the waveform IS the visual identity — full-width hero band.
          <div className="mt-4 rounded-xl bg-player-raised px-3 py-2">
            <LiveWaveformVisualizer
              active={isActiveTrack}
              color={PLAYER.violetUi}
              colorTo={PLAYER.magentaUi}
              bars={48}
              className="h-[72px] w-full"
            />
          </div>
        )}

        {/* Speaker row */}
        {content.speakers.length > 0 && (
          <div className="mt-4 flex justify-center">
            <SpeakerRow speakers={content.speakers} segments={content.segments} />
          </div>
        )}

        {/* Controls */}
        <div className="mt-5 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => player.skip(-10)}
            disabled={!isActiveTrack}
            aria-label="Back 10 seconds"
            className={`h-11 w-11 ${playerIconButton}`}
          >
            <SkipBackIcon />
          </button>

          <button
            type="button"
            onClick={player.toggle}
            disabled={!isActiveTrack}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className={`h-14 w-14 ${playerPrimaryButton}`}
          >
            {/* All three glyphs stay mounted and cross-fade/scale (200ms, ease-player) so the
                play/pause swap is a transition, not a hard cut. Reduced motion: instant. */}
            <PlayGlyph show={!isBuffering && !isPlaying}>
              <Play size={22} fill="currentColor" strokeLinejoin="round" className="ml-0.5" />
            </PlayGlyph>
            <PlayGlyph show={!isBuffering && isPlaying}>
              <Pause size={22} fill="currentColor" strokeLinejoin="round" />
            </PlayGlyph>
            <PlayGlyph show={isBuffering}>
              <Loader2 size={22} className="animate-spin motion-reduce:animate-none" />
            </PlayGlyph>
          </button>

          <button
            type="button"
            onClick={() => player.skip(10)}
            disabled={!isActiveTrack}
            aria-label="Forward 10 seconds"
            className={`h-11 w-11 ${playerIconButton}`}
          >
            <SkipForwardIcon />
          </button>
        </div>

        {/* Scrubber + time + speed */}
        <div className="mt-5 space-y-2">
          <Scrubber />
          <div className="flex items-center justify-between">
            <TimeReadout />
            <PlaybackSpeedMenu />
          </div>
        </div>

        {!isAlreadyCompleted && (
          <p className="mt-3 text-center text-[11px] !text-player-textMuted">
            Marks complete automatically at {completionThreshold ?? 90}% listened.
          </p>
        )}
      </div>

      {/* Chapters + Transcript — two columns on desktop, accordions on mobile */}
      {(content.chapters.length > 0 || content.transcript.length > 0) && (
        <>
          <div className="hidden gap-3 md:grid md:grid-cols-[220px_1fr]">
            {content.chapters.length > 0 && <ChaptersPanel chapters={content.chapters} />}
            {content.transcript.length > 0 && (
              <TranscriptPanel transcript={content.transcript} speakers={content.speakers} />
            )}
          </div>

          <div className="space-y-2 md:hidden">
            {content.chapters.length > 0 && (
              <details className={`group ${playerPanel}`}>
                <summary className={`flex cursor-pointer list-none items-center justify-between rounded-2xl px-4 py-3 ${playerFocus}`}>
                  <span className={playerEyebrow}>Chapters</span>
                  <ChevronDown size={16} className="!text-player-textMuted transition-transform duration-200 ease-player group-open:rotate-180 motion-reduce:transition-none" />
                </summary>
                <div className="px-2 pb-2">
                  <ChaptersPanel chapters={content.chapters} bare />
                </div>
              </details>
            )}
            {content.transcript.length > 0 && (
              <details className={`group ${playerPanel}`}>
                <summary className={`flex cursor-pointer list-none items-center justify-between rounded-2xl px-4 py-3 ${playerFocus}`}>
                  <span className={playerEyebrow}>Transcript</span>
                  <ChevronDown size={16} className="!text-player-textMuted transition-transform duration-200 ease-player group-open:rotate-180 motion-reduce:transition-none" />
                </summary>
                <div className="px-2 pb-2">
                  <TranscriptPanel transcript={content.transcript} speakers={content.speakers} bare />
                </div>
              </details>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PlayGlyph({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-200 ease-player motion-reduce:transition-none ${
        show ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
      }`}
    >
      {children}
    </span>
  );
}

function TimeReadout() {
  const { currentTime, duration } = useAudioTime();
  return (
    <span className="text-[12px] font-medium tabular-nums !text-player-textMuted">
      <span className="!text-player-text">{formatTime(currentTime)}</span> / {formatTime(duration)}
    </span>
  );
}
