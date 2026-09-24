"use client";

import React, { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { useAudioPlayer, useAudioTime, type AudioTrack } from '@/components/lms/AudioPlayerProvider';
// NOTE: this orchestrator deliberately does NOT call useAudioTime() itself — that hook's
// snapshot object changes on every timeupdate tick regardless of which field is read, which
// would re-render this whole tree (transcript, chapters, everything) on every tick. `duration`
// only changes at loadedmetadata, so it's read from the coarse useAudioPlayer() context instead
// (see AudioPlayerProvider's `duration` field). Only the isolated leaves (TimeReadout, Scrubber,
// SpeakerRow, TranscriptPanel, ChaptersPanel) call useAudioTime().
import { waveformColorFor } from '@/lib/lms/audio/waveformColor';
import { useAudioLessonContent } from './audio/useAudioLessonContent';
import SpeakerRow from './audio/SpeakerRow';
import Scrubber from './audio/Scrubber';
import PlaybackSpeedMenu from './audio/PlaybackSpeedMenu';
import TranscriptPanel from './audio/TranscriptPanel';
import ChaptersPanel from './audio/ChaptersPanel';
import LiveWaveformVisualizer from '@/components/lms/LiveWaveformVisualizer';
import { SkipBackIcon, SkipForwardIcon } from '@/components/lms/PlayerIcons';
import { playerEyebrow, playerFocus, playerIconButton, playerPanel } from '@/lib/lms/audio/playerStyles';
import PlayerPlayButton from '@/components/lms/PlayerPlayButton';

interface AudioDrivePlayerProps {
  assetId: string;
  contentBlockId: string;
  courseId: string;
  lessonId: string;
  title: string;
  courseTitle?: string | null;
  moduleTitle?: string | null;
  artworkUrl?: string | null;
  /** content_blocks.audio_waveform_color (the admin's raw pick; null = default monochrome). */
  waveformColor?: string | null;
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
  waveformColor,
  completionThreshold,
  isAlreadyCompleted,
  onComplete,
}: AudioDrivePlayerProps) {
  const player = useAudioPlayer();
  const { duration, registerFullView } = player;
  const content = useAudioLessonContent(contentBlockId);
  // Colours: the player's own signature identity (playerIdentity.ts / `player-*` tokens), NOT the
  // course theme — every variant there is AA-derived and asserted by playerIdentity.test.ts.
  const completedRef = useRef(isAlreadyCompleted);
  const resumeToastShownRef = useRef(false);

  useEffect(() => {
    completedRef.current = isAlreadyCompleted;
  }, [isAlreadyCompleted]);

  useEffect(() => {
    return registerFullView(contentBlockId);
    // Depends on the STABLE registerFullView callback, not the whole `player` context object:
    // that object changes on every provider state change, and re-registering on each one would
    // churn the provider's registered-view Set into a render loop.
  }, [registerFullView, contentBlockId]);

  const buildTrack = (): AudioTrack => ({
    assetId, contentBlockId, courseId, lessonId, title, courseTitle, artworkUrl, waveformColor, completionThreshold,
  });

  // Loads once resumePositionSeconds has resolved (or is confirmed absent) so a real saved
  // position is never raced by an immediate 0-start load. Only claims the provider's single
  // <audio> element if nothing else is loaded (or it's already this block): with several audio
  // blocks on one page, each used to load() on mount and the LAST one won, leaving the others
  // permanently disabled. Now the first claims it and any other claims it on its own Play.
  useEffect(() => {
    if (content.loading) return;
    const current = player.track;
    if (current && current.contentBlockId !== contentBlockId) return;
    player.load(buildTrack(), { resumeAt: content.resumePositionSeconds ?? undefined });
    // artworkUrl/waveformColor are deps so a changed image or colour reaches the mini bar's track too — safe:
    // load() short-circuits for the same assetId (metadata update only, never touches audio.src).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, content.loading, artworkUrl, waveformColor]);

  // One player at a time per provider (matches the student page's single shared element): this
  // block becomes the loaded track and plays — inside the user's click, so play() is allowed.
  // `atSeconds` lets a chapter/transcript click on an inactive player start from that point.
  const activate = (atSeconds?: number) => {
    player.load(buildTrack(), { resumeAt: atSeconds ?? content.resumePositionSeconds ?? undefined });
    player.play();
  };

  // Identity is the BLOCK, not the asset: one recording can be attached to several blocks.
  const isActiveTrack = player.track?.contentBlockId === contentBlockId;
  const seekOrActivate = (seconds: number) => (isActiveTrack ? player.seek(seconds) : activate(seconds));
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
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-player-raised ring-1 ring-inset ring-player-border">
            <AlertTriangle className="!text-player-text" size={18} />
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
        className="flex w-full animate-pulse overflow-hidden rounded-2xl border border-player-border bg-player-surface shadow-player-card motion-reduce:animate-none [container-type:inline-size]"
        aria-busy="true"
        aria-label="Loading audio"
      >
        {/* Same geometry as the loaded compact layout below, so nothing jumps when metadata arrives. */}
        <div className="min-w-0 flex-1 px-5 py-4">
          <div className="flex items-start gap-3">
            {artworkUrl && <div className="aspect-square w-10 shrink-0 rounded-lg bg-player-track [@container(min-width:720px)]:hidden" />}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-1/2 rounded bg-player-raised" />
              <div className="h-3 w-2/3 rounded bg-player-raised" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex shrink-0 items-center gap-1.5">
              <div className="h-10 w-10 rounded-full bg-player-raised" />
              <div className="h-12 w-12 rounded-full bg-player-track" />
              <div className="h-10 w-10 rounded-full bg-player-raised" />
            </div>
            <div className="h-12 min-w-[80px] flex-1 rounded-xl bg-player-raised" />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-3 w-16 rounded bg-player-raised" />
            <div className="h-1.5 flex-1 rounded-full bg-player-track" />
            <div className="h-8 w-11 rounded-full bg-player-raised" />
          </div>
        </div>
        {artworkUrl && <div className="hidden w-48 shrink-0 border-l border-player-border bg-player-raised [@container(min-width:720px)]:block" />}
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
          It's the one element on the page that floats: a white card with a neutral ink lift
          (shadow-player-card), where every other lesson card sits flat on white. */}
      {/* Compact layout (~190px tall): three rows in a content column — header / controls +
          waveform / scrubber — with custom artwork as a full-height, roughly square panel flush
          against the card's right edge on wide cards (>= 720px; the content column keeps >= ~540px).
          Narrower cards show the artwork as a small square thumbnail beside the title instead. */}
      <div className="flex overflow-hidden rounded-2xl border border-player-border bg-player-surface shadow-player-card [container-type:inline-size]">
        <div className="min-w-0 flex-1 px-5 py-4">
          {/* Row 1 — header */}
          <div className="flex items-start gap-3">
            {artworkUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={artworkUrl}
                alt=""
                className="aspect-square w-10 shrink-0 rounded-lg object-cover object-center ring-1 ring-inset ring-black/5 [@container(min-width:720px)]:hidden"
              />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[16px] font-bold leading-snug !text-player-text">{title}</h3>
              <p className="flex min-w-0 items-center gap-1.5 truncate text-[12px] font-medium !text-player-textMuted">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-player-ink" aria-hidden="true" />
                <span className="truncate">
                  Audio lesson
                  {courseTitle ? ` · ${courseTitle}` : ''}
                  {moduleTitle ? ` · ${moduleTitle}` : ''}
                </span>
              </p>
            </div>
            {!isAlreadyCompleted && (
              <span className="hidden shrink-0 pt-0.5 text-[11px] !text-player-textMuted [@container(min-width:520px)]:inline">
                Completes at {completionThreshold ?? 90}%
              </span>
            )}
          </div>

          {/* Speaker row (only when speakers are authored — optional, adds its own height) */}
          {content.speakers.length > 0 && (
            <div className="mt-3 flex justify-center">
              <SpeakerRow speakers={content.speakers} segments={content.segments} active={isActiveTrack} />
            </div>
          )}

          {/* Row 2 — transport controls + live waveform band, side by side */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => player.skip(-10)}
                disabled={!isActiveTrack}
                aria-label="Back 10 seconds"
                className={`h-10 w-10 ${playerIconButton}`}
              >
                <SkipBackIcon size={20} />
              </button>

              {/* An inactive player (another block holds the shared element) claims it on Play
                  rather than being disabled — see activate(). */}
              <PlayerPlayButton
                size="compact"
                isPlaying={isPlaying}
                isBusy={isBuffering}
                onClick={isActiveTrack ? player.toggle : () => activate()}
              />

              <button
                type="button"
                onClick={() => player.skip(10)}
                disabled={!isActiveTrack}
                aria-label="Forward 10 seconds"
                className={`h-10 w-10 ${playerIconButton}`}
              >
                <SkipForwardIcon size={20} />
              </button>
            </div>

            {/* Live waveform — zero authoring. Canvas in normal flow with a definite CSS size
                (an absolutely-positioned canvas can't be sized by insets and would grow to its
                backing-store width). */}
            <div className="flex h-12 min-w-[80px] flex-1 items-center rounded-xl border border-player-border bg-player-raised px-3">
              <LiveWaveformVisualizer active={isActiveTrack} color={waveformColorFor(waveformColor)} bars="auto" className="h-8 w-full" />
            </div>
          </div>

          {/* Row 3 — time · scrubber · speed on one line */}
          <div className="mt-3 flex items-center gap-3">
            <TimeReadout active={isActiveTrack} />
            <div className="min-w-0 flex-1">
              <Scrubber active={isActiveTrack} />
            </div>
            <PlaybackSpeedMenu />
          </div>
        </div>

        {artworkUrl && (
          // Full-height, flush to the card's right edge (the card's overflow-hidden + radius shape
          // its corners); a hairline separates it from the content. Absolutely positioned image so
          // the CONTENT column sets the height — the art crops to fit (cover, centred), ~square.
          <div className="relative hidden w-48 shrink-0 border-l border-player-border bg-player-raised [@container(min-width:720px)]:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={artworkUrl} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
          </div>
        )}
      </div>

      {/* Chapters + Transcript — two columns on desktop, accordions on mobile */}
      {(content.chapters.length > 0 || content.transcript.length > 0) && (
        <>
          <div className="hidden gap-3 md:grid md:grid-cols-[220px_1fr]">
            {content.chapters.length > 0 && (
              <ChaptersPanel chapters={content.chapters} active={isActiveTrack} onSeek={seekOrActivate} />
            )}
            {content.transcript.length > 0 && (
              <TranscriptPanel transcript={content.transcript} speakers={content.speakers} active={isActiveTrack} onSeek={seekOrActivate} />
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
                  <ChaptersPanel chapters={content.chapters} active={isActiveTrack} onSeek={seekOrActivate} bare />
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
                  <TranscriptPanel transcript={content.transcript} speakers={content.speakers} active={isActiveTrack} onSeek={seekOrActivate} bare />
                </div>
              </details>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Time/duration are the provider's CURRENT track's — only meaningful for the active block. An
// inactive block (another one holds the shared element) shows a neutral readout instead of
// mirroring someone else's position.
function TimeReadout({ active }: { active: boolean }) {
  const { currentTime, duration } = useAudioTime();
  return (
    <span className="shrink-0 text-[12px] font-medium tabular-nums !text-player-textMuted">
      <span className="!text-player-text">{formatTime(active ? currentTime : 0)}</span> / {active ? formatTime(duration) : '--:--'}
    </span>
  );
}
