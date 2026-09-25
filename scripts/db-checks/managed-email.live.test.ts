// Live verification: LeadsMind-managed sending domains (Email Service Phase 4/5 foundation).
// REAL Resend platform account (domain create/verify/remove, real sends to Resend's test inboxes,
// real delivery status), REAL database, real webhook route handlers signed with the platform
// secret, and the real campaign worker scoped to a throwaway campaign. Throwaway workspaces.
//
// Safety: the only platform domain touched is read (sms.leadsmind.io's id/status) and linked to a
// throwaway workspace row that is deleted from the DATABASE only. Nothing here removes a platform
// domain from Resend. Mail goes only to delivered@/bounced@/complained@resend.dev.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { Webhook } from 'svix';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));

const runId = randomUUID().slice(0, 8);
const LIFECYCLE_DOMAIN = `lmverify-${runId}.com`;
const PLATFORM_DOMAIN = 'sms.leadsmind.io';
process.env.CRON_SECRET = 'managed-email-live-cron';
// The local .env value is not a real svix secret; the routes read this env var per request, so a
// correctly formatted platform secret exercises exactly the production verification path.
process.env.RESEND_WEBHOOK_SECRET = 'whsec_' + Buffer.from(`managed-email-live-${randomUUID()}`).toString('base64');
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.test';

let db: any, M: any, resend: Resend;
let ws = '', wsB = '';
const userIds: string[] = [];
let lifecycleProviderId: string | null = null;
let smsDomainRowId = '';
const sentIds: Record<string, string> = {};
const contacts: Record<string, string> = {};

async function mkWorkspace(tag: string) {
  const { data, error } = await db.auth.admin.createUser({ email: `mgde-${runId}-${tag}-owner@example.com`, password: randomUUID(), email_confirm: true });
  if (error) throw new Error(`createUser: ${error.message}`);
  userIds.push(data.user.id);
  await new Promise((r) => setTimeout(r, 800));
  return (await db.from('workspace_members').select('workspace_id').eq('user_id', data.user.id).single()).data.workspace_id as string;
}

const sign = (raw: string, id = `msg_${randomUUID()}`) => {
  const ts = new Date();
  return {
    'svix-id': id,
    'svix-timestamp': String(Math.floor(ts.getTime() / 1000)),
    'svix-signature': new Webhook(process.env.RESEND_WEBHOOK_SECRET!).sign(id, ts, raw),
  };
};

async function postWebhook(route: any, url: string, payload: unknown, svixId?: string, badSig = false) {
  const { NextRequest } = await import('next/server');
  const raw = JSON.stringify(payload);
  const headers: Record<string, string> = { 'content-type': 'application/json', ...sign(raw, svixId) };
  if (badSig) headers['svix-signature'] = 'v1,forged';
  const res = await route.POST(new NextRequest(url, { method: 'POST', headers, body: raw }));
  return { status: res.status, body: await res.json() };
}

const resendEvent = (type: string, emailId: string, to: string, extra: Record<string, unknown> = {}) => ({
  type,
  created_at: new Date().toISOString(),
  data: {
    created_at: new Date().toISOString(),
    email_id: emailId,
    message_id: `<${emailId}@resend>`,
    from: `LM E2E <lm-e2e@${PLATFORM_DOMAIN}>`,
    to: [to],
    subject: 'managed e2e',
    ...extra,
  },
});

async function waitForStatus(messageId: string, want: string[], timeoutMs = 90_000) {
  const provider = new M.ResendProvider(process.env.RESEND_API_KEY!);
  const start = Date.now();
  let last = '';
  while (Date.now() - start < timeoutMs) {
    last = (await provider.getDeliveryStatus(messageId)).status;
    if (want.includes(last)) return last;
    await new Promise((r) => setTimeout(r, 3000));
  }
  return last;
}

