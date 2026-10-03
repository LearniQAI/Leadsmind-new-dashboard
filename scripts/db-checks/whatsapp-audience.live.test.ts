// Live verification of WhatsApp Broadcast B1a (audience builder decoupled from Segments), under REAL signed-in sessions.
// Real server actions, real worker route, real database, throwaway workspaces (deleted in afterAll with proof).
// NOTHING is ever sent to a real number: every connection is a `mock_` one, every contact has a fake +1555 number, and
// the only provider call is MetaAdapter's own mock branch (no network). Mock mode is switched on per test with
// vi.stubEnv (tests only). The two real WhatsApp connections are never read or touched.
//
//   npx vitest run --config scripts/db-checks/vitest.live.config.ts scripts/db-checks/whatsapp-audience.live.test.ts
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { createServerClient as ssrClient } from '@supabase/ssr';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const runId = randomUUID().slice(0, 8);
process.env.CRON_SECRET = 'wa-aud-cron';

const jars: Record<string, Map<string, string>> = {};
let activeJar = new Map<string, string>();
const flags = vi.hoisted(() => ({ failQueueUpsert: false }));
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
vi.mock('next/navigation', () => ({ redirect: () => {} }));
vi.mock('react', async (orig: any) => { const r = await orig(); const c = (fn: any) => fn; return { ...r, default: { ...(r.default ?? r), cache: c }, cache: c }; });
// Test (e) forces the queue insert to fail; everything else on the admin client is the real thing.
vi.mock('@/lib/supabase/server', async (orig: any) => {
  const o = await orig();
  return {
    ...o,
    createAdminClient: () => {
      const real = o.createAdminClient();
      return new Proxy(real, {
        get(target: any, prop: string) {
          if (prop !== 'from') { const v = target[prop]; return typeof v === 'function' ? v.bind(target) : v; }
          return (table: string) => {
            const b = target.from(table);
            if (table !== 'whatsapp_dispatch_queue' || !flags.failQueueUpsert) return b;
            return new Proxy(b, {
              get(t: any, p: string) {
                if (p === 'upsert') return () => Promise.resolve({ data: null, error: { message: 'forced chunk failure' } });
                const v = t[p]; return typeof v === 'function' ? v.bind(t) : v;
              },
            });
          };
        },
      });
    },
  };
});

let admin: any, M: any;
let wsA = '', wsB = '';
const userIds: string[] = [];
const PN_A = `mock_pn_${runId}_a`;
const PN_B = `mock_pn_${runId}_b`;
const num = (n: number) => `+15550${String(2000000 + n).padStart(7, '0')}`;

