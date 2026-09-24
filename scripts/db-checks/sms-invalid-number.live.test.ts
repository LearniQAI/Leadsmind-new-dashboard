// Live verification: a phone number is flagged invalid after repeated permanent-shaped Twilio
// delivery failures (mirroring email's is_invalid_email bounce handling), and is then excluded from
// future sends — via the audience resolver, the central sendSMS gate, AND running SMS workflows.
// Real signed status-callback simulation (same approach already proven for STOP/delivered/undelivered
// in sms-reliability.live.test.ts), real database, throwaway workspace. No message is sent: Twilio
// sends use the library's explicit AC_123 dev-mock mode.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const h = vi.hoisted(() => ({ workspaceId: '', userId: '', userClient: null as any }));
vi.mock('@/lib/auth', async (orig) => {
  const actual = await orig<any>();
  return { ...actual, getCurrentWorkspaceId: async () => h.workspaceId, requireWorkspaceAccess: async () => ({ workspaceId: h.workspaceId, userId: h.userId, role: 'owner' }), requireAuth: async () => ({}) };
});
vi.mock('@/lib/supabase/server', async (orig) => {
  const actual = await orig<any>();
  return { ...actual, createServerClient: async () => h.userClient };
});
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('next/navigation', () => ({ redirect: () => {} }));

process.env.NEXT_PUBLIC_APP_URL = 'https://app.test';
process.env.TWILIO_AUTH_TOKEN = 'platform-live-token';

const STATUS_URL = 'https://app.test/api/webhooks/twilio/sms-status';
const WS1_NUM = '+15005550061';
const WS1_TOKEN = 'token-inv-ws1-secret';

let db: any, M: any, ws1 = '';
let userClient: any; let ownerId = '';
const userIds: string[] = [];
const runId = randomUUID().slice(0, 8);
let phoneSeq = 0;

const phone = () => `0825${String(900000 + phoneSeq++)}`; // valid ZA local number, unique
const e164 = (local: string) => `+27${local.slice(1)}`;

async function mkContact(tag: string) {
  const { data, error } = await db.from('contacts').insert({ workspace_id: ws1, email: `smsi-${runId}-${tag}@example.com`, first_name: `T${tag}`, last_name: 'V', phone: phone() }).select().single();
  if (error) throw new Error(`contact: ${error.message}`);
  return data;
}
const contactRow = async (id: string) => (await db.from('contacts').select('*').eq('id', id).single()).data;

async function postStatus(o: { sid: string; status: string; to: string; code?: string }) {
  const twilio = (await import('twilio')).default as any;
  const params: Record<string, string> = { MessageSid: o.sid, MessageStatus: o.status, From: WS1_NUM, To: o.to, AccountSid: 'AC_123', ...(o.code ? { ErrorCode: o.code } : {}) };
  const headers: Record<string, string> = { 'content-type': 'application/x-www-form-urlencoded' };
  headers['X-Twilio-Signature'] = twilio.getExpectedTwilioSignature(WS1_TOKEN, STATUS_URL, params);
  const { NextRequest } = await import('next/server');
  return (await M.statusRoute.POST(new NextRequest(STATUS_URL, { method: 'POST', headers, body: new URLSearchParams(params).toString() }))).status as number;
}