beforeAll(async () => {
  for (const k of ['RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET', 'ENCRYPTION_KEY']) if (!process.env[k]) throw new Error(`${k} missing`);
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  M = {
    ...(await import('@/lib/supabase/server')),
    ...(await import('@/lib/email')),
    ...(await import('@/lib/email/sendingDomains')),
    ...(await import('@/lib/email/managedSender')),
    ...(await import('@/lib/email/resolveConfig')),
    ...(await import('@/lib/email/reputation')),
    ...(await import('@/lib/email/provider/resend')),
    deliverability: await import('@/app/api/webhooks/email/deliverability/route'),
    inbound: await import('@/app/api/webhooks/resend/inbound/route'),
    unsubscribe: await import('@/app/api/public/unsubscribe/route'),
    worker: await import('@/app/api/cron/workers/campaign-dispatch/route'),
    unsubscribeHeaders: (await import('@/lib/email/unsubscribeLink')).buildListUnsubscribeHeaders,
  };
  db = M.createAdminClient();
  resend = new Resend(process.env.RESEND_API_KEY!);
  const swept = await sweepStaleTestWorkspaces(db, testRunPatterns('mgde'));
  if (swept) console.warn(`[cleanup] removed ${swept} stale workspace(s)`);
  ws = await mkWorkspace('a');
  wsB = await mkWorkspace('b');
  for (const who of ['delivered', 'bounced', 'complained']) {
    const { data, error } = await db.from('contacts').insert({ workspace_id: ws, email: `${who}@resend.dev`, first_name: who, last_name: 'E2E' }).select('id').single();
    if (error) throw new Error(`contact: ${error.message}`);
    contacts[who] = data.id;
  }
});

afterAll(async () => {
  // Never leave a provider domain behind (only the throwaway lifecycle domain is ever created).
  if (lifecycleProviderId) await new M.ResendProvider(process.env.RESEND_API_KEY!).deleteDomain(lifecycleProviderId).catch(() => {});
  await db.from('email_send_quota').delete().like('scope', `ws:${ws}%`);
  await db.from('email_send_quota').delete().like('scope', `ws:${wsB}%`);
  const { data: doms } = await db.from('sender_domains').select('id').in('workspace_id', [ws, wsB]);
  for (const d of doms ?? []) await db.from('email_send_quota').delete().like('scope', `domain:${d.id}%`);
  await deleteTestWorkspaces(db, [ws, wsB], userIds);
});

describe('1. real Resend domain lifecycle (platform account)', () => {
  it('creates the domain in Resend and stores Resend\'s real records and status', async () => {
    const row = await M.registerSendingDomain(ws, LIFECYCLE_DOMAIN);
    lifecycleProviderId = row.provider_domain_id;
    expect(row).toMatchObject({ workspace_id: ws, domain_name: LIFECYCLE_DOMAIN, provider: 'resend', is_default: true, verified_at: null });
    expect(row.provider_domain_id).toBeTruthy();
    expect(row.status).not.toBe('verified');

    const recs = row.records as any[];
    const spfTxt = recs.find((r) => r.purpose === 'SPF' && r.type === 'TXT');
    const spfMx = recs.find((r) => r.purpose === 'SPF' && r.type === 'MX');
    const dkim = recs.find((r) => r.purpose === 'DKIM');
    expect(spfTxt).toMatchObject({ name: 'send' });
    expect(spfTxt.value).toContain('include:amazonses.com');
    expect(spfMx.name).toBe('send');
    expect(spfMx.value).toMatch(/^feedback-smtp\..+\.amazonses\.com$/);
    expect(dkim.name).toBe('resend._domainkey');
    expect(dkim.value).toMatch(/^p=MI/);

    // Resend really has it.
    const { data } = await resend.domains.get(row.provider_domain_id);
    expect(data?.name).toBe(LIFECYCLE_DOMAIN);
  });

  it('verification asks Resend and stores Resend\'s answer (no DNS exists, so NOT verified)', async () => {
    const { data: row } = await db.from('sender_domains').select('id').eq('domain_name', LIFECYCLE_DOMAIN).single();
    const updated = await M.refreshSendingDomain(ws, row.id);
    expect(updated.status).not.toBe('verified');
    expect(updated).toMatchObject({ spf_status: false, dkim_status: false, verified_at: null });
    expect(updated.last_checked_at).toBeTruthy();
  });

  it('an unverified domain cannot send: no config is resolved, and a forged From is refused before Resend', async () => {
    expect(await M.getWorkspaceEmailConfig(ws)).toBeNull();
    await expect(M.sendEmail({ to: 'delivered@resend.dev', subject: 'x', text: 'x', config: { apiKey: M.signManagedSenderToken(ws), fromEmail: `hello@${LIFECYCLE_DOMAIN}` } }))
      .rejects.toThrow(/not verified/);
  });

  it('another workspace cannot claim a domain someone is verifying; platform domains are never claimable', async () => {
    await expect(M.registerSendingDomain(wsB, LIFECYCLE_DOMAIN)).rejects.toThrow(/Another workspace started verifying/);
    await expect(M.registerSendingDomain(wsB, 'mail.leadsmind.io')).rejects.toThrow(/platform domains/);
  });

  it('removal deletes it from Resend first, then the row', async () => {
    const { data: row } = await db.from('sender_domains').select('id').eq('domain_name', LIFECYCLE_DOMAIN).single();
    await M.removeSendingDomain(ws, row.id);
    const { error } = await resend.domains.get(lifecycleProviderId!);
    expect(error?.name).toBe('not_found');
    lifecycleProviderId = null;
    expect((await db.from('sender_domains').select('id').eq('id', row.id)).data).toHaveLength(0);
  });
});

