// Live verification under a REAL signed-in user session.
//
// Nothing on the code path under test is stubbed: the real createServerClient, requireWorkspaceAccess
// and requireModuleAccess run against the user's real Supabase auth cookies (only next/headers is
// replaced, to hand those cookies to the server code the way a browser request would). Campaigns,
// contacts, tags and designs are created through the user's own session / the real server actions.
//
// Admin (service-role) use is limited to things no user path can produce, each marked ADMIN below:
//  - creating the login identities (auth provisioning) and adding a restricted member,
//  - the verified sending-domain fixture (verification needs real DNS) and the reputation pause toggle,
//  - READ-ONLY assertions on campaign_dispatch_queue / email_tracking_logs (no client can read the
//    queue, by design),
//  - teardown.
// The dispatch worker is run exactly as Vercel cron / Inngest run it (service process + CRON_SECRET).
// Mail goes only to delivered@resend.dev addresses.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { createServerClient as ssrClient } from '@supabase/ssr';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const runId = randomUUID().slice(0, 8);
const PLATFORM_DOMAIN = 'sms.leadsmind.io';
const FROM_NAME = 'Real Session Identity';
process.env.CRON_SECRET = 'campaign-real-session-cron';
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.test';

// ── the "browser": one cookie jar per signed-in user ────────────────────────────────────────────
const jars: Record<string, Map<string, string>> = {};
let activeJar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => (activeJar.has(name) ? { name, value: activeJar.get(name)! } : undefined),
    getAll: () => [...activeJar].map(([name, value]) => ({ name, value })),
    set: (a: any, b?: any) => { const n = typeof a === 'string' ? a : a.name; const v = typeof a === 'string' ? b : a.value; if (v) activeJar.set(n, v); else activeJar.delete(n); },
    delete: (name: string) => activeJar.delete(name),
  }),
  headers: () => new Headers(),
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
// Local INNGEST_* keys are placeholders: capture the real event and run the real registered function.
const sentEvents: any[] = [];
// Failure injection for the rollback test only (off by default; the real admin client otherwise).
const inject = { enqueueFails: false };
vi.mock('@/lib/inngest', () => ({ inngest: { send: async (e: any) => { sentEvents.push(e); }, createFunction: (cfg: any, fn: any) => ({ cfg, fn }) } }));
vi.mock('@/lib/supabase/server', async (orig) => {
  const real = await orig<any>();
  return {
    ...real,
    createAdminClient: () => {
      const c = real.createAdminClient();
      if (!inject.enqueueFails) return c;
      const rpc = c.rpc.bind(c);
      c.rpc = (fn: string, args: any) => fn === 'enqueue_campaign_recipients'
        ? Promise.resolve({ data: null, error: { message: 'injected: connection reset during enqueue' } })
        : rpc(fn, args);
      return c;
    },
  };
});

let admin: any, A: any, dispatchFn: any, worker: any, resend: Resend;
let wsA = '', wsB = '';
const userIds: string[] = [];
const owner: Record<string, { email: string; password: string }> = {};
let restrictedJar: Map<string, string>;
let tagA = '', contactA = '';
const report: Record<string, any> = {};

function userClient(jar: Map<string, string>) {
  return ssrClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: 'pkce' },
    cookies: {
      get: (n: string) => jar.get(n),
      set: (n: string, v: string) => { jar.set(n, v); },
      remove: (n: string) => { jar.delete(n); },
    },
  });
}
async function signIn(email: string, password: string, workspaceId: string) {
  const jar = new Map<string, string>();
  const { error } = await userClient(jar).auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn: ${error.message}`);
  jar.set('active_workspace_id', workspaceId);
  return jar;
}
const act = (jar: Map<string, string>) => { activeJar = jar; };
const me = () => userClient(activeJar);

async function mkOwner(tag: string) {
  const email = `crs-${runId}-${tag}-owner@example.com`;
  const password = `Pw-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true }); // ADMIN: identity
  if (error) throw new Error(`createUser: ${error.message}`);
  userIds.push(data.user.id);
  await new Promise((r) => setTimeout(r, 1000));
  const jar0 = await signIn(email, password, '');
  const { data: m } = await userClient(jar0).from('workspace_members').select('workspace_id, role').eq('user_id', data.user.id).single();
  jars[m.workspace_id] = await signIn(email, password, m.workspace_id);
  owner[m.workspace_id] = { email, password };
  return m.workspace_id as string;
}

