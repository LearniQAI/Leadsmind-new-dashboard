// Live verification: Bulk SMS correctness + reliability (C merge tags, D large audiences, E Twilio
// pre-flight, F campaign status/cancel, G delivery receipts). Real server actions under real users,
// real dispatch worker route, real signed Twilio status callbacks, real database, throwaway
// workspaces. No message is sent: Twilio sends use the library's explicit AC_123 dev-mock mode.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const h = vi.hoisted(() => ({
  workspaceId: '', userId: '', userClient: null as any,
  sendCalls: [] as any[],
  afterSend: null as null | ((args: any) => Promise<void>),
}));
vi.mock('@/lib/auth', async (orig) => {
  const actual = await orig<any>();
  return { ...actual, getCurrentWorkspaceId: async () => h.workspaceId, requireWorkspaceAccess: async () => ({ workspaceId: h.workspaceId, userId: h.userId, role: 'owner' }), requireAuth: async () => ({}) };
});
vi.mock('@/lib/supabase/server', async (orig) => {
  const actual = await orig<any>();
  return { ...actual, createServerClient: async () => h.userClient };
});
// Pass-through wrapper: records exactly what the worker hands to sendSMS, and lets a test act between sends.
vi.mock('@/lib/sms', async (orig) => {
  const actual = await orig<any>();
  return {
    ...actual,
    sendSMS: async (args: any) => {
      h.sendCalls.push(args);
      const r = await actual.sendSMS(args);
      if (h.afterSend) await h.afterSend(args);
      return r;
    },
  };
});
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('next/navigation', () => ({ redirect: () => {} }));

process.env.NEXT_PUBLIC_APP_URL = 'https://app.test';
process.env.CRON_SECRET = 'live-cron-secret';
process.env.TWILIO_AUTH_TOKEN = 'platform-live-token';

const STATUS_URL = 'https://app.test/api/webhooks/twilio/sms-status';
const WS1_NUM = '+15005550011'; const WS2_NUM = '+15005550012';
const WS1_TOKEN = 'token-ws1-secret'; const WS2_TOKEN = 'token-ws2-secret';

let db: any, M: any, ws1 = '', ws2 = '';
const users: Record<string, { id: string; client: any }> = {};
const userIds: string[] = [];
const runId = randomUUID().slice(0, 8);
let phoneSeq = 0;
let queueClear = true;

const as = (w: string) => { h.workspaceId = w; h.userId = users[w].id; h.userClient = users[w].client; };
const phone = (prefix = '0825') => `${prefix}${String(100000 + phoneSeq++)}`; // 10 digits, valid ZA local
const e164 = (local: string) => `+27${local.slice(1)}`;