describe('2. verified domain: status comes from Resend itself', () => {
  it('a domain Resend reports verified becomes verified here (domain.updated path), and becomes the managed sender', async () => {
    const list = await resend.domains.list({ limit: 100 });
    const platform = list.data!.data.find((d) => d.name === PLATFORM_DOMAIN)!;
    expect(platform.status).toBe('verified');
    const { data: row, error } = await db.from('sender_domains').insert({
      workspace_id: ws, domain_name: PLATFORM_DOMAIN, provider: 'resend', provider_domain_id: platform.id,
      status: 'not_started', from_local_part: 'lm-e2e', from_name: 'LM E2E', is_default: true,
    }).select('id').single();
    if (error) throw new Error(error.message);
    smsDomainRowId = row.id;

    expect(await M.applyProviderDomainUpdate(platform.id)).toBe(true);
    const { data: after } = await db.from('sender_domains').select('status, spf_status, dkim_status, verified_at').eq('id', row.id).single();
    expect(after).toMatchObject({ status: 'verified', spf_status: true, dkim_status: true });

    const cfg = await M.getWorkspaceEmailConfig(ws);
    expect(cfg).toMatchObject({ mode: 'managed', fromEmail: `lm-e2e@${PLATFORM_DOMAIN}`, fromName: 'LM E2E' });
    expect(M.isManagedSenderToken(cfg.apiKey)).toBe(true);
    expect(cfg.apiKey).not.toBe(process.env.RESEND_API_KEY);
  });
});

describe('3. real managed sends through the platform account', () => {
  it('sends to Resend test inboxes, records the provider message id, and reads real delivery status', async () => {
    const cfg = await M.getWorkspaceEmailConfig(ws);
    for (const who of ['delivered', 'bounced', 'complained']) {
      const res = await M.sendEmail({
        to: `${who}@resend.dev`, subject: `managed e2e ${runId}`, text: 'LeadsMind managed-sending live test.',
        idempotencyKey: `mgde-${runId}-${who}`,
        config: { apiKey: cfg.apiKey, fromEmail: cfg.fromEmail, fromName: cfg.fromName, headers: M.unsubscribeHeaders(`${who}@resend.dev`, ws), tags: [{ name: 'contact_id', value: contacts[who] }] },
      });
      expect(res.id).toBeTruthy();
      sentIds[who] = res.id;
      const { data: ev } = await db.from('email_tracking_logs').select('*').eq('provider_message_id', res.id).eq('event_type', 'sent').single();
      expect(ev).toMatchObject({ workspace_id: ws, sender_domain_id: smsDomainRowId, contact_id: contacts[who], recipient: `${who}@resend.dev`, provider: 'resend' });
    }
    expect(await waitForStatus(sentIds.delivered, ['delivered'])).toBe('delivered');
    expect(await waitForStatus(sentIds.bounced, ['bounced'])).toBe('bounced');
    expect(await waitForStatus(sentIds.complained, ['complained'])).toBe('complained');
  }, 300_000);

  it('a valid sender token cannot be used with another From domain', async () => {
    const cfg = await M.getWorkspaceEmailConfig(ws);
    await expect(M.sendEmail({ to: 'delivered@resend.dev', subject: 'x', text: 'x', config: { apiKey: cfg.apiKey, fromEmail: 'ceo@leadsmind.io' } }))
      .rejects.toThrow(/not a sending domain of this workspace/);
    await expect(M.sendEmail({ to: 'delivered@resend.dev', subject: 'x', text: 'x', config: { apiKey: cfg.apiKey.replace(ws, wsB), fromEmail: cfg.fromEmail } }))
      .rejects.toThrow(/sender credentials are invalid/);
  });
});

