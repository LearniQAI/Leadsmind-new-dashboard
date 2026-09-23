// Shared class recipes for every audio-player surface, so hover / press / focus states, motion and
// panel chrome are IDENTICAL across the full player, chapters, transcript and mini bar rather than
// re-typed (and drifting) per component. Colours come from the `player-*` Tailwind tokens
// (src/lib/lms/audio/playerIdentity.ts); motion is the Stage 2 curve, named `ease-player` —
// 150ms for hover/press, 200ms for state changes (icon swaps, panel open/close).

/** Keyboard focus: a violet ring offset from the card surface (>= 3:1, see playerIdentity.test). */
export const playerFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-player-violetUi focus-visible:ring-offset-2 focus-visible:ring-offset-player-surface';

export const playerMotion = 'transition duration-150 ease-player motion-reduce:transition-none';

/** Secondary round icon control (skip ±10, close): quiet at rest, tinted + slightly pressed on use. */
export const playerIconButton = `relative flex items-center justify-center rounded-full !text-player-textMuted ${playerMotion} hover:bg-player-raised hover:!text-player-text active:scale-95 motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-40 ${playerFocus}`;

/** The primary control: brand gradient + a violet glow that intensifies on hover. White icon is
 *  >= 4.5:1 against both gradient ends. */
export const playerPrimaryButton = `relative flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-player-fillFrom to-player-fillTo text-white shadow-player-glow transition-[transform,box-shadow] duration-150 ease-player hover:scale-[1.04] hover:shadow-player-glow-strong active:scale-95 disabled:opacity-60 disabled:hover:scale-100 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 ${playerFocus}`;

/** Companion panels (chapters, transcript, mobile accordions): same surface as the card, but flat —
 *  only the main player card floats. */
export const playerPanel = 'rounded-2xl border border-player-border bg-player-surface shadow-player-panel';

/** Small uppercase section label. */
export const playerEyebrow = 'text-[10px] font-bold uppercase tracking-[0.12em] !text-player-textMuted';

/** Selectable list row (chapter / transcript line). Active state is applied by the caller. */
export const playerRow = `relative w-full rounded-lg text-left ${playerMotion} hover:bg-player-raised ${playerFocus}`;
