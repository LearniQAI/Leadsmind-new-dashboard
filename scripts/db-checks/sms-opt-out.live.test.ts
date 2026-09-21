// Live verification: SMS/WhatsApp opt-out capture (STOP webhook) + enforcement at every send path.
// Real route handler, real executor/actions, real database, throwaway workspaces. No message is sent:
// Twilio sends use the library's explicit AC_123 dev-mock mode (returns a mock sid).
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';

vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('next/navigation', () => ({ redirect: () => {} }));

// Deterministic env for signature validation + mock sends (set before any route/module is used).
process.env.NEXT_PUBLIC_APP_URL = 'https://app.test';
process.env.CRON_SECRET = 'live-cron-secret';
process.env.TWILIO_AUTH_TOKEN = 'platform-live-token';
process.env.TWILIO_ACCOUNT_SID = 'AC_123'; // platform-level sends -> mock mode
process.env.TWILIO_PHONE_NUMBER = '+15005550009';

const WEBHOOK_URL = 'https://app.test/api/webhooks/twilio/inbound';
const WS1_NUM = '+15005550001'; const WS2_NUM = '+15005550002'; const PLATFORM_NUM = '+15005559999';
const WS1_TOKEN = 'token-ws1-secret'; const WS2_TOKEN = 'token-ws2-secret';

let db: any, M: any, ws1 = '', ws2 = '';
const userIds: string[] = [];
const runId = randomUUID().slice(0, 8);

const mkContact = async (workspace: string, phone: string, tag: string, extra: any = {}) =>
  (await db.from('contacts').insert({ workspace_id: workspace, email: `sms-${runId}-${tag}@example.com`, first_name: `S${tag}`, last_name: 'V', phone, ...extra }).select().single()).data;
const contact = async (id: string) => (await db.from('contacts').select('*').eq('id', id).single()).data;
const listRow = async (workspace: string, e164: string) => (await db.from('sms_suppression_list').select('*').eq('workspace_id', workspace).eq('phone_e164', e164)).data ?? [];

async function postInbound(o: { to: string; from: string; body: string; token?: string | null; accountSid?: string }) {
  const twilio = (await import('twilio')).default as any;
  const params: Record<string, string> = { From: o.from, To: o.to, Body: o.body, MessageSid: `SMLIVE${randomUUID().slice(0, 12)}`, AccountSid: o.accountSid ?? 'AC_123' };
  const headers: Record<string, string> = { 'content-type': 'application/x-www-form-urlencoded' };
  if (o.token !== null) headers['X-Twilio-Signature'] = twilio.getExpectedTwilioSignature(o.token ?? WS1_TOKEN, WEBHOOK_URL, params);
  const { NextRequest } = await import('next/server');
  const res = await M.webhook.POST(new NextRequest(WEBHOOK_URL, { method: 'POST', headers, body: new URLSearchParams(params).toString() }));
  return { status: res.status, text: await res.text() };
}

const ws1Creds = () => ({ accountSid: 'AC_123', authToken: 'x', fromNumber: WS1_NUM });

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  M = {
    ...(await import('@/lib/supabase/server')),
    ...(await import('@/lib/encryption')),
    ...(await import('@/lib/sms')),
    ...(await import('@/lib/smsOptOut')),
    ...(await import('@/lib/phone')),
    vectors: (await import('@/lib/phone.vectors')).PHONE_VECTORS,
    ...(await import('@/lib/automation/executor')),
    registry: (await import('@/lib/automation/actions_registry')).AutomationActions,
    lms: await import('@/lib/automation/lms_actions'),
    crm: (await import('@/lib/automations/CRMActionHandler')).CRMActionHandler,
    webhook: await import('@/app/api/webhooks/twilio/inbound/route'),
    worker: await import('@/app/api/cron/workers/sms-dispatch/route'),
  };
  db = M.createAdminClient();

  const mkWs = async (tag: string) => {
    const { data, error } = await db.auth.admin.createUser({ email: `sms-${runId}-${tag}-owner@example.com`, password: randomUUID(), email_confirm: true });
    if (error) throw new Error(`createUser: ${error.message}`);
    userIds.push(data.user.id);
    await new Promise((r) => setTimeout(r, 800));
    return (await db.from('workspace_members').select('workspace_id').eq('user_id', data.user.id).limit(1).maybeSingle()).data.workspace_id as string;
  };
  ws1 = await mkWs('a'); ws2 = await mkWs('b');
  const setCreds = (id: string, sid: string, token: string, num: string) =>
    db.from('workspaces').update({ twilio_sid_encrypted: M.encrypt(sid), twilio_token_encrypted: M.encrypt(token), twilio_sid: null, twilio_token: null, twilio_number: num }).eq('id', id);
  await setCreds(ws1, 'AC_123', WS1_TOKEN, WS1_NUM);
  await setCreds(ws2, 'AC_222', WS2_TOKEN, WS2_NUM);
});

