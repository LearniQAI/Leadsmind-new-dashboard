import { describe, it, expect } from 'vitest';
import { moveId, moveUp, moveDown, buildReorderItems, applyDraftOrder, sameOrder } from './moduleOrder';

describe('moduleOrder', () => {
  const ids = ['a', 'b', 'c'];

  it('moves by id, clamps at the ends, never mutates', () => {
    expect(moveUp(ids, 'b')).toEqual(['b', 'a', 'c']);
    expect(moveDown(ids, 'b')).toEqual(['a', 'c', 'b']);
    expect(moveUp(ids, 'a')).toBe(ids);
    expect(moveDown(ids, 'c')).toBe(ids);
    expect(moveId(ids, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('builds a complete 1-based payload keyed by moduleId', () => {
    expect(buildReorderItems(['b', 'a', 'c'])).toEqual([
      { moduleId: 'b', order: 1 },
      { moduleId: 'a', order: 2 },
      { moduleId: 'c', order: 3 },
    ]);
  });

  it('applies a draft to the current modules, tolerating deletes and additions', () => {
    const mods = [{ id: 'a' }, { id: 'b' }, { id: 'd' }];
    expect(applyDraftOrder(mods, ['c', 'b', 'a']).map((m) => m.id)).toEqual(['b', 'a', 'd']);
    expect(applyDraftOrder(mods, null)).toBe(mods);
  });

  it('detects unchanged order', () => {
    expect(sameOrder(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(sameOrder(['a', 'b'], ['b', 'a'])).toBe(false);
  });
});
