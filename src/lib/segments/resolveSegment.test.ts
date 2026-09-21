import { describe, it, expect } from 'vitest';
import { loadSegmentRuleGroup, SegmentUnavailableError } from '@/lib/segments/resolveSegment';

const client = (result: { data: any; error?: any }) => ({
  from: () => {
    const q: any = { select: () => q, eq: () => q, maybeSingle: () => Promise.resolve({ error: null, ...result }) };
    return q;
  },
});
const GOOD = { logic: 'AND', rules: [{ field: 'source', operator: 'equals', value: 'x' }] };

describe('loadSegmentRuleGroup — fails CLOSED (item 1)', () => {
  it('returns the live rule group for an existing, valid segment', async () => {
    expect(await loadSegmentRuleGroup(client({ data: { rule_group: GOOD } }), 'ws', 's1')).toEqual(GOOD);
  });

  it('throws SegmentUnavailableError with a clear message when the segment was deleted', async () => {
    const p = loadSegmentRuleGroup(client({ data: null }), 'ws', 'gone');
    await expect(p).rejects.toBeInstanceOf(SegmentUnavailableError);
    await expect(p).rejects.toThrow(/no longer exists \(it was deleted\)/);
  });

  it('throws when the stored segment has invalid rules (empty, unknown field, blank value)', async () => {
    for (const rg of [{ logic: 'AND', rules: [] }, { logic: 'AND', rules: [{ field: 'company', operator: 'equals', value: 'x' }] }, { logic: 'AND', rules: [{ field: 'first_name', operator: 'contains', value: '' }] }]) {
      await expect(loadSegmentRuleGroup(client({ data: { rule_group: rg } }), 'ws', 's')).rejects.toBeInstanceOf(SegmentUnavailableError);
    }
  });

  it('a database error propagates (also fail-closed, never treated as "no segment")', async () => {
    await expect(loadSegmentRuleGroup(client({ data: null, error: { message: 'db down' } }), 'ws', 's')).rejects.toMatchObject({ message: 'db down' });
  });
});