describe('4. bounce / complaint webhooks (single platform secret) update suppression with a source', () => {
  it('hard bounce -> suppression source=bounce + address marked invalid + event attributed by message id', async () => {
    const svixId = `msg_${randomUUID()}`;
    const r = await postWebhook(M.deliverability, 'https://app.test/api/webhooks/email/deliverability',
      resendEvent('email.bounced', sentIds.bounced, 'bounced@resend.dev', { bounce: { type: 'Permanent', subType: 'General', message: 'Mailbox does not exist' } }), svixId);
    expect(r).toMatchObject({ status: 200, body: { status: 'processed' } });

    const { data: sup } = await db.from('global_suppression_list').select('source, reason').eq('workspace_id', ws).eq('email', 'bounced@resend.dev').single();
    expect(sup).toMatchObject({ source: 'bounce', reason: 'hard_bounce' });
    expect((await db.from('contacts').select('is_invalid_email').eq('id', contacts.bounced).single()).data.is_invalid_email).toBe(true);
    const { data: ev } = await db.from('email_tracking_logs').select('*').eq('provider_event_id', svixId).single();
    expect(ev).toMatchObject({ workspace_id: ws, event_type: 'bounce', bounce_type: 'hard', sender_domain_id: smsDomainRowId, contact_id: contacts.bounced });

    // Redelivery of the same svix id is a no-op.
    const again = await postWebhook(M.deliverability, 'https://app.test/api/webhooks/email/deliverability',
      resendEvent('email.bounced', sentIds.bounced, 'bounced@resend.dev', { bounce: { type: 'Permanent' } }), svixId);
    expect(again.body.status).toBe('duplicate');
    expect((await db.from('email_tracking_logs').select('id').eq('provider_message_id', sentIds.bounced).eq('event_type', 'bounce')).data).toHaveLength(1);
  });

  it('complaint, delivered via the EXISTING inbound webhook -> suppression source=complaint, address NOT marked invalid', async () => {
    const r = await postWebhook(M.inbound, 'https://app.test/api/webhooks/resend/inbound', resendEvent('email.complained', sentIds.complained, 'complained@resend.dev'));
    expect(r).toMatchObject({ status: 200, body: { status: 'processed' } });
    const { data: sup } = await db.from('global_suppression_list').select('source').eq('workspace_id', ws).eq('email', 'complained@resend.dev').single();
    expect(sup.source).toBe('complaint');
    expect((await db.from('contacts').select('is_invalid_email').eq('id', contacts.complained).single()).data.is_invalid_email).toBe(false);
  });

  it('delivered event is recorded; a forged signature is rejected', async () => {
    const r = await postWebhook(M.deliverability, 'https://app.test/api/webhooks/email/deliverability', resendEvent('email.delivered', sentIds.delivered, 'delivered@resend.dev'));
    expect(r.body.status).toBe('processed');
    expect((await db.from('email_tracking_logs').select('id').eq('provider_message_id', sentIds.delivered).eq('event_type', 'delivered')).data).toHaveLength(1);
    const forged = await postWebhook(M.deliverability, 'https://app.test/api/webhooks/email/deliverability', resendEvent('email.bounced', sentIds.delivered, 'delivered@resend.dev', { bounce: { type: 'Permanent' } }), undefined, true);
    expect(forged.status).toBe(401);
    expect((await db.from('global_suppression_list').select('id').eq('workspace_id', ws).eq('email', 'delivered@resend.dev')).data).toHaveLength(0);
  });

  it('one-click List-Unsubscribe POST -> suppression source=unsubscribe, address NOT marked invalid', async () => {
    const { NextRequest } = await import('next/server');
    const url = M.unsubscribeHeaders('delivered@resend.dev', ws)['List-Unsubscribe'].slice(1, -1).replace(/^https?:\/\/[^/]+/, 'https://app.test');
    const res = await M.unsubscribe.POST(new NextRequest(url, { method: 'POST', body: 'List-Unsubscribe=One-Click' }));
    expect(res.status).toBe(200);
    expect((await db.from('global_suppression_list').select('source').eq('workspace_id', ws).eq('email', 'delivered@resend.dev').single()).data.source).toBe('unsubscribe');
    expect((await db.from('contacts').select('is_invalid_email').eq('id', contacts.delivered).single()).data.is_invalid_email).toBe(false);
    const bad = await M.unsubscribe.POST(new NextRequest(url.replace(/token=[0-9a-f]+/, 'token=00'), { method: 'POST' }));
    expect(bad.status).toBe(400);
  });
});

