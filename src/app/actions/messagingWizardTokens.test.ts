import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeFakeDb, type FakeDb } from '@/test/fakeSupabase';

const h = vi.hoisted(() => ({ db: null as any, ws: 'wsA', user: 'uA' }));

vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => h.db, createAdminClient: () => h.db }));
vi.mock('@/lib/auth', () => ({
  getCurrentWorkspaceId: async () => h.ws,
  requireWorkspaceAccess: async () => ({ workspaceId: h.ws, userId: h.user }),
  requireModuleAccess: async () => {},
}));
vi.mock('@/lib/oauth/stateNonce', () => ({ createOAuthStateNonce: async () => 'n' }));
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/messaging/dispatchOutboundMessage', () => ({ dispatchOutboundMessage: vi.fn() }));
vi.mock('@/lib/gmail/send', () => ({ resolveSenderGmailMailbox: vi.fn() }));
vi.mock('@/lib/email/inboundAddress', () => ({ workspaceInboundAddress: vi.fn() }));
vi.mock('@/lib/email/resolveConfig', () => ({ getWorkspaceEmailConfig: vi.fn() }));
vi.mock('@/lib/automations/EmailAutomationService', () => ({ EmailAutomationService: {} }));
vi.mock('@/lib/crm/UnifiedActivityEngine', () => ({ UnifiedActivityEngine: {} }));
vi.mock('@/lib/meta/subscribeWebhook', () => ({ subscribeWabaToMetaWebhook: vi.fn() }));
vi.mock('@/lib/encryption', () => ({
  encrypt: (s: string) => 'E:' + Buffer.from(s, 'utf8').toString('base64'),
  decrypt: (s: string) => {
    if (!s.startsWith('E:')) return s;
    return Buffer.from(s.slice(2), 'base64').toString('utf8');
  },
}));

import { fetchMetaPages, fetchMetaInstagramAccounts, saveMetaConnections } from '@/app/actions/messaging';

let db: FakeDb;
beforeEach(() => {
  vi.stubEnv('META_MOCK_MODE', 'true');
  h.ws = 'wsA'; h.user = 'uA';
  db = makeFakeDb({ platform_connections: [{ id: 'c0', workspace_id: 'wsA', platform: 'facebook', status: 'connected', credentials: { is_mock: true } }] });
  h.db = db;
});
afterEach(() => vi.unstubAllEnvs());

const save = (over: any, target: any) => saveMetaConnections({ pageId: 'mock_page_1', pageName: 'LeadsMind Main Page', pageAccessToken: '', ...over }, target);

describe('connect wizard: page access tokens never reach the browser', () => {
  it('fetchMetaPages returns opaque handles, never the token (same field name, wizard unchanged)', async () => {
    const pages: any[] = await fetchMetaPages('mock_biz_1');
    expect(pages.map((p) => p.id)).toEqual(['mock_page_1', 'mock_page_2']);
    for (const p of pages) {
      expect(p.access_token.startsWith('pgh1.')).toBe(true);
      expect(p.access_token).not.toContain('mock_fb_page_token');
    }
    expect(JSON.stringify(pages)).not.toMatch(/mock_fb_page_token/);
  });

  it('a handle works for the Instagram lookup; a raw token or another page\'s handle is refused', async () => {
    const [p1, p2]: any[] = await fetchMetaPages('mock_biz_1');
    expect(await fetchMetaInstagramAccounts('mock_page_1', p1.access_token)).toEqual([{ id: 'mock_ig_1', username: 'leadsmind_main' }]);
    await expect(fetchMetaInstagramAccounts('mock_page_1', 'mock_fb_page_token_1')).rejects.toThrow(/session expired/i);
    await expect(fetchMetaInstagramAccounts('mock_page_1', p2.access_token)).rejects.toThrow(/session expired/i);
  });

  it('saveMetaConnections opens the handle server-side and stores the real token encrypted', async () => {
    const [p1]: any[] = await fetchMetaPages('mock_biz_1');
    const r: any = await save({ pageAccessToken: p1.access_token }, 'facebook');
    expect(r.error).toBeUndefined();
    const stored = db.tables.platform_connections.filter((c) => c.platform === 'facebook').pop()!;
    expect(stored.credentials.page_access_token_encrypted).toBe('E:' + Buffer.from('mock_fb_page_token_1').toString('base64'));
    expect(JSON.stringify(r)).not.toMatch(/mock_fb_page_token/);
  });

  it('refuses a raw token, a handle for another page, another user\'s handle and an expired one; nothing is written', async () => {
    const [p1, p2]: any[] = await fetchMetaPages('mock_biz_1');
    const before = JSON.stringify(db.tables.platform_connections);
    expect((await save({ pageAccessToken: 'mock_fb_page_token_1' }, 'facebook') as any).error).toMatch(/session expired/i);
    expect((await save({ pageAccessToken: p2.access_token }, 'facebook') as any).error).toMatch(/session expired/i);
    h.user = 'someoneElse';
    expect((await save({ pageAccessToken: p1.access_token }, 'facebook') as any).error).toMatch(/session expired/i);
    h.user = 'uA';
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 16 * 60 * 1000);
    expect((await save({ pageAccessToken: p1.access_token }, 'facebook') as any).error).toMatch(/session expired/i);
    vi.useRealTimers();
    expect(JSON.stringify(db.tables.platform_connections)).toBe(before);
  });

  it('the WhatsApp-only path keeps working with the fixed placeholder, but ONLY for targetPlatform whatsapp', async () => {
    const wa: any = await save({ pageId: 'whatsapp_placeholder', pageName: 'whatsapp_placeholder', pageAccessToken: 'whatsapp_placeholder', whatsappBusinessAccountId: 'mock_waba_1', whatsappBusinessName: 'Biz', phoneNumberId: 'mock_pn_1', whatsappPhoneNumber: '+1 555 0100' }, 'whatsapp');
    expect(wa.error).toBeUndefined();
    const fb: any = await save({ pageId: 'whatsapp_placeholder', pageAccessToken: 'whatsapp_placeholder' }, 'facebook');
    expect(fb.error).toMatch(/session expired/i);
    const legacy: any = await save({ pageId: 'whatsapp_placeholder', pageAccessToken: 'whatsapp_placeholder' }, null);
    expect(legacy.error).toMatch(/session expired/i);
  });
});