async function mkContacts(workspace: string, n: number, opts: { source: string; tag: string; overrides?: (i: number) => any }) {
  const rows = Array.from({ length: n }, (_, i) => ({
    workspace_id: workspace, email: `smsr-${runId}-${opts.tag}-${i}@example.com`, first_name: `F${i}`, last_name: 'V',
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
const campaignRow = async (id: string) => (await db.from('bulk_sms_campaigns').select('*').eq('id', id).single()).data;
const queueRows = async (id: string) => (await db.from('sms_dispatch_queue').select('*').eq('campaign_id', id)).data ?? [];

async function runWorker() {
  const { NextRequest } = await import('next/server');
  const res = await M.worker.GET(new NextRequest('https://app.test/api/cron/workers/sms-dispatch', { headers: { Authorization: 'Bearer live-cron-secret' } }));
  expect(res.status).toBe(200);
  return res.json();
}
// Insert a campaign + queue rows directly (for scenarios that need exact row states).
async function mkCampaign(workspace: string, contacts: any[], rowState: (c: any, i: number) => any = () => ({}), body = 'hello') {
  const camp = (await db.from('bulk_sms_campaigns').insert({ workspace_id: workspace, name: `live-${randomUUID().slice(0, 6)}`, message_body: body, status: 'scheduled', total_recipients: contacts.length, scheduled_at: new Date().toISOString() }).select().single()).data;
  await db.from('sms_dispatch_queue').insert(contacts.map((c, i) => ({ campaign_id: camp.id, workspace_id: workspace, contact_id: c.id, status: 'pending', scheduled_for: new Date(Date.now() - 1000).toISOString(), ...rowState(c, i) })));
  return camp;
}

async function postStatus(o: { from: string; sid: string; status: string; to?: string; code?: string; token?: string | null; accountSid?: string }) {
  const twilio = (await import('twilio')).default as any;
  const params: Record<string, string> = { MessageSid: o.sid, MessageStatus: o.status, From: o.from, To: o.to ?? '+27825550000', AccountSid: o.accountSid ?? 'AC_123', ...(o.code ? { ErrorCode: o.code } : {}) };
  const headers: Record<string, string> = { 'content-type': 'application/x-www-form-urlencoded' };
  if (o.token !== null) headers['X-Twilio-Signature'] = twilio.getExpectedTwilioSignature(o.token ?? WS1_TOKEN, STATUS_URL, params);
  const { NextRequest } = await import('next/server');
  return (await M.statusRoute.POST(new NextRequest(STATUS_URL, { method: 'POST', headers, body: new URLSearchParams(params).toString() }))).status as number;
}

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  M = {
    ...(await import('@/lib/supabase/server')),
    ...(await import('@/lib/encryption')),
    sms: await import('@/app/actions/bulk_sms'),
    readiness: await import('@/lib/smsReadiness'),
    worker: await import('@/app/api/cron/workers/sms-dispatch/route'),
    statusRoute: await import('@/app/api/webhooks/twilio/sms-status/route'),
  };
  db = M.createAdminClient();
  // Remove what earlier KILLED runs of this test left behind (a killed run never reaches afterAll).
  const swept = await sweepStaleTestWorkspaces(db, testRunPatterns('smsr'));
  if (swept) console.warn(`[cleanup] removed ${swept} stale workspace(s) left by earlier runs of this test`);

  const mkWs = async (tag: string) => {
    const password = randomUUID(); const em = `smsr-${runId}-${tag}-owner@example.com`;
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
  // ws1 is a fully connected workspace; ws2 has NO Twilio configuration at all.
  await db.from('workspaces').update({ twilio_sid_encrypted: M.encrypt('AC_123'), twilio_token_encrypted: M.encrypt(WS1_TOKEN), twilio_sid: null, twilio_token: null, twilio_number: WS1_NUM }).eq('id', ws1);

  const pending = (await db.from('sms_dispatch_queue').select('id', { count: 'exact', head: true }).in('status', ['pending', 'processing'])).count ?? 0;
  queueClear = pending === 0;
  if (!queueClear) console.warn(`SKIPPING worker-based checks: ${pending} live SMS queue rows exist (the worker is workspace-agnostic)`);
});

afterAll(async () => {
  h.afterSend = null;
  await db.from('webhook_dead_letters').delete().eq('provider', 'twilio_sms_status').like('payload->>MessageSid', 'SMLIVE%');
  // Deletes the workspaces themselves (and any others this run's users own) and fails loudly if anything is left.
  await deleteTestWorkspaces(db, [ws1, ws2], userIds);
});

describe('C: merge tags are resolved per recipient', () => {
  it('sends "Hi Ada Lovelace from Analytical Co", never a literal {{first_name}}', async () => {
    if (!queueClear) return;
    const src = `c-${runId}`;
    const [a, b] = await mkContacts(ws1, 2, { source: src, tag: 'c', overrides: (i) => i === 0 ? { first_name: 'Ada', last_name: 'Lovelace', company: 'Analytical Co' } : { first_name: '', last_name: 'V', company: null } });
    const seg = await mkSegment(ws1, src);
    as(ws1);
    const created = await M.sms.createBulkSmsCampaign({ name: 'C test', messageBody: 'Hi {{first_name}} {{last_name}} from {{company}}{{unknown_tag}}!', segmentId: seg.id });
    expect(created.success, JSON.stringify(created)).toBe(true);
    expect(created.recipientCount).toBe(2);

    h.sendCalls.length = 0;
    await runWorker();
    const byTo = (c: any) => h.sendCalls.find((s) => s.to === e164(c.phone));
    expect(byTo(a).message).toBe('Hi Ada Lovelace from Analytical Co!');
    expect(byTo(b).message).toBe('Hi Valued Customer V from your company!');
    for (const s of h.sendCalls) expect(s.message).not.toContain('{{');
    // G wiring: the worker asks Twilio for delivery receipts at the sms-status URL
    expect(byTo(a).statusCallback).toBe(STATUS_URL);
    expect(byTo(a).workspaceId).toBe(ws1);
    expect((await campaignRow(created.data.id))).toMatchObject({ status: 'completed', total_sent: 2 });
  });
});

describe('D: audiences above ~300 contacts schedule; errors are user-safe', () => {
  it('a 700-contact audience is accepted, chunked (the old single .in() request failed at ~400 ids)', async () => {
    const src = `d-${runId}`;
    const contacts = await mkContacts(ws1, 700, { source: src, tag: 'd' });
    const seg = await mkSegment(ws1, src);

    // Control: the OLD shape (every id in one URL) still fails against the live API -- that is the failure being fixed.
    const control = await db.from('contacts').select('id').in('id', contacts.map((c) => c.id));
    expect(control.error, 'a 700-id .in() must still be rejected, proving the limit is real').toBeTruthy();

    as(ws1);
    const r = await M.sms.createBulkSmsCampaign({ name: 'D test', messageBody: 'hi', segmentId: seg.id });
    expect(r.success, JSON.stringify(r)).toBe(true);
    expect(r.recipientCount).toBe(700);
    expect((await queueRows(r.data.id)).length).toBe(700);
    expect((await campaignRow(r.data.id)).total_recipients).toBe(700);

    // remove it now so the shared worker never has to chew through 700 rows in later tests
    await db.from('bulk_sms_campaigns').delete().eq('id', r.data.id);
  });

  it('user-authored errors reach the user; internal (DB/driver) errors are replaced by a generic message', async () => {
    as(ws1);
    const raw = await M.sms.createBulkSmsCampaign({ name: 'x', messageBody: 'hi', segmentId: 'not-a-uuid' }); // Postgres: invalid input syntax for type uuid
    expect(raw.success).toBe(false);
    expect(raw.error).toBe('Failed to create SMS campaign');
    expect(raw.error).not.toMatch(/uuid|syntax|invalid input/i);

    const gone = await M.sms.createBulkSmsCampaign({ name: 'x', messageBody: 'hi', segmentId: randomUUID() });
    expect(gone.error).toMatch(/no longer exists/);
    const badRule = await M.sms.createBulkSmsCampaign({ name: 'x', messageBody: 'hi', ruleGroup: { logic: 'AND', rules: [{ field: 'nope', operator: 'equals', value: 'x' }] } });
    expect(badRule.success).toBe(false);
    expect(badRule.error).not.toBe('Failed to create SMS campaign'); // the validation message is authored for the user

    const tooLong = await M.sms.createBulkSmsCampaign({ name: 'x', messageBody: 'a'.repeat(321), segmentId: randomUUID() });
    expect(tooLong.error).toMatch(/too long/);
  });
});

describe('E: Twilio pre-flight', () => {
  it('a workspace with no Twilio setup is refused upfront: clear error, nothing scheduled', async () => {
    const src = `e-${runId}`;
    await mkContacts(ws2, 2, { source: src, tag: 'e2' });
    const seg = await mkSegment(ws2, src);
    expect((await M.readiness.getSmsReadiness(ws2))).toEqual({ ready: false, missing: ['account', 'number'] });

    as(ws2);
    const r = await M.sms.createBulkSmsCampaign({ name: 'E', messageBody: 'hi', segmentId: seg.id });
    expect(r).toEqual({ success: false, error: M.readiness.SMS_NOT_CONFIGURED_MESSAGE });
    expect((await db.from('bulk_sms_campaigns').select('id').eq('workspace_id', ws2)).data).toEqual([]);
    expect((await db.from('sms_dispatch_queue').select('id').eq('workspace_id', ws2)).data).toEqual([]);

    // account saved but no sending number: still not ready
    await db.from('workspaces').update({ twilio_sid_encrypted: M.encrypt('AC_222'), twilio_token_encrypted: M.encrypt(WS2_TOKEN) }).eq('id', ws2);
    expect((await M.readiness.getSmsReadiness(ws2))).toEqual({ ready: false, missing: ['number'] });
    expect((await M.sms.createBulkSmsCampaign({ name: 'E', messageBody: 'hi', segmentId: seg.id })).error).toBe(M.readiness.SMS_NOT_CONFIGURED_MESSAGE);

    // a fully connected workspace is ready
    await db.from('workspaces').update({ twilio_number: WS2_NUM }).eq('id', ws2);
    expect((await M.readiness.getSmsReadiness(ws2)).ready).toBe(true);
    expect((await M.readiness.getSmsReadiness(ws1)).ready).toBe(true);
  });

  it('if Twilio is removed AFTER scheduling, rows fail permanently at once (no 3x retry over ~75 minutes)', async () => {
    if (!queueClear) return;
    const contacts = await mkContacts(ws1, 2, { source: `e1-${runId}`, tag: 'e1' });
    const camp = await mkCampaign(ws1, contacts);
    await db.from('workspaces').update({ twilio_sid_encrypted: null, twilio_token_encrypted: null }).eq('id', ws1);
    try {
      await runWorker();
    } finally {
      await db.from('workspaces').update({ twilio_sid_encrypted: M.encrypt('AC_123'), twilio_token_encrypted: M.encrypt(WS1_TOKEN) }).eq('id', ws1);
    }
    for (const row of await queueRows(camp.id)) {
      expect(row.status).toBe('failed');
      expect(row.error_log).toBe('Twilio is not configured for this workspace');
      expect(row.retry_count).toBe(0);
    }
    expect((await campaignRow(camp.id)).status).toBe('failed');
  });
});

describe('F: campaign status reflects reality', () => {
  it('a campaign is "sending" while rows remain (and cannot be deleted then), and "completed" once all are done', async () => {
    if (!queueClear) return;
    const src = `f1-${runId}`;
    await mkContacts(ws1, 55, { source: src, tag: 'f1' });
    const seg = await mkSegment(ws1, src);
    as(ws1);
    const r = await M.sms.createBulkSmsCampaign({ name: 'F1', messageBody: 'hi', segmentId: seg.id });
    expect(r.success).toBe(true);
    expect((await campaignRow(r.data.id)).status).toBe('scheduled');

    await runWorker(); // claims 50 of 55
    const mid = await campaignRow(r.data.id);
    expect(mid.status).toBe('sending');
    expect(mid.total_sent).toBe(50);
    const del = await M.sms.deleteBulkSmsCampaign(r.data.id);
    expect(del).toEqual({ success: false, error: 'Cannot delete a campaign that is currently sending' });

    await runWorker(); // the remaining 5
    expect(await campaignRow(r.data.id)).toMatchObject({ status: 'completed', total_sent: 55, total_failed: 0 });
  });

  it('every send failing is "failed", not "completed"; a partial success stays "completed"', async () => {
    if (!queueClear) return;
    const bad1 = await mkContacts(ws1, 2, { source: `f2-${runId}`, tag: 'f2', overrides: () => ({ phone: '0333 1234567' }) }); // cannot be normalised
    const allBad = await mkCampaign(ws1, bad1);
    const mixedContacts = [
      ...(await mkContacts(ws1, 1, { source: `f3-${runId}`, tag: 'f3ok' })),
      ...(await mkContacts(ws1, 1, { source: `f3-${runId}`, tag: 'f3bad', overrides: () => ({ phone: '0333 7654321' }) })),
    ];
    const mixed = await mkCampaign(ws1, mixedContacts);
    await runWorker();
    expect(await campaignRow(allBad.id)).toMatchObject({ status: 'failed', total_sent: 0, total_failed: 2 });
    expect(await campaignRow(mixed.id)).toMatchObject({ status: 'completed', total_sent: 1, total_failed: 1 });
  });

  it('cancel stops rows already CLAIMED by a worker (processing), not just queued ones', async () => {
    if (!queueClear) return;
    const contacts = await mkContacts(ws1, 5, { source: `f4-${runId}`, tag: 'f4' });
    const camp = await mkCampaign(ws1, contacts, (_c, i) => i < 3
      ? { status: 'processing', locked_at: new Date().toISOString(), locked_by: 'another-worker' } // claimed, mid-flight
      : {});
    await db.from('bulk_sms_campaigns').update({ status: 'sending' }).eq('id', camp.id);
    as(ws1);
    expect((await M.sms.cancelBulkSmsCampaign(camp.id)).success).toBe(true);
    const rows = await queueRows(camp.id);
    expect(rows.map((r: any) => r.status).sort()).toEqual(['cancelled', 'cancelled', 'cancelled', 'cancelled', 'cancelled']);
    expect(rows.some((r: any) => r.status === 'failed')).toBe(false); // a cancel is not a send failure
    expect((await campaignRow(camp.id)).status).toBe('cancelled');
    h.sendCalls.length = 0;
    await runWorker();
    expect(h.sendCalls).toHaveLength(0);
  });

  it('a cancel arriving MID-BATCH stops the rows the worker has claimed but not yet sent', async () => {
    if (!queueClear) return;
    const contacts = await mkContacts(ws1, 6, { source: `f5-${runId}`, tag: 'f5' });
    const camp = await mkCampaign(ws1, contacts);
    const phones = new Set(contacts.map((c) => e164(c.phone)));
    let sends = 0;
    h.afterSend = async (args) => {
      if (!phones.has(args.to)) return;
      if (++sends === 2) await db.from('bulk_sms_campaigns').update({ status: 'cancelled' }).eq('id', camp.id); // the user hits Cancel now
    };
    try { await runWorker(); } finally { h.afterSend = null; }

    const statuses = (await queueRows(camp.id)).map((r: any) => r.status).sort();
    expect(statuses).toEqual(['cancelled', 'cancelled', 'cancelled', 'cancelled', 'sent', 'sent']);
    const after = await campaignRow(camp.id);
    expect(after.status).toBe('cancelled'); // NOT resurrected to "completed"
    expect(after.total_sent).toBe(2);
  });
});

describe('G: delivery receipts through the real, signed status webhook', () => {
  let camp: any; let sids: string[] = []; let contacts: any[] = [];

  it('setup: a campaign whose messages Twilio has accepted', async () => {
    contacts = await mkContacts(ws1, 5, { source: `g-${runId}`, tag: 'g' });
    sids = contacts.map((_c, i) => `SMLIVEg${runId}${i}`);
    camp = await mkCampaign(ws1, contacts, (_c, i) => ({ status: 'sent', twilio_sid: sids[i] }));
    await db.from('bulk_sms_campaigns').update({ status: 'completed', total_sent: 5 }).eq('id', camp.id);
    expect((await campaignRow(camp.id))).toMatchObject({ total_delivered: 0, total_undelivered: 0 });
  });

  const row = async (i: number) => (await db.from('sms_dispatch_queue').select('*').eq('twilio_sid', sids[i]).single()).data;

  it('sent -> delivered updates the row and counts once; duplicates and late older statuses are ignored', async () => {
    expect(await postStatus({ from: WS1_NUM, sid: sids[0], status: 'sent' })).toBe(204);
    expect((await row(0)).delivery_status).toBe('sent');
    expect((await campaignRow(camp.id)).total_delivered).toBe(0);

    expect(await postStatus({ from: WS1_NUM, sid: sids[0], status: 'delivered' })).toBe(204);
    expect((await row(0)).delivery_status).toBe('delivered');
    expect((await campaignRow(camp.id)).total_delivered).toBe(1);

    await postStatus({ from: WS1_NUM, sid: sids[0], status: 'delivered' }); // Twilio retry
    await postStatus({ from: WS1_NUM, sid: sids[0], status: 'sent' });      // arrives late, out of order
    expect((await row(0)).delivery_status).toBe('delivered');
    expect((await campaignRow(camp.id)).total_delivered).toBe(1);

    await postStatus({ from: WS1_NUM, sid: sids[1], status: 'delivered' }); // delivered arrives BEFORE sent
    await postStatus({ from: WS1_NUM, sid: sids[1], status: 'sent' });
    expect((await row(1)).delivery_status).toBe('delivered');
    expect((await campaignRow(camp.id)).total_delivered).toBe(2);
  });

  it('undelivered is visible (status, Twilio error code, message) and terminal', async () => {
    expect(await postStatus({ from: WS1_NUM, sid: sids[2], status: 'undelivered', code: '30003' })).toBe(204);
    const r = await row(2);
    expect(r).toMatchObject({ delivery_status: 'undelivered', delivery_error_code: '30003' });
    expect(r.error_log).toMatch(/Not delivered \(Twilio undelivered, error 30003\)/);
    const c = await campaignRow(camp.id);
    expect(c).toMatchObject({ total_delivered: 2, total_undelivered: 1 });
    await postStatus({ from: WS1_NUM, sid: sids[2], status: 'delivered' }); // a terminal status is final
    expect((await row(2)).delivery_status).toBe('undelivered');
    expect((await campaignRow(camp.id)).total_delivered).toBe(2);
  });

  it('concurrent identical callbacks are counted exactly once', async () => {
    const codes = await Promise.all(Array.from({ length: 6 }, () => postStatus({ from: WS1_NUM, sid: sids[3], status: 'delivered' })));
    expect(codes.every((c) => c === 204)).toBe(true);
    expect((await row(3)).delivery_status).toBe('delivered');
    expect((await campaignRow(camp.id)).total_delivered).toBe(3); // 2 + exactly one more
  });

  it('forged / wrongly-signed callbacks are rejected (403) and change nothing; another workspace cannot touch this workspace\'s rows', async () => {
    const before = await campaignRow(camp.id);
    expect(await postStatus({ from: WS1_NUM, sid: sids[4], status: 'delivered', token: 'platform-live-token' })).toBe(403);
    expect(await postStatus({ from: WS1_NUM, sid: sids[4], status: 'delivered', token: WS2_TOKEN })).toBe(403);
    expect(await postStatus({ from: WS1_NUM, sid: sids[4], status: 'delivered', token: null })).toBe(403);
    expect(await postStatus({ from: WS1_NUM, sid: sids[4], status: 'delivered', accountSid: 'AC_999' })).toBe(403);
    // a correctly signed callback from ANOTHER workspace naming ws1's message id: accepted as a request, applied to nothing
    expect(await postStatus({ from: WS2_NUM, sid: sids[4], status: 'delivered', token: WS2_TOKEN, accountSid: 'AC_222' })).toBe(204);
    expect(await postStatus({ from: WS1_NUM, sid: sids[4], status: 'nonsense' })).toBe(204); // unknown status ignored
    expect((await row(4)).delivery_status).toBeNull();
    expect(await campaignRow(camp.id)).toMatchObject({ total_delivered: before.total_delivered, total_undelivered: before.total_undelivered });
  });

  it('a "recipient unsubscribed" failure (Twilio 21610) is treated as a STOP: durable opt-out', async () => {
    expect(await postStatus({ from: WS1_NUM, sid: sids[4], status: 'undelivered', code: '21610', to: e164(contacts[4].phone) })).toBe(204);
    const listed = (await db.from('sms_suppression_list').select('*').eq('workspace_id', ws1).eq('phone_e164', e164(contacts[4].phone))).data;
    expect(listed).toHaveLength(1);
    expect(listed[0].source).toBe('twilio_error_21610');
    expect((await db.from('contacts').select('sms_opt_out').eq('id', contacts[4].id).single()).data.sms_opt_out).toBe(true);
    expect(await campaignRow(camp.id)).toMatchObject({ total_delivered: 3, total_undelivered: 2 });
  });
});
