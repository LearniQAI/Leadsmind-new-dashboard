import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ executeSegment: vi.fn(async (_ws: string, _rg: any) => [] as any[]) }));
vi.mock('@/lib/intelligence/SegmentationCompiler', async () => {
  const actual: any = await vi.importActual('@/lib/intelligence/SegmentationCompiler');
  return { ...actual, SegmentationCompiler: { executeSegment: h.executeSegment } };
});

import { resolveBroadcastAudience, audienceFromLegacy, topExclusionReason } from './resolveBroadcastAudience';

type Row = Record<string, any>;
const tables: Record<string, Row[]> = {};
let failTable: string | null = null;

// Minimal in-memory PostgREST stand-in: select / eq / in / neq / not / or / gte / lte / order / range.
function from(table: string) {
  const preds: ((r: Row) => boolean)[] = [];
  let order: [string, boolean][] = [];
  let range: [number, number] | null = null;
  const q: any = {
    select: () => q,
    eq: (c: string, v: any) => (preds.push((r) => r[c] === v), q),
    in: (c: string, vs: any[]) => (preds.push((r) => vs.includes(r[c])), q),
    neq: (c: string, v: any) => (preds.push((r) => r[c] !== v), q),
    not: (c: string, op: string, v: any) => (preds.push((r) => (op === 'is' ? r[c] !== v : true)), q),
    or: (expr: string) => {
      if (expr === 'phone.is.null,phone.eq.') preds.push((r) => r.phone == null || r.phone === '');
      return q;
    },
    gte: (c: string, v: any) => (preds.push((r) => String(r[c]) >= v), q),
    lte: (c: string, v: any) => (preds.push((r) => String(r[c]) <= v), q),
    order: (c: string, o: any) => (order.push([c, o?.ascending !== false]), q),
    range: (a: number, b: number) => ((range = [a, b]), q),
    maybeSingle: async () => {
      const { data } = await run();
      return { data: data[0] ?? null, error: null };
    },
    then: (res: any, rej: any) => run().then(res, rej),
  };
  async function run() {
    if (failTable === table) return { data: null, error: { message: `boom ${table}` } };
    let rows = (tables[table] ?? []).filter((r) => preds.every((p) => p(r)));
    for (const [c, asc] of [...order].reverse()) rows = [...rows].sort((a, b) => (String(a[c]) < String(b[c]) ? -1 : 1) * (asc ? 1 : -1));
    if (range) rows = rows.slice(range[0], range[1] + 1);
    return { data: rows, error: null };
  }
  return q;
}
const db = { from };

const WS = 'ws1';
const c = (id: string, over: Row = {}): Row => ({
  id, workspace_id: WS, first_name: `N${id}`, phone: `082 555 ${id.padStart(4, '0')}`, phone_e164: `+2782555${id.padStart(4, '0')}`,
  opted_out: false, sms_opt_out: false, created_at: `2026-01-${String(Number(id) % 28 + 1).padStart(2, '0')}T00:00:00Z`, source: 'web', timezone: 'Africa/Johannesburg', ...over,
});

beforeEach(() => {
  failTable = null;
  h.executeSegment.mockReset();
  h.executeSegment.mockResolvedValue([]);
  for (const k of Object.keys(tables)) delete tables[k];
  tables.contacts = [c('1'), c('2'), c('3', { phone: null, phone_e164: null }), c('4', { phone_e164: null }), c('5', { opted_out: true }),
    c('6', { sms_opt_out: true }), c('7'), c('8', { source: 'import', timezone: 'Europe/London' })];
  tables.contacts[6].phone_e164 = '+27825550007'; tables.contacts[6].id = '7'; // distinct number
  tables.tags = [{ id: 'aaaaaaaa-0000-0000-0000-000000000001', workspace_id: WS, name: 'VIP' }, { id: 'aaaaaaaa-0000-0000-0000-000000000002', workspace_id: WS, name: 'Promo' }];
  tables.tag_assignments = [];
  tables.sms_suppression_list = [];
  tables.segments = [];
});

