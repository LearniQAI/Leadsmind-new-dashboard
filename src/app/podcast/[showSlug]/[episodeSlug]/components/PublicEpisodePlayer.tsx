"use client";

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Play, Pause, Loader2, AlertTriangle } from 'lucide-react';
import { SkipBackIcon, SkipForwardIcon } from '@/components/lms/PlayerIcons';
import {
  playerEyebrow,
  playerFocus,
  playerIconButton,
  playerPanel,
  playerPrimaryButton,
  playerRow,
} from '@/lib/lms/audio/playerStyles';

interface Chapter {
  id: string;
  title: string;
  start_time_ms: number;
  end_time_ms: number;
}

interface PublicEpisodePlayerProps {
  episodeId: string;
  title: string;
  artworkUrl: string | null;
  chapters: Chapter[];
}

// Deliberately NOT AudioPlayerProvider/useAudioPlayer — per the phase spec, the public player
// must never share the access-control-bearing data layer (that provider's load() calls the
// enrolment-gated course stream route). This is a small, self-contained, single-instance player
// pointed at the SEPARATE public stream route (/api/podcast/episodes/[id]/stream, no auth). It
// shares Phase 3's visual language deliberately, not its gated component files: the signature
// player identity comes from the provider-free token/recipe/icon layer (`player-*` Tailwind
// tokens from playerIdentity.ts, playerStyles.ts, PlayerIcons) — pure presentation, no data
// access. The gated Scrubber/ChaptersPanel/LiveWaveformVisualizer are NOT reused: they read the
// gated AudioPlayerProvider.
export default function PublicEpisodePlayer({ episodeId, title, artworkUrl, chapters }: PublicEpisodePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const streamUrl = `/api/podcast/episodes/${episodeId}/stream`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoadedMetadata = () => { setDuration(audio.duration || 0); setIsLoading(false); };
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.buffered.length > 0) setBufferedEnd(audio.buffered.end(audio.buffered.length - 1));
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);
    const onError = () => { setHasError(true); setIsLoading(false); };
    const onProgress = () => { if (audio.buffered.length > 0) setBufferedEnd(audio.buffered.end(audio.buffered.length - 1)); };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('error', onError);
    audio.addEventListener('progress', onProgress);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('progress', onProgress);
    };
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, []);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || seconds, seconds));
  }, []);

  const skip = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    seek(audio.currentTime + delta);
  }, [seek]);

  const formatTime = (s: number) => {
    if (!Number.isFinite(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const timeFromPointer = (clientX: number): number => {
    const el = trackRef.current;
    if (!el || duration <= 0) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  const displayTime = dragTime ?? currentTime;
  const playedPct = duration > 0 ? Math.min(100, (displayTime / duration) * 100) : 0;
  const bufferedPct = duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;

  const activeChapter = chapters.find((c) => currentTime * 1000 >= c.start_time_ms && currentTime * 1000 < c.end_time_ms);

  if (hasError) {
    return (
      <div className={`p-5 ${playerPanel}`} role="alert">
        <div className="flex items-center justify-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 ring-1 ring-inset ring-amber-200">
            <AlertTriangle className="text-amber-700" size={18} />
          </span>
          <p className="text-[13px] font-bold !text-player-text">This episode is temporarily unavailable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={streamUrl} preload="metadata" className="sr-only" />

      <div className="rounded-2xl border border-player-border bg-player-surface p-5 shadow-player-card">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={toggle}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className={`h-16 w-16 shrink-0 ${playerPrimaryButton}`}
          >
            {/* Same cross-fading glyph swap as the lesson player (200ms, ease-player). */}
            <Glyph show={!isLoading && !isPlaying}>
              <Play size={24} fill="currentColor" strokeLinejoin="round" className="ml-0.5" />
            </Glyph>
            <Glyph show={!isLoading && isPlaying}>
              <Pause size={24} fill="currentColor" strokeLinejoin="round" />
            </Glyph>
            <Glyph show={isLoading}>
              <Loader2 size={24} className="animate-spin motion-reduce:animate-none" />
            </Glyph>
          </button>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => skip(-10)}
                aria-label="Back 10 seconds"
                className={`h-9 w-9 shrink-0 ${playerIconButton}`}
              >
                <SkipBackIcon size={20} />
              </button>
              <div className="min-w-0 flex-1 text-center">
                <span className="block text-[10px] font-bold uppercase tracking-[0.12em] !text-player-violetText">
                  {activeChapter ? 'Now playing' : 'Episode'}
                </span>
                <span className="block truncate text-[14px] font-bold !text-player-text">
                  {activeChapter ? activeChapter.title : title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => skip(10)}
                aria-label="Forward 10 seconds"
                className={`h-9 w-9 shrink-0 ${playerIconButton}`}
              >
                <SkipForwardIcon size={20} />
              </button>
            </div>

            <div
              ref={trackRef}
              role="slider"
              tabIndex={0}
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(displayTime)}
              onPointerDown={(e) => { setIsDragging(true); setDragTime(timeFromPointer(e.clientX)); }}
              onPointerMove={(e) => { if (isDragging) setDragTime(timeFromPointer(e.clientX)); }}
              onPointerUp={() => { if (dragTime != null) seek(dragTime); setIsDragging(false); setDragTime(null); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') { e.preventDefault(); skip(10); }
                else if (e.key === 'ArrowLeft') { e.preventDefault(); skip(-10); }
                else if (e.key === ' ') { e.preventDefault(); toggle(); }
              }}
              className={`group relative h-5 w-full cursor-pointer touch-none select-none rounded-full ${playerFocus}`}
            >
              <div
                className={`absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-player-track transition-[height] duration-150 ease-player motion-reduce:transition-none ${isDragging ? 'h-2' : 'h-1.5 group-hover:h-2'}`}
              >
                <div className="absolute inset-y-0 left-0 h-full rounded-full bg-player-buffered" style={{ width: `${bufferedPct}%` }} />
                <div
                  className={`absolute inset-y-0 left-0 h-full rounded-full bg-gradient-to-r from-player-violetUi to-player-magentaUi ${isDragging ? '' : 'transition-[width] duration-150 ease-linear'}`}
                  style={{ width: `${playedPct}%` }}
                />
              </div>
              <div
                className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-[3px] border-white bg-player-violetUi shadow-player-glow transition-transform duration-150 ease-player group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${isDragging ? 'scale-125' : ''}`}
                style={{ left: `calc(${playedPct}% - 7px)` }}
              />
            </div>

            <div className="text-right text-[12px] font-medium tabular-nums !text-player-textMuted">
              <span className="!text-player-text">{formatTime(displayTime)}</span> / {formatTime(duration)}
            </div>
          </div>
        </div>
      </div>

      {chapters.length > 0 && (
        <div className={`p-2 ${playerPanel}`}>
          <div className={`px-3 pb-1.5 pt-2 ${playerEyebrow}`}>Chapters</div>
          <div className="space-y-0.5">
            {chapters.map((c) => {
              const isActive = c.id === activeChapter?.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => seek(c.start_time_ms / 1000)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 ${playerRow} ${isActive ? 'bg-player-raised' : ''}`}
                >
                  {isActive && (
                    <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-gradient-to-b from-player-fillFrom to-player-fillTo" aria-hidden="true" />
                  )}
                  <span className={`w-10 shrink-0 text-[11px] font-semibold tabular-nums ${isActive ? '!text-player-violetText' : '!text-player-textMuted'}`}>
                    {formatTime(c.start_time_ms / 1000)}
                  </span>
                  <span className={`truncate text-[13px] ${isActive ? 'font-semibold !text-player-text' : 'font-medium !text-player-textMuted'}`}>
                    {c.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Glyph({ show, children }: { show: boolean; children: React.ReactNode }) {
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