function userClient(jar: Map<string, string>) {
  return ssrClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: 'pkce' },
    cookies: { get: (n: string) => jar.get(n), set: (n: string, v: string) => { jar.set(n, v); }, remove: (n: string) => { jar.delete(n); } },
  });
}
async function mkUser(tag: string) {
  const email = `wa-aud-${runId}-${tag}-owner@example.com`; const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`createUser: ${error.message}`);
  userIds.push(data.user.id);
  await new Promise((r) => setTimeout(r, 1000));
  const ws = (await admin.from('workspace_members').select('workspace_id').eq('user_id', data.user.id).limit(1).maybeSingle()).data.workspace_id as string;
  const jar = new Map<string, string>();
  const { error: se } = await userClient(jar).auth.signInWithPassword({ email, password });
  if (se) throw new Error(`signIn: ${se.message}`);
  jar.set('active_workspace_id', ws);
  jars[tag] = jar;
  return ws;
}
const as = (tag: string) => { activeJar = jars[tag]; };
const mkContact = async (ws: string, tag: string, phone: string | null, extra: any = {}) => {
  const { data, error } = await admin.from('contacts').insert({ workspace_id: ws, email: `wa-aud-${runId}-${tag}@example.com`, first_name: tag, last_name: 'T', phone, ...extra }).select().single();
  if (error) throw new Error(`contact ${tag}: ${error.message}`);
  return data;
};
const callWorker = () => M.worker.GET(new Request('https://app.test/x', { headers: { Authorization: 'Bearer wa-aud-cron' } })).then(async (r: any) => ({ status: r.status, body: await r.json() }));
const queueCount = async (campaignId: string) => (await admin.from('whatsapp_dispatch_queue').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId)).count as number;
const campaignCount = async (ws: string) => (await admin.from('whatsapp_broadcast_campaigns').select('id', { count: 'exact', head: true }).eq('workspace_id', ws)).count as number;
async function dispatchAndAssert(campaignId: string, expectedSent: number) {
  await admin.from('whatsapp_dispatch_queue').update({ scheduled_for: new Date(Date.now() - 120_000).toISOString() }).eq('campaign_id', campaignId);
  let sent = 0;
  // The worker talks to the remote database over the network; retry a transient fetch failure (it returns 500 and leaves the rows pending).
  let last: any = null;
  for (let i = 0; i < 6 && sent < expectedSent; i++) { last = await callWorker(); sent += last.body.sent ?? 0; }
  const qs = (await admin.from('whatsapp_dispatch_queue').select('status,error_log,retry_count').eq('campaign_id', campaignId)).data;
  expect(sent, JSON.stringify({ last, qs })).toBe(expectedSent);
  const rows = (await admin.from('whatsapp_dispatch_queue').select('status,whatsapp_message_id').eq('campaign_id', campaignId)).data;
  expect(rows.every((r: any) => r.status === 'sent' && String(r.whatsapp_message_id).startsWith('mock_wa_template_out_'))).toBe(true);
  const c = (await admin.from('whatsapp_broadcast_campaigns').select('status,total_sent').eq('id', campaignId).single()).data;
  expect(c.status).toBe('completed');
  expect(c.total_sent).toBe(expectedSent);
}

let tagVip = '', tagPromo = '', segA = '';
// Contacts have no WhatsApp conversation (outside the 24h window), so the worker needs the template branch to send.
const base = (name: string) => ({ name: `aud ${name} ${runId}`, messageBody: 'hello {{contact.first_name}}', templateName: 'order_confirmation', templateLanguage: 'en_US', templateBodyParams: ['{{contact.first_name}}', '1'], consentAttested: true });

beforeAll(async () => {
  M = {
    ...(await import('@/lib/supabase/server')),
    ...(await import('@/app/actions/messaging')),
    ...(await import('@/app/actions/whatsapp_broadcast')),
    worker: await import('@/app/api/cron/workers/whatsapp-dispatch/route'),
  };
  admin = M.createAdminClient();
  const swept = await sweepStaleTestWorkspaces(admin, testRunPatterns('wa-aud'));
  if (swept) console.warn(`[cleanup] removed ${swept} stale workspace(s)`);
  // SAFETY: the dispatch worker drains the GLOBAL queue; refuse to run if anything else is pending.
  const { count } = await admin.from('whatsapp_dispatch_queue').select('id', { count: 'exact', head: true });
  if ((count ?? 0) !== 0) throw new Error(`ABORT: whatsapp_dispatch_queue is not empty (${count})`);
  wsA = await mkUser('a'); wsB = await mkUser('b');

  vi.stubEnv('META_MOCK_MODE', 'true');
  as('a');
  expect((await M.connectPlatformManually('whatsapp', { phoneNumberId: PN_A, whatsappBusinessAccountId: 'mock_waba', systemUserAccessToken: 'mock_token' })).success).toBe(true);
  as('b');
  expect((await M.connectPlatformManually('whatsapp', { phoneNumberId: PN_B, whatsappBusinessAccountId: 'mock_waba', systemUserAccessToken: 'mock_token' })).success).toBe(true);

  // Workspace A fixtures: 7 contacts, deliberately NO segment.
  const c1 = await mkContact(wsA, 'c1', num(1), { source: 'web' });
  const c2 = await mkContact(wsA, 'c2', num(2), { source: 'web' });
  await mkContact(wsA, 'c3', num(3), { opted_out: true, opted_in: false });       // opted out
  await mkContact(wsA, 'c4', null);                                                  // no phone
  await mkContact(wsA, 'c5', 'abc');                                                 // invalid number (no E.164)
  await new Promise((r) => setTimeout(r, 1100));
  await mkContact(wsA, 'c6', num(1), { source: 'web' });                             // newer duplicate of c1
  await mkContact(wsA, 'c7', num(7), { source: 'import', timezone: 'Europe/London' });
  tagVip = (await admin.from('tags').insert({ workspace_id: wsA, name: `vip${runId}` }).select().single()).data.id;
  tagPromo = (await admin.from('tags').insert({ workspace_id: wsA, name: `promo${runId}` }).select().single()).data.id;
  await admin.from('tag_assignments').insert([
    { workspace_id: wsA, tag_id: tagVip, entity_type: 'contact', entity_id: c1.id },
    { workspace_id: wsA, tag_id: tagVip, entity_type: 'contact', entity_id: c2.id },
    { workspace_id: wsA, tag_id: tagPromo, entity_type: 'contact', entity_id: c2.id },
  ]);
  // Workspace B has one contact carrying a tag with the SAME name as A's, to prove tenant isolation.
  const bc = await mkContact(wsB, 'b1', num(901));
  const bTag = (await admin.from('tags').insert({ workspace_id: wsB, name: `vip${runId}` }).select().single()).data.id;
  await admin.from('tag_assignments').insert({ workspace_id: wsB, tag_id: bTag, entity_type: 'contact', entity_id: bc.id });
}, 240_000);

