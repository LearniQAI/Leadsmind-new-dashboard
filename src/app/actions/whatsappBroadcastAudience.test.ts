import { describe, it, expect, vi, beforeEach } from 'vitest';

type Row = Record<string, any>;
const tables: Record<string, Row[]> = {};
const writes: { table: string; op: string; rows?: any }[] = [];
const state = { failQueueUpsert: false };

vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireWorkspaceAccess: async () => ({ workspaceId: 'w1', userId: 'u1' }), requireModuleAccess: async () => {} }));
vi.mock('@/lib/encryption', () => ({ decrypt: (s: string) => s }));
vi.mock('@/lib/intelligence/SegmentationCompiler', async () => {
  const actual: any = await vi.importActual('@/lib/intelligence/SegmentationCompiler');
  return { ...actual, SegmentationCompiler: { executeSegment: async () => [{ id: '1' }, { id: '2' }] } };
});

function from(table: string) {
  const preds: ((r: Row) => boolean)[] = [];
  let range: [number, number] | null = null;
  let op: 'select' | 'insert' | 'upsert' | 'delete' = 'select';
  let payload: any;
  let cols: string[] | null = null;
  const q: any = {
    select: (c?: string) => ((cols = c && c !== '*' ? c.split(',').map((x) => x.trim()) : null), q),
    eq: (c: string, v: any) => (preds.push((r) => r[c] === v), q),
    in: (c: string, vs: any[]) => (preds.push((r) => vs.includes(r[c])), q),
    neq: (c: string, v: any) => (preds.push((r) => r[c] !== v), q),
    not: (c: string, _op: string, v: any) => (preds.push((r) => r[c] !== v), q),
    or: () => q, gte: () => q, lte: () => q, order: () => q,
    range: (a: number, b: number) => ((range = [a, b]), q),
    insert: (r: any) => ((op = 'insert'), (payload = r), q),
    upsert: (r: any) => ((op = 'upsert'), (payload = r), q),
    delete: () => ((op = 'delete'), q),
    maybeSingle: async () => ({ data: (await run()).data?.[0] ?? null, error: null }),
    single: async () => { const r = await run(); return { data: r.data?.[0] ?? null, error: r.error }; },
    then: (res: any, rej: any) => run().then(res, rej),
  };
  async function run() {
    if (op === 'insert') {
      const row = { id: `${table}-${(tables[table] ??= []).length + 1}`, ...payload };
      tables[table].push(row); writes.push({ table, op, rows: row });
      return { data: [row], error: null };
    }
    if (op === 'upsert') {
      if (table === 'whatsapp_dispatch_queue' && state.failQueueUpsert) return { data: null, error: { message: 'chunk failed' } };
      (tables[table] ??= []).push(...payload); writes.push({ table, op, rows: payload });
      return { data: null, error: null };
    }
    if (op === 'delete') {
      const before = tables[table] ?? [];
      tables[table] = before.filter((r) => !preds.every((p) => p(r)));
      writes.push({ table, op });
      return { data: null, error: null };
    }
    let rows = (tables[table] ?? []).filter((r) => preds.every((p) => p(r)));
    if (range) rows = rows.slice(range[0], range[1] + 1);
    if (cols) rows = rows.map((r) => Object.fromEntries(cols!.map((c) => [c, r[c]])));
    return { data: rows, error: null };
  }
  return q;
}
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => ({ from }), createAdminClient: () => ({ from }) }));

import {
  createWhatsAppBroadcastCampaign, previewWhatsAppBroadcastAudience, listAudienceSegmentOptions,
} from '@/app/actions/whatsapp_broadcast';

