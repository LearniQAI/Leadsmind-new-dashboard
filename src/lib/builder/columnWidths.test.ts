import { describe, it, expect } from 'vitest';
import { MIN_COLUMN_PERCENT, presetWidths, validColumnWidths, resizeAdjacent, gridTemplateFor } from './columnWidths';
import { flattenLessonCanvas } from '@/lib/lms/flattenLessonCanvas';

describe('columnWidths', () => {
  it('preset splits', () => {
    expect(presetWidths('3', 3)).toEqual([33.33, 33.33, 33.33]);
    expect(presetWidths('1/3-2/3', 2)).toEqual([33.33, 66.67]);
  });

  it('resizeAdjacent keeps the row at 100 and only moves the two neighbours', () => {
    const r = resizeAdjacent([25, 25, 25, 25], 1, 10);
    expect(r).toEqual([25, 35, 15, 25]);
    expect(r.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('never drags a column below the minimum, in either direction', () => {
    expect(resizeAdjacent([50, 50], 0, 500)).toEqual([90, 10]);
    expect(resizeAdjacent([50, 50], 0, -500)).toEqual([10, 90]);
    expect(MIN_COLUMN_PERCENT).toBe(10);
  });

  it('rejects malformed stored widths', () => {
    expect(validColumnWidths([50, 50], 3)).toBeUndefined(); // wrong count
    expect(validColumnWidths([95, 5], 2)).toBeUndefined(); // under the minimum
    expect(validColumnWidths([50, 40], 2)).toBeUndefined(); // doesn't total 100
    expect(validColumnWidths([30, 70], 2)).toEqual([30, 70]);
  });

  it('grid template', () => {
    expect(gridTemplateFor([30, 70])).toBe('minmax(0,30fr) minmax(0,70fr)');
  });
});

describe('flattenLessonCanvas columns', () => {
  const tree = (extra: Record<string, unknown>) => ({
    ROOT: { type: { resolvedName: 'Container' }, props: {}, nodes: ['cols'] },
    cols: { type: { resolvedName: 'Columns' }, props: { layout: '2', gap: 24, ...extra }, nodes: ['a', 'b'] },
    a: { type: { resolvedName: 'Container' }, props: {}, nodes: ['pa'] },
    b: { type: { resolvedName: 'Container' }, props: {}, nodes: ['pb'] },
    pa: { type: { resolvedName: 'Paragraph' }, props: { text: '<p>A</p>' }, nodes: [] },
    pb: { type: { resolvedName: 'Paragraph' }, props: { text: '<p>B</p>' }, nodes: [] },
  });

  it('tags items of a resized Columns block with their column and widths', () => {
    const items = flattenLessonCanvas(tree({ columnWidths: [30, 70] }));
    expect(items.map((i) => i.columns)).toEqual([
      { group: 'cols:0', index: 0, widths: [30, 70], gap: 24 },
      { group: 'cols:0', index: 1, widths: [30, 70], gap: 24 },
    ]);
  });

  it('leaves un-resized (or invalid) Columns as the stacked list it always was', () => {
    expect(flattenLessonCanvas(tree({})).every((i) => !i.columns)).toBe(true);
    expect(flattenLessonCanvas(tree({ columnWidths: [1, 2, 3] })).every((i) => !i.columns)).toBe(true);
  });
});