afterAll(async () => {
  if (!admin) return;
  vi.unstubAllEnvs();
  await deleteTestWorkspaces(admin, [wsA, wsB], userIds); // throws (fails the run) if anything is left
  const remaining = await Promise.all([
    admin.from('workspaces').select('id', { count: 'exact', head: true }).in('id', [wsA, wsB]),
    admin.from('contacts').select('id', { count: 'exact', head: true }).like('email', `wa-aud-${runId}-%`),
    admin.from('platform_connections').select('id', { count: 'exact', head: true }).like('credentials->>phone_number_id', `mock_pn_${runId}%`),
    admin.from('whatsapp_broadcast_campaigns').select('id', { count: 'exact', head: true }).in('workspace_id', [wsA, wsB]),
    admin.from('whatsapp_dispatch_queue').select('id', { count: 'exact', head: true }).in('workspace_id', [wsA, wsB]),
    admin.from('segments').select('id', { count: 'exact', head: true }).in('workspace_id', [wsA, wsB]),
    admin.from('tags').select('id', { count: 'exact', head: true }).in('workspace_id', [wsA, wsB]),
  ]);
  const { data: lu } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const users = (lu?.users ?? []).filter((u: any) => u.email?.startsWith(`wa-aud-${runId}-`)).length;
  console.log(`CLEANUP PROOF remaining: workspaces=${remaining[0].count} contacts=${remaining[1].count} mockConnections=${remaining[2].count} campaigns=${remaining[3].count} queueRows=${remaining[4].count} segments=${remaining[5].count} tags=${remaining[6].count} authUsers=${users}`);
  for (const r of remaining) expect(r.count).toBe(0);
  expect(users).toBe(0);
}, 240_000);

vi.setConfig({ testTimeout: 400_000 });

