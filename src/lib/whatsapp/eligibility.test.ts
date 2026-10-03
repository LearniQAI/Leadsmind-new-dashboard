import { describe, it, expect, vi } from 'vitest';

vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => { throw new Error('admin client must not be used when a db is injected'); } }));

import { getEligibleContactIds, ELIGIBILITY_UNAVAILABLE } from './eligibility';

const row = (n: number) => ({ contact_id: `c${String(n).padStart(5, '0')}`, phone_e164: `+2782555${String(n).padStart(4, '0')}`, consent_id: `k${n}` });

/** A fake rpc client that serves a pre-built eligible set, honouring p_contact_ids, order and range like PostgREST. */
function fakeDb(all: ReturnType<typeof row>[], opts: { error?: any; malformed?: boolean; notArray?: boolean } = {}) {
  const calls: any[] = [];
  const db = {
    rpc(fn: string, args: any) {
      calls.push({ fn, args });
      let rows = args.p_contact_ids == null ? all : all.filter((r) => args.p_contact_ids.includes(r.contact_id));
      const q: any = {
        order: () => ((rows = [...rows].sort((a, b) => a.contact_id.localeCompare(b.contact_id))), q),
        range: (a: number, b: number) => ((rows = rows.slice(a, b + 1)), q),
        then: (res: any, rej: any) => {
          if (opts.error) return Promise.resolve({ data: null, error: opts.error }).then(res, rej);
          if (opts.notArray) return Promise.resolve({ data: null, error: null }).then(res, rej);
          const data = opts.malformed ? rows.map((r) => ({ ...r, consent_id: undefined })) : rows;
          return Promise.resolve({ data, error: null }).then(res, rej);
        },
      };
      return q;
    },
  };
  return { db, calls };
}

describe('getEligibleContactIds', () => {
  it('returns the eligible contacts mapped to camelCase', async () => {
    const { db } = fakeDb([row(1), row(2)]);
    const r = await getEligibleContactIds('ws', null, { db });
    expect(r).toEqual({ ok: true, contacts: [{ contactId: 'c00001', phoneE164: '+27825550001', consentId: 'k1' }, { contactId: 'c00002', phoneE164: '+27825550002', consentId: 'k2' }], contactIds: ['c00001', 'c00002'] });
  });

  it('passes the workspace and null ids when asking about everyone', async () => {
    const { db, calls } = fakeDb([row(1)]);
    await getEligibleContactIds('ws-1', undefined, { db });
    expect(calls[0]).toEqual({ fn: 'wa_marketing_eligible', args: { p_workspace: 'ws-1', p_contact_ids: null } });
  });

  it('only returns the asked-about ids and de-duplicates them', async () => {
    const { db, calls } = fakeDb([row(1), row(2), row(3)]);
    const r: any = await getEligibleContactIds('ws', ['c00002', 'c00002', 'c00099'], { db });
    expect(r.contactIds).toEqual(['c00002']);
    expect(calls).toHaveLength(1);
    expect(calls[0].args.p_contact_ids).toEqual(['c00002', 'c00099']);
  });

  it('an empty id list is a successful empty result with no database call', async () => {
    const { db, calls } = fakeDb([row(1)]);
    expect(await getEligibleContactIds('ws', [], { db })).toEqual({ ok: true, contacts: [], contactIds: [] });
    expect(calls).toHaveLength(0);
  });

  it('pages past the 1000-row PostgREST cap (no silent truncation)', async () => {
    const all = Array.from({ length: 2500 }, (_, i) => row(i + 1));
    const { db, calls } = fakeDb(all);
    const r: any = await getEligibleContactIds('ws', null, { db });
    expect(r.ok).toBe(true);
    expect(r.contactIds).toHaveLength(2500);
    expect(new Set(r.contactIds).size).toBe(2500);
    expect(calls).toHaveLength(3);
  });

  it('chunks a large id list and merges the results', async () => {
    const all = Array.from({ length: 2500 }, (_, i) => row(i + 1));
    const { db, calls } = fakeDb(all);
    const r: any = await getEligibleContactIds('ws', all.map((x) => x.contact_id), { db });
    expect(r.contactIds).toHaveLength(2500);
    expect(calls.filter((c) => c.args.p_contact_ids.length <= 1000).length).toBe(calls.length);
    expect(calls.length).toBeGreaterThanOrEqual(3);
  });
});

describe('fails CLOSED (an error is never an empty-as-allowed or a full list)', () => {
  const closed = { ok: false, error: ELIGIBILITY_UNAVAILABLE };

  it('database error', async () => {
    const { db } = fakeDb([row(1)], { error: { message: 'permission denied for function wa_marketing_eligible' } });
    expect(await getEligibleContactIds('ws', null, { db })).toEqual(closed);
  });

  it('thrown transport error', async () => {
    const db = { rpc: () => { throw new Error('fetch failed'); } } as any;
    expect(await getEligibleContactIds('ws', ['a'], { db })).toEqual(closed);
  });

  it('a non-array result', async () => {
    const { db } = fakeDb([row(1)], { notArray: true });
    expect(await getEligibleContactIds('ws', null, { db })).toEqual(closed);
  });

  it('a malformed row', async () => {
    const { db } = fakeDb([row(1)], { malformed: true });
    expect(await getEligibleContactIds('ws', null, { db })).toEqual(closed);
  });

  it('a missing workspace id', async () => {
    const { db } = fakeDb([row(1)]);
    expect(await getEligibleContactIds('', null, { db })).toEqual(closed);
  });

  it('the error message never leaks database detail', async () => {
    const { db } = fakeDb([], { error: { message: 'relation "whatsapp_consent_records" does not exist' } });
    const r: any = await getEligibleContactIds('ws', null, { db });
    expect(r.error).not.toMatch(/relation|whatsapp_consent/);
  });

  it('an error on a later chunk fails the whole call (no partial list)', async () => {
    const all = Array.from({ length: 1500 }, (_, i) => row(i + 1));
    let n = 0;
    const db = {
      rpc: () => {
        const q: any = { order: () => q, range: () => q, then: (res: any, rej: any) => Promise.resolve(++n === 1 ? { data: all.slice(0, 1000), error: null } : { data: null, error: { message: 'boom' } }).then(res, rej) };
        return q;
      },
    } as any;
    expect(await getEligibleContactIds('ws', null, { db })).toEqual(closed);
  });
});
