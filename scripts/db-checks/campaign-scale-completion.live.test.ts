// Live verification (REAL signed-in session; same harness as campaign-tag-targeting.live.test.ts):
//  1. saved-segment and ad-hoc-filter audiences of 1505 contacts queue ALL 1505 (no 1000-row cap),
//     and the auto-sender's membership check finds a contact that sorts after row 1000;
//  2. a finished campaign always reaches 'sent': a failure injected at the final status update is
//     retried, and a failure that outlasts the retries is corrected by the worker's reconcile pass.
//
// The 1505-contact audiences are queued on a FUTURE schedule and the campaigns deleted afterwards:
// this database is shared with the production cron, which would otherwise really send them.
// ADMIN is used only for: identities, the verified-domain fixture, the auto-sender campaign row (so
// activating it doesn't enqueue 1505 due rows), read-only assertions, and teardown.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { createServerClient as ssrClient } from '@supabase/ssr';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const runId = randomUUID().slice(0, 8);
const PLATFORM_DOMAIN = 'sms.leadsmind.io';
const SOURCE = `seg-${runId}`;
process.env.CRON_SECRET = 'campaign-scale-completion-cron';
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.test';

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
const sentEvents: any[] = [];
vi.mock('@/lib/inngest', () => ({ inngest: { send: async (e: any) => { sentEvents.push(e); }, createFunction: (cfg: any, fn: any) => ({ cfg, fn }) } }));
// Failure injection at the FINAL status update only (email_campaigns -> 'sent').
const inject = { failSentUpdates: 0, failed: 0 };
vi.mock('@supabase/supabase-js', async (orig) => {
  const real = await orig<any>();
  return {
    ...real,
    createClient: (...args: any[]) => {
      const client = real.createClient(...args);
      const from = client.from.bind(client);
      client.from = (table: string) => {
        const builder = from(table);
        if (table !== 'email_campaigns') return builder;
        const update = builder.update.bind(builder);
        builder.update = (payload: any, ...rest: any[]) => {
          if (payload?.status === 'sent' && inject.failSentUpdates > 0) {
            inject.failSentUpdates--; inject.failed++;
            const failing: any = { eq: () => failing, in: () => failing, then: (res: any) => res({ data: null, error: { message: 'injected: connection reset during final status update' } }) };
            return failing;
          }
          return update(payload, ...rest);
        };
        return builder;
      };
      return client;
    },
  };
});

let admin: any, A: any, S: any, T: any, dispatchFn: any, worker: any, resend: Resend;
let ws = '';
const userIds: string[] = [];
const report: Record<string, any> = {};
let bulkIds: string[] = [];

