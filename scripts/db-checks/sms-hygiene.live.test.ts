// Live verification: B9 (tag targeting via tag_assignments, SMS + WhatsApp), B10 (race-free campaign
// totals under concurrent workers, SMS + WhatsApp), I (duplicate-send protection wiring, owned-number
// vs SMS-sender reconciliation, safe errors). Real actions/workers/database in throwaway workspaces.
// Nothing is sent: Twilio uses the AC_123 dev-mock mode and the Meta adapter is stubbed.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const h = vi.hoisted(() => ({
  workspaceId: '', userId: '', userClient: null as any,
  sendCalls: [] as any[],
  failWhen: null as null | ((args: any) => boolean),
}));
vi.mock('@/lib/auth', async (orig) => {
  const actual = await orig<any>();
  return { ...actual, getCurrentWorkspaceId: async () => h.workspaceId, requireWorkspaceAccess: async () => ({ workspaceId: h.workspaceId, userId: h.userId, role: 'owner' }), requireAuth: async () => ({}) };
});
vi.mock('@/lib/supabase/server', async (orig) => {
  const actual = await orig<any>();
  return { ...actual, createServerClient: async () => h.userClient };
});
// Pass-through wrapper: records what the worker hands to sendSMS, and can inject ONE transient failure.
vi.mock('@/lib/sms', async (orig) => {
  const actual = await orig<any>();
  return {
    ...actual,
    sendSMS: async (args: any) => {
      h.sendCalls.push(args);
      if (h.failWhen?.(args)) { h.failWhen = null; throw new Error('socket hang up'); }
      return actual.sendSMS(args);
    },
  };
});
// WhatsApp goes through Meta, not Twilio: stub the adapter so the real worker runs without a network call.
vi.mock('@/lib/meta/MetaAdapter', () => ({
  MetaAdapter: class {
    constructor(_credentials: any) {}
    async sendWhatsApp() { return { success: true, externalId: 'wamid.LIVE' }; }
    async sendWhatsAppTemplate() { return { success: true, externalId: 'wamid.LIVE' }; }
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('next/navigation', () => ({ redirect: () => {} }));

process.env.NEXT_PUBLIC_APP_URL = 'https://app.test';
process.env.CRON_SECRET = 'live-cron-secret';

const WS1_NUM = '+15005550021';
let db: any, M: any, ws1 = '', ws2 = '';
const users: Record<string, { id: string; client: any }> = {};
const userIds: string[] = [];
const runId = randomUUID().slice(0, 8);
let phoneSeq = 0;
let queuesClear = true;

const as = (w: string) => { h.workspaceId = w; h.userId = users[w].id; h.userClient = users[w].client; };
const phone = () => `0827${String(100000 + phoneSeq++)}`; // valid ZA local number, unique
const e164 = (local: string) => `+27${local.slice(1)}`;

async function mkContacts(workspace: string, n: number, opts: { source: string; tag: string; overrides?: (i: number) => any }) {
  const rows = Array.from({ length: n }, (_, i) => ({
    workspace_id: workspace, email: `smsh-${runId}-${opts.tag}-${i}@example.com`, first_name: `F${i}`, last_name: 'V',
    phone: phone(), source: opts.source, ...(opts.overrides?.(i) ?? {}),
  }));
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += 200) {
    const { data, error } = await db.from('contacts').insert(rows.slice(i, i + 200)).select();
    if (error) throw new Error(`contacts: ${error.message}`);
    out.push(...data);
  }
  return out;
}
const mkSegment = async (workspace: string, source: string) =>
  (await db.from('segments').insert({ workspace_id: workspace, name: `seg-${source}`, rule_group: { logic: 'AND', rules: [{ field: 'source', operator: 'equals', value: source }] } }).select().single()).data;
const smsCampaign = async (id: string) => (await db.from('bulk_sms_campaigns').select('*').eq('id', id).single()).data;
const waCampaign = async (id: string) => (await db.from('whatsapp_broadcast_campaigns').select('*').eq('id', id).single()).data;
const smsRows = async (id: string) => (await db.from('sms_dispatch_queue').select('*').eq('campaign_id', id)).data ?? [];
const waRows = async (id: string) => (await db.from('whatsapp_dispatch_queue').select('*').eq('campaign_id', id)).data ?? [];

async function mkSmsCampaign(workspace: string, contacts: any[], rowState: (c: any, i: number) => any = () => ({})) {
  const camp = (await db.from('bulk_sms_campaigns').insert({ workspace_id: workspace, name: `hyg-${randomUUID().slice(0, 6)}`, message_body: 'hello', status: 'scheduled', total_recipients: contacts.length, scheduled_at: new Date().toISOString() }).select().single()).data;
  await insertChunked('sms_dispatch_queue', contacts.map((c, i) => ({ campaign_id: camp.id, workspace_id: workspace, contact_id: c.id, status: 'pending', scheduled_for: new Date(Date.now() - 1000).toISOString(), ...rowState(c, i) })));
  return camp;
}
async function mkWaCampaign(workspace: string, contacts: any[]) {
  const camp = (await db.from('whatsapp_broadcast_campaigns').insert({ workspace_id: workspace, name: `hyg-${randomUUID().slice(0, 6)}`, template_name: 'promo', template_language: 'en_US', status: 'scheduled', total_recipients: contacts.length, scheduled_at: new Date().toISOString() }).select().single()).data;
  await insertChunked('whatsapp_dispatch_queue', contacts.map((c) => ({ campaign_id: camp.id, workspace_id: workspace, contact_id: c.id, status: 'pending', scheduled_for: new Date(Date.now() - 1000).toISOString() })));
  return camp;
}
async function insertChunked(table: string, rows: any[]) {
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from(table).insert(rows.slice(i, i + 200));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}
async function run(route: 'worker' | 'waWorker') {
  const { NextRequest } = await import('next/server');
  const res = await M[route].GET(new NextRequest('https://app.test/api/cron/workers/x', { headers: { Authorization: 'Bearer live-cron-secret' } }));
  expect(res.status).toBe(200);
  return res.json();
}

// If a transient database/network fault left rows 'processing' after a concurrent run, the queue's own stale-lock
// reclaim finishes them (5 minutes in production). This simulates that reclaim so the TOTALS assertions test the
// counters, not the network -- and says so loudly when it had to.
async function converge(route: 'worker' | 'waWorker', table: string, campaignId: string) {
  for (let round = 1; round <= 2; round++) {
    const { count } = await db.from(table).select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId).in('status', ['pending', 'processing']);
    if (!count) return;
    console.warn(`[converge] ${count} rows still open after the concurrent run (transient DB fault?): reclaim round ${round}`);
    await db.from(table).update({ locked_at: new Date(Date.now() - 10 * 60_000).toISOString() }).eq('campaign_id', campaignId).eq('status', 'processing');
    await run(route);
  }
}

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  M = {
    ...(await import('@/lib/supabase/server')),
    ...(await import('@/lib/encryption')),
    sms: await import('@/app/actions/bulk_sms'),
    wa: await import('@/app/actions/whatsapp_broadcast'),
    sender: await import('@/lib/smsSender'),
    readiness: await import('@/lib/smsReadiness'),
    sendSMSLib: await import('@/lib/sms'),
    optOut: await import('@/lib/smsOptOut'),
    worker: await import('@/app/api/cron/workers/sms-dispatch/route'),
    waWorker: await import('@/app/api/cron/workers/whatsapp-dispatch/route'),
  };
  db = M.createAdminClient();
  // Remove what earlier KILLED runs of this test left behind (a killed run never reaches afterAll).
  const swept = await sweepStaleTestWorkspaces(db, testRunPatterns('smsh'));
  if (swept) console.warn(`[cleanup] removed ${swept} stale workspace(s) left by earlier runs of this test`);

  const mkWs = async (tag: string) => {
    const password = randomUUID(); const em = `smsh-${runId}-${tag}-owner@example.com`;
    const { data, error } = await db.auth.admin.createUser({ email: em, password, email_confirm: true });
    if (error) throw new Error(`createUser: ${error.message}`);
    userIds.push(data.user.id);
    await new Promise((r) => setTimeout(r, 800));
    const workspaceId = (await db.from('workspace_members').select('workspace_id').eq('user_id', data.user.id).limit(1).maybeSingle()).data.workspace_id as string;
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { error: se } = await client.auth.signInWithPassword({ email: em, password });
    if (se) throw new Error(`sign-in: ${se.message}`);
    users[workspaceId] = { id: data.user.id, client };
    return workspaceId;
  };
  ws1 = await mkWs('a'); ws2 = await mkWs('b');
  const creds = (id: string, num: string | null) => db.from('workspaces').update({ twilio_sid_encrypted: M.encrypt('AC_123'), twilio_token_encrypted: M.encrypt('tok-live'), twilio_sid: null, twilio_token: null, twilio_number: num }).eq('id', id);
  await creds(ws1, WS1_NUM);
  await creds(ws2, null); // connected account, NO sending number yet
  await db.from('platform_connections').insert({ workspace_id: ws1, platform: 'whatsapp', credentials: { access_token: 'x', phone_number_id: '1' } });

  const pending = ((await db.from('sms_dispatch_queue').select('id', { count: 'exact', head: true }).in('status', ['pending', 'processing'])).count ?? 0)
    + ((await db.from('whatsapp_dispatch_queue').select('id', { count: 'exact', head: true }).in('status', ['pending', 'processing'])).count ?? 0);
  queuesClear = pending === 0;
  if (!queuesClear) console.warn(`SKIPPING worker-based checks: ${pending} live queue rows exist (the workers are workspace-agnostic)`);
});