describe('4b. email.suppressed (provider account-level suppression)', () => {
  const addr = `delivered+suppressed-${runId}@resend.dev`;
  let messageId = '';
  let contactId = '';

  it('a real send, then a signed email.suppressed for its real message id -> suppression source=provider_suppressed', async () => {
    const { data: c } = await db.from('contacts').insert({ workspace_id: ws, email: addr, first_name: 'Supp', last_name: 'E2E' }).select('id').single();
    contactId = c.id;
    const cfg = await M.getWorkspaceEmailConfig(ws);
    messageId = (await M.sendEmail({ to: addr, subject: `suppressed e2e ${runId}`, text: 'x', config: { apiKey: cfg.apiKey, fromEmail: cfg.fromEmail, tags: [{ name: 'contact_id', value: contactId }] } })).id;
    expect(messageId).toMatch(/^[0-9a-f-]{36}$/);

    const svixId = `msg_${randomUUID()}`;
    const evt = resendEvent('email.suppressed', messageId, addr, { suppressed: { type: 'OnAccountSuppressionList', message: 'Resend has suppressed sending to this address' } });
    const r = await postWebhook(M.inbound, 'https://app.test/api/webhooks/resend/inbound', evt, svixId);
    expect(r).toMatchObject({ status: 200, body: { status: 'processed' } });

    const { data: sup } = await db.from('global_suppression_list').select('source, reason, email').eq('workspace_id', ws).ilike('email', addr);
    expect(sup).toEqual([{ source: 'provider_suppressed', reason: 'resend:OnAccountSuppressionList', email: addr }]);
    const { data: ev } = await db.from('email_tracking_logs').select('event_type, provider_event_id, sender_domain_id, contact_id').eq('provider_message_id', messageId).eq('event_type', 'suppressed');
    expect(ev).toEqual([{ event_type: 'suppressed', provider_event_id: svixId, sender_domain_id: smsDomainRowId, contact_id: contactId }]);
    // Provider suppression is not evidence the mailbox is broken.
    expect((await db.from('contacts').select('is_invalid_email').eq('id', contactId).single()).data.is_invalid_email).toBe(false);

    // Replay of the same delivery: no duplicate event, no duplicate suppression.
    const again = await postWebhook(M.deliverability, 'https://app.test/api/webhooks/email/deliverability', evt, svixId);
    expect(again.body.status).toBe('duplicate');
    // A second, distinct suppressed event for the same address: recorded, but still one suppression row.
    const second = await postWebhook(M.deliverability, 'https://app.test/api/webhooks/email/deliverability', evt);
    expect(second.body.status).toBe('processed');
    expect((await db.from('global_suppression_list').select('id').eq('workspace_id', ws).ilike('email', addr)).data).toHaveLength(1);
    expect((await db.from('email_tracking_logs').select('id').eq('provider_message_id', messageId).eq('event_type', 'suppressed')).data).toHaveLength(2);
  });

  it('blocks every suppression-aware send path for that address', async () => {
    const { checkEmailSuppression, filterEmailableContactIds } = await import('@/lib/campaigns/emailSuppression');
    // Sequences / automations / EmailAutomationService gate (single recipient).
    expect(await checkEmailSuppression(db, ws, { email: addr.toUpperCase() })).toBe('suppressed');
    // Campaign enqueue gate.
    expect((await filterEmailableContactIds(db, ws, [contactId])).eligible).toEqual([]);
    // Sequence step, for real.
    const { AutomationActions } = await import('@/lib/automation/actions_registry');
    await expect(AutomationActions.send_email(ws, contactId, { subject: 'x', body: 'x' })).rejects.toThrow(/unsubscribed/);
    // Engine B workflow email, for real: refused before any send.
    const { EmailAutomationService } = await import('@/lib/automations/EmailAutomationService');
    const res: any = await (EmailAutomationService as any).sendWorkflowEmail(ws, { templateType: 'confirmation', subject: 'Hi', body: 'Hello there', toEmail: addr }, {});
    expect(res).toMatchObject({ success: false, error: expect.stringMatching(/opted out/) });
    // Campaign worker send-time gate, for real (scoped to a throwaway campaign).
    const { data: campaign } = await db.from('email_campaigns').insert({ workspace_id: ws, name: `supp-${runId}`, subject: 's', body_html: '<p>x</p>', from_email: `lm-e2e@${PLATFORM_DOMAIN}`, status: 'sending' }).select('id').single();
    const { data: job } = await db.from('campaign_dispatch_queue').insert({ campaign_id: campaign.id, workspace_id: ws, contact_id: contactId, status: 'pending', scheduled_for: new Date(Date.now() - 1000).toISOString() }).select('id').single();
    const w = await M.worker.GET(new Request(`https://app.test/api/cron/workers/campaign-dispatch?campaignId=${campaign.id}`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }));
    expect(w.status).toBe(200);
    const { data: after } = await db.from('campaign_dispatch_queue').select('status, error_log, provider_message_id').eq('id', job.id).single();
    expect(after).toEqual({ status: 'skipped_suppressed', error_log: 'suppressed', provider_message_id: null });
  });
});