afterAll(async () => {
  await db.from('webhook_dead_letters').delete().like('payload->>MessageSid', 'SMLIVE%');
  for (const w of [ws1, ws2].filter(Boolean)) {
    for (const t of ['workflow_step_logs', 'workflow_executions', 'workflow_edges', 'workflow_steps', 'workflows', 'sms_dispatch_queue', 'bulk_sms_campaigns', 'sms_suppression_list', 'contact_activities', 'conversations', 'messages', 'contacts']) {
      await db.from(t).delete().eq('workspace_id', w);
    }
  }
  for (const id of userIds) await db.auth.admin.deleteUser(id).catch(() => {});
});

describe('phone normalisation: SQL and TypeScript agree', () => {
  it('normalize_phone_e164 (the contacts.phone_e164 generated column) matches normalizePhone on every vector', async () => {
    for (const [input, expected] of M.vectors) {
      const { data, error } = await db.rpc('normalize_phone_e164', { raw: input });
      expect(error).toBeNull();
      expect(data, `SQL for ${JSON.stringify(input)}`).toBe(expected);
      expect(M.normalizePhone(input)).toBe(expected);
    }
  });
});

describe('B: STOP capture through the real webhook', () => {
  let c1: any, c2: any;

  it('a STOP signed with the WORKSPACE token is captured, persisted and matched to the right workspace', async () => {
    c1 = await mkContact(ws1, '082 123 4567', 'c1'); // stored in local format
    c2 = await mkContact(ws2, '082 123 4567', 'c2'); // SAME number in another workspace
    expect((await contact(c1.id)).phone_e164).toBe('+27821234567');

    const r = await postInbound({ to: WS1_NUM, from: '+27821234567', body: 'STOP', token: WS1_TOKEN, accountSid: 'AC_123' });
    expect(r.status).toBe(200);
    expect(r.text).toContain('unsubscribed');

    const row = await listRow(ws1, '+27821234567');
    expect(row).toHaveLength(1);
    expect(row[0]).toMatchObject({ reason: 'stop_keyword', source: 'twilio_inbound' });
    const after1 = await contact(c1.id);
    expect(after1.sms_opt_out).toBe(true); expect(after1.opted_out).toBe(true);
    // scoped: the other workspace's contact with the same number is untouched
    const after2 = await contact(c2.id);
    expect(after2.sms_opt_out).toBe(false); expect(after2.opted_out).toBeFalsy();
    expect(await listRow(ws2, '+27821234567')).toHaveLength(0);
  });

  it('a STOP with the WRONG token / missing signature / wrong AccountSid is rejected (403) and changes nothing', async () => {
    const victim = await mkContact(ws1, '082 555 0199', 'victim');
    const e164 = '+27825550199';
    const attempts = [
      postInbound({ to: WS1_NUM, from: e164, body: 'STOP', token: 'platform-live-token' }), // platform token cannot sign for a workspace number
      postInbound({ to: WS1_NUM, from: e164, body: 'STOP', token: WS2_TOKEN }),             // another workspace's token
      postInbound({ to: WS1_NUM, from: e164, body: 'STOP', token: null }),                    // unsigned
      postInbound({ to: WS1_NUM, from: e164, body: 'STOP', token: WS1_TOKEN, accountSid: 'AC_999' }), // right token, wrong account
    ];
    for (const a of attempts) expect((await a).status).toBe(403);
    expect(await listRow(ws1, e164)).toHaveLength(0);
    expect((await contact(victim.id)).sms_opt_out).toBe(false);
  });

  it('a STOP from a number that is NOT a contact is still recorded, so a later import stays suppressed', async () => {
    const r = await postInbound({ to: WS1_NUM, from: '+27829999999', body: 'stop.', token: WS1_TOKEN }); // lowercase + trailing dot
    expect(r.status).toBe(200);
    expect(await listRow(ws1, '+27829999999')).toHaveLength(1);
    const imported = await mkContact(ws1, '0829999999', 'imported'); // "re-import" in local format
    expect(await M.getSmsOptOutReason(db, ws1, imported.phone)).toBe('suppression_list');
    await expect(M.sendSMS({ to: imported.phone, message: 'x', config: ws1Creds(), workspaceId: ws1 })).rejects.toBeInstanceOf(M.SmsOptedOutError);
  });

  it('a STOP is idempotent (Twilio retries) and START lifts it only in the workspace that owns the number', async () => {
    await postInbound({ to: WS1_NUM, from: '+27821234567', body: 'STOP', token: WS1_TOKEN });
    expect(await listRow(ws1, '+27821234567')).toHaveLength(1);

    // platform-level number (belongs to no workspace): STOP flags EVERY matching contact (safe side); no list row
    const p = await postInbound({ to: PLATFORM_NUM, from: '+27821234567', body: 'STOP', token: 'platform-live-token' });
    expect(p.status).toBe(200);
    expect((await contact(c2.id)).sms_opt_out).toBe(true);
    expect(await listRow(ws2, '+27821234567')).toHaveLength(0);
    // ...and a START to a platform number changes nothing
    await postInbound({ to: PLATFORM_NUM, from: '+27821234567', body: 'START', token: 'platform-live-token' });
    expect((await contact(c2.id)).sms_opt_out).toBe(true);

    // START to ws1's number clears ws1 only
    const s = await postInbound({ to: WS1_NUM, from: '+27821234567', body: 'START', token: WS1_TOKEN });
    expect(s.status).toBe(200);
    expect(await listRow(ws1, '+27821234567')).toHaveLength(0);
    expect((await contact(c1.id)).sms_opt_out).toBe(false);
    expect((await contact(c2.id)).sms_opt_out).toBe(true); // ws2's opt-out (from the platform-number STOP) is untouched
  });
});

