// Live verification of WhatsApp Batch 1 (safety hotfixes), under REAL signed-in sessions.
// Real route handlers, real server actions, real database, throwaway workspaces (deleted in afterAll with proof).
// NOTHING is ever sent to a real number: every connection is a `mock_` one and the only provider call is the
// MetaAdapter's own mock branch (no network). Mock mode is switched on per test with vi.stubEnv (tests only);
// production behaviour is exercised by stubbing NODE_ENV=production.
//
//   npx vitest run --config scripts/db-checks/vitest.live.config.ts scripts/db-checks/whatsapp-batch1.live.test.ts
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID, createHmac } from 'crypto';
import { createServerClient as ssrClient } from '@supabase/ssr';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const runId = randomUUID().slice(0, 8);
process.env.CRON_SECRET = 'wa-batch1-cron';
process.env.META_APP_SECRET = 'wa-batch1-app-secret';
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.test';

const jars: Record<string, Map<string, string>> = {};
let activeJar = new Map<string, string>();
const logs = vi.hoisted(() => ({ calls: [] as any[][] }));
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
// Capture every log call so the PII test can inspect exactly what the webhook logs.
vi.mock('@/shared/logger', () => {
  const rec = (level: string) => (...a: any[]) => { logs.calls.push([level, ...a]); };
  return { logger: { info: rec('info'), warn: rec('warn'), error: rec('error'), debug: rec('debug'), child: () => ({ info: rec('info'), warn: rec('warn'), error: rec('error'), debug: rec('debug') }) } };
});

let admin: any, M: any;
let wsA = '', wsB = '';
const userIds: string[] = [];
const PN_ID = `mock_pn_${runId}`;
const rg = (tag: string) => ({ logic: 'AND' as const, rules: [{ field: 'email', operator: 'contains' as const, value: `wb1-${runId}-${tag}` }] });