function userClient(jar: Map<string, string>) {
  return ssrClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: 'pkce' },
    cookies: { get: (n: string) => jar.get(n), set: (n: string, v: string) => { jar.set(n, v); }, remove: (n: string) => { jar.delete(n); } },
  });
}
const me = () => userClient(activeJar);
const future = () => new Date(Date.now() + 14 * 86400_000).toISOString();
const queuedIds = async (cid: string) => {
  const ids: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await admin.from('campaign_dispatch_queue').select('contact_id').eq('campaign_id', cid).order('id').range(from, from + 999); // ADMIN: read-only
    ids.push(...(data ?? []).map((r: any) => r.contact_id));
    if (!data || data.length < 1000) return ids;
  }
};
async function campaign(label: string) {
  const c = await A.createEmailCampaign(`csc-${runId}-${label}`);
  if (c.error) throw new Error(c.error);
  const s = await A.updateCampaign(c.data.id, { subject: `Scale ${label}`, body_html: '<p>Hi {{first_name}} <a href="{{unsubscribe_link}}">u</a></p>' });
  if (s.error) throw new Error(s.error);
  return c.data.id as string;
}
async function runInngest() {
  const out: any[] = [];
  while (sentEvents.length) {
    const event = sentEvents.shift();
    if (event.name === 'campaign/dispatch') out.push(await dispatchFn.fn({ event, step: { run: (_: string, cb: () => any) => cb() } }));
  }
  return out;
}
const campaignRow = async (cid: string) => (await me().from('email_campaigns').select('status, sent_at, total_sent').eq('id', cid).single()).data;

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  admin = (await import('@/lib/supabase/server')).createAdminClient();
  A = await import('@/app/actions/marketing');
  S = await import('@/app/actions/segments');
  T = await import('@/app/actions/tags');
  dispatchFn = (await import('@/lib/inngest/functions/campaignDispatch')).campaignDispatchFn;
  worker = await import('@/app/api/cron/workers/campaign-dispatch/route');
  resend = new Resend(process.env.RESEND_API_KEY!);
  await sweepStaleTestWorkspaces(admin, testRunPatterns('csc'));

  const email = `csc-${runId}-a-owner@example.com`, password = `Pw-${randomUUID()}`;
  const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true }); // ADMIN: identity
  if (error) throw new Error(error.message);
  userIds.push(u.user.id);
  await new Promise((r) => setTimeout(r, 1000));
  const jar = new Map<string, string>();
  const { error: sErr } = await userClient(jar).auth.signInWithPassword({ email, password });
  if (sErr) throw new Error(sErr.message);
  ws = (await userClient(jar).from('workspace_members').select('workspace_id').eq('user_id', u.user.id).single()).data.workspace_id;
  jar.set('active_workspace_id', ws);
  activeJar = jar;

  let listed: any = null;
  for (let i = 0; i < 5 && !listed?.data; i++) { listed = await resend.domains.list({ limit: 100 }); if (!listed.data) await new Promise((r) => setTimeout(r, 3000)); }
  if (!listed?.data) throw new Error('Resend domains.list failed');
  const platform = listed.data.data.find((d: any) => d.name === PLATFORM_DOMAIN);
  const { error: dErr } = await admin.from('sender_domains').insert({ workspace_id: ws, domain_name: PLATFORM_DOMAIN, provider: 'resend', provider_domain_id: platform.id, status: 'verified', verified_at: new Date().toISOString(), spf_status: true, dkim_status: true, from_local_part: 'hello', from_name: 'Scale Check', is_default: true }); // ADMIN: fixture
  if (dErr) throw new Error(dErr.message);

  // 1505 contacts sharing a source, inserted with the user's own client.
  for (let i = 0; i < 1505; i += 500) {
    const rows = Array.from({ length: Math.min(500, 1505 - i) }, (_, j) => ({ workspace_id: ws, email: `bulk${i + j}-${runId}@example.org`, first_name: `B${i + j}`, last_name: 'Scale', source: SOURCE }));
    const { data, error: cErr } = await me().from('contacts').insert(rows).select('id');
    if (cErr) throw new Error(`user contacts insert: ${cErr.message}`);
    bulkIds.push(...data.map((d: any) => d.id));
  }
}, 600_000);

afterAll(async () => {
  if (process.env.AUDIT_REPORT_PATH) (await import('fs')).writeFileSync(process.env.AUDIT_REPORT_PATH, JSON.stringify(report, null, 2));
  await deleteTestWorkspaces(admin, [ws], userIds); // ADMIN: teardown
}, 600_000);