/** Contact + tag + assignment through the signed-in user's own RLS-scoped client. */
async function taggedContact(email: string) {
  const db = me();
  const ws = activeJar.get('active_workspace_id')!;
  const { data: c, error } = await db.from('contacts').insert({ workspace_id: ws, email, first_name: 'Real', last_name: 'Session' }).select('id').single();
  if (error) throw new Error(`user contact insert: ${error.message}`);
  // Tags through the real tag actions (as the user), the way the Contacts UI creates and assigns them.
  const T = await import('@/app/actions/tags');
  const created = await T.createTag({ name: `crs-${randomUUID().slice(0, 6)}` });
  if (!created.success) throw new Error(`createTag: ${created.error}`);
  const t = created.data as any;
  const assigned = await T.assignTag(t.id, 'contact', c.id);
  if (!assigned.success) throw new Error(`assignTag: ${assigned.error}`);
  return { contactId: c.id as string, tagId: t.id as string };
}

/** Campaign created and designed through the real server actions (as the signed-in user). */
async function designedCampaign(name: string) {
  const created = await A.createEmailCampaign(`crs-${runId}-${name}`);
  if (created.error) throw new Error(`createEmailCampaign: ${created.error}`);
  const saved = await A.updateCampaign(created.data.id, { subject: `Real session: ${name}`, body_html: '<p>Hi {{first_name}} <a href="{{unsubscribe_link}}">unsubscribe</a></p>', builder_json: [] });
  if (saved.error) throw new Error(`design save: ${saved.error}`);
  return created.data.id as string;
}

const queueRows = async (cid: string) => (await admin.from('campaign_dispatch_queue').select('id, status, scheduled_for, send_immediately, provider_message_id, error_log, retry_count').eq('campaign_id', cid)).data as any[]; // ADMIN: read-only assertion
const campaignAsUser = async (cid: string) => (await me().from('email_campaigns').select('status, scheduled_for, sent_at, total_sent').eq('id', cid).single()).data;

