// Shared class recipes for every audio-player surface, so hover / press / focus states, motion and
// panel chrome are IDENTICAL across the full player, chapters, transcript, mini bar and the public
// podcast player rather than re-typed (and drifting) per component. Colours come from the
// monochrome `player-*` Tailwind tokens (src/lib/lms/audio/playerIdentity.ts); motion is the
// Stage 2 curve, named `ease-player` — 150ms for hover/press, 200ms for state changes.

/** Keyboard focus: an ink ring offset from the card surface (>= 3:1, see playerIdentity.test). */
export const playerFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-player-ink focus-visible:ring-offset-2 focus-visible:ring-offset-player-surface';

export const playerMotion = 'transition duration-150 ease-player motion-reduce:transition-none';

/** Secondary round icon control (skip ±10, close): quiet at rest, tinted + slightly pressed on use. */
export const playerIconButton = `relative flex items-center justify-center rounded-full !text-player-textMuted ${playerMotion} hover:bg-player-raised hover:!text-player-text active:scale-95 motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-40 ${playerFocus}`;

/** Filled secondary control (e.g. "Jump to current"): solid ink, white label (>= 4.5:1). No glow —
 *  the glow is reserved for play/pause (playerPlayButton). */
export const playerPrimaryButton = `relative flex items-center justify-center overflow-hidden rounded-full bg-player-ink text-white shadow-player-panel transition-transform duration-150 ease-player hover:scale-[1.04] active:scale-95 disabled:opacity-60 disabled:hover:scale-100 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 ${playerFocus}`;

/** Play/pause: solid ink with the signature cool glow, stronger on hover. The playing-state pulse
 *  and sheen are added by PlayerPlayButton (components/lms). `group` lets the sheen react to hover;
 *  overflow-hidden clips the sheen to the circle without clipping the (outer) glow. */
export const playerPlayButton = `group relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-player-ink text-white shadow-player-glow transition-[transform,box-shadow] duration-150 ease-player hover:scale-[1.04] hover:shadow-player-glow-strong active:scale-95 disabled:opacity-60 disabled:hover:scale-100 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 ${playerFocus}`;

/** Companion panels (chapters, transcript, mobile accordions): same surface as the card, but flat —
 *  only the main player card floats. */
export const playerPanel = 'rounded-2xl border border-player-border bg-player-surface shadow-player-panel';

/** Small uppercase section label. */
export const playerEyebrow = 'text-[10px] font-bold uppercase tracking-[0.12em] !text-player-textMuted';

/** Selectable list row (chapter / transcript line). Active state is applied by the caller. */
export const playerRow = `relative w-full rounded-lg text-left ${playerMotion} hover:bg-player-raised ${playerFocus}`;