// One real, signed queue row + status callback, mirroring exactly how a bulk-sms send is tracked.
let sidSeq = 0;
async function sendAndFail(contactId: string, to: string, code: string, status: 'undelivered' | 'failed' = 'undelivered') {
  const sid = `SMLIVEi${runId}${sidSeq++}`;
  const camp = (await db.from('bulk_sms_campaigns').insert({ workspace_id: ws1, name: `inv-${randomUUID().slice(0, 6)}`, message_body: 'hi', status: 'completed', total_recipients: 1, total_sent: 1 }).select().single()).data;
  await db.from('sms_dispatch_queue').insert({ campaign_id: camp.id, workspace_id: ws1, contact_id: contactId, status: 'sent', twilio_sid: sid, scheduled_for: new Date().toISOString() });
  await postStatus({ sid, status: 'sent', to });
  const code204 = await postStatus({ sid, status, to, code });
  return { code204, campaignId: camp.id };
}
async function sendAndDeliver(contactId: string, to: string) {
  const sid = `SMLIVEi${runId}${sidSeq++}`;
  const camp = (await db.from('bulk_sms_campaigns').insert({ workspace_id: ws1, name: `inv-${randomUUID().slice(0, 6)}`, message_body: 'hi', status: 'completed', total_recipients: 1, total_sent: 1 }).select().single()).data;
  await db.from('sms_dispatch_queue').insert({ campaign_id: camp.id, workspace_id: ws1, contact_id: contactId, status: 'sent', twilio_sid: sid, scheduled_for: new Date().toISOString() });
  await postStatus({ sid, status: 'sent', to });
  return postStatus({ sid, status: 'delivered', to });
}

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  M = {
    ...(await import('@/lib/supabase/server')),
    ...(await import('@/lib/encryption')),
    ...(await import('@/lib/automation/executor')),
    sms: await import('@/app/actions/bulk_sms'),
    sendSMSLib: await import('@/lib/sms'),
    statusRoute: await import('@/app/api/webhooks/twilio/sms-status/route'),
  };
  db = M.createAdminClient();
  // Remove what earlier KILLED runs of this test left behind (a killed run never reaches afterAll).
  const swept = await sweepStaleTestWorkspaces(db, testRunPatterns('smsi'));
  if (swept) console.warn(`[cleanup] removed ${swept} stale workspace(s) left by earlier runs of this test`);

  const password = randomUUID();
  const em = `smsi-${runId}-owner@example.com`;
  const { data, error } = await db.auth.admin.createUser({ email: em, password, email_confirm: true });
  if (error) throw new Error(`createUser: ${error.message}`);
  ownerId = data.user.id; userIds.push(ownerId);
  await new Promise((r) => setTimeout(r, 800));
  ws1 = (await db.from('workspace_members').select('workspace_id').eq('user_id', ownerId).limit(1).maybeSingle()).data.workspace_id;
  h.workspaceId = ws1; h.userId = ownerId;
  await db.from('workspaces').update({ twilio_sid_encrypted: M.encrypt('AC_123'), twilio_token_encrypted: M.encrypt(WS1_TOKEN), twilio_sid: null, twilio_token: null, twilio_number: WS1_NUM }).eq('id', ws1);
  userClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { error: se } = await userClient.auth.signInWithPassword({ email: em, password });
  if (se) throw new Error(`sign-in: ${se.message}`);
  h.userClient = userClient;
});

afterAll(async () => {
  // Deletes the workspace itself (and any other this run's user owns) and fails loudly if anything is left.
  await deleteTestWorkspaces(db, [ws1], [ownerId]);
});

describe('a single permanent-shaped failure never flags invalid (Twilio hedges every one of these codes)', () => {
  it('one 30005 (unknown destination) is recorded but does not flag the number', async () => {
    const c = await mkContact('single');
    const { code204 } = await sendAndFail(c.id, e164(c.phone), '30005');
    expect(code204).toBe(204);
    const row = await contactRow(c.id);
    expect(row).toMatchObject({ sms_invalid: false, sms_soft_fail_count: 1, sms_consecutive_soft_fails: 1 });
    expect((await db.from('sms_suppression_list').select('id').eq('workspace_id', ws1).eq('phone_e164', e164(c.phone))).data).toEqual([]);
  });
});

