"use client";

import React from 'react';
import { Loader2, Pause, Play } from 'lucide-react';
import { playerPlayButton } from '@/lib/lms/audio/playerStyles';

// The signature play/pause button, shared by the lesson player, mini bar and public podcast
// player. Purely presentational (no provider/data access) so the public page can use it without
// touching Phase 4's access isolation.
//
// Layers, bottom to top: ink fill + cool glow (static, always) → sheen band → the three glyphs,
// which stay mounted and cross-fade/scale (200ms, ease-player) exactly as before.
//   idle     — static glow; hover strengthens the glow and sweeps the sheen.
//   playing  — the glow slowly breathes (3.2s) and the sheen sweeps on a slow loop (4.8s).
//   reduced motion — no pulse, no sheen: the static glow only.

const SIZES = {
  lg: { box: 'h-16 w-16', icon: 24 },
  md: { box: 'h-14 w-14', icon: 22 },
  sm: { box: 'h-10 w-10', icon: 16 },
} as const;

interface PlayerPlayButtonProps {
  isPlaying: boolean;
  /** Loading/buffering: shows the spinner glyph. */
  isBusy?: boolean;
  onClick: () => void;
  disabled?: boolean;
  size?: keyof typeof SIZES;
  className?: string;
}

export default function PlayerPlayButton({
  isPlaying,
  isBusy = false,
  onClick,
  disabled,
  size = 'md',
  className = '',
}: PlayerPlayButtonProps) {
  const s = SIZES[size];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isPlaying ? 'Pause' : 'Play'}
      className={`${s.box} ${playerPlayButton} ${isPlaying ? 'animate-player-glow motion-reduce:animate-none' : ''} ${className}`}
    >
      {/* White hover light: a soft radial highlight + a thin white inner ring fade in over the
          ink (200ms). Lives INSIDE the button — a white glow around it would vanish on the white
          card. Decorative and pointer-events-none, so presses still land on the <button> itself
          (the canvas shield keys off the nearest button). Opacity-only fade: fine for reduced
          motion (motion-reduce makes it instant). */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.32),rgba(255,255,255,0.08)_55%,transparent_75%)] opacity-0 ring-1 ring-inset ring-white/50 transition-opacity duration-200 ease-player group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent motion-reduce:hidden ${
          isPlaying ? 'animate-player-sheen' : 'opacity-0 group-hover:animate-player-sheen group-hover:opacity-100'
        }`}
      />
      <Glyph show={!isBusy && !isPlaying}>
        <Play size={s.icon} fill="currentColor" strokeLinejoin="round" className="ml-0.5" />
      </Glyph>
      <Glyph show={!isBusy && isPlaying}>
        <Pause size={s.icon} fill="currentColor" strokeLinejoin="round" />
      </Glyph>
      <Glyph show={isBusy}>
        <Loader2 size={s.icon} className="animate-spin motion-reduce:animate-none" />
      </Glyph>
    </button>
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