async function runInngest() {
  const out: any[] = [];
  while (sentEvents.length) {
    const event = sentEvents.shift();
    out.push(await dispatchFn.fn({ event, step: { run: (_id: string, cb: () => any) => cb() } }));
  }
  return out;
}
async function runCron(cid?: string) {
  const url = `https://app.test/api/cron/workers/campaign-dispatch${cid ? `?campaignId=${cid}` : ''}`;
  return worker.GET(new Request(url, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }));
}
async function fromHeader(messageId: string) {
  for (let i = 0; i < 5; i++) {
    const { data } = await resend.emails.get(messageId);
    if (data?.from) return data.from;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}
async function fromHeaderByRecipient(recipient: string, since: string) {
  for (let i = 0; i < 10; i++) {
    const { data } = await admin.from('email_tracking_logs').select('provider_message_id').eq('workspace_id', wsA).eq('event_type', 'sent').eq('recipient', recipient).gte('timestamp', since).order('timestamp', { ascending: false }).limit(1); // ADMIN: read-only
    if (data?.[0]?.provider_message_id) return { id: data[0].provider_message_id, from: await fromHeader(data[0].provider_message_id) };
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  admin = (await import('@/lib/supabase/server')).createAdminClient();
  A = await import('@/app/actions/marketing');
  dispatchFn = (await import('@/lib/inngest/functions/campaignDispatch')).campaignDispatchFn;
  worker = await import('@/app/api/cron/workers/campaign-dispatch/route');
  resend = new Resend(process.env.RESEND_API_KEY!);
  await sweepStaleTestWorkspaces(admin, testRunPatterns('crs'));

  wsA = await mkOwner('a');
  wsB = await mkOwner('b');

  // ADMIN: verified-domain fixture. A user cannot mark a domain verified (probed below); in
  // production it becomes verified only through Resend's DNS check. sms.leadsmind.io is genuinely
  // verified in the platform Resend account, so real sends from it are accepted.
  let listed: Awaited<ReturnType<typeof resend.domains.list>> | null = null;
  for (let i = 0; i < 4 && !listed?.data; i++) {
    listed = await resend.domains.list({ limit: 100 });
    if (!listed.data) await new Promise((r) => setTimeout(r, 3000));
  }
  if (!listed?.data) throw new Error(`Resend domains.list failed: ${JSON.stringify(listed?.error)}`);
  const platform = listed.data.data.find((d) => d.name === PLATFORM_DOMAIN)!;
  expect(platform.status).toBe('verified');
  const { error } = await admin.from('sender_domains').insert({ workspace_id: wsA, domain_name: PLATFORM_DOMAIN, provider: 'resend', provider_domain_id: platform.id, status: 'verified', verified_at: new Date().toISOString(), spf_status: true, dkim_status: true, from_local_part: 'hello', from_name: FROM_NAME, is_default: true });
  if (error) throw new Error(error.message);

  act(jars[wsA]);
  ({ contactId: contactA, tagId: tagA } = await taggedContact('delivered@resend.dev'));
});

afterAll(async () => {
  if (process.env.AUDIT_REPORT_PATH) (await import('fs')).writeFileSync(process.env.AUDIT_REPORT_PATH, JSON.stringify(report, null, 2));
  await deleteTestWorkspaces(admin, [wsA, wsB], userIds); // ADMIN: teardown
});

describe('0. the session is real and the queue stays closed to clients', () => {
  it('the user is really signed in and their own client cannot touch the queue, call the enqueue RPC, or self-verify a domain', async () => {
    act(jars[wsA]);
    const db = me();
    const { data: { user } } = await db.auth.getUser();
    expect(user?.email).toBe(owner[wsA].email);
    const cid = await designedCampaign('probe');
    const ins = await db.from('campaign_dispatch_queue').insert({ campaign_id: cid, workspace_id: wsA, contact_id: contactA, status: 'pending', scheduled_for: new Date().toISOString() });
    const rpc = await db.rpc('enqueue_campaign_recipients', { p_campaign_id: cid, p_workspace_id: wsA, p_contact_ids: [contactA], p_scheduled_for: new Date().toISOString(), p_send_immediately: true });
    const dom = await db.from('sender_domains').insert({ workspace_id: wsA, domain_name: `selfverify-${runId}.com`, status: 'verified' });
    report.probes = { queueInsert: ins.error?.message, rpc: rpc.error?.message, selfVerifyDomain: dom.error?.message ?? 'ALLOWED' };
    expect(ins.error).toBeTruthy();
    expect(rpc.error?.message).toMatch(/permission denied/);
    expect(dom.error).toBeTruthy();
    expect(await queueRows(cid)).toEqual([]);
  });
});

describe('1. card Send now, as the signed-in admin', () => {
  it('queues, dispatches through Inngest, sends, and the From header is the Settings identity', async () => {
    act(jars[wsA]);
    const cid = await designedCampaign('card');
    // Audience saved through the real Settings dialog action (as the user).
    const saved = await A.updateCampaign(cid, { segment: { tags: [tagA] } });
    expect(saved.error).toBeUndefined();

    const res = await A.sendCampaignNow(cid);
    report.cardSendNow = { result: { error: res.error, matched: res.matchedContactsCount, dispatchWarning: res.dispatchWarning } };
    expect(res.error).toBeUndefined();
    expect(res.matchedContactsCount).toBe(1);
    expect(sentEvents).toEqual([{ name: 'campaign/dispatch', data: { campaignId: cid } }]);
    const queued = await queueRows(cid);
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ status: 'pending', send_immediately: true });

    const [batch] = await runInngest();
    const [row] = await queueRows(cid);
    const from = await fromHeader(row.provider_message_id);
    report.cardSendNow.batch = batch; report.cardSendNow.row = row; report.cardSendNow.fromHeader = from;
    expect(batch).toMatchObject({ processed: 1, sent: 1, remaining: 0 });
    expect(row.status).toBe('sent');
    expect(from).toBe(`${FROM_NAME} <hello@${PLATFORM_DOMAIN}>`);
    // What the card's poll (getEmailCampaigns, as the user) now shows.
    const listed = (await A.getEmailCampaigns()).data.find((c: any) => c.id === cid);
    expect(listed).toMatchObject({ status: 'sent', total_sent: 1 });
  });
});