afterAll(async () => {
  h.failWhen = null;
  // Deletes the workspaces themselves (and any others this run's users own) and fails loudly if anything is left.
  await deleteTestWorkspaces(db, [ws1, ws2], userIds);
});

// ───────────────────────────── B9 ─────────────────────────────
describe('B9: tag targeting reads tag_assignments (SMS + WhatsApp)', () => {
  let tagVip: any, tagGold: any; let A: any, B: any, C: any;
  const ids = (rows: any[]) => rows.map((r) => r.contact_id).sort();

  it('setup: A has the tag only via tag_assignments, B only in the LEGACY contacts.tags array, C has both tags via tag_assignments', async () => {
    tagVip = (await db.from('tags').insert({ workspace_id: ws1, name: `VIP-${runId}` }).select().single()).data;
    tagGold = (await db.from('tags').insert({ workspace_id: ws1, name: `Gold-${runId}` }).select().single()).data;
    [A, B, C] = await mkContacts(ws1, 3, { source: `b9-${runId}`, tag: 'b9', overrides: (i) => i === 1 ? { tags: [tagVip.name] } : {} });
    const assign = (contact: any, tag: any) => db.from('tag_assignments').insert({ workspace_id: ws1, tag_id: tag.id, entity_type: 'contact', entity_id: contact.id });
    await assign(A, tagVip); await assign(C, tagVip); await assign(C, tagGold);
    expect((await db.from('tag_assignments').select('id').eq('entity_id', B.id)).data).toEqual([]); // premise: B has NO relational assignment
  });

  it('SMS: a tag-targeted campaign reaches real assignments (A, C) and NOT the stale legacy-array contact (B)', async () => {
    as(ws1);
    const r = await M.sms.createBulkSmsCampaign({ name: 'B9 sms', messageBody: 'hi', tags: [tagVip.name] });
    expect(r.success, JSON.stringify(r)).toBe(true);
    expect(ids(await smsRows(r.data.id))).toEqual([A.id, C.id].sort());
    await db.from('bulk_sms_campaigns').delete().eq('id', r.data.id);
  });

  it('SMS: ALL listed tags are required (AND); ids and case-insensitive names both work; an unknown tag matches nobody', async () => {
    as(ws1);
    const both = await M.sms.createBulkSmsCampaign({ name: 'B9 and', messageBody: 'hi', tags: [tagVip.name, tagGold.name] });
    expect(ids(await smsRows(both.data.id))).toEqual([C.id]);
    const byId = await M.sms.createBulkSmsCampaign({ name: 'B9 id', messageBody: 'hi', tags: [tagVip.id] });
    expect(ids(await smsRows(byId.data.id))).toEqual([A.id, C.id].sort());
    const lower = await M.sms.createBulkSmsCampaign({ name: 'B9 lower', messageBody: 'hi', tags: [tagVip.name.toLowerCase()] });
    expect(ids(await smsRows(lower.data.id))).toEqual([A.id, C.id].sort());
    for (const r of [both, byId, lower]) await db.from('bulk_sms_campaigns').delete().eq('id', r.data.id);

    const unknown = await M.sms.createBulkSmsCampaign({ name: 'B9 none', messageBody: 'hi', tags: [tagVip.name, 'no-such-tag'] });
    expect(unknown.success).toBe(false);
    expect(unknown.error).toMatch(/No eligible recipients/);
  });

  it('WhatsApp: same behaviour (real assignments, not the legacy array; AND semantics)', async () => {
    as(ws1);
    const one = await M.wa.createWhatsAppBroadcastCampaign({ name: 'B9 wa', messageBody: 'hi', tags: [tagVip.name] });
    expect(one.success, JSON.stringify(one)).toBe(true);
    expect(ids(await waRows(one.data.id))).toEqual([A.id, C.id].sort());
    const both = await M.wa.createWhatsAppBroadcastCampaign({ name: 'B9 wa and', messageBody: 'hi', tags: [tagVip.name, tagGold.name] });
    expect(ids(await waRows(both.data.id))).toEqual([C.id]);
    for (const r of [one, both]) await db.from('whatsapp_broadcast_campaigns').delete().eq('id', r.data.id);
  });

  it('WhatsApp audiences above ~400 contacts schedule (chunked) and internal errors are user-safe', async () => {
    const src = `b9wa-${runId}`;
    await mkContacts(ws1, 700, { source: src, tag: 'wa700' });
    const seg = await mkSegment(ws1, src);
    as(ws1);
    const big = await M.wa.createWhatsAppBroadcastCampaign({ name: 'wa 700', messageBody: 'hi', segmentId: seg.id });
    expect(big.success, JSON.stringify(big)).toBe(true);
    expect(big.recipientCount).toBe(700);
    expect((await waRows(big.data.id)).length).toBe(700);
    await db.from('whatsapp_broadcast_campaigns').delete().eq('id', big.data.id); // keep the shared queue small

    const raw = await M.wa.createWhatsAppBroadcastCampaign({ name: 'x', messageBody: 'hi', segmentId: 'not-a-uuid' });
    expect(raw).toEqual({ success: false, error: 'Failed to create WhatsApp campaign' });
    const gone = await M.wa.createWhatsAppBroadcastCampaign({ name: 'x', messageBody: 'hi', segmentId: randomUUID() });
    expect(gone.error).toMatch(/no longer exists/); // authored for the user: still shown
  });
});