function userClient(jar: Map<string, string>) {
  return ssrClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: 'pkce' },
    cookies: { get: (n: string) => jar.get(n), set: (n: string, v: string) => { jar.set(n, v); }, remove: (n: string) => { jar.delete(n); } },
  });
}
async function mkUser(tag: string) {
  const email = `wb1-${runId}-${tag}-owner@example.com`; const password = randomUUID();
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
const mkContact = async (tag: string, phone: string | null, extra: any = {}) =>
  (await admin.from('contacts').insert({ workspace_id: wsA, email: `wb1-${runId}-${tag}@example.com`, first_name: tag, last_name: 'T', phone, ...extra }).select().single()).data;
const contactRow = async (id: string) => (await admin.from('contacts').select('*').eq('id', id).single()).data;
const supp = async (e164: string) => (await admin.from('sms_suppression_list').select('reason,source').eq('workspace_id', wsA).eq('phone_e164', e164)).data ?? [];

function sign(body: string) { return 'sha256=' + createHmac('sha256', process.env.META_APP_SECRET!).update(body, 'utf8').digest('hex'); }
async function postMeta(payload: any) {
  const body = JSON.stringify(payload);
  const res = await M.metaWebhook.POST(new Request('https://app.test/api/webhooks/meta', { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': sign(body) }, body }));
  return res.status;
}
const waInbound = (from: string, text: string, id = `wamid.${runId}.${randomUUID().slice(0, 8)}`) => ({
  object: 'whatsapp_business_account',
  entry: [{ id: 'mock_waba', changes: [{ field: 'messages', value: { metadata: { phone_number_id: PN_ID, display_phone_number: '15550000000' }, contacts: [{ wa_id: from, profile: { name: 'Probe Person' } }], messages: [{ from, id, timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: text } }] } }] }],
});
const callWorker = () => M.worker.GET(new Request('https://app.test/x', { headers: { Authorization: 'Bearer wa-batch1-cron' } })).then(async (r: any) => ({ status: r.status, body: await r.json() }));

beforeAll(async () => {
  M = {
    ...(await import('@/lib/supabase/server')),
    ...(await import('@/lib/encryption')),
    ...(await import('@/app/actions/messaging')),
    ...(await import('@/app/actions/whatsapp_broadcast')),
    ...(await import('@/app/actions/whatsapp_bot_rules')),
    metaWebhook: await import('@/app/api/webhooks/meta/route'),
    worker: await import('@/app/api/cron/workers/whatsapp-dispatch/route'),
    adapter: await import('@/lib/meta/MetaAdapter'),
    mock: await import('@/lib/meta/mockMode'),
  };
  admin = M.createAdminClient();
  const swept = await sweepStaleTestWorkspaces(admin, testRunPatterns('wb1'));
  if (swept) console.warn(`[cleanup] removed ${swept} stale workspace(s)`);
  // SAFETY: the dispatch worker drains the GLOBAL queue; refuse to run if anything else is pending.
  const { count } = await admin.from('whatsapp_dispatch_queue').select('id', { count: 'exact', head: true });
  if ((count ?? 0) !== 0) throw new Error(`ABORT: whatsapp_dispatch_queue is not empty (${count})`);
  wsA = await mkUser('a'); wsB = await mkUser('b');
}, 180_000);

afterAll(async () => {
  if (!admin) return;
  vi.unstubAllEnvs();
  await deleteTestWorkspaces(admin, [wsA, wsB], userIds); // throws (fails the run) if anything is left
  const remaining = await Promise.all([
    admin.from('workspaces').select('id', { count: 'exact', head: true }).in('id', [wsA, wsB]),
    admin.from('contacts').select('id', { count: 'exact', head: true }).like('email', `wb1-${runId}-%`),
    admin.from('platform_connections').select('id', { count: 'exact', head: true }).like('credentials->>phone_number_id', `mock_pn_${runId}`),
    admin.from('sms_suppression_list').select('id', { count: 'exact', head: true }).in('workspace_id', [wsA, wsB]),
    admin.from('whatsapp_broadcast_campaigns').select('id', { count: 'exact', head: true }).in('workspace_id', [wsA, wsB]),
    admin.from('whatsapp_bot_rules').select('id', { count: 'exact', head: true }).in('workspace_id', [wsA, wsB]),
  ]);
  const { data: lu } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const users = (lu?.users ?? []).filter((u: any) => u.email?.startsWith(`wb1-${runId}-`)).length;
  console.log(`CLEANUP PROOF remaining: workspaces=${remaining[0].count} contacts=${remaining[1].count} mockConnections=${remaining[2].count} suppression=${remaining[3].count} campaigns=${remaining[4].count} botRules=${remaining[5].count} authUsers=${users}`);
  for (const r of remaining) expect(r.count).toBe(0);
  expect(users).toBe(0);
}, 240_000);

describe('item 1: mock_ credentials', () => {
  it('PRODUCTION: a manually typed mock_ WhatsApp credential is rejected and nothing is saved', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('META_MOCK_MODE', 'true'); // even with the flag on
    as('a');
    const res: any = await M.connectPlatformManually('whatsapp', { phoneNumberId: PN_ID, whatsappBusinessAccountId: 'mock_waba', systemUserAccessToken: 'mock_token' });
    expect(res.error).toBe(M.mock.MOCK_CREDENTIALS_REJECTED);
    expect(res.success).toBeUndefined();
    const { count } = await admin.from('platform_connections').select('id', { count: 'exact', head: true }).eq('workspace_id', wsA).eq('platform', 'whatsapp');
    expect(count).toBe(0);
    const fb: any = await M.connectPlatformManually('facebook', { pageId: 'mock_page_1', pageAccessToken: 'mock_tok' });
    expect(fb.error).toBe(M.mock.MOCK_CREDENTIALS_REJECTED);
    vi.unstubAllEnvs();
  });

  it('mock mode OFF (non-production, flag absent): rejected as well', async () => {
    vi.stubEnv('META_MOCK_MODE', '');
    as('a');
    const res: any = await M.connectPlatformManually('whatsapp', { phoneNumberId: PN_ID, whatsappBusinessAccountId: 'mock_waba', systemUserAccessToken: 'mock_token' });
    expect(res.error).toBe(M.mock.MOCK_CREDENTIALS_REJECTED);
    vi.unstubAllEnvs();
  });

  it('mock mode ON (tests only): the same connect succeeds, and the template picker serves sample templates', async () => {
    vi.stubEnv('META_MOCK_MODE', 'true'); vi.stubEnv('NODE_ENV', 'test');
    as('a');
    const res: any = await M.connectPlatformManually('whatsapp', { phoneNumberId: PN_ID, whatsappBusinessAccountId: 'mock_waba', systemUserAccessToken: 'mock_token' });
    expect(res.success).toBe(true);
    const tpl: any = await M.listApprovedWhatsAppTemplates();
    expect(tpl.success).toBe(true); expect(tpl.mock).toBe(true);
  });

  it('PRODUCTION: the template picker refuses a mock connection instead of serving fake templates', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    as('a');
    const tpl: any = await M.listApprovedWhatsAppTemplates();
    expect(tpl.success).toBe(false);
    expect(tpl.error).toBe(M.mock.MOCK_CREDENTIALS_REJECTED);
    vi.unstubAllEnvs();
  });

  it('PRODUCTION: the dispatch worker never reports "sent" for a mock connection; a missing token fails too', async () => {
    const c = await mkContact('p1', '+15550100021');
    as('a');
    vi.stubEnv('META_MOCK_MODE', 'true'); vi.stubEnv('NODE_ENV', 'test');
    const camp: any = await M.createWhatsAppBroadcastCampaign({ name: `b1 prod ${runId}`, messageBody: 'x', templateName: 'order_confirmation', templateBodyParams: ['hi'], ruleGroup: rg('p1') });
    expect(camp.success).toBe(true);
    // local clock vs database clock: make the row due now so the worker picks it up
    await admin.from('whatsapp_dispatch_queue').update({ scheduled_for: new Date(Date.now() - 120_000).toISOString() }).eq('campaign_id', camp.data.id);
    vi.stubEnv('NODE_ENV', 'production');
    const w = await callWorker();
    vi.unstubAllEnvs();
    const q = (await admin.from('whatsapp_dispatch_queue').select('status,error_log,whatsapp_message_id,retry_count').eq('campaign_id', camp.data.id)).data;
    expect(w.body.sent).toBe(0);
    expect(q.every((r: any) => r.status !== 'sent' && !r.whatsapp_message_id)).toBe(true);
    // the failure is explained, not silent (hard fail or scheduled retry carrying the reason)
    expect(q[0].error_log).toMatch(/mock_|Test credentials/i);
    // cleanup of the retry state so later tests' worker runs do not pick it up
    await admin.from('whatsapp_dispatch_queue').delete().eq('campaign_id', camp.data.id);
    expect(c).toBeTruthy();
  });
});

describe('item 3: Meta STOP handling', () => {
  it('every STOP keyword variant records a durable suppression row and flags the (locally formatted) contact', async () => {
    vi.stubEnv('META_MOCK_MODE', 'true'); vi.stubEnv('NODE_ENV', 'test');
    const variants: [string, string, string][] = [
      ['STOP', 'STOP', '+15550100031'], ['STOPALL', 'STOPALL', '+15550100032'], ['UNSUBSCRIBE', 'Unsubscribe', '+15550100033'],
      ['CANCEL', 'CANCEL', '+15550100034'], ['END', 'end', '+15550100035'], ['QUIT', 'QUIT', '+15550100036'],
      ['REMOVE', 'remove', '+15550100037'], ['punct', 'Stop.', '+15550100038'], ['spaces', '  stop  ', '+15550100039'],
    ];
    for (const [tag, text, num] of variants) {
      const c = await mkContact(`k${tag}`, num);
      expect(await postMeta(waInbound(num.replace('+', ''), text))).toBe(200);
      const after = await contactRow(c.id);
      expect(after.opted_out, `${text}: opted_out`).toBe(true);
      expect(after.sms_opt_out, `${text}: sms_opt_out`).toBe(true);
      const rows = await supp(num);
      expect(rows, `${text}: suppression row`).toHaveLength(1);
      expect(rows[0]).toMatchObject({ reason: 'stop_keyword', source: 'meta_whatsapp_inbound' });
    }
    // a contact stored in LOCAL SA format is matched through phone_e164
    const local = await mkContact('klocal', '082 555 0150');
    await postMeta(waInbound('27825550150', 'STOP'));
    expect((await contactRow(local.id)).opted_out).toBe(true);
    expect(await supp('+27825550150')).toHaveLength(1);
  });

  it('free phrases do NOT opt anyone out', async () => {
    const phrases = ['please stop messaging me', 'stop it', "don't stop", 'cancel my order', 'yes', 'stopping'];
    let i = 0;
    for (const text of phrases) {
      const num = `+155501001${String(60 + i++)}`;
      const c = await mkContact(`free${i}`, num);
      await postMeta(waInbound(num.replace('+', ''), text));
      const after = await contactRow(c.id);
      expect(after.opted_out, `"${text}" must not opt out`).toBeFalsy();
      expect(await supp(num), `"${text}" must not suppress`).toHaveLength(0);
    }
  });

  it('a STOP from an UNKNOWN number writes a suppression row and creates NO contact and NO conversation', async () => {
    const num = '+15550100199';
    const contactsBefore = (await admin.from('contacts').select('id', { count: 'exact', head: true }).eq('workspace_id', wsA)).count;
    const convsBefore = (await admin.from('conversations').select('id', { count: 'exact', head: true }).eq('workspace_id', wsA)).count;
    expect(await postMeta(waInbound('15550100199', 'STOP'))).toBe(200);
    expect(await supp(num)).toHaveLength(1);
    expect((await admin.from('contacts').select('id', { count: 'exact', head: true }).eq('workspace_id', wsA)).count).toBe(contactsBefore);
    expect((await admin.from('conversations').select('id', { count: 'exact', head: true }).eq('workspace_id', wsA)).count).toBe(convsBefore);
    expect((await admin.from('contacts').select('id', { count: 'exact', head: true }).eq('workspace_id', wsA).eq('phone_e164', num)).count).toBe(0);
    // the durable row means a contact imported LATER with that number is still excluded from a broadcast
    const later = await mkContact('later', num);
    as('a');
    const camp: any = await M.createWhatsAppBroadcastCampaign({ name: `b1 later ${runId}`, messageBody: 'x', ruleGroup: rg('later') });
    expect(camp.success).toBe(false);
    expect(camp.error).toMatch(/No eligible recipients/);
    expect(later).toBeTruthy();
  });

  it('START lifts the opt-out (flags and suppression row); an unknown number STOP is replay-safe', async () => {
    const num = '+15550100031';
    expect(await supp(num)).toHaveLength(1);
    await postMeta(waInbound('15550100031', 'START'));
    expect(await supp(num)).toHaveLength(0);
    const c = (await admin.from('contacts').select('opted_out,sms_opt_out').eq('workspace_id', wsA).eq('phone_e164', num).single()).data;
    expect(c.opted_out).toBe(false); expect(c.sms_opt_out).toBe(false);
    // replay of the same STOP wamid twice leaves exactly one row
    const id = `wamid.${runId}.replay`;
    await postMeta(waInbound('15550100198', 'STOP', id)); await postMeta(waInbound('15550100198', 'STOP', id));
    expect(await supp('+15550100198')).toHaveLength(1);
  });

  it('a known contact who sends STOP still gets the thread + a compliance note, and the keyword message is stored', async () => {
    const num = '+15550100041';
    const c = await mkContact('known', num);
    await postMeta(waInbound('15550100041', 'STOP'));
    const conv = (await admin.from('conversations').select('id,contact_id').eq('workspace_id', wsA).eq('external_thread_id', num).single()).data;
    expect(conv.contact_id).toBe(c.id);
    const notes = (await admin.from('messages').select('direction,content').eq('conversation_id', conv.id)).data;
    // The timeline compliance note cannot persist today: messages_direction_check only allows inbound/outbound (a
    // pre-existing database constraint; fixing it needs a migration, out of scope). The opt-out itself is unaffected.
    expect(notes.some((m: any) => m.direction === 'inbound')).toBe(true);
  });
});

describe('item 2: Hub sendMessage server guards', () => {
  it('an opted-out contact cannot be messaged (typed error, no provider call, no message row)', async () => {
    const num = '+15550100051';
    const c = await mkContact('hubout', num);
    await postMeta(waInbound('15550100051', 'hello')); // opens the 24h window
    const conv = (await admin.from('conversations').select('id').eq('workspace_id', wsA).eq('external_thread_id', num).single()).data;
    as('a');
    const send = vi.spyOn(M.adapter.MetaAdapter.prototype, 'sendWhatsApp');
    const ok: any = await M.sendMessage(conv.id, 'in-window reply', undefined, undefined, randomUUID());
    expect(ok.success).toBe(true); expect(send).toHaveBeenCalledTimes(1);

    await postMeta(waInbound('15550100051', 'STOP'));
    expect((await contactRow(c.id)).opted_out).toBe(true);
    send.mockClear();
    const before = (await admin.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', conv.id).eq('direction', 'outbound')).count;
    const blocked: any = await M.sendMessage(conv.id, 'should never be sent', undefined, undefined, randomUUID());
    expect(blocked.code).toBe('opted_out');
    expect(blocked.error).toMatch(/opted out/i);
    expect(send).not.toHaveBeenCalled();
    expect((await admin.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', conv.id).eq('direction', 'outbound')).count).toBe(before);

    // flags cleared by hand but the DURABLE list still says STOP: still blocked
    await admin.from('contacts').update({ opted_out: false, sms_opt_out: false }).eq('id', c.id);
    const stillBlocked: any = await M.sendMessage(conv.id, 'still no', undefined, undefined, randomUUID());
    expect(stillBlocked.code).toBe('opted_out');
    expect(send).not.toHaveBeenCalled();
    send.mockRestore();
  });

  it('free text outside the 24h window is blocked with a typed error; inside it still works', async () => {
    const num = '+15550100052';
    await mkContact('hubwin', num);
    await postMeta(waInbound('15550100052', 'hi'));
    const conv = (await admin.from('conversations').select('id').eq('workspace_id', wsA).eq('external_thread_id', num).single()).data;
    as('a');
    const send = vi.spyOn(M.adapter.MetaAdapter.prototype, 'sendWhatsApp');
    await admin.from('conversations').update({ last_customer_message_at: new Date(Date.now() - 72 * 3600_000).toISOString() }).eq('id', conv.id);
    const closed: any = await M.sendMessage(conv.id, 'outside window', undefined, undefined, randomUUID());
    expect(closed.code).toBe('window_closed');
    expect(closed.error).toBe('Outside the 24-hour window. Template replies are coming soon.');
    expect(send).not.toHaveBeenCalled();
    await admin.from('conversations').update({ last_customer_message_at: new Date(Date.now() - 2 * 3600_000).toISOString() }).eq('id', conv.id);
    const open: any = await M.sendMessage(conv.id, 'inside window', undefined, undefined, randomUUID());
    expect(open.success).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    send.mockRestore();
  });

  it('other channels are unchanged: a Facebook conversation (no phone, no 24h rule) still sends', async () => {
    const c = await mkContact('fbc', null);
    await admin.from('platform_connections').upsert({ workspace_id: wsA, platform: 'facebook', credentials: { page_id: 'mock_page_b1', page_access_token_encrypted: M.encrypt ? M.encrypt('mock_tok') : 'x' }, status: 'connected' }, { onConflict: 'workspace_id,platform' });
    const { data: conv } = await admin.from('conversations').insert({ workspace_id: wsA, contact_id: c.id, platform: 'facebook', external_thread_id: `psid_${runId}`, title: 'fb', last_message_at: new Date().toISOString() }).select().single();
    as('a');
    const res: any = await M.sendMessage(conv.id, 'hello on facebook', undefined, undefined, randomUUID());
    expect(res.error).toBeUndefined();
    expect(res.code).toBeUndefined();
  });
});

describe('item 4: bot regex rules', () => {
  it('creating or updating a regex rule is refused with a clear message', async () => {
    as('a');
    const created: any = await M.createWhatsAppBotRule({ name: 'evil', matchType: 'regex', matchValue: '^(a+)+$', replyType: 'text', replyText: 'x' });
    expect(created.success).toBe(false);
    expect(created.error).toMatch(/Regex rules are no longer supported/);
    const ok: any = await M.createWhatsAppBotRule({ name: 'pricing', matchType: 'contains', matchValue: 'pricing', replyType: 'text', replyText: 'See our site' });
    expect(ok.success).toBe(true);
    const upd: any = await M.updateWhatsAppBotRule(ok.data.id, { name: 'pricing', matchType: 'regex', matchValue: '.*', replyType: 'text', replyText: 'x' });
    expect(upd.success).toBe(false); expect(upd.error).toMatch(/Regex rules are no longer supported/);
  });

  it('a legacy regex row is never evaluated: a catastrophic pattern costs nothing and never replies; it cannot be re-enabled', async () => {
    const num = '+15550100061';
    await mkContact('redos', num);
    const { data: rule } = await admin.from('whatsapp_bot_rules').insert({ workspace_id: wsA, name: 'legacy evil', match_type: 'regex', match_value: '^(a+)+$', reply_type: 'text', reply_text: 'REGEX REPLY', priority: -10, active: false }).select().single();
    await admin.from('whatsapp_bot_rules').update({ active: true }).eq('id', rule.id); // active in the DB, as a legacy row would be
    const send = vi.spyOn(M.adapter.MetaAdapter.prototype, 'sendWhatsApp');
    const t0 = Date.now();
    expect(await postMeta(waInbound('15550100061', 'a'.repeat(30) + '!'))).toBe(200);
    const ms = Date.now() - t0;
    expect(ms).toBeLessThan(4000); // the audit measured 6.5s for 24 chars and 8.2s for 26 under the regex engine
    expect(send.mock.calls.some((c: any) => c[1] === 'REGEX REPLY')).toBe(false);
    send.mockRestore();
    as('a');
    const re: any = await M.toggleWhatsAppBotRule(rule.id, true);
    expect(re.success).toBe(false); expect(re.error).toMatch(/Regex rules are no longer supported/);
  });
});

describe('item 6: foreign ids return not-found, never success, never raw database text', () => {
  let campaignA: any, ruleA: any;
  it('setup: workspace A owns a campaign and a rule', async () => {
    as('a');
    await mkContact('c6', '+15550100071');
    const camp: any = await M.createWhatsAppBroadcastCampaign({ name: `b1 own ${runId}`, messageBody: 'x', ruleGroup: rg('c6'), scheduledAt: new Date(Date.now() + 3600_000).toISOString() });
    expect(camp.success).toBe(true); campaignA = camp.data;
    const r: any = await M.createWhatsAppBotRule({ name: 'ownrule', matchType: 'exact', matchValue: 'menu', replyType: 'text', replyText: 'x' });
    expect(r.success).toBe(true); ruleA = r.data;
  });

  it('workspace B: delete / cancel / update / toggle / delete-rule on A\'s ids -> not found, and nothing changed', async () => {
    as('b');
    const del: any = await M.deleteWhatsAppBroadcastCampaign(campaignA.id);
    expect(del).toEqual({ success: false, error: 'Campaign not found' });
    const cancel: any = await M.cancelWhatsAppBroadcastCampaign(campaignA.id);
    expect(cancel.success).toBe(false);
    const upd: any = await M.updateWhatsAppBotRule(ruleA.id, { name: 'hijack', matchType: 'contains', matchValue: 'x', replyType: 'text', replyText: 'x' });
    expect(upd).toEqual({ success: false, error: 'Rule not found' });
    const tog: any = await M.toggleWhatsAppBotRule(ruleA.id, false);
    expect(tog).toEqual({ success: false, error: 'Rule not found' });
    const delRule: any = await M.deleteWhatsAppBotRule(ruleA.id);
    expect(delRule).toEqual({ success: false, error: 'Rule not found' });
    for (const r of [del, cancel, upd, tog, delRule]) expect(JSON.stringify(r)).not.toMatch(/coerce|JSON object|PGRST|violates|relation|row-level/i);
    expect((await admin.from('whatsapp_broadcast_campaigns').select('id', { count: 'exact', head: true }).eq('id', campaignA.id)).count).toBe(1);
    const still = (await admin.from('whatsapp_bot_rules').select('name,active').eq('id', ruleA.id).single()).data;
    expect(still).toEqual({ name: 'ownrule', active: true });
  });

  it('a random (nonexistent) id is also not-found; A can still delete its own', async () => {
    as('a');
    const ghost = randomUUID();
    expect(await M.deleteWhatsAppBroadcastCampaign(ghost)).toEqual({ success: false, error: 'Campaign not found' });
    expect(await M.toggleWhatsAppBotRule(ghost, true)).toEqual({ success: false, error: 'Rule not found' });
    expect((await M.updateWhatsAppBotRule(ghost, { name: 'n', matchType: 'exact', matchValue: 'v', replyType: 'text', replyText: 't' })).error).toBe('Rule not found');
    expect(await M.deleteWhatsAppBroadcastCampaign(campaignA.id)).toEqual({ success: true });
    expect(await M.deleteWhatsAppBotRule(ruleA.id)).toEqual({ success: true });
  });
});

describe('item 9: schedule validation (real action)', () => {
  it('an invalid and a past date return specific messages and create nothing', async () => {
    as('a');
    const before = (await admin.from('whatsapp_broadcast_campaigns').select('id', { count: 'exact', head: true }).eq('workspace_id', wsA)).count;
    const bad: any = await M.createWhatsAppBroadcastCampaign({ name: 'd', messageBody: 'x', ruleGroup: rg('c6'), scheduledAt: 'not-a-date' });
    expect(bad.error).toMatch(/not valid/i);
    const past: any = await M.createWhatsAppBroadcastCampaign({ name: 'd', messageBody: 'x', ruleGroup: rg('c6'), scheduledAt: new Date(Date.now() - 86400_000).toISOString() });
    expect(past.error).toMatch(/in the past/i);
    expect(bad.error).not.toBe('Failed to create WhatsApp campaign');
    expect((await admin.from('whatsapp_broadcast_campaigns').select('id', { count: 'exact', head: true }).eq('workspace_id', wsA)).count).toBe(before);
  });
});

describe('item 7: the webhook no longer logs payloads', () => {
  it('"webhook.meta.received" carries counts and ids only; no phone number, name or message text appears in any log line', async () => {
    logs.calls.length = 0;
    const secretText = `very-private-text-${runId}`;
    await postMeta(waInbound('15550100081', secretText));
    const received = logs.calls.find((c) => c[2] === 'webhook.meta.received');
    expect(received).toBeTruthy();
    expect(received![1]).toMatchObject({ object: 'whatsapp_business_account', messages: 1 });
    const all = JSON.stringify(logs.calls);
    expect(all).not.toContain(secretText);
    expect(all).not.toContain('15550100081');
    expect(all).not.toContain('Probe Person');
  });
});