describe('sources', () => {
  it('all_contacts counts every exclusion reason once and keeps the rest', async () => {
    tables.sms_suppression_list = [{ workspace_id: WS, phone_e164: '+27825550002' }];
    const r = await resolveBroadcastAudience(db, WS, { type: 'all_contacts' });
    expect(r.counts.matched).toBe(8);
    expect(r.exclusions).toEqual({ no_phone: 1, invalid_number: 1, opted_out: 2, suppressed: 1, duplicate_phone: 0 });
    expect(r.contactIds.sort()).toEqual(['1', '7', '8']);
    expect(r.counts.eligible).toBe(3);
  });

  it('tags mode all = AND, mode any = OR, unknown tag under all = nobody', async () => {
    tables.tag_assignments = [
      { id: 'a1', workspace_id: WS, entity_type: 'contact', entity_id: '1', tag_id: tables.tags[0].id },
      { id: 'a2', workspace_id: WS, entity_type: 'contact', entity_id: '1', tag_id: tables.tags[1].id },
      { id: 'a3', workspace_id: WS, entity_type: 'contact', entity_id: '2', tag_id: tables.tags[0].id },
    ];
    const all = await resolveBroadcastAudience(db, WS, { type: 'tags', tags: ['vip', 'PROMO'], mode: 'all' });
    expect(all.contactIds).toEqual(['1']);
    const any = await resolveBroadcastAudience(db, WS, { type: 'tags', tags: ['vip', 'promo'], mode: 'any' });
    expect(any.contactIds.sort()).toEqual(['1', '2']);
    const unknownAll = await resolveBroadcastAudience(db, WS, { type: 'tags', tags: ['vip', 'nope'], mode: 'all' });
    expect(unknownAll.contactIds).toEqual([]);
    const unknownAny = await resolveBroadcastAudience(db, WS, { type: 'tags', tags: ['vip', 'nope'], mode: 'any' });
    expect(unknownAny.contactIds.sort()).toEqual(['1', '2']);
  });

  it('tags with no tag names is a validation error', async () => {
    await expect(resolveBroadcastAudience(db, WS, { type: 'tags', tags: [' '], mode: 'all' })).rejects.toThrow(/at least one tag/);
  });

  it('contact_fields uses only real columns', async () => {
    const src = await resolveBroadcastAudience(db, WS, { type: 'contact_fields', filters: [{ field: 'source', value: 'import' }] });
    expect(src.contactIds).toEqual(['8']);
    const tz = await resolveBroadcastAudience(db, WS, { type: 'contact_fields', filters: [{ field: 'timezone', value: 'Europe/London' }] });
    expect(tz.contactIds).toEqual(['8']);
    const hp = await resolveBroadcastAudience(db, WS, { type: 'contact_fields', filters: [{ field: 'has_phone', value: true }] });
    expect(hp.counts.matched).toBe(7);
    const after = await resolveBroadcastAudience(db, WS, { type: 'contact_fields', filters: [{ field: 'created_after', value: '2026-01-08T00:00:00Z' }] });
    expect(after.counts.matched).toBe(tables.contacts.filter((x) => x.created_at >= '2026-01-08T00:00:00Z').length);
  });

  it('contact_fields rejects has_phone:false with a clear error instead of an always-empty result', async () => {
    await expect(resolveBroadcastAudience(db, WS, { type: 'contact_fields', filters: [{ field: 'has_phone', value: false } as any] })).rejects.toThrow(/no phone number is not supported/);
  });

  it('contact_fields rejects unknown fields and blank values', async () => {
    await expect(resolveBroadcastAudience(db, WS, { type: 'contact_fields', filters: [{ field: 'company', value: 'x' } as any] })).rejects.toThrow(/Unknown contact filter/);
    await expect(resolveBroadcastAudience(db, WS, { type: 'contact_fields', filters: [{ field: 'source', value: ' ' }] })).rejects.toThrow(/Enter a value/);
    await expect(resolveBroadcastAudience(db, WS, { type: 'contact_fields', filters: [{ field: 'created_after', value: 'nope' }] })).rejects.toThrow(/valid date/);
  });

  it('saved_segment reads the segment and executes it read-only', async () => {
    tables.segments = [{ id: 's1', workspace_id: WS, rule_group: { logic: 'AND', rules: [{ field: 'first_name', operator: 'equals', value: 'N1' }] } }];
    h.executeSegment.mockResolvedValue([{ id: '1' }, { id: '2' }]);
    const r = await resolveBroadcastAudience(db, WS, { type: 'saved_segment', segmentId: 's1' });
    expect(r.contactIds.sort()).toEqual(['1', '2']);
    expect(h.executeSegment).toHaveBeenCalledTimes(1);
  });

  it('saved_segment: deleted, invalid and foreign segments fail closed before any contact lookup', async () => {
    await expect(resolveBroadcastAudience(db, WS, { type: 'saved_segment', segmentId: 'gone' })).rejects.toThrow(/no longer exists \(it was deleted\)/);
    tables.segments = [{ id: 's2', workspace_id: WS, rule_group: { logic: 'AND', rules: [{ field: 'first_name', operator: 'contains', value: '' }] } }];
    await expect(resolveBroadcastAudience(db, WS, { type: 'saved_segment', segmentId: 's2' })).rejects.toThrow(/invalid/);
    tables.segments = [{ id: 's3', workspace_id: 'OTHER', rule_group: { logic: 'AND', rules: [] } }];
    await expect(resolveBroadcastAudience(db, WS, { type: 'saved_segment', segmentId: 's3' })).rejects.toThrow(/no longer exists/);
    expect(h.executeSegment).not.toHaveBeenCalled();
  });

  it('is workspace scoped: another workspace\'s contacts and tags never match', async () => {
    tables.contacts.push(c('99', { workspace_id: 'OTHER' }));
    const r = await resolveBroadcastAudience(db, WS, { type: 'all_contacts' });
    expect(r.counts.matched).toBe(8);
    tables.tag_assignments = [{ id: 'x', workspace_id: 'OTHER', entity_type: 'contact', entity_id: '99', tag_id: tables.tags[0].id }];
    const t = await resolveBroadcastAudience(db, WS, { type: 'tags', tags: ['vip'], mode: 'all' });
    expect(t.contactIds).toEqual([]);
  });
});

