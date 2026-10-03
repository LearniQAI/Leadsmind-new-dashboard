import { describe, it, expect } from 'vitest';
import { countWindowStatus } from './windowCounts';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

function dbWith(rows: any[], error: any = null) {
  const q: any = {
    select: () => q, eq: () => q,
    in: (_c: string, ids: string[]) => { q._ids = ids; return q; },
    then: (res: any, rej: any) => Promise.resolve(error ? { data: null, error } : { data: rows.filter((r) => q._ids.includes(r.contact_id)), error: null }).then(res, rej),
  };
  return { from: () => q } as any;
}

describe('countWindowStatus', () => {
  it('counts open (< 24h) and closed (older, missing, no conversation, future-dated)', async () => {
    const db = dbWith([
      { contact_id: 'a', last_customer_message_at: hoursAgo(1) },
      { contact_id: 'b', last_customer_message_at: hoursAgo(25) },
      { contact_id: 'c', last_customer_message_at: null },
      { contact_id: 'f', last_customer_message_at: new Date(Date.now() + 3600_000).toISOString() },
    ]);
    // d has no conversation at all
    expect(await countWindowStatus(db, 'ws', ['a', 'b', 'c', 'd', 'f'])).toEqual({ open: 1, closed: 4 });
  });

  it('uses the newest message when a contact has several WhatsApp conversations', async () => {
    const db = dbWith([
      { contact_id: 'a', last_customer_message_at: hoursAgo(48) },
      { contact_id: 'a', last_customer_message_at: hoursAgo(2) },
    ]);
    expect(await countWindowStatus(db, 'ws', ['a'])).toEqual({ open: 1, closed: 0 });
  });

  it('chunks long id lists and handles an empty audience', async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `c${i}`);
    const db = dbWith(ids.map((id) => ({ contact_id: id, last_customer_message_at: hoursAgo(1) })));
    expect(await countWindowStatus(db, 'ws', ids)).toEqual({ open: 250, closed: 0 });
    expect(await countWindowStatus(db, 'ws', [])).toEqual({ open: 0, closed: 0 });
  });

  it('fails closed on a lookup error', async () => {
    await expect(countWindowStatus(dbWith([], { message: 'boom' }), 'ws', ['a'])).rejects.toBeTruthy();
  });
});