const contact = (id: string, over: Row = {}): Row => ({
  id, workspace_id: 'w1', first_name: `Name${id}`, phone: `082 555 000${id}`, phone_e164: `+2782555000${id}`,
  opted_out: false, sms_opt_out: false, created_at: `2026-01-0${id}T00:00:00Z`, ...over,
});

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  writes.length = 0; state.failQueueUpsert = false;
  tables.platform_connections = [{ id: 'conn', workspace_id: 'w1', platform: 'whatsapp' }];
  tables.contacts = [contact('1'), contact('2'), contact('3', { opted_out: true })];
  tables.sms_suppression_list = []; tables.tags = []; tables.tag_assignments = [];
  tables.segments = [{ id: 's1', name: 'VIPs', workspace_id: 'w1', rule_group: { logic: 'AND', rules: [{ field: 'first_name', operator: 'contains', value: 'Name' }] } },
    { id: 'sx', name: 'Foreign', workspace_id: 'w2', rule_group: { logic: 'AND', rules: [{ field: 'first_name', operator: 'contains', value: 'Name' }] } }];
  tables.whatsapp_broadcast_campaigns = []; tables.whatsapp_dispatch_queue = [];
});

const base = { name: 'Blast', messageBody: 'hi' };
const wrote = () => writes.filter((w) => w.op !== 'select').length;

describe('createWhatsAppBroadcastCampaign: attestation', () => {
  it.each([
    ['all_contacts', { type: 'all_contacts' }],
    ['tags', { type: 'tags', tags: ['vip'] }],
    ['contact_fields', { type: 'contact_fields', filters: [{ field: 'has_phone', value: true }] }],
    ['saved_segment', { type: 'saved_segment', segmentId: 's1' }],
  ] as const)('%s without consentAttested is rejected and nothing is written', async (_n, audience) => {
    const r: any = await createWhatsAppBroadcastCampaign({ ...base, audience: audience as any });
    expect(r).toMatchObject({ success: false, code: 'consent_attestation_required' });
    expect(r.error).toMatch(/agreed to receive WhatsApp marketing/);
    expect(wrote()).toBe(0);
  });

  it('consentAttested must be exactly true (truthy strings do not count)', async () => {
    const r: any = await createWhatsAppBroadcastCampaign({ ...base, audience: { type: 'all_contacts' }, consentAttested: 'yes' as any });
    expect(r.code).toBe('consent_attestation_required');
    expect(wrote()).toBe(0);
  });

  it('the legacy segmentId input also needs the attestation', async () => {
    const r: any = await createWhatsAppBroadcastCampaign({ ...base, segmentId: 's1' });
    expect(r.code).toBe('consent_attestation_required');
    expect(wrote()).toBe(0);
  });
});

describe('createWhatsAppBroadcastCampaign: a workspace with 0 segments', () => {
  beforeEach(() => { tables.segments = []; });

  it('creates and queues from all_contacts; queue rows equal eligible and the snapshot is stored', async () => {
    const r: any = await createWhatsAppBroadcastCampaign({ ...base, audience: { type: 'all_contacts' }, consentAttested: true });
    expect(r.success).toBe(true);
    expect(r.recipientCount).toBe(2);
    expect(tables.whatsapp_dispatch_queue).toHaveLength(2);
    const c = tables.whatsapp_broadcast_campaigns[0];
    expect(c).toMatchObject({ audience_type: 'all_contacts', segment_id: null, total_recipients: 2, total_skipped_opt_out: 1 });
    expect(c.audience_snapshot.counts).toEqual({ matched: 3, eligible: 2 });
    expect(c.audience_snapshot.exclusions.opted_out).toBe(1);
    expect(c.compliance_ack).toMatchObject({ userId: 'u1', textVersion: 'wa-attest-v1' });
    expect(typeof c.compliance_ack.ts).toBe('string');
  });

  it('contact_fields works without segments', async () => {
    const r: any = await createWhatsAppBroadcastCampaign({ ...base, audience: { type: 'contact_fields', filters: [{ field: 'has_phone', value: true }] }, consentAttested: true });
    expect(r.success).toBe(true);
    expect(tables.whatsapp_dispatch_queue).toHaveLength(2);
  });

  it('an empty eligible audience errors, names the top exclusion reason, and writes nothing', async () => {
    tables.contacts = [contact('1', { opted_out: true }), contact('2', { opted_out: true })];
    const r: any = await createWhatsAppBroadcastCampaign({ ...base, audience: { type: 'all_contacts' }, consentAttested: true });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/No eligible recipients/);
    expect(r.error).toMatch(/2 contacts who opted out/);
    expect(wrote()).toBe(0);
  });
});