describe('2. builder Send now and Schedule, as the signed-in admin', () => {
  it('builder Send now: updateCampaign(now) then dispatchCampaignNow, exactly as EmailBuilderClient calls them', async () => {
    act(jars[wsA]);
    const cid = await designedCampaign('builder-now');
    const res = await A.updateCampaign(cid, { builder_json: [], body_html: '<p>Builder {{first_name}} <a href="{{unsubscribe_link}}">u</a></p>', segment: { tags: [tagA], emails: [], is_automated: false }, status: 'scheduled', scheduled_for: null });
    expect(res.error).toBeUndefined();
    expect(res.matchedContactsCount).toBe(1);
    const d = await A.dispatchCampaignNow(cid);
    expect(d).toMatchObject({ success: true, queued: 1 });
    await runInngest();
    const [row] = await queueRows(cid);
    const from = await fromHeader(row.provider_message_id);
    report.builderSendNow = { row, fromHeader: from };
    expect(row.status).toBe('sent');
    expect(from).toBe(`${FROM_NAME} <hello@${PLATFORM_DOMAIN}>`);
    expect(await campaignAsUser(cid)).toMatchObject({ status: 'sent', total_sent: 1 });
  });

  it('builder Schedule: queued for the chosen time (predictive timing kept), then sent by the cron when due', async () => {
    act(jars[wsA]);
    const { contactId, tagId } = await taggedContact('delivered+scheduled@resend.dev');
    // A real open this hour (inserted as the user) so predictive timing says "now" when due.
    const open = await me().from('email_tracking_logs').insert({ workspace_id: wsA, contact_id: contactId, event_type: 'open' });
    report.scheduleOpenInsertAsUser = open.error?.message ?? 'ok';
    if (open.error) await admin.from('email_tracking_logs').insert({ workspace_id: wsA, contact_id: contactId, event_type: 'open' }); // ADMIN fallback (reported)
    const cid = await designedCampaign('builder-schedule');
    const at = new Date(Date.now() + 75_000);
    const res = await A.updateCampaign(cid, { segment: { tags: [tagId] }, status: 'scheduled', scheduled_for: at.toISOString() });
    expect(res.error).toBeUndefined();
    expect(sentEvents).toEqual([]);
    const [queued] = await queueRows(cid);
    expect(queued).toMatchObject({ status: 'pending', send_immediately: false });
    expect(new Date(queued.scheduled_for).getTime()).toBe(at.getTime());
    expect(await campaignAsUser(cid)).toMatchObject({ status: 'scheduled' });

    // Not due yet: a cron run leaves it alone.
    await runCron(cid);
    expect((await queueRows(cid))[0].status).toBe('pending');
    await new Promise((r) => setTimeout(r, at.getTime() - Date.now() + 2000));
    await runCron(cid);
    const [row] = await queueRows(cid);
    const from = row.provider_message_id ? await fromHeader(row.provider_message_id) : null;
    report.builderSchedule = { row, fromHeader: from };
    expect(row.status).toBe('sent');
    expect(from).toBe(`${FROM_NAME} <hello@${PLATFORM_DOMAIN}>`);
    expect(await campaignAsUser(cid)).toMatchObject({ status: 'sent', total_sent: 1 });
  });
});

describe('3. a failed enqueue rolls the campaign back (failure injected at the enqueue RPC)', () => {
  it('draft -> Send now with the enqueue failing: stays draft, nothing queued, clear error', async () => {
    act(jars[wsA]);
    const cid = await designedCampaign('rollback-draft');
    await A.updateCampaign(cid, { segment: { tags: [tagA] } });
    inject.enqueueFails = true;
    let res: any;
    try { res = await A.sendCampaignNow(cid); } finally { inject.enqueueFails = false; }
    report.rollbackDraft = { error: res.error, campaign: await campaignAsUser(cid), queued: (await queueRows(cid)).length, events: sentEvents.length };
    expect(res.error).toBe("Could not queue this campaign's recipients, so nothing was sent and the campaign was left as it was. Please try again.");
    expect(await campaignAsUser(cid)).toMatchObject({ status: 'draft', scheduled_for: null });
    expect(await queueRows(cid)).toEqual([]);
    expect(sentEvents).toEqual([]);
  });

  it('scheduled -> Send now with the enqueue failing: keeps its original schedule and queued rows untouched', async () => {
    act(jars[wsA]);
    const cid = await designedCampaign('rollback-scheduled');
    const future = new Date(Date.now() + 3 * 86400_000).toISOString();
    expect((await A.updateCampaign(cid, { segment: { tags: [tagA] }, status: 'scheduled', scheduled_for: future })).error).toBeUndefined();
    const before = await queueRows(cid);
    inject.enqueueFails = true;
    let res: any;
    try { res = await A.sendCampaignNow(cid); } finally { inject.enqueueFails = false; }
    const after = await queueRows(cid);
    const camp = await campaignAsUser(cid);
    report.rollbackScheduled = { error: res.error, campaign: camp, rowsBefore: before, rowsAfter: after };
    expect(res.error).toMatch(/Could not queue/);
    expect(camp.status).toBe('scheduled');
    expect(new Date(camp.scheduled_for).getTime()).toBe(new Date(future).getTime());
    expect(after).toEqual(before);
  });
});

