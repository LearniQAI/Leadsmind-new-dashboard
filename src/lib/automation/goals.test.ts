import { describe, it, expect, vi } from 'vitest';

vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { findMetGoal, evaluateGoal, CONVERTED_APPOINTMENT_STATUSES } from '@/lib/automation/goals';

type Call = { table: string; eq: [string, any][]; in: [string, any[]][] };

// Minimal chainable fake: per-table rows (list queries) / single (maybeSingle), recording filters.
function fakeDb(tables: Record<string, { rows?: any[]; single?: any; error?: any }>) {
  const calls: Call[] = [];
  return {
    calls,
    from(table: string) {
      const c: Call = { table, eq: [], in: [] };
      calls.push(c);
      const t = tables[table] ?? {};
      const q: any = {
        select: () => q, limit: () => q,
        eq: (k: string, v: any) => { c.eq.push([k, v]); return q; },
        in: (k: string, v: any[]) => { c.in.push([k, v]); return q; },
        maybeSingle: () => Promise.resolve({ data: t.single ?? null, error: t.error ?? null }),
        then: (r: any) => r({ data: t.rows ?? [], error: t.error ?? null }),
      };
      return q;
    },
  } as any;
}

const W = 'w1'; const C = 'c1';

describe('meeting_booked', () => {
  it('counts only genuinely booked/kept appointments (never cancelled or no-show), scoped to the workspace', async () => {
    const db = fakeDb({ appointments: { rows: [{ id: 'a' }] } });
    expect(await evaluateGoal([{ field: 'meeting_booked', operator: 'equals', value: true }], W, C, db)).toBe(true);
    const call = db.calls.find((c: Call) => c.table === 'appointments')!;
    expect(call.in).toEqual([['status', ['scheduled', 'showed_up']]]);
    expect(CONVERTED_APPOINTMENT_STATUSES).not.toContain('cancelled');
    expect(CONVERTED_APPOINTMENT_STATUSES).not.toContain('no_show');
    expect(call.eq).toEqual(expect.arrayContaining([['workspace_id', W], ['contact_id', C]]));
  });
  it('is not met when there is no qualifying appointment', async () => {
    expect(await evaluateGoal([{ field: 'meeting_booked', operator: 'equals', value: true }], W, C, fakeDb({ appointments: { rows: [] } }))).toBe(false);
  });
});

describe('invoice_paid', () => {
  it('is met by a paid invoice in this workspace', async () => {
    const db = fakeDb({ invoices: { rows: [{ id: 'i' }] } });
    expect(await evaluateGoal([{ field: 'invoice_paid', operator: 'equals', value: true }], W, C, db)).toBe(true);
    expect(db.calls[0].eq).toEqual(expect.arrayContaining([['status', 'paid'], ['workspace_id', W]]));
  });
});

describe('tag goals read tag_assignments, never the legacy contacts.tags array', () => {
  it('met when an assignment exists, even though the legacy array is empty', async () => {
    const db = fakeDb({ tag_assignments: { rows: [{ tag_id: 't1', tags: { name: 'Hot' } }] }, contacts: { single: { metadata: {} } } });
    expect(await evaluateGoal([{ field: 'tag', operator: 'equals', value: 'Hot' }], W, C, db)).toBe(true);
    const ta = db.calls.find((c: Call) => c.table === 'tag_assignments')!;
    expect(ta.eq).toEqual(expect.arrayContaining([['workspace_id', W], ['entity_type', 'contact'], ['entity_id', C]]));
    expect(db.calls.some((c: Call) => c.table === 'contacts')).toBe(false);
  });
  it('NOT met when only the legacy array says so (no assignment row)', async () => {
    const db = fakeDb({ tag_assignments: { rows: [] }, contacts: { single: { tags: ['Hot'], metadata: {} } } });
    expect(await evaluateGoal([{ field: 'tag', operator: 'equals', value: 'Hot' }], W, C, db)).toBe(false);
  });
  it('matches by tag_id (survives a rename) and by case-insensitive name', async () => {
    const byId = fakeDb({ tag_assignments: { rows: [{ tag_id: 't1', tags: { name: 'Renamed' } }] } });
    expect(await evaluateGoal([{ field: 'tag', operator: 'equals', value: 'OldName', tag_id: 't1' }], W, C, byId)).toBe(true);
    expect(byId.calls[0].eq).toEqual(expect.arrayContaining([['tag_id', 't1']]));
    const byName = fakeDb({ tag_assignments: { rows: [{ tag_id: 't1', tags: [{ name: 'HOT lead' }] }] } });
    expect(await evaluateGoal([{ field: 'tag', operator: 'equals', value: ' hot Lead ' }], W, C, byName)).toBe(true);
  });
  it('not_equals is met only when the contact lacks the tag; a lookup error is never a conversion', async () => {
    expect(await evaluateGoal([{ field: 'tag', operator: 'not_equals', value: 'X' }], W, C, fakeDb({ tag_assignments: { rows: [] } }))).toBe(true);
    expect(await evaluateGoal([{ field: 'tag', operator: 'not_equals', value: 'X' }], W, C, fakeDb({ tag_assignments: { rows: [{ tag_id: 't', tags: { name: 'X' } }] } }))).toBe(false);
    expect(await evaluateGoal([{ field: 'tag', operator: 'not_equals', value: 'X' }], W, C, fakeDb({ tag_assignments: { error: { message: 'boom' } } }))).toBe(false);
  });
});

describe('rule list semantics', () => {
  it('returns the FIRST met rule; a non-matching passed_quiz rule no longer short-circuits later rules', async () => {
    const db = fakeDb({ tag_assignments: { rows: [] }, contacts: { single: { metadata: { plan: 'pro' } } }, invoices: { rows: [{ id: 'i' }] } });
    const met = await findMetGoal([
      { field: 'passed_quiz', operator: 'equals', value: true },
      { field: 'invoice_paid', operator: 'equals', value: true },
    ], W, C, db);
    expect(met?.field).toBe('invoice_paid');
  });
  it('metadata rules and empty/absent rule lists behave', async () => {
    const db = fakeDb({ contacts: { single: { metadata: { plan: 'pro' } } } });
    expect(await evaluateGoal([{ field: 'plan', operator: 'equals', value: 'pro' }], W, C, db)).toBe(true);
    expect(await evaluateGoal([], W, C, db)).toBe(false);
    expect(await evaluateGoal(null, W, C, db)).toBe(false);
    expect(await evaluateGoal([{ field: 'invoice_paid', value: true }], W, null, db)).toBe(false);
  });
});