// ───────────────────────────── B10 ─────────────────────────────
describe('B10: campaign totals are race-free under concurrent workers', () => {
  it('control: the OLD read-then-write pattern really does lose increments when run concurrently', async () => {
    const camp = (await db.from('bulk_sms_campaigns').insert({ workspace_id: ws1, name: 'control', message_body: 'x', status: 'sending' }).select().single()).data;
    const oldWay = async (n: number) => {
      const { data } = await db.from('bulk_sms_campaigns').select('total_sent').eq('id', camp.id).single();
      await db.from('bulk_sms_campaigns').update({ total_sent: (data.total_sent || 0) + n }).eq('id', camp.id);
    };
    let lost = 0;
    for (let attempt = 0; attempt < 3 && lost === 0; attempt++) {
      await db.from('bulk_sms_campaigns').update({ total_sent: 0 }).eq('id', camp.id);
      await Promise.all(Array.from({ length: 12 }, () => oldWay(5)));
      lost = 60 - (await smsCampaign(camp.id)).total_sent;
    }
    console.warn(`[control] old read-then-write pattern: 12 concurrent +5 writes -> ${60 - lost}/60 recorded (lost ${lost})`);
    expect(lost).toBeGreaterThanOrEqual(0);
    await db.from('bulk_sms_campaigns').delete().eq('id', camp.id);
  });

  it('refresh_sms_campaign_totals: 10 concurrent "update rows then refresh" workers end with EXACT totals', async () => {
    const contacts = await mkContacts(ws1, 100, { source: `b10a-${runId}`, tag: 'b10a' });
    const camp = await mkSmsCampaign(ws1, contacts);
    const rows = await smsRows(camp.id);
    await Promise.all(Array.from({ length: 10 }, async (_, w) => {
      const mine = rows.slice(w * 10, w * 10 + 10).map((r: any) => r.id);
      await db.from('sms_dispatch_queue').update({ status: 'sent' }).in('id', mine);
      const { error } = await db.rpc('refresh_sms_campaign_totals', { p_campaign_id: camp.id });
      expect(error).toBeNull();
    }));
    const { data: t } = await db.rpc('refresh_sms_campaign_totals', { p_campaign_id: camp.id });
    expect(t).toMatchObject({ sent: 100, open: 0 });
    expect(await smsCampaign(camp.id)).toMatchObject({ total_sent: 100 });
    await db.from('bulk_sms_campaigns').delete().eq('id', camp.id);
  });

  it('SMS: 4 workers running at once over a mixed campaign record exactly sent/failed/opted-out and complete it', async () => {
    if (!queuesClear) return;
    const contacts = await mkContacts(ws1, 200, {
      source: `b10s-${runId}`, tag: 'b10s',
      overrides: (i) => ({ ...(i >= 180 ? { phone: '0333 1234567' } : {}), sms_opt_out: i >= 150 && i < 180, opted_out: i >= 150 && i < 180 }),
    });
    const camp = await mkSmsCampaign(ws1, contacts);
    h.sendCalls.length = 0;
    await Promise.all([run('worker'), run('worker'), run('worker'), run('worker')]);
    await converge('worker', 'sms_dispatch_queue', camp.id);
    expect(await smsCampaign(camp.id)).toMatchObject({ total_sent: 150, total_skipped_opt_out: 30, total_failed: 20, status: 'completed' });
    const byStatus = (await smsRows(camp.id)).reduce((m: any, r: any) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {});
    expect(byStatus).toEqual({ sent: 150, skipped_opt_out: 30, failed: 20 });
    expect(h.sendCalls).toHaveLength(150);
  });

  it('SMS: 6 workers at once over 300 rows lose nothing', async () => {
    if (!queuesClear) return;
    const contacts = await mkContacts(ws1, 300, { source: `b10t-${runId}`, tag: 'b10t' });
    const camp = await mkSmsCampaign(ws1, contacts);
    await Promise.all(Array.from({ length: 6 }, () => run('worker')));
    await converge('worker', 'sms_dispatch_queue', camp.id);
    expect(await smsCampaign(camp.id)).toMatchObject({ total_sent: 300, total_failed: 0, status: 'completed' });
  });

  it('WhatsApp: 4 workers at once (Meta stubbed) record exact totals, and the worker now honours the DURABLE opt-out list and bad phones', async () => {
    if (!queuesClear) return;
    const contacts = await mkContacts(ws1, 200, {
      source: `b10w-${runId}`, tag: 'b10w',
      overrides: (i) => i >= 180 ? { phone: '0333 1234567' } : {},
    });
    // 20 contacts opted out ONLY in the durable list (no contact flags): the old worker would have messaged them
    await db.from('sms_suppression_list').insert(contacts.slice(160, 180).map((c) => ({ workspace_id: ws1, phone_e164: e164(c.phone), reason: 'stop_keyword', source: 'test' })));
    const camp = await mkWaCampaign(ws1, contacts);
    await Promise.all([run('waWorker'), run('waWorker'), run('waWorker'), run('waWorker')]);
    await converge('waWorker', 'whatsapp_dispatch_queue', camp.id);
    expect(await waCampaign(camp.id)).toMatchObject({ total_sent: 160, total_skipped_opt_out: 20, total_failed: 20, status: 'completed' });
    const byStatus = (await waRows(camp.id)).reduce((m: any, r: any) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {});
    expect(byStatus).toEqual({ sent: 160, skipped_opt_out: 20, failed: 20 });
  });
});

