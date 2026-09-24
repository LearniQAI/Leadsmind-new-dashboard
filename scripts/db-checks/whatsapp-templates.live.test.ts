// Live verification of the WhatsApp template path.
//
// 1. listApprovedWhatsAppTemplates returns REAL approved templates from Meta for every connected account. It used
//    to read credentials.whatsapp_business_account_id, but sign-in connections store the account id as waba_id, so
//    the call went to graph.facebook.com/v18.0//message_templates and failed for every real connection. Read-only.
// 2. A real template from that list, selected the way the picker does, flows through the real
//    createWhatsAppBroadcastCampaign and the real dispatch worker to a template send carrying that exact
//    name/language and the per-contact variables. Runs in a throwaway workspace; only the final Meta send is
//    stubbed (it records the call), so nobody is messaged.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const h = vi.hoisted(() => ({ workspaceId: '', client: null as any, sends: [] as any[] }));
vi.mock('@/lib/auth', async (orig) => {
  const actual = await orig<any>();
  return { ...actual, requireWorkspaceAccess: async () => ({ workspaceId: h.workspaceId, userId: 'live-check', role: 'owner' }) };
});
vi.mock('@/lib/supabase/server', async (orig) => {
  const actual = await orig<any>();
  return { ...actual, createServerClient: async () => h.client };
});
// Only the final send is stubbed. listApprovedWhatsAppTemplates calls Meta with fetch, not the adapter.
vi.mock('@/lib/meta/MetaAdapter', () => ({
  MetaAdapter: class {
    constructor(_credentials: any) {}
    async sendWhatsApp(to: string, text: string) { h.sends.push({ kind: 'text', to, text }); return { success: true, externalId: 'wamid.LIVETEXT' }; }
    async sendWhatsAppTemplate(to: string, name: string, language: string, params: string[]) {
      h.sends.push({ kind: 'template', to, name, language, params }); return { success: true, externalId: 'wamid.LIVETPL' };
    }
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));

process.env.CRON_SECRET = 'live-cron-secret';

let M: any, db: any;
let connections: { workspace_id: string; credentials: any }[] = [];
const runId = randomUUID().slice(0, 8);
const userIds: string[] = [];
let ws = '';

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  M = {
    ...(await import('@/lib/supabase/server')),
    wa: await import('@/app/actions/whatsapp_broadcast'),
    creds: await import('@/lib/meta/whatsappCredentials'),
    worker: await import('@/app/api/cron/workers/whatsapp-dispatch/route'),
  };
  db = M.createAdminClient();
  h.client = db;
  const swept = await sweepStaleTestWorkspaces(db, testRunPatterns('watpl'));
  if (swept) console.warn(`[cleanup] removed ${swept} stale workspace(s) left by earlier runs of this test`);
  const { data, error } = await db.from('platform_connections').select('workspace_id, credentials').eq('platform', 'whatsapp').eq('status', 'connected');
  if (error) throw error;
  connections = data ?? [];
});

afterAll(async () => {
  await deleteTestWorkspaces(db, [ws], userIds);
});

describe('listApprovedWhatsAppTemplates against real connected accounts', () => {
  it('there is at least one real (non-mock) connected WhatsApp account to check', () => {
    expect(connections.filter((c) => !M.creds.readWhatsAppCredentials(c.credentials).wabaId.startsWith('mock_')).length).toBeGreaterThan(0);
  });

  it('returns live (not mock) approved templates for every connected account', async () => {
    const seen = new Set<string>();
    for (const c of connections) {
      const { wabaId } = M.creds.readWhatsAppCredentials(c.credentials);
      if (seen.has(wabaId)) continue;
      seen.add(wabaId);
      h.workspaceId = c.workspace_id;
      const res = await M.wa.listApprovedWhatsAppTemplates();
      process.stderr.write(`[templates] ws ${c.workspace_id.slice(0, 8)} waba ${wabaId}: ${JSON.stringify(res.success ? { mock: res.mock, templates: res.data.map((t: any) => `${t.name}/${t.language}/${t.category}`) } : res)}\n`);
      expect(res.success, JSON.stringify(res)).toBe(true);
      expect(res.mock).toBe(false);
      for (const t of res.data) {
        expect(t.status).toBe('APPROVED');
        expect(t.name).toBeTruthy();
        expect(t.language).toBeTruthy();
      }
    }
  });
});