describe('A: opt-out enforced in sendSMS and at real call sites', () => {
  let opted: any, clean: any;

  it('setup: opt a contact out through the real webhook', async () => {
    opted = await mkContact(ws1, '082 555 0111', 'opted');
    clean = await mkContact(ws1, '082 555 0112', 'clean');
    expect((await postInbound({ to: WS1_NUM, from: '+27825550111', body: 'STOP', token: WS1_TOKEN })).status).toBe(200);
    expect((await contact(opted.id)).sms_opt_out).toBe(true);
  });

  it('sendSMS itself: blocked for the opted-out number however it is written, sender inferred or explicit, SMS or WhatsApp', async () => {
    const send = (to: string, extra: any = {}, config: any = ws1Creds()) => M.sendSMS({ to, message: 'hi', config, ...extra });
    await expect(send('0825550111')).rejects.toBeInstanceOf(M.SmsOptedOutError);            // local format, workspace inferred from fromNumber
    await expect(send('+27825550111', { workspaceId: ws1 })).rejects.toBeInstanceOf(M.SmsOptedOutError);
    await expect(send('whatsapp:+082 555 0111', {}, { ...ws1Creds(), fromNumber: `whatsapp:${WS1_NUM}` })).rejects.toBeInstanceOf(M.SmsOptedOutError); // mangled '+082..' + WhatsApp
    expect((await send('0825550112')).sid).toMatch(/^mock_sms_id_/);                          // a clean contact still sends
  });

  it('exemptions are explicit: transactional purpose and platform-level sends are not blocked; opt-out is per workspace', async () => {
    expect((await M.sendSMS({ to: '0825550111', message: 'code 123', config: ws1Creds(), purpose: 'transactional' })).sid).toMatch(/^mock_sms_id_/);
    expect((await M.sendSMS({ to: '0825550111', message: 'portal PIN' })).sid).toMatch(/^mock_sms_id_/); // no config = platform-level
    // same phone, texted FROM another workspace's number: that workspace has no opt-out for it
    await mkContact(ws2, '082 555 0111', 'other-ws');
    expect((await M.sendSMS({ to: '0825550111', message: 'hi', config: { accountSid: 'AC_123', authToken: 'x', fromNumber: WS2_NUM } })).sid).toMatch(/^mock_sms_id_/);
  });

  it('call site 1: automation send_sms step', async () => {
    await expect(M.registry.send_sms(ws1, opted.id, { message: 'hi' })).rejects.toBeInstanceOf(M.SmsOptedOutError);
    await expect(M.registry.send_sms(ws1, clean.id, { message: 'hi' })).resolves.toBeUndefined();
  });

  it('call site 2: automation send_whatsapp step', async () => {
    await expect(M.registry.send_whatsapp(ws1, opted.id, { body: 'hi' })).rejects.toBeInstanceOf(M.SmsOptedOutError);
    await expect(M.registry.send_whatsapp(ws1, clean.id, { body: 'hi' })).resolves.toBeUndefined();
  });

  it('call site 3: LMS send_whatsapp_template', async () => {
    await expect(M.lms.send_whatsapp_template(ws1, opted.id, { templateName: 't' })).rejects.toBeInstanceOf(M.SmsOptedOutError);
    await expect(M.lms.send_whatsapp_template(ws1, clean.id, { templateName: 't' })).resolves.not.toThrow();
  });

  it('call site 4: Engine B (CRMActionHandler) WhatsApp voice note', async () => {
    const cfg = { audioUrl: 'https://example.com/a.mp3', sendTranscript: false };
    const blocked = await M.crm.sendWhatsAppVoice(db, ws1, opted.id, cfg).then((r: any) => r, (e: any) => e);
    const ok = await M.crm.sendWhatsAppVoice(db, ws1, clean.id, cfg).then((r: any) => r, (e: any) => e);
    expect(blocked instanceof M.SmsOptedOutError || blocked?.success === false, JSON.stringify(blocked)).toBe(true);
    expect(ok instanceof Error, String(ok)).toBe(false);
    expect(ok?.success).not.toBe(false);
  });

  it('call site 5: the bulk SMS worker (send-time gate; local phones normalised; bad phones fail clearly)', async () => {
    const pending = (await db.from('sms_dispatch_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending')).count ?? 0;
    if (pending > 0) { console.warn(`SKIPPED bulk worker check: ${pending} live pending SMS rows exist (the worker is workspace-agnostic)`); return; }

    const bOpt = await mkContact(ws1, '082 555 0121', 'b-opt');
    const bOk = await mkContact(ws1, '082 555 0122', 'b-ok');
    const bBad = await mkContact(ws1, '0333 1234567', 'b-bad'); // unnormalisable
    const camp = (await db.from('bulk_sms_campaigns').insert({ workspace_id: ws1, name: 'live', message_body: 'hello', status: 'scheduled', total_recipients: 3, scheduled_at: new Date().toISOString() }).select().single()).data;
    const rows = [bOpt, bOk, bBad].map((c) => ({ campaign_id: camp.id, workspace_id: ws1, contact_id: c.id, status: 'pending', scheduled_for: new Date(Date.now() - 1000).toISOString() }));
    await db.from('sms_dispatch_queue').insert(rows);

    // STOP arrives AFTER the campaign was queued
    expect((await postInbound({ to: WS1_NUM, from: '+27825550121', body: 'STOP', token: WS1_TOKEN })).status).toBe(200);
    const { NextRequest } = await import('next/server');
    const res = await M.worker.GET(new NextRequest('https://app.test/api/cron/workers/sms-dispatch', { headers: { Authorization: 'Bearer live-cron-secret' } }));
    expect(res.status).toBe(200);

    const q = async (c: any) => (await db.from('sms_dispatch_queue').select('status, twilio_sid, error_log').eq('campaign_id', camp.id).eq('contact_id', c.id).single()).data;
    expect((await q(bOpt)).status).toBe('skipped_opt_out');
    const okRow = await q(bOk);
    expect(okRow.status).toBe('sent'); expect(okRow.twilio_sid).toMatch(/^mock_sms_id_/);
    const bad = await q(bBad);
    expect(bad.status).toBe('failed'); expect(bad.error_log).toMatch(/Invalid phone number/);
    const after = (await db.from('bulk_sms_campaigns').select('*').eq('id', camp.id).single()).data;
    expect(after).toMatchObject({ total_sent: 1, total_failed: 1, total_skipped_opt_out: 1, status: 'completed' });
  });
});