async function syntheticVerifiedDomain(workspaceId: string, name: string, extra: Record<string, unknown> = {}) {
  const { data, error } = await db.from('sender_domains').insert({
    workspace_id: workspaceId, domain_name: name, provider: 'resend', status: 'verified', verified_at: new Date().toISOString(), ...extra,
  }).select('*').single();
  if (error) throw new Error(error.message);
  return data;
}

describe('5. rate limiting under simulated abuse', () => {
  it('workspace hourly cap: the 4th claim is refused, retryAt = next hour, nothing over-counted', async () => {
    const dom = await syntheticVerifiedDomain(wsB, `rl-${runId}.com`);
    await db.from('email_sending_limits').upsert({ workspace_id: wsB, hourly_limit: 3, daily_limit: 1000 });
    for (let i = 0; i < 3; i++) await M.claimSendQuota(db, wsB, dom);
    const err = await M.claimSendQuota(db, wsB, dom).catch((e: any) => e);
    expect(err).toBeInstanceOf(M.EmailRateLimitError);
    expect(err.scope).toBe(`ws:${wsB}|hour`);
    const next = new Date(); next.setUTCMinutes(60, 0, 0);
    expect(err.retryAt.toISOString()).toBe(next.toISOString());
    const { data: q } = await db.from('email_send_quota').select('scope, used').or(`scope.like.ws:${wsB}%,scope.like.domain:${dom.id}%`);
    expect(Object.fromEntries(q.map((r: any) => [r.scope, r.used]))).toEqual({ [`ws:${wsB}|hour`]: 3, [`ws:${wsB}|day`]: 3, [`domain:${dom.id}|hour`]: 3 });

    // sendEmail itself refuses before any provider call (this domain doesn't exist at Resend).
    await expect(M.sendEmail({ to: 'delivered@resend.dev', subject: 'x', text: 'x', config: { apiKey: M.signManagedSenderToken(wsB), fromEmail: `news@rl-${runId}.com` } }))
      .rejects.toBeInstanceOf(M.EmailRateLimitError);
  });

  it('per-domain cap applies independently of the workspace cap', async () => {
    await db.from('email_sending_limits').upsert({ workspace_id: wsB, hourly_limit: 1000, daily_limit: 1000 });
    const dom = await syntheticVerifiedDomain(wsB, `rl2-${runId}.com`, { hourly_send_limit: 1 });
    await M.claimSendQuota(db, wsB, dom);
    const err = await M.claimSendQuota(db, wsB, dom).catch((e: any) => e);
    expect(err).toBeInstanceOf(M.EmailRateLimitError);
    expect(err.scope).toBe(`domain:${dom.id}|hour`);
  });

  it('the campaign worker defers a rate-limited job to the next window without spending a retry', async () => {
    const { data: q } = await db.from('email_send_quota').select('used').eq('scope', `ws:${wsB}|hour`).order('window_start', { ascending: false }).limit(1).single();
    await db.from('email_sending_limits').upsert({ workspace_id: wsB, hourly_limit: q.used, daily_limit: 1000 });
    const { data: contact } = await db.from('contacts').insert({ workspace_id: wsB, email: 'delivered@resend.dev', first_name: 'RL', last_name: 'E2E' }).select('id').single();
    // An open in the current hour makes predictive send-time say "now" rather than defer on its own.
    await db.from('email_tracking_logs').insert({ workspace_id: wsB, contact_id: contact.id, event_type: 'open' });
    const { data: campaign } = await db.from('email_campaigns').insert({ workspace_id: wsB, name: `rl-${runId}`, subject: 'rl', body_html: '<p>hi</p>', from_email: `news@rl-${runId}.com`, status: 'sending' }).select('id').single();
    const { data: job } = await db.from('campaign_dispatch_queue').insert({ campaign_id: campaign.id, workspace_id: wsB, contact_id: contact.id, status: 'pending', scheduled_for: new Date(Date.now() - 1000).toISOString() }).select('id').single();

    const res = await M.worker.GET(new Request(`https://app.test/api/cron/workers/campaign-dispatch?campaignId=${campaign.id}`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }));
    expect(res.status).toBe(200);
    const { data: after } = await db.from('campaign_dispatch_queue').select('status, error_log, retry_count, scheduled_for, provider_message_id').eq('id', job.id).single();
    const next = new Date(); next.setUTCMinutes(60, 0, 0);
    expect(after).toMatchObject({ status: 'deferred', error_log: 'rate_limited', retry_count: 0, provider_message_id: null });
    expect(new Date(after.scheduled_for).toISOString()).toBe(next.toISOString());
  });
});

