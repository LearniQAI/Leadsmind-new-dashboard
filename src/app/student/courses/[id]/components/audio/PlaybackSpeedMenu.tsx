"use client";

import React, { useState } from 'react';
import { useAudioPlayer } from '@/components/lms/AudioPlayerProvider';
import type { AccessibleAccent } from '@/lib/color/accessibleAccent';

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

export default function PlaybackSpeedMenu({ accent }: { accent: AccessibleAccent }) {
  const { playbackRate, setPlaybackRate } = useAudioPlayer();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Playback speed, currently ${playbackRate}x`}
        aria-expanded={open}
        className="flex h-8 items-center rounded-full border border-dash-border bg-white px-2.5 text-[11px] font-bold !text-dash-text transition-colors duration-150 hover:bg-dash-surface"
      >
        {playbackRate}x
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute bottom-full right-0 z-20 mb-2 flex gap-1 rounded-full border border-dash-border bg-white p-1 shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-150 motion-reduce:animate-none">
            {RATES.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => {
                  setPlaybackRate(rate);
                  setOpen(false);
                }}
                className="flex h-7 min-w-[34px] items-center justify-center rounded-full px-2 text-[11px] font-bold transition-colors duration-150"
                style={
                  rate === playbackRate
                    ? { backgroundColor: accent.text, color: '#fff' }
                    : { color: '#475569' }
                }
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
