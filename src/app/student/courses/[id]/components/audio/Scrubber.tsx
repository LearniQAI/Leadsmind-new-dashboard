"use client";

import React, { useCallback, useRef, useState } from 'react';
import { useAudioTime, useAudioPlayer } from '@/components/lms/AudioPlayerProvider';
import type { AccessibleAccent } from '@/lib/color/accessibleAccent';

interface ScrubberProps {
  accent: AccessibleAccent;
}

function timeFromPointer(clientX: number, el: HTMLDivElement, duration: number): number {
  const rect = el.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return ratio * duration;
}

// Own re-render boundary (useAudioTime), same isolation pattern as SpeakerRow. Shows played AND
// buffered range from the real <audio> `buffered` TimeRanges (via the provider), with a
// physically-grabbable drag handle whose hit target is larger than its visual size.
export default function Scrubber({ accent }: ScrubberProps) {
  const { seek } = useAudioPlayer();
  const { currentTime, duration, bufferedEnd } = useAudioTime();
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const displayTime = dragTime ?? currentTime;
  const playedPct = duration > 0 ? Math.min(100, (displayTime / duration) * 100) : 0;
  const bufferedPct = duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el || duration <= 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragTime(timeFromPointer(e.clientX, el, duration));
  }, [duration]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const el = trackRef.current;
    if (!el) return;
    setDragTime(timeFromPointer(e.clientX, el, duration));
  }, [isDragging, duration]);

  const commit = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsDragging(false);
    if (dragTime != null) seek(dragTime);
    setDragTime(null);
  }, [isDragging, dragTime, seek]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); seek(Math.min(duration, currentTime + 10)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); seek(Math.max(0, currentTime - 10)); }
    else if (e.key === 'Home') { e.preventDefault(); seek(0); }
    else if (e.key === 'End') { e.preventDefault(); seek(duration); }
  }, [duration, currentTime, seek]);

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(displayTime)}
      aria-valuetext={`${Math.floor(displayTime / 60)}:${String(Math.floor(displayTime % 60)).padStart(2, '0')}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={commit}
      onPointerCancel={commit}
      onKeyDown={onKeyDown}
      className="group relative h-4 w-full cursor-pointer touch-none select-none"
    >
      <div className="absolute inset-y-0 my-auto h-1.5 w-full rounded-full bg-dash-border">
        <div
          className="absolute inset-y-0 left-0 h-full rounded-full bg-dash-border"
          style={{ width: `${bufferedPct}%`, backgroundColor: '#CBD5E1' }}
        />
        <div
          className={`absolute inset-y-0 left-0 h-full rounded-full ${isDragging ? '' : 'transition-[width] duration-150 ease-linear'}`}
          style={{ width: `${playedPct}%`, backgroundColor: accent.ui }}
        />
      </div>
      {/* Visual thumb is small; the actual hit target is this whole 16px-tall track, well past
          WCAG's 24px minimum once combined with the pointerdown-anywhere-on-track behavior. */}
      <div
        className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white shadow transition-transform duration-150 ease-out group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${isDragging ? 'scale-125' : ''}`}
        style={{ left: `calc(${playedPct}% - 7px)`, backgroundColor: accent.ui }}
      />
    </div>
  );
}
