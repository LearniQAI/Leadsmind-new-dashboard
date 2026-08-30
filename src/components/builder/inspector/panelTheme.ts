// Premium settings-panel styling tokens — class strings only, zero behaviour.
// Shared by every left-panel Element inspector (Text / Heading / Paragraph / Image / Video)
// so they read as one refined, consistent system.

/** Native range input, restyled: slim rounded track, floating white thumb with an accent ring. */
export const RANGE_CLS =
  'w-full h-1.5 appearance-none rounded-full bg-dash-border/60 accent-dash-accent cursor-pointer ' +
  'outline-none transition-colors ' +
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 ' +
  '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border ' +
  '[&::-webkit-slider-thumb]:border-dash-accent [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.15)] ' +
  '[&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110 ' +
  'active:[&::-webkit-slider-thumb]:scale-95 ' +
  '[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full ' +
  '[&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-dash-accent';

/** Text / select field. */
export const FIELD_CLS =
  'h-9 w-full rounded-lg bg-white border border-dash-border px-3 text-xs !text-dash-text ' +
  'outline-none transition-all duration-150 motion-reduce:transition-none ' +
  'hover:border-dash-border/80 focus:border-dash-accent focus:ring-2 focus:ring-dash-accent/15';

/** Compact numeric cell (spacing / radius grids). */
export const CELL_CLS =
  'flex items-center h-8 rounded-lg bg-white border border-dash-border px-2 gap-1.5 ' +
  'transition-all duration-150 motion-reduce:transition-none ' +
  'focus-within:border-dash-accent focus-within:ring-2 focus-within:ring-dash-accent/15';

/** Segmented button group wrapper + item. */
export const SEGMENT_WRAP =
  'flex gap-0.5 p-0.5 rounded-lg bg-dash-surface ring-1 ring-inset ring-dash-border';

export const segmentBtn = (active: boolean) =>
  'flex-1 min-w-0 rounded-md py-1.5 text-[10px] font-bold capitalize ' +
  'transition-all duration-150 motion-reduce:transition-none active:scale-[0.97] motion-reduce:active:scale-100 ' +
  (active
    ? 'bg-dash-accent text-white shadow-[0_1px_3px_rgba(0,0,0,0.18)]'
    : '!text-dash-textMuted hover:!text-dash-text hover:bg-white/70');

/** Icon variant of a segmented item (alignment, corner-mode toggles). */
export const segmentIconBtn = (active: boolean) =>
  'flex items-center justify-center h-7 w-7 rounded-md ' +
  'transition-all duration-150 motion-reduce:transition-none active:scale-[0.97] motion-reduce:active:scale-100 ' +
  (active
    ? 'bg-dash-accent text-white shadow-[0_1px_3px_rgba(0,0,0,0.18)]'
    : '!text-dash-textMuted hover:!text-dash-text hover:bg-white/70');

/** Small-caps section / field label. */
export const MICRO_LABEL =
  'text-[10px] font-bold uppercase tracking-[0.08em] !text-dash-textMuted';
