"use client";

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Play, Pause, Loader2, RotateCcw, RotateCw } from 'lucide-react';
import { getAccessibleAccent } from '@/lib/color/accessibleAccent';

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
  accentHex: string;
}

// Deliberately NOT AudioPlayerProvider/useAudioPlayer — per the phase spec, the public player
// must never share the access-control-bearing data layer (that provider's load() calls the
// enrolment-gated course stream route). This is a small, self-contained, single-instance player
// pointed at the SEPARATE public stream route (/api/podcast/episodes/[id]/stream, no auth). It
// shares Phase 3's visual language (colors, radius, motion, the same AA-safe accent derivation)
// deliberately, not its gated component files.
export default function PublicEpisodePlayer({ episodeId, title, artworkUrl, chapters, accentHex }: PublicEpisodePlayerProps) {
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

  const accent = getAccessibleAccent(accentHex);
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
      <div className="rounded-2xl border border-dash-border bg-white p-6 text-center">
        <p className="text-[13px] font-bold !text-dash-text">This episode is temporarily unavailable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={streamUrl} preload="metadata" className="sr-only" />

      <div className="rounded-2xl border border-dash-border bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={toggle}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-transform duration-150 hover:scale-105 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
            style={{ backgroundColor: accent.text }}
          >
            {isLoading ? (
              <Loader2 size={24} className="animate-spin motion-reduce:animate-none" />
            ) : isPlaying ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => skip(-10)}
                aria-label="Back 10 seconds"
                className="flex h-8 w-8 items-center justify-center rounded-full !text-dash-textMuted transition-colors hover:bg-dash-surface"
              >
                <RotateCcw size={16} />
              </button>
              <span className="min-w-0 flex-1 truncate text-[13px] font-bold !text-dash-text">
                {activeChapter ? activeChapter.title : title}
              </span>
              <button
                type="button"
                onClick={() => skip(10)}
                aria-label="Forward 10 seconds"
                className="flex h-8 w-8 items-center justify-center rounded-full !text-dash-textMuted transition-colors hover:bg-dash-surface"
              >
                <RotateCw size={16} />
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
              className="relative h-4 w-full cursor-pointer touch-none select-none"
            >
              <div className="absolute inset-y-0 my-auto h-1.5 w-full rounded-full bg-dash-border">
                <div className="absolute inset-y-0 left-0 h-full rounded-full" style={{ width: `${bufferedPct}%`, backgroundColor: '#CBD5E1' }} />
                <div className="absolute inset-y-0 left-0 h-full rounded-full transition-[width] duration-150 ease-linear" style={{ width: `${playedPct}%`, backgroundColor: accent.ui }} />
              </div>
              <div
                className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white shadow"
                style={{ left: `calc(${playedPct}% - 7px)`, backgroundColor: accent.ui }}
              />
            </div>

            <div className="text-right font-mono text-[11px] tabular-nums !text-dash-textMuted">
              {formatTime(displayTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>
      </div>

      {chapters.length > 0 && (
        <div className="rounded-2xl border border-dash-border bg-white p-2">
          <div className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wide !text-dash-textMuted">Chapters</div>
          <div className="space-y-0.5">
            {chapters.map((c) => {
              const isActive = c.id === activeChapter?.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => seek(c.start_time_ms / 1000)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150 hover:bg-dash-surface"
                  style={isActive ? { backgroundColor: `${accent.ui}14` } : undefined}
                >
                  <span className="w-10 shrink-0 font-mono text-[11px] tabular-nums" style={{ color: isActive ? accent.text : '#94A3B8' }}>
                    {formatTime(c.start_time_ms / 1000)}
                  </span>
                  <span className="truncate text-[13px]" style={{ color: isActive ? '#0F172A' : '#475569', fontWeight: isActive ? 600 : 500 }}>
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
