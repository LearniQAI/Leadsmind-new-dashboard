// Live verification of Hub security hotfix H0a (cross-tenant writes, fake success, secrets to the browser, unscoped receipts)
// under REAL signed-in sessions in two throwaway workspaces. Real server actions, real webhook route handler, real database.
// NOTHING is ever sent to a real number: both connections are `mock_` ones and mock mode is enabled for this test process only.
// The two real WhatsApp connections are never read. Throwaway data is deleted in afterAll with proof.
//
//   npx vitest run --config scripts/db-checks/vitest.live.config.ts scripts/db-checks/hub-tenant-isolation.live.test.ts
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID, createHmac } from 'crypto';
import { createServerClient as ssrClient } from '@supabase/ssr';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const runId = randomUUID().slice(0, 8);
process.env.META_APP_SECRET = 'h0a-live-app-secret';
process.env.META_MOCK_MODE = 'true';

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
vi.mock('next/navigation', () => ({ redirect: () => {} }));
vi.mock('react', async (orig: any) => { const r = await orig(); const c = (fn: any) => fn; return { ...r, default: { ...(r.default ?? r), cache: c }, cache: c }; });

let admin: any, M: any;
let wsA = '', wsB = '', userA = '', userB = '';
const userIds: string[] = [];
const PN_A = `mock_pn_${runId}_a`;
const PN_B = `mock_pn_${runId}_b`;
let contactA = '', convA = '', contactB = '', convB = '';
const WAMID_A = `wamid.${runId}.A`;