describe('a real approved template, selected and used in a broadcast', () => {
  it('flows through create + the dispatch worker as a template send with that name, language and per-contact variables', async () => {
    // A real template with at least one {{n}} variable, from a real account.
    let tpl: any = null;
    for (const c of connections) {
      h.workspaceId = c.workspace_id;
      const res = await M.wa.listApprovedWhatsAppTemplates();
      tpl = res.success && !res.mock ? res.data.find((t: any) => /\{\{\d+\}\}/.test(t.bodyText)) : null;
      if (tpl) break;
    }
    expect(tpl, 'no real approved template with variables on any connected account').toBeTruthy();
    const varCount = new Set(tpl.bodyText.match(/\{\{\d+\}\}/g)).size;
    process.stderr.write(`[broadcast] using real template ${tpl.name}/${tpl.language} with ${varCount} variable(s): "${tpl.bodyText}"\n`);

    const open = (await db.from('whatsapp_dispatch_queue').select('id', { count: 'exact', head: true }).in('status', ['pending', 'processing'])).count ?? 0;
    expect(open, 'live WhatsApp queue rows exist; the worker is workspace-agnostic, so this check must not run now').toBe(0);

    // Throwaway workspace with a (stubbed-send) WhatsApp connection, one contact, and a segment matching it.
    const { data: u, error: ue } = await db.auth.admin.createUser({ email: `watpl-${runId}-owner@example.com`, password: randomUUID(), email_confirm: true });
    if (ue) throw new Error(`createUser: ${ue.message}`);
    userIds.push(u.user.id);
    await new Promise((r) => setTimeout(r, 800));
    ws = (await db.from('workspace_members').select('workspace_id').eq('user_id', u.user.id).limit(1).maybeSingle()).data.workspace_id;
    h.workspaceId = ws;
    await db.from('platform_connections').insert({ workspace_id: ws, platform: 'whatsapp', status: 'connected', credentials: { waba_id: 'live_check_waba', phone_number_id: 'live_check_pnid' } });
    const { data: contact, error: ce } = await db.from('contacts').insert({ workspace_id: ws, email: `watpl-${runId}@example.com`, first_name: 'Ada', last_name: 'Lovelace', phone: '0821234567', source: `watpl-${runId}` }).select().single();
    if (ce) throw new Error(`contact: ${ce.message}`);
    const { data: seg } = await db.from('segments').insert({ workspace_id: ws, name: `watpl-${runId}`, rule_group: { logic: 'AND', rules: [{ field: 'source', operator: 'equals', value: `watpl-${runId}` }] } }).select().single();

    // Exactly what the picker submits: the selected template's name + language, one value per variable.
    const params = Array.from({ length: varCount }, (_, i) => (i === 0 ? '{{contact.first_name}}' : `V${i + 1}`));
    const created = await M.wa.createWhatsAppBroadcastCampaign({
      name: `watpl-${runId}`, messageBody: null, templateName: tpl.name, templateLanguage: tpl.language, templateBodyParams: params, segmentId: seg.id,
    });
    expect(created.success, JSON.stringify(created)).toBe(true);
    expect(created.recipientCount).toBe(1);

    const { NextRequest } = await import('next/server');
    const res = await M.worker.GET(new NextRequest('https://app.test/api/cron/workers/whatsapp-dispatch', { headers: { Authorization: 'Bearer live-cron-secret' } }));
    expect(res.status).toBe(200);

    const mine = h.sends.filter((s) => s.to === '+27821234567');
    expect(mine).toEqual([{ kind: 'template', to: '+27821234567', name: tpl.name, language: tpl.language, params: ['Ada', ...params.slice(1)] }]);
    const row = (await db.from('whatsapp_dispatch_queue').select('status, was_template, whatsapp_message_id').eq('contact_id', contact.id).single()).data;
    expect(row).toEqual({ status: 'sent', was_template: true, whatsapp_message_id: 'wamid.LIVETPL' });
    const camp = (await db.from('whatsapp_broadcast_campaigns').select('status, total_sent').eq('id', created.data.id).single()).data;
    expect(camp).toEqual({ status: 'completed', total_sent: 1 });
  });
});