describe('createWhatsAppBroadcastCampaign: saved segment, legacy and failure paths', () => {
  it('a saved-segment audience still works and records segment_id', async () => {
    const r: any = await createWhatsAppBroadcastCampaign({ ...base, audience: { type: 'saved_segment', segmentId: 's1' }, consentAttested: true });
    expect(r.success).toBe(true);
    expect(tables.whatsapp_broadcast_campaigns[0]).toMatchObject({ segment_id: 's1', audience_type: 'saved_segment' });
    expect(tables.whatsapp_dispatch_queue).toHaveLength(2);
  });

  it("another workspace's segment id is not found and nothing is written", async () => {
    const r: any = await createWhatsAppBroadcastCampaign({ ...base, audience: { type: 'saved_segment', segmentId: 'sx' }, consentAttested: true });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/no longer exists/);
    expect(wrote()).toBe(0);
  });

  it('legacy inputs keep working (recorded as audience_type legacy)', async () => {
    const r: any = await createWhatsAppBroadcastCampaign({ ...base, segmentId: 's1', consentAttested: true });
    expect(r.success).toBe(true);
    expect(tables.whatsapp_broadcast_campaigns[0]).toMatchObject({ audience_type: 'legacy', segment_id: 's1' });
  });

  it('no audience at all is a clear error', async () => {
    const r: any = await createWhatsAppBroadcastCampaign({ ...base, consentAttested: true });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/Select an audience/);
  });

  it('a failed queue chunk removes the campaign and its queue rows', async () => {
    state.failQueueUpsert = true;
    const r: any = await createWhatsAppBroadcastCampaign({ ...base, audience: { type: 'all_contacts' }, consentAttested: true });
    expect(r.success).toBe(false);
    expect(tables.whatsapp_broadcast_campaigns).toHaveLength(0);
    expect(tables.whatsapp_dispatch_queue).toHaveLength(0);
  });

  it('no WhatsApp connection is still refused', async () => {
    tables.platform_connections = [];
    const r: any = await createWhatsAppBroadcastCampaign({ ...base, audience: { type: 'all_contacts' }, consentAttested: true });
    expect(r.error).toMatch(/Connect a WhatsApp Business account first/);
    expect(wrote()).toBe(0);
  });
});

describe('previewWhatsAppBroadcastAudience and listAudienceSegmentOptions', () => {
  it('returns counts, exclusions and a masked sample only, and writes nothing', async () => {
    const r: any = await previewWhatsAppBroadcastAudience({ type: 'all_contacts' });
    expect(r.success).toBe(true);
    expect(r.counts).toEqual({ matched: 3, eligible: 2 });
    expect(r.exclusions.opted_out).toBe(1);
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/\+27|082 555|2782555/);
    expect(json).not.toMatch(/Name1\b[^"]*Name/);
    expect(r.sample[0].phone).toMatch(/^\*\*\*\d{3}$/);
    expect(wrote()).toBe(0);
  });

  it('preview of a foreign segment id fails closed', async () => {
    const r: any = await previewWhatsAppBroadcastAudience({ type: 'saved_segment', segmentId: 'sx' });
    expect(r.success).toBe(false);
  });

  it('lists only id and name of this workspace\'s segments', async () => {
    const r: any = await listAudienceSegmentOptions();
    expect(r.success).toBe(true);
    expect(r.data).toEqual([{ id: 's1', name: 'VIPs' }]);
  });
});
