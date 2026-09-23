// The audio player's own signature identity — deliberately INDEPENDENT of the per-course theme
// system (Signal/Ember/Grove), the way a music app's now-playing surface looks the same whatever
// playlist you're in. Scoped strictly to player surfaces via the `player-*` Tailwind namespace
// (tailwind.config.js requires this file) — nothing else in the LMS reads these tokens.
//
// Monochrome, gallery-like: a clean white card, near-black ink, and a graduated neutral grey
// scale. The card stays LIGHT (not a moody near-black card) because the student shell is
// light-only and every surrounding lesson card is white — a black slab would fight the page;
// the player instead stands out through elevation and the one deliberate flourish, the glowing
// play button (see tailwind.config.js `player-glow*` / `player-sheen`).
//
// Ink is #111111, not #000000: pure black on white (21:1) reads harsh and "default"; #111 keeps
// 18.9:1 while feeling like printed ink. Every derived variant is computed against the harder
// surface, exactly like getAccessibleAccent, and asserted by playerIdentity.test.ts.
//
// NOTE: relative import only — Tailwind loads this file at build time outside Next's alias setup.
import { darkenUntil } from '../../color/accessibleAccent';

const BASE = {
  surface: '#FFFFFF', // card background
  raised: '#F5F5F5', // waveform field, hover rows
  border: '#E5E5E5', // hairline card/panel border
  track: '#E5E5E5', // scrubber rail
  buffered: '#C7C7C7', // scrubber buffered range
  ink: '#111111', // text, icons, fills, active state, focus
  textMutedSeed: '#737373',
} as const;

export const PLAYER = {
  surface: BASE.surface,
  raised: BASE.raised,
  border: BASE.border,
  track: BASE.track,
  buffered: BASE.buffered,
  /** Headings/body text. */
  text: BASE.ink,
  /** >= 4.5:1 on raised (and therefore on surface) — secondary text, time readouts, labels. */
  textMuted: darkenUntil(BASE.textMutedSeed, BASE.raised, 4.5),
  /** The one "accent": play-button fill (white icon on it), scrubber fill, active markers, focus
   *  ring, active speaker ring, and the waveform (whose bars carry loudness as opacity: loud bars
   *  are near-solid ink, quiet ones a soft grey). */
  ink: BASE.ink,
} as const;

export type PlayerPalette = typeof PLAYER;