describe('(a) a workspace with 0 segments creates and dispatches a campaign for every audience type', () => {
  it('workspace A really has 0 segments', async () => {
    const { count } = await admin.from('segments').select('id', { count: 'exact', head: true }).eq('workspace_id', wsA);
    expect(count).toBe(0);
  });

  it('preview: counts and exclusions match the fixtures, a masked sample only, and nothing is written', async () => {
    as('a');
    const before = await campaignCount(wsA);
    const p: any = await M.previewWhatsAppBroadcastAudience({ type: 'all_contacts' });
    expect(p.success).toBe(true);
    expect(p.counts).toEqual({ matched: 7, eligible: 3 });
    expect(p.exclusions).toEqual({ no_phone: 1, invalid_number: 1, opted_out: 1, suppressed: 0, duplicate_phone: 1 });
    const json = JSON.stringify(p);
    expect(json).not.toMatch(/\+1555|15550/);
    expect(p.sample.length).toBeLessThanOrEqual(5);
    for (const s of p.sample) expect(s.phone).toMatch(/^\*\*\*\d{3}$/);
    expect(await campaignCount(wsA)).toBe(before);
  });

  it('all_contacts', async () => {
    as('a');
    const r: any = await M.createWhatsAppBroadcastCampaign({ ...base('all'), audience: { type: 'all_contacts' } });
    expect(r.success).toBe(true);
    expect(r.recipientCount).toBe(3);
    expect(await queueCount(r.data.id)).toBe(3); // (f) queue rows == eligible
    const c = (await admin.from('whatsapp_broadcast_campaigns').select('*').eq('id', r.data.id).single()).data;
    expect(c.audience_type).toBe('all_contacts');
    expect(c.segment_id).toBeNull();
    expect(c.audience_snapshot.counts).toEqual({ matched: 7, eligible: 3 });
    expect(c.audience_snapshot.exclusions).toEqual({ no_phone: 1, invalid_number: 1, opted_out: 1, suppressed: 0, duplicate_phone: 1 });
    expect(c.compliance_ack.userId).toBe(c.created_by);
    expect(c.compliance_ack.textVersion).toBe('wa-attest-v1');
    expect(c.total_skipped_opt_out).toBe(1);
    await dispatchAndAssert(r.data.id, 3);
  });

  it('tags (all, then any)', async () => {
    as('a');
    const all: any = await M.createWhatsAppBroadcastCampaign({ ...base('tags-all'), audience: { type: 'tags', tags: [`vip${runId}`, `promo${runId}`], mode: 'all' } });
    expect(all.success).toBe(true); expect(all.recipientCount).toBe(1); expect(await queueCount(all.data.id)).toBe(1);
    await dispatchAndAssert(all.data.id, 1);
    const any: any = await M.createWhatsAppBroadcastCampaign({ ...base('tags-any'), audience: { type: 'tags', tags: [`vip${runId}`, `promo${runId}`], mode: 'any' } });
    expect(any.success).toBe(true); expect(any.recipientCount).toBe(2); expect(await queueCount(any.data.id)).toBe(2);
    await dispatchAndAssert(any.data.id, 2);
  });

  it('contact_fields', async () => {
    as('a');
    const r: any = await M.createWhatsAppBroadcastCampaign({ ...base('fields'), audience: { type: 'contact_fields', filters: [{ field: 'source', value: 'import' }] } });
    expect(r.success).toBe(true); expect(r.recipientCount).toBe(1); expect(await queueCount(r.data.id)).toBe(1);
    await dispatchAndAssert(r.data.id, 1);
    const phone: any = await M.createWhatsAppBroadcastCampaign({ ...base('hasphone'), audience: { type: 'contact_fields', filters: [{ field: 'has_phone', value: true }] } });
    expect(phone.success).toBe(true); expect(phone.recipientCount).toBe(3);
    await admin.from('whatsapp_dispatch_queue').delete().eq('campaign_id', phone.data.id);
    await admin.from('whatsapp_broadcast_campaigns').delete().eq('id', phone.data.id);
  });

  it('an audience with nobody eligible errors and names the reason', async () => {
    as('a');
    const r: any = await M.createWhatsAppBroadcastCampaign({ ...base('nobody'), audience: { type: 'contact_fields', filters: [{ field: 'source', value: 'does-not-exist' }] } });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/No eligible recipients/);
  });
});

describe('(c) attestation', () => {
  it('create without attestation is rejected and nothing is written', async () => {
    as('a');
    const before = await campaignCount(wsA);
    const r: any = await M.createWhatsAppBroadcastCampaign({ name: `aud noattest ${runId}`, messageBody: 'x', audience: { type: 'all_contacts' } });
    expect(r).toMatchObject({ success: false, code: 'consent_attestation_required' });
    expect(await campaignCount(wsA)).toBe(before);
    const { count } = await admin.from('whatsapp_dispatch_queue').select('id', { count: 'exact', head: true }).eq('workspace_id', wsA).eq('status', 'pending');
    expect(count).toBe(0);
  });
});