describe('crossing the consecutive-failure threshold flags the number invalid', () => {
  it('3 consecutive 30005s (unknown destination) flag invalid, write a durable suppression row, and cancel a running SMS workflow', async () => {
    const c = await mkContact('threshold');
    const to = e164(c.phone);

    // A real SMS-drip workflow, exactly like the STOP-cancellation test — proves the "excluded from
    // future sends" claim covers workflows too, not just a fresh bulk campaign.
    const { data: wf } = await db.from('workflows').insert({ workspace_id: ws1, name: 'Invalid-number drip', trigger_type: 'contact_created', trigger_config: {}, is_active: true }).select().single();
    const stepIds: string[] = [];
    for (const s of [{ type: 'send_sms', config: { message: 'hello' } }, { type: 'wait', config: { delayValue: 1, delayUnit: 'days' } }, { type: 'send_sms', config: { message: 'later' } }]) {
      stepIds.push((await db.from('workflow_steps').insert({ workflow_id: wf.id, workspace_id: ws1, position: stepIds.length + 1, type: s.type, config: s.config }).select('id').single()).data.id);
    }
    for (let i = 0; i < stepIds.length - 1; i++) await db.from('workflow_edges').insert({ workflow_id: wf.id, workspace_id: ws1, source_step_id: stepIds[i], target_step_id: stepIds[i + 1], source_handle: 'next' });
    await M.triggerWorkflows(ws1, 'contact_created', c.id); // first send_sms sends (mock), then waits
    const runRow = async () => (await db.from('workflow_executions').select('*').eq('workflow_id', wf.id).eq('contact_id', c.id).single()).data;
    expect((await runRow()).status).toBe('running');

    await sendAndFail(c.id, to, '30005');
    expect(await contactRow(c.id)).toMatchObject({ sms_invalid: false, sms_consecutive_soft_fails: 1 });
    await sendAndFail(c.id, to, '30003'); // a DIFFERENT counted code — still accumulates toward the SAME threshold
    expect(await contactRow(c.id)).toMatchObject({ sms_invalid: false, sms_consecutive_soft_fails: 2 });
    await sendAndFail(c.id, to, '30006'); // third consecutive counted failure crosses the threshold
    const flagged = await contactRow(c.id);
    expect(flagged).toMatchObject({ sms_invalid: true, sms_soft_fail_count: 3, sms_consecutive_soft_fails: 3 });
    expect(flagged.sms_invalid_at).toBeTruthy();
    // NOT a consent withdrawal: the opt-out flags must stay untouched.
    expect(flagged.sms_opt_out).toBe(false);
    expect(flagged.opted_out).toBeFalsy();

    const suppression = (await db.from('sms_suppression_list').select('*').eq('workspace_id', ws1).eq('phone_e164', to)).data;
    expect(suppression).toHaveLength(1);
    expect(suppression[0]).toMatchObject({ reason: 'invalid_number', source: 'twilio_error_30006' });

    // The running SMS drip is cancelled, with an honest (non-STOP-worded) reason — same mechanism as STOP.
    const cancelled = await runRow();
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.context.termination_reason).toBe('sms_invalid_number');
    const { data: logs } = await db.from('workflow_step_logs').select('error_message').eq('execution_id', cancelled.id).eq('status', 'skipped');
    expect(logs.map((l: any) => l.error_message)).toEqual(["Cancelled: contact's phone number is invalid (repeated delivery failures)."]);
  });

  it('EXCLUDED FROM FUTURE SENDS: a new bulk campaign never queues the flagged contact; sendSMS itself refuses to send to it', async () => {
    const c = await mkContact('excluded');
    const to = e164(c.phone);
    for (const code of ['30004', '30004', '30005']) await sendAndFail(c.id, to, code);
    expect((await contactRow(c.id)).sms_invalid).toBe(true);

    const seg = (await db.from('segments').insert({ workspace_id: ws1, name: `seg-inv-${runId}`, rule_group: { logic: 'AND', rules: [{ field: 'email', operator: 'equals', value: c.email }] } }).select().single()).data;
    h.userClient = userClient;
    const created = await M.sms.createBulkSmsCampaign({ name: 'post-invalid', messageBody: 'hi', segmentId: seg.id });
    // The ONLY matching contact is now invalid: no eligible recipients at all (not silently "0 excluded").
    expect(created).toEqual({ success: false, error: 'No eligible recipients matched this audience (check opt-outs and missing phone numbers)' });

    const sendErr = await M.sendSMSLib.sendSMS({ to: c.phone, message: 'hi', config: { accountSid: 'AC_123', authToken: 'x', fromNumber: WS1_NUM } }).then(() => null, (e: any) => e);
    expect(sendErr).toBeInstanceOf(M.sendSMSLib.SmsOptedOutError);
    expect(sendErr.reason).toBe('invalid_number');
  });

  it('a DELIVERED success resets the consecutive streak (but not the lifetime total), so the threshold is not crossed by unrelated later failures', async () => {
    const c = await mkContact('reset');
    const to = e164(c.phone);
    await sendAndFail(c.id, to, '30003');
    await sendAndFail(c.id, to, '30003');
    expect(await contactRow(c.id)).toMatchObject({ sms_consecutive_soft_fails: 2, sms_soft_fail_count: 2 });

    expect(await sendAndDeliver(c.id, to)).toBe(204); // the number just proved it works
    expect(await contactRow(c.id)).toMatchObject({ sms_consecutive_soft_fails: 0, sms_soft_fail_count: 2, sms_invalid: false });

    await sendAndFail(c.id, to, '30003');
    await sendAndFail(c.id, to, '30003');
    // consecutive is only 2 again (reset by the delivery), but the LIFETIME total is now 4 — one more
    // failure of EITHER kind crosses total>=5 even without 3 in a row.
    expect(await contactRow(c.id)).toMatchObject({ sms_consecutive_soft_fails: 2, sms_soft_fail_count: 4, sms_invalid: false });
    await sendAndFail(c.id, to, '30006');
    expect(await contactRow(c.id)).toMatchObject({ sms_soft_fail_count: 5, sms_invalid: true });
  });
});