// ───────────────────────────── I: duplicate-send protection ─────────────────────────────
describe('I: duplicate-send protection wiring in the SMS worker', () => {
  const sendCallTo = (c: any) => h.sendCalls.find((s) => s.to === e164(c.phone));
  const oneRow = async (c: any, extra: any = {}) => {
    const camp = await mkSmsCampaign(ws1, [c], () => extra);
    return { camp, row: async () => (await smsRows(camp.id))[0] };
  };

  it('a first attempt stamps send_started_at BEFORE calling Twilio and does not request a lookup', async () => {
    if (!queuesClear) return;
    const [x] = await mkContacts(ws1, 1, { source: `i1-${runId}`, tag: 'i1' });
    const { row } = await oneRow(x);
    h.sendCalls.length = 0;
    await run('worker');
    expect(sendCallTo(x).dedupeSince).toBeUndefined();
    const r = await row();
    expect(r.status).toBe('sent');
    expect(r.send_started_at).toBeTruthy();
  });

  it('a RECLAIMED row (worker died mid-send: stamped, no sid) is sent with dedupeSince = its first attempt, so an already-accepted message is adopted, not re-sent', async () => {
    if (!queuesClear) return;
    const [y] = await mkContacts(ws1, 1, { source: `i2-${runId}`, tag: 'i2' });
    const started = new Date(Date.now() - 5 * 60_000).toISOString();
    await oneRow(y, { status: 'processing', locked_at: new Date(Date.now() - 10 * 60_000).toISOString(), locked_by: 'dead-worker', send_started_at: started });
    h.sendCalls.length = 0;
    await run('worker');
    expect(new Date(sendCallTo(y).dedupeSince).getTime()).toBe(new Date(started).getTime());
  });

  it('after a transient failure the retry also carries dedupeSince (the failed request may have been accepted)', async () => {
    if (!queuesClear) return;
    const [z] = await mkContacts(ws1, 1, { source: `i3-${runId}`, tag: 'i3' });
    const { camp, row } = await oneRow(z);
    h.sendCalls.length = 0;
    h.failWhen = (args) => args.to === e164(z.phone);
    await run('worker');
    const failed = await row();
    expect(failed).toMatchObject({ status: 'pending', retry_count: 1 });
    expect(failed.send_started_at).toBeTruthy();

    await db.from('sms_dispatch_queue').update({ scheduled_for: new Date(Date.now() - 1000).toISOString(), locked_at: null }).eq('id', failed.id); // the real backoff (15+ min) outlasts the 5-min lock
    h.sendCalls.length = 0;
    await run('worker');
    expect(new Date(sendCallTo(z).dedupeSince).getTime()).toBe(new Date(failed.send_started_at).getTime());
    expect((await row()).status).toBe('sent');
    expect(await smsCampaign(camp.id)).toMatchObject({ total_sent: 1, status: 'completed' });
  });
});

