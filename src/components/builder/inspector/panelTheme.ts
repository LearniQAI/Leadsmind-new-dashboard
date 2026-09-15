// Premium settings-panel styling tokens — class strings only, zero behaviour.
// Shared by every left-panel Element inspector (Text / Heading / Paragraph / Image / Video)
// so they read as one refined, consistent system. Slate palette (Sidebar Visual Polish,
// extended here to match the rest of the left panel — see NavbarSettings.tsx/FooterSettings.tsx
// and ElementProperties.tsx for the same system applied elsewhere).

/** Native range input, restyled: slim rounded track, floating white thumb with a slate ring. */
export const RANGE_CLS =
  'w-full h-1.5 appearance-none rounded-full bg-slate-200 accent-slate-900 cursor-pointer ' +
  'outline-none transition-colors ' +
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 ' +
  '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border ' +
  '[&::-webkit-slider-thumb]:border-slate-400 [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.15)] ' +
  '[&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110 ' +
  'active:[&::-webkit-slider-thumb]:scale-95 ' +
  '[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full ' +
  '[&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-slate-400';

/** Text / select field. */
export const FIELD_CLS =
  'h-9 w-full rounded-xl bg-white border border-slate-200 px-3 text-xs text-slate-700 ' +
  'outline-none transition-all duration-150 motion-reduce:transition-none ' +
  'hover:border-slate-300 focus:border-slate-300 focus:ring-2 focus:ring-slate-100';

/** Compact numeric cell (spacing / radius grids). */
export const CELL_CLS =
  'flex items-center h-8 rounded-lg bg-white border border-slate-200 px-2 gap-1.5 ' +
  'transition-all duration-150 motion-reduce:transition-none ' +
  'focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-100';

/** Segmented button group wrapper + item. */
export const SEGMENT_WRAP =
  'flex gap-0.5 p-0.5 rounded-lg bg-slate-100 ring-1 ring-inset ring-slate-200';

export const segmentBtn = (active: boolean) =>
  'flex-1 min-w-0 rounded-md py-1.5 text-[10px] font-bold capitalize ' +
  'transition-all duration-150 motion-reduce:transition-none active:scale-[0.97] motion-reduce:active:scale-100 ' +
  (active
    ? 'bg-slate-900 text-white shadow-[0_1px_3px_rgba(0,0,0,0.18)]'
    : 'text-slate-500 hover:text-slate-700 hover:bg-white/70');

/** Icon variant of a segmented item (alignment, corner-mode toggles). */
export const segmentIconBtn = (active: boolean) =>
  'flex items-center justify-center h-7 w-7 rounded-md ' +
  'transition-all duration-150 motion-reduce:transition-none active:scale-[0.97] motion-reduce:active:scale-100 ' +
  (active
    ? 'bg-slate-900 text-white shadow-[0_1px_3px_rgba(0,0,0,0.18)]'
    : 'text-slate-500 hover:text-slate-700 hover:bg-white/70');

/** Field / section label — sentence case, not uppercase micro-caps (matches the rest of the
 *  left panel's design language: text-[12px] font-medium text-slate-700). */
export const MICRO_LABEL =
  'text-[12px] font-medium text-slate-700';