describe('codes that are NOT about the destination number never flag it, no matter how many times', () => {
  it('30002 (account suspended) and 30007 (content filtering) do not count, even 5 times each', async () => {
    const c = await mkContact('excluded-codes');
    const to = e164(c.phone);
    for (let i = 0; i < 5; i++) await sendAndFail(c.id, to, '30002');
    for (let i = 0; i < 5; i++) await sendAndFail(c.id, to, '30007');
    const row = await contactRow(c.id);
    expect(row).toMatchObject({ sms_invalid: false, sms_soft_fail_count: 0, sms_consecutive_soft_fails: 0 });
    expect((await db.from('sms_suppression_list').select('id').eq('workspace_id', ws1).eq('phone_e164', to)).data).toEqual([]);
  });

  it('30001 (queue overflow) and an unlisted/unknown code also never count', async () => {
    const c = await mkContact('excluded-codes-2');
    const to = e164(c.phone);
    for (let i = 0; i < 5; i++) await sendAndFail(c.id, to, '30001');
    for (let i = 0; i < 5; i++) await sendAndFail(c.id, to, '99999');
    expect(await contactRow(c.id)).toMatchObject({ sms_invalid: false, sms_soft_fail_count: 0 });
  });
});

describe('21610 (recipient replied STOP to Twilio) stays fully separate from invalid-number handling', () => {
  it('is recorded as an opt-out (reason stop-related), never as invalid_number, and never touches the soft-fail counters', async () => {
    const c = await mkContact('21610');
    const to = e164(c.phone);
    await sendAndFail(c.id, to, '21610');
    const row = await contactRow(c.id);
    expect(row).toMatchObject({ sms_invalid: false, sms_soft_fail_count: 0, sms_opt_out: true });
    const suppression = (await db.from('sms_suppression_list').select('reason').eq('workspace_id', ws1).eq('phone_e164', to)).data;
    expect(suppression[0].reason).not.toBe('invalid_number');
  });
});