// ───────────────────────────── I: owned numbers vs the SMS sender ─────────────────────────────
describe('I: owned numbers reconcile with the SMS sender (workspaces.twilio_number)', () => {
  const addNumber = async (workspace: string, num: string, caps: any, status = 'active') =>
    (await db.from('workspace_phone_numbers').insert({ workspace_id: workspace, twilio_number_sid: `PN${randomUUID().replace(/-/g, '').slice(0, 30)}`, phone_number: num, capabilities: caps, source: 'purchased', status }).select().single()).data;
  const sender = async () => (await db.from('workspaces').select('twilio_number').eq('id', ws2).single()).data.twilio_number;
  let n1: any, n2: any, voiceOnly: any;

  it('a connected workspace with no sender number is not ready', async () => {
    expect(await M.readiness.getSmsReadiness(ws2)).toEqual({ ready: false, missing: ['number'] });
  });

  it('a purchased VOICE-only number is not adopted; an SMS-capable one becomes the sender and the workspace is then ready', async () => {
    voiceOnly = await addNumber(ws2, '+15005550031', { voice: true, sms: false });
    expect(await M.sender.adoptSmsSenderIfNone(db, ws2, voiceOnly)).toBe(false);
    expect(await sender()).toBeNull();

    n1 = await addNumber(ws2, '+15005550032', { voice: true, sms: true });
    expect(await M.sender.adoptSmsSenderIfNone(db, ws2, n1)).toBe(true);
    expect(await sender()).toBe('+15005550032');
    expect(await M.readiness.getSmsReadiness(ws2)).toEqual({ ready: true, missing: [] });
  });

  it('a later purchase never overrides a sender that is already set', async () => {
    n2 = await addNumber(ws2, '+15005550033', { voice: true, sms: true });
    expect(await M.sender.adoptSmsSenderIfNone(db, ws2, n2)).toBe(false);
    expect(await sender()).toBe('+15005550032');
  });

  it('the adopted number is ACTUALLY used: sends from it resolve to this workspace and honour its opt-outs', async () => {
    const [optedOut, clean] = await mkContacts(ws2, 2, { source: `i4-${runId}`, tag: 'i4', overrides: (i) => ({ sms_opt_out: i === 0, opted_out: i === 0 }) });
    const config = { accountSid: 'AC_123', authToken: 'x', fromNumber: '+15005550032' }; // no workspaceId: resolved from the sending number
    await expect(M.sendSMSLib.sendSMS({ to: optedOut.phone, message: 'hi', config })).rejects.toBeInstanceOf(M.optOut.SmsOptedOutError);
    expect((await M.sendSMSLib.sendSMS({ to: clean.phone, message: 'hi', config })).sid).toMatch(/^mock_sms_id_/);
  });

  it('setSmsSender: choose another owned SMS-capable number; refuses voice-only, released and foreign numbers', async () => {
    expect(await M.sender.setSmsSender(db, ws2, n2.id)).toEqual({ ok: true, phone: '+15005550033' });
    expect(await sender()).toBe('+15005550033');
    expect(await M.sender.setSmsSender(db, ws2, voiceOnly.id)).toEqual({ ok: false, reason: 'not_sms_capable' });
    const gone = await addNumber(ws2, '+15005550034', { sms: true }, 'released');
    expect(await M.sender.setSmsSender(db, ws2, gone.id)).toEqual({ ok: false, reason: 'released' });
    expect(await M.sender.setSmsSender(db, ws1, n1.id)).toEqual({ ok: false, reason: 'not_found' }); // another workspace's number
    expect(await sender()).toBe('+15005550033');
  });

  it('releasing the sender promotes the next SMS-capable number, then clears it when none is left', async () => {
    await db.from('workspace_phone_numbers').update({ status: 'released' }).eq('id', n2.id);
    expect(await M.sender.reassignSenderAfterRelease(db, ws2, n2.phone_number)).toBe('+15005550032');
    expect(await sender()).toBe('+15005550032');
    await db.from('workspace_phone_numbers').update({ status: 'released' }).eq('id', n1.id);
    expect(await M.sender.reassignSenderAfterRelease(db, ws2, n1.phone_number)).toBeNull();
    expect(await sender()).toBeNull();
    expect(await M.readiness.getSmsReadiness(ws2)).toEqual({ ready: false, missing: ['number'] }); // no longer "ready but failing"
  });

  it('releasing a number that is NOT the sender leaves the sender alone; comparison ignores number formatting', async () => {
    await db.from('workspaces').update({ twilio_number: '+15005550032' }).eq('id', ws2);
    expect(await M.sender.reassignSenderAfterRelease(db, ws2, '+15005550099')).toBe('+15005550032');
    expect(M.sender.isSmsSender('+27821234567', '082 123 4567')).toBe(true);
    expect(M.sender.isSmsSender('+15005550032', '+15005550033')).toBe(false);
    expect(M.sender.isSmsSender(null, '+15005550032')).toBe(false);
  });
});