describe('4. audit findings re-checked under the real session', () => {
  it('test send and direct-address send: From header is the Settings identity', async () => {
    act(jars[wsA]);
    const cid = await designedCampaign('test-send');
    const since = new Date(Date.now() - 5000).toISOString();
    const t = await A.sendTestEmailAction(cid, 'delivered+test@resend.dev', '<p>test {{first_name}}</p>');
    expect(t.success).toBe(true);
    const testHdr = await fromHeaderByRecipient('delivered+test@resend.dev', since);
    const cid2 = await designedCampaign('direct');
    const d = await A.updateCampaign(cid2, { status: 'scheduled', scheduled_for: null, segment: { emails: ['delivered+direct@resend.dev'] }, body_html: '<p>direct {{first_name}} <a href="{{unsubscribe_link}}">u</a></p>' });
    expect(d.directSent).toEqual(['delivered+direct@resend.dev']);
    const directHdr = await fromHeaderByRecipient('delivered+direct@resend.dev', since);
    report.testSend = testHdr; report.directSend = directHdr;
    expect(testHdr?.from).toBe(`${FROM_NAME} <hello@${PLATFORM_DOMAIN}>`);
    expect(directHdr?.from).toBe(`${FROM_NAME} <hello@${PLATFORM_DOMAIN}>`);
  });

  it('paused domain: every path refuses and the worker sends nothing', async () => {
    act(jars[wsA]);
    const cid = await designedCampaign('paused');
    await A.updateCampaign(cid, { segment: { tags: [tagA] } });
    await admin.from('sender_domains').update({ paused_at: new Date().toISOString(), pause_reason: 'real-session check' }).eq('workspace_id', wsA); // ADMIN: reputation-system toggle
    try {
      const out = {
        testSend: (await A.sendTestEmailAction(cid, 'delivered+paused@resend.dev', '<p>x</p>')).error,
        cardSendNow: (await A.sendCampaignNow(cid)).error,
        builderSchedule: (await A.updateCampaign(cid, { segment: { tags: [tagA] }, status: 'scheduled', scheduled_for: new Date(Date.now() + 86400_000).toISOString() })).error,
        direct: (await A.updateCampaign(cid, { status: 'scheduled', scheduled_for: null, segment: { emails: ['delivered+paused@resend.dev'] }, body_html: '<p>x</p>' })).error,
        campaignAfter: await campaignAsUser(cid),
        queued: (await queueRows(cid)).length,
      };
      report.paused = out;
      for (const k of ['testSend', 'cardSendNow', 'builderSchedule', 'direct'] as const) expect(out[k]).toMatch(/paused to protect deliverability/);
      expect(out.campaignAfter.status).toBe('draft');
      expect(out.queued).toBe(0);
    } finally {
      await admin.from('sender_domains').update({ paused_at: null, pause_reason: null }).eq('workspace_id', wsA); // ADMIN
    }
  });

  it('workspace with NO verified domain: every path refuses cleanly, as its own owner', async () => {
    act(jars[wsB]);
    const { tagId } = await taggedContact('delivered@resend.dev');
    const cid = await designedCampaign('no-domain');
    await A.updateCampaign(cid, { segment: { tags: [tagId] } });
    const out = {
      testSend: (await A.sendTestEmailAction(cid, 'delivered@resend.dev', '<p>x</p>')).error,
      cardSendNow: (await A.sendCampaignNow(cid)).error,
      builderSendNow: (await A.updateCampaign(cid, { status: 'scheduled', scheduled_for: null, segment: { tags: [tagId] } })).error,
      builderSchedule: (await A.updateCampaign(cid, { status: 'scheduled', scheduled_for: new Date(Date.now() + 86400_000).toISOString(), segment: { tags: [tagId] } })).error,
      direct: (await A.updateCampaign(cid, { status: 'scheduled', scheduled_for: null, segment: { emails: ['delivered@resend.dev'] }, body_html: '<p>x</p>' })).error,
      campaignAfter: await campaignAsUser(cid),
    };
    report.noDomain = out;
    for (const k of ['testSend', 'cardSendNow', 'builderSendNow', 'builderSchedule', 'direct'] as const) expect(out[k]).toBe('Add and verify a sending domain in Settings → Email Domains before sending a campaign.');
    expect(out.campaignAfter.status).toBe('draft');
    expect(sentEvents).toEqual([]);
  });

  it('a member WITHOUT the Marketing permission is refused by every campaign action (explicit module check)', async () => {
    // ADMIN: identity + membership provisioning (the invite flow needs a real inbox).
    const email = `crs-${runId}-r-member@example.com`, password = `Pw-${randomUUID()}`;
    const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(error.message);
    userIds.push(u.user.id);
    await new Promise((r) => setTimeout(r, 1000));
    await admin.from('workspace_members').insert({ workspace_id: wsA, user_id: u.user.id, role: 'member', permissions: ['dashboard', 'crm'] });
    restrictedJar = await signIn(email, password, wsA);

    act(jars[wsA]);
    const cid = await designedCampaign('restricted-target');
    act(restrictedJar);
    const attempt = async (fn: () => Promise<any>) => { try { const r = await fn(); return `returned ${JSON.stringify(r).slice(0, 80)}`; } catch (e: any) { return `threw ${e.constructor?.name}: ${e.message}`; } };
    const out = {
      getEmailCampaigns: await attempt(() => A.getEmailCampaigns()),
      createEmailCampaign: await attempt(() => A.createEmailCampaign('nope')),
      updateCampaign: await attempt(() => A.updateCampaign(cid, { name: 'hijack' })),
      sendCampaignNow: await attempt(() => A.sendCampaignNow(cid)),
      dispatchCampaignNow: await attempt(() => A.dispatchCampaignNow(cid)),
      sendTestEmailAction: await attempt(() => A.sendTestEmailAction(cid, 'delivered@resend.dev', '<p>x</p>')),
      deleteCampaignAction: await attempt(() => A.deleteCampaignAction(cid)),
    };
    report.restrictedMember = out;
    for (const v of Object.values(out)) expect(v).toMatch(/threw ForbiddenError: .*does not include access to this module/);
    act(jars[wsA]);
    expect((await me().from('email_campaigns').select('name').eq('id', cid).single()).data.name).toBe(`crs-${runId}-restricted-target`);
  });
});