describe('A2: STOP cancels running SMS workflows', () => {
  it('cancels a run that has SMS steps (recorded), leaves an email-only run alone; an already-opted-out contact\'s SMS step is skipped', async () => {
    const mkWorkflow = async (name: string, trigger: string, specs: Array<{ type: string; config: any }>) => {
      const { data: wf } = await db.from('workflows').insert({ workspace_id: ws1, name, trigger_type: trigger, trigger_config: {}, is_active: true }).select().single();
      const ids: string[] = [];
      for (let i = 0; i < specs.length; i++) ids.push((await db.from('workflow_steps').insert({ workflow_id: wf.id, workspace_id: ws1, position: i + 1, type: specs[i].type, config: specs[i].config }).select('id').single()).data.id);
      for (let i = 0; i < ids.length - 1; i++) await db.from('workflow_edges').insert({ workflow_id: wf.id, workspace_id: ws1, source_step_id: ids[i], target_step_id: ids[i + 1], source_handle: 'next' });
      return { wf, ids };
    };
    const smsWf = await mkWorkflow('SMS drip', 'contact_created', [
      { type: 'send_sms', config: { message: 'hello' } }, { type: 'wait', config: { delayValue: 1, delayUnit: 'days' } }, { type: 'send_sms', config: { message: 'later' } },
    ]);
    const emailWf = await mkWorkflow('Email only', 'appointment_booked', [
      { type: 'wait', config: { delayValue: 1, delayUnit: 'days' } }, { type: 'send_email', config: { subject: 's', body: 'b' } },
    ]);

    const w = await mkContact(ws1, '082 555 0131', 'wf');
    await M.triggerWorkflows(ws1, 'contact_created', w.id);     // first send_sms sends (mock), then waits
    await M.triggerWorkflows(ws1, 'appointment_booked', w.id);  // email-only run, waiting
    const exec = async (wfId: string) => (await db.from('workflow_executions').select('*').eq('workflow_id', wfId).eq('contact_id', w.id).single()).data;
    const smsRun = await exec(smsWf.wf.id); const emailRun = await exec(emailWf.wf.id);
    expect(smsRun.status).toBe('running'); expect(emailRun.status).toBe('running');
    expect(smsRun.current_step_id).toBe(smsWf.ids[1]);

    expect((await postInbound({ to: WS1_NUM, from: '+27825550131', body: 'STOP', token: WS1_TOKEN })).status).toBe(200);

    const cancelled = await exec(smsWf.wf.id);
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.context.termination_reason).toBe('sms_opt_out');
    const { data: logs } = await db.from('workflow_step_logs').select('status, error_message').eq('execution_id', smsRun.id).eq('status', 'skipped');
    expect(logs.map((l: any) => l.error_message)).toEqual(['Cancelled: contact replied STOP (SMS/WhatsApp opt-out).']);
    expect((await exec(emailWf.wf.id)).status).toBe('running'); // an email-only run is NOT touched by an SMS STOP

    // even if it were somehow driven again, the cancelled run does nothing
    await db.from('workflow_executions').update({ context: { resume_at: new Date(Date.now() - 60e3).toISOString() } }).eq('id', smsRun.id);
    await M.processNextStep(smsRun.id);
    expect((await exec(smsWf.wf.id)).status).toBe('cancelled');

    // a contact who has ALREADY opted out and is then enrolled: the SMS step is skipped (not failed), the run carries on
    const late = await mkContact(ws1, '082 555 0132', 'late');
    await postInbound({ to: WS1_NUM, from: '+27825550132', body: 'STOP', token: WS1_TOKEN });
    await M.triggerWorkflows(ws1, 'contact_created', late.id);
    const lateRun = (await db.from('workflow_executions').select('*').eq('workflow_id', smsWf.wf.id).eq('contact_id', late.id).single()).data;
    expect(lateRun.status).toBe('running');
    const { data: lateLogs } = await db.from('workflow_step_logs').select('status, error_message').eq('execution_id', lateRun.id).order('started_at');
    expect(lateLogs[0]).toMatchObject({ status: 'skipped' });
    expect(lateLogs[0].error_message).toMatch(/opted out/i);
  });
});