describe('(b) tenant isolation', () => {
  it("B cannot preview or create with A's segment id; nothing is written", async () => {
    // A segment is created for A here (also used by (d) below).
    segA = (await admin.from('segments').insert({ workspace_id: wsA, name: `seg ${runId}`, rule_group: { logic: 'AND', rules: [{ field: 'email', operator: 'contains', value: `wa-aud-${runId}-c` }] } }).select().single()).data.id;
    as('b');
    const before = await campaignCount(wsB);
    const p: any = await M.previewWhatsAppBroadcastAudience({ type: 'saved_segment', segmentId: segA });
    expect(p.success).toBe(false);
    const r: any = await M.createWhatsAppBroadcastCampaign({ ...base('b-seg'), audience: { type: 'saved_segment', segmentId: segA } });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/no longer exists|not found/i);
    expect(await campaignCount(wsB)).toBe(before);
  });

  it("B using A's tag NAME only matches B's own contact (never A's), and A's contacts are never queued for B", async () => {
    as('b');
    const p: any = await M.previewWhatsAppBroadcastAudience({ type: 'tags', tags: [`vip${runId}`], mode: 'all' });
    expect(p.success).toBe(true);
    expect(p.counts.matched).toBe(1); // B's own contact only
    const r: any = await M.createWhatsAppBroadcastCampaign({ ...base('b-tag'), audience: { type: 'tags', tags: [`vip${runId}`], mode: 'all' } });
    expect(r.success).toBe(true);
    const rows = (await admin.from('whatsapp_dispatch_queue').select('workspace_id,contact_id').eq('campaign_id', r.data.id)).data;
    expect(rows).toHaveLength(1);
    expect(rows[0].workspace_id).toBe(wsB);
    const owner = (await admin.from('contacts').select('workspace_id').eq('id', rows[0].contact_id).single()).data;
    expect(owner.workspace_id).toBe(wsB);
    await admin.from('whatsapp_dispatch_queue').delete().eq('campaign_id', r.data.id);
    await admin.from('whatsapp_broadcast_campaigns').delete().eq('id', r.data.id);
  });

  it("B's segment options never include A's segments", async () => {
    as('b');
    const o: any = await M.listAudienceSegmentOptions();
    expect(o.success).toBe(true);
    expect(o.data).toEqual([]);
  });
});

describe('(d) a saved-segment audience still works', () => {
  it('options list id+name, create via audience and via the legacy segmentId input', async () => {
    as('a');
    const o: any = await M.listAudienceSegmentOptions();
    expect(o.data).toEqual([{ id: segA, name: `seg ${runId}` }]);
    const r: any = await M.createWhatsAppBroadcastCampaign({ ...base('seg'), audience: { type: 'saved_segment', segmentId: segA } });
    expect(r.success).toBe(true);
    expect(r.recipientCount).toBe(3);
    expect(await queueCount(r.data.id)).toBe(3);
    const c = (await admin.from('whatsapp_broadcast_campaigns').select('segment_id,audience_type').eq('id', r.data.id).single()).data;
    expect(c).toEqual({ segment_id: segA, audience_type: 'saved_segment' });
    await dispatchAndAssert(r.data.id, 3);
    const legacy: any = await M.createWhatsAppBroadcastCampaign({ ...base('legacy'), segmentId: segA });
    expect(legacy.success).toBe(true);
    expect(legacy.recipientCount).toBe(3);
    expect((await admin.from('whatsapp_broadcast_campaigns').select('audience_type').eq('id', legacy.data.id).single()).data.audience_type).toBe('legacy');
    await dispatchAndAssert(legacy.data.id, 3);
  });
});

describe('(e) a forced failed queue chunk still removes the campaign', () => {
  it('no campaign and no queue rows remain', async () => {
    as('a');
    const before = await campaignCount(wsA);
    flags.failQueueUpsert = true;
    const r: any = await M.createWhatsAppBroadcastCampaign({ ...base('failchunk'), audience: { type: 'all_contacts' } });
    flags.failQueueUpsert = false;
    expect(r.success).toBe(false);
    expect(await campaignCount(wsA)).toBe(before);
    const { data } = await admin.from('whatsapp_broadcast_campaigns').select('id').eq('workspace_id', wsA).like('name', `aud failchunk ${runId}`);
    expect(data).toHaveLength(0);
    const { count } = await admin.from('whatsapp_dispatch_queue').select('id', { count: 'exact', head: true }).eq('workspace_id', wsA).eq('status', 'pending');
    expect(count).toBe(0);
  });
});