describe('6. reputation thresholds auto-pause a domain (simulated abuse)', () => {
  async function seed(domainId: string, sent: number, hardBounces: number, complaints: number, messageId: string) {
    const rows: any[] = [];
    for (let i = 0; i < sent; i++) rows.push({ workspace_id: wsB, event_type: 'sent', provider: 'resend', sender_domain_id: domainId, provider_message_id: i === 0 ? messageId : `seed-${runId}-${domainId}-${i}`, recipient: `r${i}@example.com` });
    for (let i = 0; i < hardBounces; i++) rows.push({ workspace_id: wsB, event_type: 'bounce', bounce_type: 'hard', provider: 'resend', sender_domain_id: domainId, recipient: `b${i}@example.com` });
    for (let i = 0; i < complaints; i++) rows.push({ workspace_id: wsB, event_type: 'complaint', provider: 'resend', sender_domain_id: domainId, recipient: `c${i}@example.com` });
    const { error } = await db.from('email_tracking_logs').insert(rows);
    if (error) throw new Error(error.message);
  }

  it('hard-bounce rate reaching 5% (on >= 100 sends) pauses the domain via the webhook, and sending is then refused', async () => {
    const dom = await syntheticVerifiedDomain(wsB, `rep-${runId}.com`);
    const msg = `em_rep_${runId}`;
    await seed(dom.id, 100, 4, 0, msg);
    expect((await M.evaluateDomainReputation(db, dom.id)).paused).toBe(false); // 4.00%

    const r = await postWebhook(M.deliverability, 'https://app.test/api/webhooks/email/deliverability',
      { ...resendEvent('email.bounced', msg, 'r0@example.com', { bounce: { type: 'Permanent' } }) });
    expect(r.body.status).toBe('processed');
    const { data: after } = await db.from('sender_domains').select('paused_at, pause_reason').eq('id', dom.id).single();
    expect(after.paused_at).toBeTruthy();
    expect(after.pause_reason).toMatch(/hard-bounce rate 5\.00%/);

    const gate = await M.checkManagedFromDomain(db, wsB, `news@rep-${runId}.com`);
    expect(gate.ok).toBe(false);
    expect(gate.reason).toMatch(/paused/);
  });

  it('complaint rate reaching 0.3% pauses; a small sample never does', async () => {
    const dom = await syntheticVerifiedDomain(wsB, `rep2-${runId}.com`);
    const msg = `em_rep2_${runId}`;
    await seed(dom.id, 200, 0, 0, msg);
    const r = await postWebhook(M.deliverability, 'https://app.test/api/webhooks/email/deliverability', resendEvent('email.complained', msg, 'r0@example.com'));
    expect(r.body.status).toBe('processed');
    const { data: after } = await db.from('sender_domains').select('paused_at, pause_reason').eq('id', dom.id).single();
    expect(after.pause_reason).toMatch(/complaint rate 0\.50%/);

    const small = await syntheticVerifiedDomain(wsB, `rep3-${runId}.com`);
    await seed(small.id, 10, 5, 0, `em_rep3_${runId}`);
    const rep = await M.evaluateDomainReputation(db, small.id);
    expect(rep).toMatchObject({ sent: 10, hardBounces: 5, paused: false, breach: null });
  });
});
