"use client";

import React, { useCallback, useRef, useState } from 'react';
import { useAudioTime, useAudioPlayer } from '@/components/lms/AudioPlayerProvider';
import { playerFocus } from '@/lib/lms/audio/playerStyles';

function timeFromPointer(clientX: number, el: HTMLDivElement, duration: number): number {
  const rect = el.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return ratio * duration;
}

// Own re-render boundary (useAudioTime), same isolation pattern as SpeakerRow. Shows played AND
// buffered range from the real <audio> `buffered` TimeRanges (via the provider), with a
// physically-grabbable drag handle whose hit target is larger than its visual size.
// `active` = this player's block is the provider's loaded track. When another block holds the
// shared element, the time snapshot belongs to THAT block, so an inactive scrubber shows empty
// and ignores input instead of displaying/seeking someone else's audio.
export default function Scrubber({ active = true }: { active?: boolean }) {
  const { seek } = useAudioPlayer();
  const snapshot = useAudioTime();
  const currentTime = active ? snapshot.currentTime : 0;
  const duration = active ? snapshot.duration : 0;
  const bufferedEnd = active ? snapshot.bufferedEnd : 0;
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
      tabIndex={active ? 0 : -1}
      aria-disabled={!active || undefined}
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
      className={`group relative h-5 w-full cursor-pointer touch-none select-none rounded-full ${playerFocus}`}
    >
      {/* Rail thickens on hover/drag (6px → 8px) so the control visibly "wakes up" under the pointer. */}
      <div
        className={`absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-player-track transition-[height] duration-150 ease-player motion-reduce:transition-none ${isDragging ? 'h-2' : 'h-1.5 group-hover:h-2'}`}
      >
        <div
          className="absolute inset-y-0 left-0 h-full rounded-full bg-player-buffered"
          style={{ width: `${bufferedPct}%` }}
        />
        <div
          className={`absolute inset-y-0 left-0 h-full rounded-full bg-gradient-to-r from-player-violetUi to-player-magentaUi ${isDragging ? '' : 'transition-[width] duration-150 ease-linear'}`}
          style={{ width: `${playedPct}%` }}
        />
      </div>
      {/* Visual thumb is small; the actual hit target is this whole 16px-tall track, well past
          WCAG's 24px minimum once combined with the pointerdown-anywhere-on-track behavior. */}
      <div
        className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-[3px] border-white bg-player-violetUi shadow-player-glow transition-transform duration-150 ease-player group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${isDragging ? 'scale-125' : ''}`}
        style={{ left: `calc(${playedPct}% - 7px)` }}
      />
    </div>
  );
}