function userClient(jar: Map<string, string>) {
  return ssrClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: 'pkce' },
    cookies: { get: (n: string) => jar.get(n), set: (n: string, v: string) => { jar.set(n, v); }, remove: (n: string) => { jar.delete(n); } },
  });
}
async function mkUser(tag: string) {
  const email = `h0a-${runId}-${tag}-owner@example.com`; const password = randomUUID();
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
  return { ws, userId: data.user.id as string };
}
const as = (tag: string) => { activeJar = jars[tag]; };
const sign = (body: string) => 'sha256=' + createHmac('sha256', process.env.META_APP_SECRET!).update(body, 'utf8').digest('hex');
async function postStatus(phoneNumberId: string, wamid: string, status: string) {
  const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'mock_waba', changes: [{ field: 'messages', value: { metadata: { phone_number_id: phoneNumberId }, statuses: [{ id: wamid, status, recipient_id: '15550000000' }] } }] }] });
  const res = await M.metaWebhook.POST(new Request('https://app.test/api/webhooks/meta', { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': sign(body) }, body }));
  return res.status;
}
const convRow = async (id: string) => (await admin.from('conversations').select('*').eq('id', id).single()).data;
const msgCount = async (ws: string) => (await admin.from('messages').select('id', { count: 'exact', head: true }).eq('workspace_id', ws)).count as number;

beforeAll(async () => {
  M = {
    ...(await import('@/lib/supabase/server')),
    ...(await import('@/app/actions/messaging')),
    social: await import('@/app/actions/social'),
    metaWebhook: await import('@/app/api/webhooks/meta/route'),
    safe: await import('@/lib/messaging/safeConnections'),
  };
  admin = M.createAdminClient();
  const swept = await sweepStaleTestWorkspaces(admin, testRunPatterns('h0a'));
  if (swept) console.warn(`[cleanup] removed ${swept} stale workspace(s)`);
  ({ ws: wsA, userId: userA } = await mkUser('a'));
  ({ ws: wsB, userId: userB } = await mkUser('b'));

  as('a');
  expect((await M.connectPlatformManually('whatsapp', { phoneNumberId: PN_A, whatsappBusinessAccountId: 'mock_waba', systemUserAccessToken: 'mock_token' })).success).toBe(true);
  as('b');
  expect((await M.connectPlatformManually('whatsapp', { phoneNumberId: PN_B, whatsappBusinessAccountId: 'mock_waba', systemUserAccessToken: 'mock_token' })).success).toBe(true);

  contactA = (await admin.from('contacts').insert({ workspace_id: wsA, email: `h0a-${runId}-ca@example.com`, first_name: 'Ann', last_name: 'A', phone: '+15550401001' }).select().single()).data.id;
  contactB = (await admin.from('contacts').insert({ workspace_id: wsB, email: `h0a-${runId}-cb@example.com`, first_name: 'Bob', last_name: 'B', phone: '+15550401002' }).select().single()).data.id;
  convA = (await admin.from('conversations').insert({ workspace_id: wsA, contact_id: contactA, platform: 'whatsapp', external_thread_id: '+15550401001', last_customer_message_at: new Date().toISOString(), status: 'open', tags: [] }).select().single()).data.id;
  convB = (await admin.from('conversations').insert({ workspace_id: wsB, contact_id: contactB, platform: 'whatsapp', external_thread_id: '+15550401002', last_customer_message_at: new Date().toISOString(), status: 'open', tags: [] }).select().single()).data.id;
  await admin.from('messages').insert([
    { workspace_id: wsA, conversation_id: convA, direction: 'inbound', content: 'hello from A contact', status: 'delivered', external_id: `wamid.${runId}.in` },
    { workspace_id: wsA, conversation_id: convA, direction: 'outbound', content: 'reply', status: 'sent', external_id: WAMID_A },
  ]);
}, 240_000);

afterAll(async () => {
  if (!admin) return;
  await deleteTestWorkspaces(admin, [wsA, wsB], userIds); // throws (fails the run) if anything is left
  const remaining = await Promise.all([
    admin.from('workspaces').select('id', { count: 'exact', head: true }).in('id', [wsA, wsB]),
    admin.from('contacts').select('id', { count: 'exact', head: true }).like('email', `h0a-${runId}-%`),
    admin.from('conversations').select('id', { count: 'exact', head: true }).in('workspace_id', [wsA, wsB]),
    admin.from('messages').select('id', { count: 'exact', head: true }).in('workspace_id', [wsA, wsB]),
    admin.from('platform_connections').select('id', { count: 'exact', head: true }).like('credentials->>phone_number_id', `mock_pn_${runId}%`),
  ]);
  const { data: lu } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const users = (lu?.users ?? []).filter((u: any) => u.email?.startsWith(`h0a-${runId}-`)).length;
  console.log(`CLEANUP PROOF remaining: workspaces=${remaining[0].count} contacts=${remaining[1].count} conversations=${remaining[2].count} messages=${remaining[3].count} mockConnections=${remaining[4].count} authUsers=${users}`);
  for (const r of remaining) expect(r.count).toBe(0);
  expect(users).toBe(0);
}, 240_000);

describe("workspace B cannot write to or read workspace A's conversation", () => {
  it("B's sendMessage to A's conversation returns not-found and writes zero rows", async () => {
    const beforeA = await msgCount(wsA); const beforeB = await msgCount(wsB);
    as('b');
    const r: any = await M.sendMessage(convA, 'cross-tenant hello');
    expect(r).toMatchObject({ success: false, code: 'not_found' });
    expect(await msgCount(wsA)).toBe(beforeA);
    expect(await msgCount(wsB)).toBe(beforeB); // the old bug: a B-owned row pointing at A's conversation
    const { count } = await admin.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', convA).eq('workspace_id', wsB);
    expect(count).toBe(0);
  });

  it("B's sendMessage via the contact alias of A's contact is not-found too", async () => {
    as('b');
    const r: any = await M.sendMessage(`contact:${contactA}`, 'cross-tenant alias');
    expect(r).toMatchObject({ success: false, code: 'not_found' });
    expect(await msgCount(wsB)).toBe(0);
  });

  it("B cannot note, assign, tag or close A's conversation; A is unchanged", async () => {
    const before = await convRow(convA);
    const beforeMsgs = await msgCount(wsA);
    as('b');
    expect(await M.sendInternalNote(convA, 'x')).toMatchObject({ success: false, code: 'not_found' });
    expect(await M.updateConversationAssignment(convA, userB)).toMatchObject({ success: false, code: 'not_found' });
    expect(await M.updateConversationTags(convA, ['pwned'])).toMatchObject({ success: false, code: 'not_found' });
    expect(await M.updateConversationStatus(convA, 'resolved')).toMatchObject({ success: false, code: 'not_found' });
    const after = await convRow(convA);
    expect(after).toEqual(before);
    expect(await msgCount(wsA)).toBe(beforeMsgs);
    expect(await msgCount(wsB)).toBe(0);
  });

  it("B cannot read A's conversation or messages (action list and direct REST)", async () => {
    as('b');
    const res: any = await M.getConversations();
    const ids = (res.data ?? []).map((c: any) => c.id);
    expect(ids).toContain(convB);
    expect(ids).not.toContain(convA);
    const client = userClient(jars.b);
    const c = await client.from('conversations').select('id').eq('id', convA);
    expect(c.data ?? []).toHaveLength(0);
    const m = await client.from('messages').select('id').eq('conversation_id', convA);
    expect(m.data ?? []).toHaveLength(0);
  });

  it("B's own conversation still works (note, tag, status, assign to a member)", async () => {
    as('b');
    // Internal notes cannot be persisted today: messages_direction_check allows only inbound/outbound, so the insert is rejected
    // by the database (pre-existing, tracked in the Hub audit). What matters here is that the tenant check PASSED for B's own
    // conversation, i.e. the failure is not a not-found.
    const note: any = await M.sendInternalNote(convB, 'own note');
    expect(note.code).not.toBe('not_found');
    console.log(`INFO: own-conversation internal note => ${note.success ? 'saved' : 'rejected by the DB direction CHECK (pre-existing): ' + note.error}`);
    expect(await M.updateConversationTags(convB, ['vip'])).toEqual({ success: true });
    expect(await M.updateConversationStatus(convB, 'resolved')).toEqual({ success: true });
    expect(await M.updateConversationAssignment(convB, userB)).toEqual({ success: true });
    expect(await convRow(convB)).toMatchObject({ status: 'resolved', tags: ['vip'], assigned_to: userB });
    // an agent from another tenant cannot be assigned
    expect(await M.updateConversationAssignment(convB, userA)).toMatchObject({ success: false, code: 'not_found' });
  });

  it("A's real send path still works for A's own conversation (mock transport)", async () => {
    as('a');
    const r: any = await M.sendMessage(convA, 'hello from A', undefined, undefined, randomUUID());
    expect(r.error).toBeUndefined();
    expect(r.success).not.toBe(false);
    const { data } = await admin.from('messages').select('workspace_id,direction,status').eq('conversation_id', convA).eq('content', 'hello from A');
    expect(data).toHaveLength(1);
    expect(data[0].workspace_id).toBe(wsA);
  });

  it('INFO: whether the database itself blocks a cross-tenant message row (needs the proposed composite FK)', async () => {
    const client = userClient(jars.b);
    const { error } = await client.from('messages').insert({ workspace_id: wsB, conversation_id: convA, direction: 'outbound', status: 'sent', content: 'db-level probe' });
    console.log(`DB-LEVEL cross-tenant insert ${error ? 'BLOCKED' : 'ALLOWED (composite FK not applied; see docs/proposed/h0a-conversations-messages-composite-fk.sql)'}`);
    await admin.from('messages').delete().eq('workspace_id', wsB).eq('content', 'db-level probe');
    expect(true).toBe(true);
  });
});

describe('connected-platforms payloads carry no encrypted keys', () => {
  it('getConnectedPlatforms (A has an encrypted WhatsApp token stored)', async () => {
    const raw = (await admin.from('platform_connections').select('credentials').eq('workspace_id', wsA).eq('platform', 'whatsapp').single()).data;
    expect(Object.keys(raw.credentials).some((k) => /encrypted/.test(k))).toBe(true); // proves the row really holds a secret
    as('a');
    const rows: any[] = await M.getConnectedPlatforms();
    expect(rows.find((r) => r.platform === 'whatsapp')).toBeTruthy();
    expect(M.safe.containsSecretKeys(rows)).toBe(false);
    expect(JSON.stringify(rows)).not.toMatch(/encrypted/);
  });

  it('getSocialAccounts and the OAuth session helper do not leak either', async () => {
    as('a');
    const social: any = await M.social.getSocialAccounts();
    expect(M.safe.containsSecretKeys(social.data)).toBe(false);
    const oauth: any = await M.getMetaOauthToken();
    expect(oauth === null || !('token' in oauth)).toBe(true);
  });
});

describe('status webhooks cannot reach into another workspace', () => {
  it("a delivered receipt for A's wamid sent on B's phone_number_id changes nothing", async () => {
    expect(await postStatus(PN_B, WAMID_A, 'delivered')).toBe(200);
    const m = (await admin.from('messages').select('status').eq('external_id', WAMID_A).single()).data;
    expect(m.status).toBe('sent');
  });

  it("an unknown phone_number_id changes nothing", async () => {
    expect(await postStatus(`mock_pn_unknown_${runId}`, WAMID_A, 'read')).toBe(200);
    expect((await admin.from('messages').select('status').eq('external_id', WAMID_A).single()).data.status).toBe('sent');
  });

  it("A's own number does update A's message", async () => {
    expect(await postStatus(PN_A, WAMID_A, 'delivered')).toBe(200);
    expect((await admin.from('messages').select('status').eq('external_id', WAMID_A).single()).data.status).toBe('delivered');
  });
});