describe('5. marketing email sends ONLY from a verified managed domain (a saved BYO key never wins)', () => {
  // A syntactically valid but fake Resend key: if any marketing path used it, Resend would reject
  // the send with an auth error instead of the expected domain message / domain From header.
  const fakeByoKey = () => `re_byo${randomUUID().replace(/-/g, '')}`;
  const ADD_DOMAIN = 'Add and verify a sending domain in Settings → Email Domains before sending a campaign.';

  it('NO verified domain + a saved BYO key: every campaign path and the sequence/automation step refuse', async () => {
    act(jars[wsB]);
    const P = await import('@/app/actions/emailProviders');
    const saved = await P.saveEmailProvider(wsB, { apiKey: fakeByoKey(), fromEmail: `news@byo-${runId}.com`, fromName: 'BYO Key' });
    expect(saved).toEqual({ success: true });
    const { contactId, tagId } = await taggedContact('delivered+byo@resend.dev');
    const cid = await designedCampaign('byo-no-domain');
    await A.updateCampaign(cid, { segment: { tags: [tagId] } });
    const R = await import('@/lib/automation/actions_registry');
    const AE = await import('@/lib/automation/automationEmail');
    let automationErr: any = null;
    try { await R.AutomationActions.send_email(wsB, contactId, { subject: 'seq', body: 'hi' }, {}); } catch (e) { automationErr = e; }
    const { getWorkspaceEmailConfig } = await import('@/lib/email/resolveConfig');
    const out = {
      testSend: (await A.sendTestEmailAction(cid, 'delivered+byo@resend.dev', '<p>x</p>')).error,
      cardSendNow: (await A.sendCampaignNow(cid)).error,
      builderSendNow: (await A.updateCampaign(cid, { status: 'scheduled', scheduled_for: null, segment: { tags: [tagId] } })).error,
      builderSchedule: (await A.updateCampaign(cid, { status: 'scheduled', scheduled_for: new Date(Date.now() + 86400_000).toISOString(), segment: { tags: [tagId] } })).error,
      direct: (await A.updateCampaign(cid, { status: 'scheduled', scheduled_for: null, segment: { emails: ['delivered+byo@resend.dev'] }, body_html: '<p>x</p>' })).error,
      automationStep: automationErr?.message,
      automationStepPermanent: AE.isPermanentEmailError(automationErr),
      campaignAfter: await campaignAsUser(cid),
      // Transactional email deliberately untouched in this pass: it still resolves the BYO key.
      transactionalResolverMode: (await getWorkspaceEmailConfig(wsB))?.mode,
    };
    report.byoNoDomain = out;
    for (const k of ['testSend', 'cardSendNow', 'builderSendNow', 'builderSchedule', 'direct'] as const) expect(out[k]).toBe(ADD_DOMAIN);
    expect(out.automationStep).toBe('Add and verify a sending domain in Settings → Email Domains before sending sequence or automation emails.');
    expect(out.automationStepPermanent).toBe(true);
    expect(out.campaignAfter.status).toBe('draft');
    expect(await queueRows(cid)).toEqual([]);
    expect(sentEvents).toEqual([]);
    expect(out.transactionalResolverMode).toBe('byo');
  });

  it('verified domain + a saved BYO key: the domain is used (card Send now and the sequence/automation step)', async () => {
    act(jars[wsA]);
    const P = await import('@/app/actions/emailProviders');
    expect(await P.saveEmailProvider(wsA, { apiKey: fakeByoKey(), fromEmail: `news@byo-${runId}.com`, fromName: 'BYO Key' })).toEqual({ success: true });

    const cid = await designedCampaign('byo-and-domain');
    await A.updateCampaign(cid, { segment: { tags: [tagA] } });
    const res = await A.sendCampaignNow(cid);
    expect(res.error).toBeUndefined();
    await runInngest();
    const [row] = await queueRows(cid);
    const campaignFrom = row.provider_message_id ? await fromHeader(row.provider_message_id) : null;

    const R = await import('@/lib/automation/actions_registry');
    const since = new Date(Date.now() - 5000).toISOString();
    const { contactId } = await taggedContact('delivered+seq@resend.dev');
    await R.AutomationActions.send_email(wsA, contactId, { subject: 'Sequence step', body: 'Hi {{first_name}}' }, {});
    const seqHdr = await fromHeaderByRecipient('delivered+seq@resend.dev', since);

    report.byoAndDomain = { campaignRow: row, campaignFrom, sequenceFrom: seqHdr };
    expect(row.status).toBe('sent');
    expect(campaignFrom).toBe(`${FROM_NAME} <hello@${PLATFORM_DOMAIN}>`);
    expect(seqHdr?.from).toBe(`${FROM_NAME} <hello@${PLATFORM_DOMAIN}>`);
  });

  it('the saved key can be removed by an admin, and not by a member without Settings access', async () => {
    const P = await import('@/app/actions/emailProviders');
    act(restrictedJar);
    let restricted: string;
    try { restricted = JSON.stringify(await P.removeEmailProvider(wsA)); } catch (e: any) { restricted = `threw ${e.constructor?.name}: ${e.message}`; }
    act(jars[wsA]);
    const stillThere = await P.getEmailProvider(wsA);
    const removed = await P.removeEmailProvider(wsA);
    const after = await P.getEmailProvider(wsA);
    report.removeKey = { restrictedAttempt: restricted, stillThereAfterRestricted: !!stillThere.data, removed, after };
    expect(restricted).toMatch(/ForbiddenError|Only workspace admins/);
    expect(stillThere.data).toBeTruthy();
    expect(removed).toEqual({ success: true });
    expect(after).toEqual({ success: true, data: null });
  });
});