describe('1. segment / filter audiences are not capped at 1000', () => {
  const rules = () => ({ logic: 'AND' as const, rules: [{ field: 'source', operator: 'equals' as const, value: SOURCE }] });

  it('saved segment of 1505 contacts: all 1505 queued', async () => {
    const seg = await S.createSegment({ name: `Bulk ${runId}`, ruleGroup: rules() });
    expect(seg.success).toBe(true);
    const cid = await campaign('segment');
    const r = await A.updateCampaign(cid, { segment: { segmentId: seg.data.id }, status: 'scheduled', scheduled_for: future() });
    const q = await queuedIds(cid);
    report.savedSegment = { error: r.error, matched: r.matchedContactsCount, queued: q.length, uniqueQueued: new Set(q).size, expected: bulkIds.length };
    expect(r.error).toBeUndefined();
    expect(new Set(q)).toEqual(new Set(bulkIds));
    await A.deleteCampaignAction(cid);
  });

  it('ad-hoc filter of 1505 contacts: all 1505 queued, and the Send dialog count agrees', async () => {
    const cid = await campaign('filter');
    await A.updateCampaign(cid, { segment: { ruleGroup: rules() } });
    const reach = await A.getCampaignAudienceReach(cid);
    const r = await A.updateCampaign(cid, { segment: { ruleGroup: rules() }, status: 'scheduled', scheduled_for: future() });
    const q = await queuedIds(cid);
    report.adHocFilter = { error: r.error, matched: r.matchedContactsCount, queued: q.length, reach };
    expect(new Set(q)).toEqual(new Set(bulkIds));
    expect(reach).toMatchObject({ total: 1505, emailReach: 1505 });
    await A.deleteCampaignAction(cid);
  });

  it('auto-sender membership: a new contact that sorts after row 1000 is enrolled', async () => {
    // ADMIN fixture: an ACTIVE auto-sender row (activating via the UI would enqueue all 1505 as due now).
    const { data: auto } = await admin.from('email_campaigns').insert({ workspace_id: ws, name: `csc-${runId}-auto`, subject: 'Auto', body_html: '<p>Hi</p>', status: 'scheduled', segment: { is_automated: true, ruleGroup: rules() } }).select('id').single();
    const lateId = `ffffffff-ffff-4fff-bfff-${randomUUID().slice(-12)}`; // sorts after every other id
    const { error } = await me().from('contacts').insert({ id: lateId, workspace_id: ws, email: `delivered+auto-${runId}@resend.dev`, first_name: 'Late', last_name: 'Joiner', source: SOURCE });
    if (error) throw new Error(error.message);
    const { enqueueAutoSenderCampaigns } = await import('@/lib/campaigns/autoSender');
    const res = await enqueueAutoSenderCampaigns(ws, lateId);
    const q = await queuedIds(auto.id);
    report.autoSender = { result: res, queuedForAuto: q, segmentSize: bulkIds.length + 1 };
    expect(q).toEqual([lateId]);
    await admin.from('email_campaigns').delete().eq('id', auto.id); // not due-now rows left for the prod cron
  });
});

describe('2. a finished campaign always reaches "sent"', () => {
  async function sentCampaign(label: string) {
    const emails = [1, 2].map((i) => `delivered+done${i}-${label}-${runId}@resend.dev`);
    const { data: cs } = await me().from('contacts').insert(emails.map((e) => ({ workspace_id: ws, email: e, first_name: 'Done', last_name: label }))).select('id');
    const tag = await T.createTag({ name: `done-${label}-${runId}` });
    await T.bulkAssignTags([tag.data.id], 'contact', cs.map((c: any) => c.id));
    const cid = await campaign(label);
    await A.updateCampaign(cid, { segment: { tags: [tag.data.id] } });
    return cid;
  }

  it('one transient failure at the final status update: retried, campaign is "sent"', async () => {
    const cid = await sentCampaign('retry');
    expect((await A.sendCampaignNow(cid)).error).toBeUndefined();
    inject.failSentUpdates = 1; inject.failed = 0;
    const batches = await runInngest();
    const row = await campaignRow(cid);
    report.retry = { batches, injectedFailures: inject.failed, campaign: row };
    expect(inject.failed).toBe(1);
    expect(row).toMatchObject({ status: 'sent', total_sent: 2 });
  });

  it('failure outlasting every retry: left "scheduled", then the next worker run reconciles it to "sent"', async () => {
    const cid = await sentCampaign('reconcile');
    expect((await A.sendCampaignNow(cid)).error).toBeUndefined();
    inject.failSentUpdates = 99; inject.failed = 0;
    await runInngest();
    const stuck = await campaignRow(cid);
    const failedAttempts = inject.failed;
    inject.failSentUpdates = 0;
    const { count: open } = await admin.from('campaign_dispatch_queue').select('id', { count: 'exact', head: true }).eq('campaign_id', cid).in('status', ['pending', 'processing', 'deferred']); // ADMIN: read-only
    // Next run for this campaign (as the cron / a later Inngest event would): nothing left to send.
    const res = await worker.GET(new Request(`https://app.test/api/cron/workers/campaign-dispatch?campaignId=${cid}`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }));
    const after = await campaignRow(cid);
    report.reconcile = { failedAttempts, stuckAfterBatch: stuck, openRows: open, nextRun: { status: res.status, body: await res.json() }, after };
    expect(failedAttempts).toBe(3); // first try + 2 retries
    expect(stuck).toMatchObject({ status: 'scheduled', total_sent: 2 });
    expect(open).toBe(0);
    expect(after).toMatchObject({ status: 'sent', total_sent: 2 });
    expect(after.sent_at).toBeTruthy();
  });
});
