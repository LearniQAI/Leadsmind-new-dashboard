import { describe, it, expect } from 'vitest';
import { claimTestSendSlot, TEST_SEND_WORKSPACE_LIMIT, TEST_SEND_RECIPIENT_LIMIT } from '@/lib/campaigns/testSendLimit';

// In-memory fake of campaign_test_send_events supporting insert/select-count/delete.
function fakeDb(opts: { failInsert?: boolean } = {}) {
  const rows: any[] = []; let n = 0;
  const db: any = {
    rows,
    from() {
      let mode = 'select', filters: any[] = [], head = false, payload: any = null;
      const q: any = {
        insert: (p: any) => { mode = 'insert'; payload = p; return q; },
        delete: () => { mode = 'delete'; return q; },
        select: (_c?: string, o?: any) => { head = !!o?.head; return q; },
        eq: (c: string, v: any) => { filters.push((r: any) => r[c] === v); return q; },
        gte: () => q,
        single: () => { if (opts.failInsert) return Promise.resolve({ data: null, error: { message: 'x' } }); const r = { id: String(++n), ...payload, created_at: new Date().toISOString() }; rows.push(r); return Promise.resolve({ data: r, error: null }); },
        then: (res: any) => {
          const m = rows.filter((r) => filters.every((f) => f(r)));
          if (mode === 'delete') { for (const r of m) rows.splice(rows.indexOf(r), 1); return res({ error: null }); }
          return res({ count: m.length, data: head ? null : m, error: null });
        },
      };
      return q;
    },
  };
  return db;
}

describe('claimTestSendSlot', () => {
  it('allows up to the per-recipient limit, then rejects with a clear message and does not consume a slot', async () => {
    const db = fakeDb();
    for (let i = 0; i < TEST_SEND_RECIPIENT_LIMIT; i++) expect((await claimTestSendSlot(db, 'w1', 'u', 'a@x.com')).ok).toBe(true);
    const over: any = await claimTestSendSlot(db, 'w1', 'u', 'A@x.com');
    expect(over.ok).toBe(false);
    expect(over.error).toMatch(/limit reached for A@x.com/);
    expect(db.rows.length).toBe(TEST_SEND_RECIPIENT_LIMIT); // rejected claim removed its own row
  });
  it('enforces the per-workspace cap across different recipients, per-workspace', async () => {
    const db = fakeDb();
    for (let i = 0; i < TEST_SEND_WORKSPACE_LIMIT; i++) expect((await claimTestSendSlot(db, 'w1', 'u', `r${i}@x.com`)).ok).toBe(true);
    const over: any = await claimTestSendSlot(db, 'w1', 'u', 'new@x.com');
    expect(over.ok).toBe(false);
    expect(over.error).toMatch(/10 per hour for this workspace/);
    expect((await claimTestSendSlot(db, 'w2', 'u', 'new@x.com')).ok).toBe(true); // other workspace unaffected
  });
  it('fails closed (not silently open) when the counter cannot be written', async () => {
    const r: any = await claimTestSendSlot(fakeDb({ failInsert: true }), 'w1', 'u', 'a@x.com');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Could not verify/);
  });
});
