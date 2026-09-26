// Live verification: one-click "Send now" (campaign card + builder).
// REAL database, REAL managed sending through the platform Resend account (to delivered@resend.dev
// only), the real sendCampaignNow -> updateCampaign -> dispatchCampaignNow chain, and the real
// registered Inngest function (campaignDispatchFn) invoked with the exact event the action emitted.
// Only the Inngest cloud hop is skipped (local INNGEST_* keys are placeholders) and auth is stubbed
// to the throwaway workspace. Throwaway workspaces, removed with liveCleanup.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const runId = randomUUID().slice(0, 8);
const PLATFORM_DOMAIN = 'sms.leadsmind.io';
process.env.CRON_SECRET = 'campaign-send-now-live-cron';
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.test';

const auth = { workspaceId: '' };
const sentEvents: any[] = [];
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('@/lib/auth', async (orig) => ({
  ...(await orig<any>()),
  requireWorkspaceAccess: async () => ({ userId: 'live', workspaceId: auth.workspaceId }),
  requireModuleAccess: async () => {},
}));
// The server client becomes the admin client: the actions run their real queries, scoped by the
// workspace filters they already apply.
vi.mock('@/lib/supabase/server', async (orig) => {
  const real = await orig<any>();
  return { ...real, createServerClient: async () => real.createAdminClient() };
});
vi.mock('@/lib/inngest', () => ({ inngest: { send: async (e: any) => { sentEvents.push(e); }, createFunction: (cfg: any, fn: any) => ({ cfg, fn }) } }));

let db: any, A: any, dispatchFn: any, resend: Resend;
let ws = '', wsNoSender = '';
const userIds: string[] = [];
let tagId = '', contactId = '', noHistoryContactId = '', noHistoryTagId = '';

async function mkWorkspace(tag: string) {
  const { data, error } = await db.auth.admin.createUser({ email: `csn-${runId}-${tag}-owner@example.com`, password: randomUUID(), email_confirm: true });
  if (error) throw new Error(`createUser: ${error.message}`);
  userIds.push(data.user.id);
  await new Promise((r) => setTimeout(r, 800));
  return (await db.from('workspace_members').select('workspace_id').eq('user_id', data.user.id).single()).data.workspace_id as string;
}

async function tagged(workspaceId: string, email: string, withOpenThisHour: boolean) {
  const { data: c, error } = await db.from('contacts').insert({ workspace_id: workspaceId, email, first_name: 'Send', last_name: 'Now' }).select('id').single();
  if (error) throw new Error(`contact: ${error.message}`);
  const { data: t, error: tErr } = await db.from('tags').insert({ workspace_id: workspaceId, name: `csn-${runId}-${randomUUID().slice(0, 4)}` }).select('id').single();
  if (tErr) throw new Error(`tag: ${tErr.message}`);
  const { error: aErr } = await db.from('tag_assignments').insert({ workspace_id: workspaceId, tag_id: t.id, entity_type: 'contact', entity_id: c.id });
  if (aErr) throw new Error(`tag_assignment: ${aErr.message}`);
  // An open in the current hour makes predictive send-time say "now" (see the finding test below).
  if (withOpenThisHour) await db.from('email_tracking_logs').insert({ workspace_id: workspaceId, contact_id: c.id, event_type: 'open' });
  return { contactId: c.id as string, tagId: t.id as string };
}

async function campaign(workspaceId: string, fields: Record<string, unknown>) {
  const { data, error } = await db.from('email_campaigns').insert({
    workspace_id: workspaceId, name: `csn-${runId}`, subject: 'Send now live check', body_html: '<p>Hi {{first_name}} <a href="{{unsubscribe_link}}">unsubscribe</a></p>', status: 'draft', ...fields,
  }).select('id').single();
  if (error) throw new Error(`campaign: ${error.message}`);
  return data.id as string;
}

const queue = async (cid: string) => (await db.from('campaign_dispatch_queue').select('id, status, scheduled_for, error_log, retry_count, provider_message_id').eq('campaign_id', cid)).data as any[];
const camp = async (cid: string) => (await db.from('email_campaigns').select('status, scheduled_for, sent_at, total_sent').eq('id', cid).single()).data;