describe('shared numbers: opt-out of ANY contact on the number excludes it', () => {
  const N = '+27825551111';
  it('oldest clean + newer opted-out -> excluded, counted as opted_out', async () => {
    tables.contacts = [c('1', { phone_e164: N, created_at: '2026-01-01T00:00:00Z' }), c('2', { phone_e164: N, created_at: '2026-02-01T00:00:00Z', opted_out: true })];
    const r = await resolveBroadcastAudience(db, WS, { type: 'all_contacts' });
    expect(r.contactIds).toEqual([]);
    expect(r.exclusions).toMatchObject({ opted_out: 2, duplicate_phone: 0 });
  });
  it('oldest opted-out + newer clean -> excluded', async () => {
    tables.contacts = [c('1', { phone_e164: N, created_at: '2026-01-01T00:00:00Z', sms_opt_out: true }), c('2', { phone_e164: N, created_at: '2026-02-01T00:00:00Z' })];
    const r = await resolveBroadcastAudience(db, WS, { type: 'all_contacts' });
    expect(r.contactIds).toEqual([]);
    expect(r.exclusions.opted_out).toBe(2);
  });
  it('both clean -> one recipient (the oldest), the other counted as duplicate', async () => {
    tables.contacts = [c('1', { phone_e164: N, created_at: '2026-01-01T00:00:00Z' }), c('2', { phone_e164: N, created_at: '2026-02-01T00:00:00Z' })];
    const r = await resolveBroadcastAudience(db, WS, { type: 'all_contacts' });
    expect(r.contactIds).toEqual(['1']);
    expect(r.exclusions).toMatchObject({ opted_out: 0, duplicate_phone: 1 });
  });
  it('an opted-out duplicate OUTSIDE the audience (a tag audience) still excludes the number', async () => {
    tables.contacts = [c('1', { phone_e164: N }), c('2', { phone_e164: N, opted_out: true })];
    tables.tag_assignments = [{ id: 'a', workspace_id: WS, entity_type: 'contact', entity_id: '1', tag_id: tables.tags[0].id }];
    const r = await resolveBroadcastAudience(db, WS, { type: 'tags', tags: ['vip'], mode: 'all' });
    expect(r.contactIds).toEqual([]);
    expect(r.exclusions.opted_out).toBe(1);
  });
  it('a lookup failure fails closed', async () => {
    tables.contacts = [c('1')];
    failTable = 'contacts';
    await expect(resolveBroadcastAudience(db, WS, { type: 'all_contacts' })).rejects.toBeTruthy();
  });
});

