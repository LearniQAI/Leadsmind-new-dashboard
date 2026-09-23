"use client";

import React, { useEffect, useState } from 'react';
import { useAudioPlayer } from '@/components/lms/AudioPlayerProvider';
import { playerFocus, playerMotion } from '@/lib/lms/audio/playerStyles';

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

export default function PlaybackSpeedMenu() {
  const { playbackRate, setPlaybackRate } = useAudioPlayer();
  const [open, setOpen] = useState(false);

  // Escape closes the popover (it previously only closed on outside click).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Playback speed, currently ${playbackRate}x`}
        aria-expanded={open}
        className={`flex h-8 items-center rounded-full border border-player-border bg-player-surface px-3 text-[12px] font-bold tabular-nums !text-player-text ${playerMotion} hover:border-player-buffered hover:bg-player-raised active:scale-95 motion-reduce:active:scale-100 ${playerFocus} ${open ? 'bg-player-raised' : ''}`}
      >
        {/* Re-keyed so a new rate fades in rather than snapping. */}
        <span key={playbackRate} className="animate-in fade-in duration-200 motion-reduce:animate-none">
          {playbackRate}x
        </span>
      </button>
      {open && (
        <>
          {/* data-player-control: on the lesson canvas, a click-away here only closes the menu —
              it must not also select/drag the block (see CanvasAudioPlayer). */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" data-player-control="" />
          <div className="absolute bottom-full right-0 z-20 mb-2 flex gap-1 rounded-full border border-player-border bg-player-surface p-1 shadow-player-card animate-in fade-in slide-in-from-bottom-1 duration-150 motion-reduce:animate-none">
            {RATES.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => {
                  setPlaybackRate(rate);
                  setOpen(false);
                }}
                aria-pressed={rate === playbackRate}
                className={`flex h-7 min-w-[38px] items-center justify-center rounded-full px-2 text-[11px] font-bold tabular-nums ${playerMotion} ${playerFocus} ${
                  rate === playbackRate
                    ? 'bg-gradient-to-br from-player-fillFrom to-player-fillTo !text-white shadow-player-glow'
                    : '!text-player-textMuted hover:bg-player-raised hover:!text-player-text'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
