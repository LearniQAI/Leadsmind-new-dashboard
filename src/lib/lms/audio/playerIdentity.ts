// The audio player's own signature identity — deliberately INDEPENDENT of the per-course theme
// system (Signal/Ember/Grove), the way a music app's now-playing surface looks the same whatever
// playlist you're in. Scoped strictly to player surfaces via the `player-*` Tailwind namespace
// (tailwind.config.js requires this file) — nothing else in the LMS reads these tokens.
//
// Mood: calm, confident, studio-premium on a light page. A soft lavender-white card (distinct
// from the pure-white lesson cards around it, without shouting) carries LeadsMind's OWN brand
// violet and magenta (tailwind `secondary` / `tertiary`) as the accent pair — so the player reads
// as a LeadsMind sub-brand and never collides with any course theme (red / orange / green) or the
// blue dashboard accent.
//
// Base hues are chosen; every text/UI variant is DERIVED here against the harder surface (the
// raised tint), exactly like getAccessibleAccent, so retuning a base colour can't silently break
// AA — playerIdentity.test.ts asserts every pairing.
//
// NOTE: relative import only — Tailwind loads this file at build time outside Next's alias setup.
import { darkenUntil } from '../../color/accessibleAccent';

const BASE = {
  surface: '#FBFAFF', // card background — lavender-white
  raised: '#F3EFFF', // waveform wash, hover rows, popovers' inner tint
  border: '#E4DDF9', // hairline card/panel border
  track: '#E4DDF7', // scrubber rail
  buffered: '#CDC2EF', // scrubber buffered range
  text: '#1B1537', // deep violet-ink body/heading text
  textMutedSeed: '#6F6893',
  violet: '#7B3FF2', // LeadsMind brand secondary
  magenta: '#FF3CAC', // LeadsMind brand tertiary
  white: '#FFFFFF',
} as const;

export const PLAYER = {
  surface: BASE.surface,
  raised: BASE.raised,
  border: BASE.border,
  track: BASE.track,
  buffered: BASE.buffered,
  text: BASE.text,
  /** >= 4.5:1 on raised (and therefore on surface/white) — secondary text, time readouts. */
  textMuted: darkenUntil(BASE.textMutedSeed, BASE.raised, 4.5),
  /** >= 3:1 on track (the darkest tint any thin UI sits on, so also on raised/surface) — scrubber
   *  fill start, focus rings, active rings, waveform. */
  violetUi: darkenUntil(BASE.violet, BASE.track, 3),
  /** >= 4.5:1 on raised — violet text (active chapter time, speaker label). */
  violetText: darkenUntil(BASE.violet, BASE.raised, 4.5),
  /** >= 3:1 on track — the gradient partner for thin UI (waveform peaks, scrubber fill end). */
  magentaUi: darkenUntil(BASE.magenta, BASE.track, 3),
  /** >= 4.5:1 on raised — magenta text (transcript speaker names). */
  magentaText: darkenUntil(BASE.magenta, BASE.raised, 4.5),
  /** Filled controls carrying WHITE icons/text (play button, active speed chip): each end of the
   *  gradient is >= 4.5:1 against white, so the foreground passes anywhere along it. */
  fillFrom: darkenUntil(BASE.violet, BASE.white, 4.5),
  fillTo: darkenUntil(BASE.magenta, BASE.white, 4.5),
} as const;

export type PlayerPalette = typeof PLAYER;