describe('6. form-workflow email (Forms › Automations, Engine B) follows the domain-only rule', () => {
  /** Form + active workflow with one send_email step, built exactly as the Forms UI does it. */
  async function formWorkflow(label: string) {
    const created = await A.createForm(`crs-${runId}-${label}`);
    if (created.error) throw new Error(`createForm: ${created.error}`);
    const formId = created.data.id as string;
    const wf = await A.createFormWorkflow(formId, `crs-${label}`);
    if (wf.error) throw new Error(`createFormWorkflow: ${wf.error}`);
    // The Forms WorkflowEditor saves steps with the user's own browser client.
    const ws = activeJar.get('active_workspace_id')!;
    const { error } = await me().from('workflow_steps').insert({
      workflow_id: wf.data.id, workspace_id: ws, position: 1, type: 'send_email',
      config: { templateType: 'confirmation', subject: 'Thanks for your submission', body: 'Hi {{first_name}}, we received your form.', fromName: 'Step From Name', fromEmail: 'step@not-a-domain.com' },
    });
    if (error) throw new Error(`user workflow_steps insert: ${error.message}`);
    const on = await A.toggleFormWorkflowActive(formId, wf.data.id, true);
    if (on.error) throw new Error(`toggle: ${on.error}`);
    return { formId, workflowId: wf.data.id as string };
  }

  /** Same dispatch the public submit route makes, then the real registered Inngest function. */
  async function submitForm(ws: string, formId: string, email: string) {
    const { TriggerDispatcher } = await import('@/lib/automations/TriggerDispatcher');
    const { workflowTriggerFn } = await import('@/lib/inngest/functions/workflowTrigger');
    await TriggerDispatcher.dispatch('form_submitted', { formId, workspaceId: ws, formName: 'Live form', values: { email, first_name: 'Form' } });
    const events = sentEvents.splice(0).filter((e) => e.name === 'workflow/trigger');
    expect(events).toHaveLength(1);
    return (workflowTriggerFn as any).fn({ event: events[0], step: { run: (_id: string, cb: () => any) => cb() } });
  }
  const lastExecution = async (workflowId: string) => {
    const asUser = await me().from('workflow_executions').select('status').eq('workflow_id', workflowId).limit(1);
    report.executionReadAsUser = asUser.error?.message ?? `${asUser.data?.length ?? 0} row(s) visible`;
    // ADMIN: read-only assertion (execution rows are written by the service-role engine).
    return (await admin.from('workflow_executions').select('status, error_message').eq('workflow_id', workflowId).order('created_at', { ascending: false }).limit(1).single()).data;
  };

  it('no verified domain (with a saved BYO key): refused with the domain message, nothing sent', async () => {
    act(jars[wsB]);
    const { formId, workflowId } = await formWorkflow('form-no-domain');
    const since = new Date().toISOString();
    await submitForm(wsB, formId, 'delivered+byo@resend.dev');
    const exec = await lastExecution(workflowId);
    const { data: sent } = await admin.from('email_tracking_logs').select('id').eq('workspace_id', wsB).eq('event_type', 'sent').gte('timestamp', since); // ADMIN: read-only
    report.formWorkflowNoDomain = { execution: exec, sentEvents: sent?.length ?? 0 };
    expect(exec).toEqual({ status: 'failed', error_message: 'Step at position 1 failed: Add and verify a sending domain in Settings → Email Domains before sending form automation emails.' });
    expect(sent ?? []).toEqual([]);
  });

  it('verified domain: sends from the domain identity (not the step-configured From or a BYO key)', async () => {
    act(jars[wsA]);
    // wsA's BYO key was removed in section 5; save a fresh fake one so this also proves it is ignored.
    const P = await import('@/app/actions/emailProviders');
    expect(await P.saveEmailProvider(wsA, { apiKey: `re_byo${randomUUID().replace(/-/g, '')}`, fromEmail: `news@byo-${runId}.com`, fromName: 'BYO Key' })).toEqual({ success: true });
    // The engine only emails an existing contact (it resolves, never creates): create it first.
    await taggedContact('delivered+form@resend.dev');
    const { formId, workflowId } = await formWorkflow('form-domain');
    const since = new Date(Date.now() - 5000).toISOString();
    await submitForm(wsA, formId, 'delivered+form@resend.dev');
    const exec = await lastExecution(workflowId);
    const hdr = await fromHeaderByRecipient('delivered+form@resend.dev', since);
    report.formWorkflowDomain = { execution: exec, fromHeader: hdr };
    expect(exec?.status).toBe('completed');
    expect(hdr?.from).toBe(`${FROM_NAME} <hello@${PLATFORM_DOMAIN}>`);
  });

  it('transactional email still uses the old resolver unchanged (BYO key first, else the domain)', async () => {
    const { getWorkspaceEmailConfig, getMarketingEmailConfig } = await import('@/lib/email/resolveConfig');
    const a = await getWorkspaceEmailConfig(wsA);
    const b = await getWorkspaceEmailConfig(wsB);
    const mA = await getMarketingEmailConfig(wsA);
    report.transactionalResolver = { wsA: { mode: a?.mode, from: a?.fromEmail }, wsB: { mode: b?.mode, from: b?.fromEmail }, marketingWsA: { mode: mA?.mode, from: mA?.fromEmail } };
    expect(a).toMatchObject({ mode: 'byo', fromEmail: `news@byo-${runId}.com` });
    expect(b).toMatchObject({ mode: 'byo', fromEmail: `news@byo-${runId}.com` });
    expect(mA).toMatchObject({ mode: 'managed', fromEmail: `hello@${PLATFORM_DOMAIN}` });
  });
});