/** Runs the real registered Inngest function for every campaign/dispatch event emitted so far. */
async function drainInngest() {
  const results: any[] = [];
  while (sentEvents.length) {
    const event = sentEvents.shift();
    expect(event.name).toBe('campaign/dispatch');
    results.push(await dispatchFn.fn({ event, step: { run: (_id: string, cb: () => any) => cb() } }));
  }
  return results;
}

beforeAll(async () => {
  for (const k of ['RESEND_API_KEY', 'ENCRYPTION_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) if (!process.env[k]) throw new Error(`${k} missing`);
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  db = (await import('@/lib/supabase/server')).createAdminClient();
  A = await import('@/app/actions/marketing');
  dispatchFn = (await import('@/lib/inngest/functions/campaignDispatch')).campaignDispatchFn;
  resend = new Resend(process.env.RESEND_API_KEY!);
  const swept = await sweepStaleTestWorkspaces(db, testRunPatterns('csn'));
  if (swept) console.warn(`[cleanup] removed ${swept} stale workspace(s)`);

  ws = await mkWorkspace('a');
  wsNoSender = await mkWorkspace('b');
  const platform = (await resend.domains.list({ limit: 100 })).data!.data.find((d) => d.name === PLATFORM_DOMAIN)!;
  expect(platform.status).toBe('verified');
  const { error } = await db.from('sender_domains').insert({
    workspace_id: ws, domain_name: PLATFORM_DOMAIN, provider: 'resend', provider_domain_id: platform.id, status: 'verified',
    verified_at: new Date().toISOString(), spf_status: true, dkim_status: true, from_local_part: 'lm-e2e', from_name: 'LM E2E', is_default: true,
  });
  if (error) throw new Error(`sender_domains: ${error.message}`);
  ({ contactId, tagId } = await tagged(ws, 'delivered@resend.dev', true));
  ({ contactId: noHistoryContactId, tagId: noHistoryTagId } = await tagged(ws, 'delivered+nohistory@resend.dev', false));
});

afterAll(async () => {
  await deleteTestWorkspaces(db, [ws, wsNoSender], userIds);
});

describe('1. Send now on a draft: real, immediate, via the existing Inngest path', () => {
  it('queues through updateCampaign, emits campaign/dispatch, and the registered function sends at once', async () => {
    auth.workspaceId = ws;
    const cid = await campaign(ws, { segment: { tags: [tagId] } });
    const t0 = Date.now();
    const res = await A.sendCampaignNow(cid);
    expect(res.error).toBeUndefined();
    expect(res.matchedContactsCount).toBe(1);
    expect(res.dispatchWarning).toBeUndefined();
    expect(sentEvents).toEqual([{ name: 'campaign/dispatch', data: { campaignId: cid } }]);
    // Before any worker run the card state is "sending": scheduled, no scheduled_for.
    expect(await camp(cid)).toMatchObject({ status: 'scheduled', scheduled_for: null });

    const [batch] = await drainInngest();
    expect(batch).toMatchObject({ processed: 1, sent: 1, remaining: 0 });
    const [row] = await queue(cid);
    expect(row.status).toBe('sent');
    expect(row.provider_message_id).toBeTruthy();
    const after = await camp(cid);
    expect(after).toMatchObject({ status: 'sent', total_sent: 1 });
    expect(after.sent_at).toBeTruthy();
    console.log(`[send-now] enqueue -> sent in ${Date.now() - t0} ms, Resend id ${row.provider_message_id}`);

    // The card's poll (getEmailCampaigns) sees the real result.
    const listed = (await A.getEmailCampaigns()).data.find((c: any) => c.id === cid);
    expect(listed).toMatchObject({ status: 'sent', total_sent: 1 });

    // Resend really accepted it.
    const { data: msg } = await resend.emails.get(row.provider_message_id);
    expect(msg?.to).toEqual(['delivered@resend.dev']);
  });

  it('a scheduled campaign is overridden: its queued rows move to now and send', async () => {
    auth.workspaceId = ws;
    const cid = await campaign(ws, { segment: { tags: [tagId] } });
    const future = new Date(Date.now() + 3 * 86400_000).toISOString();
    const sched = await A.updateCampaign(cid, { segment: { tags: [tagId] }, status: 'scheduled', scheduled_for: future });
    expect(sched.error).toBeUndefined();
    expect((await queue(cid))[0].scheduled_for).toBe(new Date(future).toISOString().replace('Z', '+00:00'));

    const res = await A.sendCampaignNow(cid);
    expect(res.error).toBeUndefined();
    expect(new Date((await queue(cid))[0].scheduled_for).getTime()).toBeLessThanOrEqual(Date.now());
    await drainInngest();
    expect((await queue(cid))[0].status).toBe('sent');
    expect(await camp(cid)).toMatchObject({ status: 'sent', total_sent: 1 });
  });
});

describe('2. refusals: clear message, nothing mutated, nothing dispatched', () => {
  it('no audience', async () => {
    auth.workspaceId = ws;
    const cid = await campaign(ws, { segment: null });
    const res = await A.sendCampaignNow(cid);
    expect(res.error).toMatch(/Choose who this campaign is for/);
    expect(await camp(cid)).toMatchObject({ status: 'draft' });
    expect(await queue(cid)).toEqual([]);
    expect(sentEvents).toEqual([]);
  });

  it('audience that resolves to zero eligible contacts (B6): rolled back to draft', async () => {
    auth.workspaceId = ws;
    const { data: t } = await db.from('tags').insert({ workspace_id: ws, name: `csn-empty-${runId}` }).select('id').single();
    const cid = await campaign(ws, { segment: { tags: [t.id] } });
    const res = await A.sendCampaignNow(cid);
    expect(res.error).toMatch(/No eligible recipients/);
    expect(await camp(cid)).toMatchObject({ status: 'draft', scheduled_for: null });
    expect(sentEvents).toEqual([]);
  });

  it('suppressed contact is dropped at enqueue', async () => {
    auth.workspaceId = ws;
    const { contactId: sup, tagId: supTag } = await tagged(ws, 'delivered+suppressed@resend.dev', true);
    const { error: supErr } = await db.from('global_suppression_list').insert({ workspace_id: ws, email: 'delivered+suppressed@resend.dev' });
    if (supErr) throw new Error(supErr.message);
    void sup;
    const cid = await campaign(ws, { segment: { tags: [supTag] } });
    const res = await A.sendCampaignNow(cid);
    expect(res.error).toMatch(/No eligible recipients/);
    expect(await queue(cid)).toEqual([]);
  });

  it('no verified sending domain', async () => {
    auth.workspaceId = wsNoSender;
    const { tagId: t } = await tagged(wsNoSender, 'delivered@resend.dev', true);
    const cid = await campaign(wsNoSender, { segment: { tags: [t] } });
    const res = await A.sendCampaignNow(cid);
    expect(res.error).toBeTruthy();
    expect(res.error).not.toMatch(/Operation failed|Could not send/);
    console.log(`[send-now] no-sender refusal: "${res.error}"`);
    expect(await camp(cid)).toMatchObject({ status: 'draft' });
    expect(await queue(cid)).toEqual([]);
    expect(sentEvents).toEqual([]);
  });

  it('paused sending domain', async () => {
    auth.workspaceId = ws;
    await db.from('sender_domains').update({ paused_at: new Date().toISOString(), pause_reason: 'live test' }).eq('workspace_id', ws);
    try {
      const cid = await campaign(ws, { segment: { tags: [tagId] } });
      const res = await A.sendCampaignNow(cid);
      expect(res.error).toMatch(/paused to protect deliverability/);
      expect(await camp(cid)).toMatchObject({ status: 'draft' });
      expect(await queue(cid)).toEqual([]);
    } finally {
      await db.from('sender_domains').update({ paused_at: null, pause_reason: null }).eq('workspace_id', ws);
    }
  });

  it('no design / auto-sender / already sent', async () => {
    auth.workspaceId = ws;
    expect((await A.sendCampaignNow(await campaign(ws, { segment: { tags: [tagId] }, body_html: null }))).error).toMatch(/Design the email/);
    expect((await A.sendCampaignNow(await campaign(ws, { segment: { tags: [tagId], is_automated: true } }))).error).toMatch(/auto-sender/);
    expect((await A.sendCampaignNow(await campaign(ws, { segment: { tags: [tagId] }, status: 'sent' }))).error).toMatch(/already been sent/);
    expect(sentEvents).toEqual([]);
  });
});

describe('3. rate limit: queued for the next window, not failed, not bypassed', () => {
  it('workspace at its hourly cap: the row is deferred to the next hour with no retry spent', async () => {
    auth.workspaceId = ws;
    const { data: q } = await db.from('email_send_quota').select('used').eq('scope', `ws:${ws}|hour`).order('window_start', { ascending: false }).limit(1).single();
    await db.from('email_sending_limits').upsert({ workspace_id: ws, hourly_limit: q.used, daily_limit: 1000 });
    try {
    const cid = await campaign(ws, { segment: { tags: [tagId] } });
    const res = await A.sendCampaignNow(cid);
    expect(res.error).toBeUndefined();
    const results = await drainInngest();
    expect(results[0]).toMatchObject({ processed: 1, sent: 0 });
    const [row] = await queue(cid);
    const next = new Date(); next.setUTCMinutes(60, 0, 0);
    expect(row).toMatchObject({ status: 'deferred', error_log: 'rate_limited', retry_count: 0, provider_message_id: null });
    expect(new Date(row.scheduled_for).toISOString()).toBe(next.toISOString());
    // Still "sending" on the card; the cron picks the row up in the next window.
    expect(await camp(cid)).toMatchObject({ status: 'scheduled', scheduled_for: null, total_sent: 0 });
    // The re-emitted event found nothing due and stopped (no hot loop).
    expect(sentEvents).toEqual([]);
    } finally {
      await db.from('email_sending_limits').delete().eq('workspace_id', ws);
    }
  });
});

describe('4. Send now skips predictive send-time; scheduled campaigns keep it', () => {
  it('Send now to a contact with NO open history sends immediately (not held until 09:00)', async () => {
    auth.workspaceId = ws;
    const cid = await campaign(ws, { segment: { tags: [noHistoryTagId] } });
    expect((await A.sendCampaignNow(cid)).error).toBeUndefined();
    expect((await db.from('campaign_dispatch_queue').select('send_immediately').eq('campaign_id', cid).single()).data).toEqual({ send_immediately: true });
    const [batch] = await drainInngest();
    expect(batch).toMatchObject({ processed: 1, sent: 1, remaining: 0 });
    const [row] = await queue(cid);
    console.log(`[send-now] no-history contact ${noHistoryContactId}: status=${row.status} (server hour ${new Date().getHours()})`);
    expect(row.status).toBe('sent');
    expect(row.provider_message_id).toBeTruthy();
    expect(await camp(cid)).toMatchObject({ status: 'sent', total_sent: 1 });
  });

  it('a normal scheduled campaign to the same kind of contact still gets the predictive hold when its time arrives', async () => {
    auth.workspaceId = ws;
    const { tagId: t } = await tagged(ws, 'delivered+scheduled@resend.dev', false);
    const cid = await campaign(ws, { segment: { tags: [t] } });
    const future = new Date(Date.now() + 86400_000).toISOString();
    expect((await A.updateCampaign(cid, { segment: { tags: [t] }, status: 'scheduled', scheduled_for: future })).error).toBeUndefined();
    expect(sentEvents).toEqual([]); // scheduling never fires the immediate path
    const [queued] = (await db.from('campaign_dispatch_queue').select('id, send_immediately').eq('campaign_id', cid)).data;
    expect(queued.send_immediately).toBe(false);

    // The scheduled time arrives: make the row due, then the cron run of the worker claims it.
    await db.from('campaign_dispatch_queue').update({ scheduled_for: new Date(Date.now() - 1000).toISOString() }).eq('id', queued.id);
    const worker = await import('@/app/api/cron/workers/campaign-dispatch/route');
    const res = await worker.GET(new Request(`https://app.test/api/cron/workers/campaign-dispatch?campaignId=${cid}`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }));
    expect(res.status).toBe(200);
    const [row] = await queue(cid);
    console.log(`[scheduled] no-history contact: status=${row.status} scheduled_for=${row.scheduled_for} (server hour ${new Date().getHours()})`);
    if (new Date().getHours() === 9) {
      expect(row.status).toBe('sent'); // already inside the predicted hour
    } else {
      const expected = new Date(); expected.setHours(9, 0, 0, 0);
      if (expected.getTime() <= Date.now()) expected.setDate(expected.getDate() + 1);
      expect(row).toMatchObject({ status: 'deferred', provider_message_id: null });
      expect(new Date(row.scheduled_for).toISOString()).toBe(expected.toISOString());
    }
  });
});
