import { describe, it, expect } from 'vitest';
import { computePreviewLessonIds } from './coursePreview';

// Course Start Method 3 (free preview lessons, then paywall) — the pure ordering/selection
// logic behind recomputeCoursePreviewLessons(), tested without a Supabase client.

describe('computePreviewLessonIds', () => {
  const modules = [
    { id: 'm1', position: 1 },
    { id: 'm2', position: 2 },
  ];
  const lessons = [
    { id: 'l1', module_id: 'm1', position: 1 },
    { id: 'l2', module_id: 'm1', position: 2 },
    { id: 'l3', module_id: 'm1', position: 3 },
    { id: 'l4', module_id: 'm2', position: 1 },
    { id: 'l5', module_id: 'm2', position: 2 },
  ];

  it('selects the first N lessons by real course-wide position (module order, then lesson order)', () => {
    const ids = computePreviewLessonIds(modules, lessons, 3);
    expect(ids).toEqual(new Set(['l1', 'l2', 'l3']));
  });

  it('crosses module boundaries once the first module is exhausted', () => {
    const ids = computePreviewLessonIds(modules, lessons, 4);
    expect(ids).toEqual(new Set(['l1', 'l2', 'l3', 'l4']));
  });

  it('respects module order even if module rows are passed out of order', () => {
    const shuffledModules = [modules[1], modules[0]];
    const ids = computePreviewLessonIds(shuffledModules, lessons, 2);
    expect(ids).toEqual(new Set(['l1', 'l2']));
  });

  it('a count of 0 selects nothing', () => {
    expect(computePreviewLessonIds(modules, lessons, 0)).toEqual(new Set());
  });

  it('a count exceeding the total lesson count selects everything, not an error', () => {
    const ids = computePreviewLessonIds(modules, lessons, 100);
    expect(ids).toEqual(new Set(lessons.map((l) => l.id)));
  });

  it('a negative count (defensive) selects nothing rather than throwing', () => {
    expect(computePreviewLessonIds(modules, lessons, -1)).toEqual(new Set());
  });
});
