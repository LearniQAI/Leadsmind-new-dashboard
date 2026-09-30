// Per-column widths for the Columns block. `columnWidths` on the node is an array of percentages
// (one per column in a row, summing to 100) that overrides the layout preset's own ratio. The
// preset name stays the source of the column COUNT and the default split; a manual drag-resize
// only ever adds this array, and picking a preset clears it again.

/** No column may be dragged below this share of the row. */
export const MIN_COLUMN_PERCENT = 10;

const PRESET_WIDTHS: Record<string, number[]> = {
  '1/3-2/3': [100 / 3, 200 / 3],
  '2/3-1/3': [200 / 3, 100 / 3],
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The preset's own split: even for N columns, 1:2 / 2:1 for the asymmetric presets. */
export function presetWidths(layout: string | undefined, count: number): number[] {
  const preset = layout ? PRESET_WIDTHS[layout] : undefined;
  if (preset && preset.length === count) return preset.map(round2);
  return Array.from({ length: count }, () => round2(100 / count));
}

/**
 * The stored widths if they are usable for `count` columns (right length, finite, each within
 * [MIN, 100 - MIN*(count-1)], summing to ~100), else undefined. Anything malformed falls back to
 * the preset rather than rendering a broken grid.
 */
export function validColumnWidths(widths: unknown, count: number): number[] | undefined {
  if (!Array.isArray(widths) || count < 2 || widths.length !== count) return undefined;
  if (!widths.every((w) => typeof w === 'number' && Number.isFinite(w) && w >= MIN_COLUMN_PERCENT - 0.01)) return undefined;
  const sum = (widths as number[]).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 100) < 0.5 ? (widths as number[]) : undefined;
}

/**
 * Move the shared edge between column `index` and `index + 1` by `deltaPercent`, starting from
 * `start`. Only those two columns change and their sum is preserved, so the row still totals 100.
 */
export function resizeAdjacent(start: number[], index: number, deltaPercent: number): number[] {
  const pair = start[index] + start[index + 1];
  const left = Math.min(pair - MIN_COLUMN_PERCENT, Math.max(MIN_COLUMN_PERCENT, start[index] + deltaPercent));
  const next = start.slice();
  next[index] = round2(left);
  next[index + 1] = round2(pair - next[index]);
  return next;
}

/** CSS `grid-template-columns` value. `minmax(0, Nfr)` so wide content can't blow a column out. */
export function gridTemplateFor(widths: number[]): string {
  return widths.map((w) => `minmax(0,${w}fr)`).join(' ');
}
