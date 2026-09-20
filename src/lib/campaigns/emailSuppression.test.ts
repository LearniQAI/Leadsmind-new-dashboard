import { describe, it, expect } from 'vitest';
import { suppressionReason, loadSuppressedEmails, filterEmailableContactIds } from '@/lib/campaigns/emailSuppression';

// Minimal chainable fake of the supabase query builder.
function fakeDb(tables: Record<string, any[]>, failTable?: string) {
  return {
    from(name: string) {
      let rows = tables[name] ?? [];
      const q: any = {
        select: () => q,
        eq: (c: string, v: any) => { rows = rows.filter((r) => r[c] === v); return q; },
        order: () => q,
        range: () => q,
        in: (c: string, vs: any[]) => { rows = rows.filter((r) => vs.includes(r[c])); return q; },
        then: (res: any) => res(name === failTable ? { data: null, error: { message: 'boom' } } : { data: rows, error: null }),
      };
      return q;
    },
  } as any;
}

describe('suppressionReason', () => {
  const sup = new Set(['w1|gone@x.com']);
  it('blocks suppressed (case-insensitive), invalid, and email-less contacts', () => {
    expect(suppressionReason({ email: 'GONE@x.com' }, 'w1', sup)).toBe('suppressed');
    expect(suppressionReason({ email: 'a@x.com', is_invalid_email: true }, 'w1', sup)).toBe('invalid_email');
    expect(suppressionReason({ email: null }, 'w1', sup)).toBe('no_email');
  });
  it('allows a clean contact and is workspace-scoped', () => {
    expect(suppressionReason({ email: 'ok@x.com' }, 'w1', sup)).toBeNull();
    expect(suppressionReason({ email: 'gone@x.com' }, 'w2', sup)).toBeNull();
  });
});

describe('filterEmailableContactIds', () => {
  const db = fakeDb({
    contacts: [
      { id: 'c1', workspace_id: 'w1', email: 'ok@x.com', is_invalid_email: false },
      { id: 'c2', workspace_id: 'w1', email: 'Gone@x.com', is_invalid_email: false },
      { id: 'c3', workspace_id: 'w1', email: 'bounced@x.com', is_invalid_email: true },
      { id: 'c4', workspace_id: 'w1', email: null, is_invalid_email: false },
    ],
    global_suppression_list: [{ workspace_id: 'w1', email: 'GONE@X.COM' }], // stored casing differs from contact's
  });
  it('keeps only emailable contacts', async () => {
    expect(await filterEmailableContactIds(db, 'w1', ['c1', 'c2', 'c3', 'c4'])).toEqual({ eligible: ['c1'], excluded: 3 });
  });
  it('fails closed when the suppression lookup errors', async () => {
    const bad = fakeDb({ contacts: [{ id: 'c1', workspace_id: 'w1', email: 'ok@x.com' }], global_suppression_list: [] }, 'global_suppression_list');
    await expect(filterEmailableContactIds(bad, 'w1', ['c1'])).rejects.toThrow(/suppression lookup failed/);
    await expect(loadSuppressedEmails(bad, ['w1'])).rejects.toThrow();
  });
});