describe('dedup, sample and fail-closed', () => {
  it('keeps the oldest contact per number and counts the rest', async () => {
    tables.contacts = [
      c('1', { phone_e164: '+27825551111', created_at: '2026-03-01T00:00:00Z' }),
      c('2', { phone_e164: '+27825551111', created_at: '2026-01-01T00:00:00Z' }),
      c('3', { phone_e164: '+27825551111', created_at: '2026-02-01T00:00:00Z' }),
    ];
    const r = await resolveBroadcastAudience(db, WS, { type: 'all_contacts' });
    expect(r.contactIds).toEqual(['2']);
    expect(r.exclusions.duplicate_phone).toBe(2);
    expect(r.counts).toEqual({ matched: 3, eligible: 1 });
  });

  it('sample is at most 5, first name + last 3 digits, never a full number or full name', async () => {
    tables.contacts = Array.from({ length: 9 }, (_, i) => c(String(i + 1), { first_name: `Ann Smith${i}`, phone_e164: `+2782555${String(1000 + i)}` }));
    const r = await resolveBroadcastAudience(db, WS, { type: 'all_contacts' });
    expect(r.sample).toHaveLength(5);
    const json = JSON.stringify(r.sample);
    expect(json).not.toMatch(/\+27|\d{4,}/);
    expect(json).not.toMatch(/Smith/);
    expect(r.sample[0]).toEqual({ name: 'Ann', phone: '***' + r.sample[0].phone.slice(3) });
    expect(r.sample[0].phone).toMatch(/^\*\*\*\d{3}$/);
  });

  it('fails closed on any lookup error (never a partial audience)', async () => {
    for (const t of ['contacts', 'sms_suppression_list']) {
      failTable = t;
      await expect(resolveBroadcastAudience(db, WS, { type: 'all_contacts' })).rejects.toBeTruthy();
    }
    failTable = 'tags';
    await expect(resolveBroadcastAudience(db, WS, { type: 'tags', tags: ['vip'], mode: 'all' })).rejects.toBeTruthy();
    failTable = 'tag_assignments';
    tables.tag_assignments = [];
    await expect(resolveBroadcastAudience(db, WS, { type: 'tags', tags: ['vip'], mode: 'any' })).rejects.toBeTruthy();
  });

  it('topExclusionReason names the largest reason', () => {
    expect(topExclusionReason({ no_phone: 1, invalid_number: 0, opted_out: 4, suppressed: 0, duplicate_phone: 0 })).toBe('4 contacts who opted out');
    expect(topExclusionReason({ no_phone: 0, invalid_number: 0, opted_out: 0, suppressed: 0, duplicate_phone: 0 })).toBeNull();
  });
});

describe('legacy inputs map to identical results', () => {
  it('maps the three legacy inputs', () => {
    expect(audienceFromLegacy({})).toBeNull();
    expect(audienceFromLegacy({ tags: [] })).toBeNull();
    expect(audienceFromLegacy({ segmentId: 's1' })).toEqual([{ type: 'saved_segment', segmentId: 's1' }]);
    const rg = { logic: 'AND' as const, rules: [{ field: 'first_name', operator: 'equals', value: 'x' }] };
    // a non-empty ruleGroup wins over segmentId, exactly as before
    expect(audienceFromLegacy({ ruleGroup: rg as any, segmentId: 's1' })).toEqual([{ type: 'rule_group', ruleGroup: rg }]);
    // an EMPTY ruleGroup is ignored and the segment is used
    expect(audienceFromLegacy({ ruleGroup: { logic: 'AND', rules: [] } as any, segmentId: 's1' })).toEqual([{ type: 'saved_segment', segmentId: 's1' }]);
    expect(audienceFromLegacy({ segmentId: 's1', tags: ['a', '', 'b'] })).toEqual([{ type: 'saved_segment', segmentId: 's1' }, { type: 'tags', tags: ['a', 'b'], mode: 'all' }]);
  });

  it('rule+tags is the INTERSECTION and tags are AND-of-all, same as the old inline code', async () => {
    tables.tag_assignments = [
      { id: 'a1', workspace_id: WS, entity_type: 'contact', entity_id: '1', tag_id: tables.tags[0].id },
      { id: 'a2', workspace_id: WS, entity_type: 'contact', entity_id: '1', tag_id: tables.tags[1].id },
      { id: 'a3', workspace_id: WS, entity_type: 'contact', entity_id: '2', tag_id: tables.tags[0].id },
      { id: 'a4', workspace_id: WS, entity_type: 'contact', entity_id: '7', tag_id: tables.tags[0].id },
      { id: 'a5', workspace_id: WS, entity_type: 'contact', entity_id: '7', tag_id: tables.tags[1].id },
    ];
    h.executeSegment.mockResolvedValue([{ id: '1' }, { id: '2' }]);
    const rg = { logic: 'AND' as const, rules: [{ field: 'first_name', operator: 'contains', value: 'N' }] };
    const spec = audienceFromLegacy({ ruleGroup: rg as any, tags: ['VIP', 'promo'] })!;
    const r = await resolveBroadcastAudience(db, WS, spec);
    expect(r.contactIds).toEqual(['1']); // rules {1,2} ∩ both tags {1,7}
    const tagsOnly = await resolveBroadcastAudience(db, WS, audienceFromLegacy({ tags: ['vip', 'promo'] })!);
    expect(tagsOnly.contactIds.sort()).toEqual(['1', '7']);
  });

  it('a legacy rule group is validated before any lookup', async () => {
    const bad = audienceFromLegacy({ ruleGroup: { logic: 'AND', rules: [{ field: 'company', operator: 'equals', value: 'x' }] } as any })!;
    await expect(resolveBroadcastAudience(db, WS, bad)).rejects.toThrow(/Unknown segment field/);
    expect(h.executeSegment).not.toHaveBeenCalled();
  });
});
