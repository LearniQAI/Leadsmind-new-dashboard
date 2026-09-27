// Live verification: campaign TAG targeting resolves to exactly the right contacts, under a REAL
// signed-in session (same harness as campaign-real-session.live.test.ts: only next/headers is
// replaced, to hand the server code the user's real Supabase auth cookies).
//
// Setup goes through the user's session and real actions (createTag, bulkAssignTags, contact
// inserts with the user's own client, the real signed-token unsubscribeEmail). ADMIN is used only
// for: auth identities, the verified-domain fixture, bulk tag assignment for the 1005-contact cap
// case (the read path is what is under test), read-only queue/log assertions, and teardown.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { createServerClient as ssrClient } from '@supabase/ssr';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const runId = randomUUID().slice(0, 8);
const PLATFORM_DOMAIN = 'sms.leadsmind.io';
process.env.CRON_SECRET = 'campaign-tag-targeting-cron';
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

let admin: any, A: any, T: any, dispatchFn: any, resend: Resend;
let ws = '', wsNoDomain = '';
const userIds: string[] = [];
const jars: Record<string, Map<string, string>> = {};
const report: Record<string, any> = {};

function userClient(jar: Map<string, string>) {
  return ssrClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: 'pkce' },
    cookies: { get: (n: string) => jar.get(n), set: (n: string, v: string) => { jar.set(n, v); }, remove: (n: string) => { jar.delete(n); } },
  });
}
const me = () => userClient(activeJar);
async function mkOwner(tag: string) {
  const email = `ctt-${runId}-${tag}-owner@example.com`, password = `Pw-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true }); // ADMIN: identity
  if (error) throw new Error(error.message);
  userIds.push(data.user.id);
  await new Promise((r) => setTimeout(r, 1000));
  const jar = new Map<string, string>();
  const { error: sErr } = await userClient(jar).auth.signInWithPassword({ email, password });
  if (sErr) throw new Error(sErr.message);
  const { data: m } = await userClient(jar).from('workspace_members').select('workspace_id').eq('user_id', data.user.id).single();
  jar.set('active_workspace_id', m.workspace_id);
  jars[m.workspace_id] = jar;
  return m.workspace_id as string;
}
const act = (w: string) => { activeJar = jars[w]; };

async function contactsAsUser(w: string, emails: string[]) {
  const ids: string[] = [];
  for (let i = 0; i < emails.length; i += 500) {
    const { data, error } = await me().from('contacts').insert(emails.slice(i, i + 500).map((email, j) => ({ workspace_id: w, email, first_name: `C${i + j}`, last_name: 'Tag' }))).select('id');
    if (error) throw new Error(`user contacts insert: ${error.message}`);
    ids.push(...data.map((d: any) => d.id));
  }
  return ids;
}
async function tagAsUser(name: string) {
  const r = await T.createTag({ name });
  if (!r.success) throw new Error(`createTag: ${r.error}`);
  return r.data as { id: string; name: string };
}
async function campaign(label: string) {
  const c = await A.createEmailCampaign(`ctt-${runId}-${label}`);
  if (c.error) throw new Error(c.error);
  const s = await A.updateCampaign(c.data.id, { subject: `Tag targeting ${label}`, body_html: '<p>Hi {{first_name}} <a href="{{unsubscribe_link}}">u</a></p>' });
  if (s.error) throw new Error(s.error);
  return c.data.id as string;
}
const queued = async (cid: string) => {
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await admin.from('campaign_dispatch_queue').select('contact_id, status, provider_message_id').eq('campaign_id', cid).order('id').range(from, from + 999); // ADMIN: read-only
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
};
const future = () => new Date(Date.now() + 7 * 86400_000).toISOString();

let small: { ids: string[]; emails: string[]; tag: { id: string; name: string }; tagB: { id: string; name: string } };
let big: { tag: { id: string; name: string }; count: number };

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  admin = (await import('@/lib/supabase/server')).createAdminClient();
  A = await import('@/app/actions/marketing');
  T = await import('@/app/actions/tags');
  dispatchFn = (await import('@/lib/inngest/functions/campaignDispatch')).campaignDispatchFn;
  resend = new Resend(process.env.RESEND_API_KEY!);
  await sweepStaleTestWorkspaces(admin, testRunPatterns('ctt'));
  ws = await mkOwner('a');
  wsNoDomain = await mkOwner('b');

  let listed: any = null;
  for (let i = 0; i < 4 && !listed?.data; i++) { listed = await resend.domains.list({ limit: 100 }); if (!listed.data) await new Promise((r) => setTimeout(r, 3000)); }
  const platform = listed.data.data.find((d: any) => d.name === PLATFORM_DOMAIN);
  const { error } = await admin.from('sender_domains').insert({ workspace_id: ws, domain_name: PLATFORM_DOMAIN, provider: 'resend', provider_domain_id: platform.id, status: 'verified', verified_at: new Date().toISOString(), spf_status: true, dkim_status: true, from_local_part: 'hello', from_name: 'Tag Targeting', is_default: true }); // ADMIN: verified-domain fixture
  if (error) throw new Error(error.message);

  act(ws);
  // 6 contacts on tag X; 2 of them also on tag Y. #4 unsubscribes (real signed link), #5 is invalid.
  const emails = Array.from({ length: 6 }, (_, i) => `delivered+ctt${i}-${runId}@resend.dev`);
  const ids = await contactsAsUser(ws, emails);
  const tag = await tagAsUser(`VIP ${runId}`);
  const tagB = await tagAsUser(`Newsletter ${runId}`);
  expect((await T.bulkAssignTags([tag.id], 'contact', ids)).success).toBe(true);
  expect((await T.bulkAssignTags([tagB.id], 'contact', [ids[0], ids[1]])).success).toBe(true);
  const { unsubscribeEmail } = await import('@/app/actions/popia');
  const { buildUnsubscribeLink } = await import('@/lib/email/unsubscribeLink');
  const token = new URL(buildUnsubscribeLink(emails[4], ws)).searchParams.get('token')!;
  expect(await unsubscribeEmail(emails[4], ws, token)).toMatchObject({ success: true });
  const inv = await me().from('contacts').update({ is_invalid_email: true }).eq('id', ids[5]).select('id');
  report.invalidAsUser = inv.error?.message ?? `ok (${inv.data?.length} row)`;
  if (inv.error || !inv.data?.length) await admin.from('contacts').update({ is_invalid_email: true }).eq('id', ids[5]); // ADMIN fallback (reported)
  small = { ids, emails, tag, tagB };

  // 1005 contacts on tag Z (cap case). Contacts as the user; assignments in bulk (ADMIN, see header).
  const bigEmails = Array.from({ length: 1005 }, (_, i) => `bulk${i}-${runId}@example.org`);
  const bigIds = await contactsAsUser(ws, bigEmails);
  const bigTag = await tagAsUser(`Bulk ${runId}`);
  for (let i = 0; i < bigIds.length; i += 500) {
    const { error: aErr } = await admin.from('tag_assignments').insert(bigIds.slice(i, i + 500).map((id) => ({ workspace_id: ws, tag_id: bigTag.id, entity_type: 'contact', entity_id: id })));
    if (aErr) throw new Error(aErr.message);
  }
  big = { tag: bigTag, count: bigIds.length };
}, 600_000);

afterAll(async () => {
  if (process.env.AUDIT_REPORT_PATH) (await import('fs')).writeFileSync(process.env.AUDIT_REPORT_PATH, JSON.stringify(report, null, 2));
  await deleteTestWorkspaces(admin, [ws, wsNoDomain], userIds); // ADMIN: teardown
}, 600_000);

describe('campaign tag targeting (real session)', () => {
  it('Settings dialog path (tag ids): exactly the tagged, emailable contacts are queued', async () => {
    act(ws);
    const cid = await campaign('ids');
    const r = await A.updateCampaign(cid, { segment: { tags: [small.tag.id] }, status: 'scheduled', scheduled_for: future() });
    const q = await queued(cid);
    report.idsPath = { error: r.error, matched: r.matchedContactsCount, queued: q.length };
    expect(r.error).toBeUndefined();
    expect(new Set(q.map((x) => x.contact_id))).toEqual(new Set(small.ids.slice(0, 4)));
  });

  it('builder Send dialog path (tag NAMES typed): the same contacts', async () => {
    act(ws);
    const cid = await campaign('names');
    const r = await A.updateCampaign(cid, { segment: { tags: [small.tag.name], emails: [] }, status: 'scheduled', scheduled_for: future() });
    const q = await queued(cid);
    report.namesPath = { error: r.error, matched: r.matchedContactsCount, queued: q.length };
    expect(r.error).toBeUndefined();
    expect(new Set(q.map((x) => x.contact_id))).toEqual(new Set(small.ids.slice(0, 4)));
  });

  it('multiple tags mean ALL of them (AND)', async () => {
    act(ws);
    const cid = await campaign('all');
    const r = await A.updateCampaign(cid, { segment: { tags: [small.tag.id, small.tagB.id] }, status: 'scheduled', scheduled_for: future() });
    const q = await queued(cid);
    report.allSemantics = { error: r.error, matched: r.matchedContactsCount, queued: q.map((x) => small.ids.indexOf(x.contact_id)) };
    expect(new Set(q.map((x) => x.contact_id))).toEqual(new Set([small.ids[0], small.ids[1]]));
  });

  it('a tag with 1005 contacts queues all 1005 (no 1000-row cap)', async () => {
    act(ws);
    const cid = await campaign('big');
    const r = await A.updateCampaign(cid, { segment: { tags: [big.tag.id] }, status: 'scheduled', scheduled_for: future() });
    const q = await queued(cid);
    report.bigTag = { error: r.error, matched: r.matchedContactsCount, queued: q.length, expected: big.count };
    expect(q.length).toBe(big.count);
    await A.deleteCampaignAction(cid);
  });

  it('a real Send now to the small tag reaches exactly the 4 emailable contacts', async () => {
    act(ws);
    const cid = await campaign('send');
    await A.updateCampaign(cid, { segment: { tags: [small.tag.id] } });
    const res = await A.sendCampaignNow(cid);
    while (sentEvents.length) {
      const event = sentEvents.shift();
      if (event.name === 'campaign/dispatch') await (dispatchFn as any).fn({ event, step: { run: (_: string, cb: () => any) => cb() } });
    }
    const q = await queued(cid);
    const sentTo = q.filter((x) => x.status === 'sent').map((x) => small.emails[small.ids.indexOf(x.contact_id)]).sort();
    report.realSend = { result: { error: res.error, matched: res.matchedContactsCount }, statuses: q.map((x) => x.status), sentTo, messageIds: q.map((x) => x.provider_message_id) };
    expect(res.error).toBeUndefined();
    expect(sentTo).toEqual(small.emails.slice(0, 4).sort());
    expect(q.every((x) => x.provider_message_id)).toBe(true);
  });

  it('tag-targeted send from a workspace with no verified domain is refused', async () => {
    act(wsNoDomain);
    const [id] = await contactsAsUser(wsNoDomain, [`delivered+nd-${runId}@resend.dev`]);
    const tag = await tagAsUser(`ND ${runId}`);
    await T.bulkAssignTags([tag.id], 'contact', [id]);
    const cid = await campaign('nodomain');
    const r = await A.sendCampaignNow((await A.updateCampaign(cid, { segment: { tags: [tag.id] } }), cid));
    report.noDomain = r.error;
    expect(r.error).toBe('Add and verify a sending domain in Settings → Email Domains before sending a campaign.');
  });
});
