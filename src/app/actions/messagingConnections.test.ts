import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeDb, type FakeDb } from '@/test/fakeSupabase';
import { containsSecretKeys } from '@/lib/messaging/safeConnections';

const h = vi.hoisted(() => ({ db: null as any, ws: 'wsA' }));

vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => h.db, createAdminClient: () => h.db }));
vi.mock('@/lib/auth', () => ({
  getCurrentWorkspaceId: async () => h.ws,
  requireWorkspaceAccess: async () => ({ workspaceId: h.ws, userId: 'u1' }),
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
vi.mock('@/lib/encryption', () => ({ encrypt: (s: string) => `enc(${s})`, decrypt: (s: string) => s.replace(/^enc\(|\)$/g, '') }));

import { getConnectedPlatforms, getMetaOauthToken } from '@/app/actions/messaging';

const SECRET_CREDS = {
  access_token_encrypted: 'ciphertext', system_user_access_token_encrypted: 'ciphertext2',
  user_access_token_encrypted: 'ciphertext3', page_access_token_encrypted: 'ciphertext4',
  waba_id: 'w1', waba_name: 'Acme', phone_number: '+27 82 555 0101', phone_number_id: 'pn1',
  health_status: 'connected', page_name: 'Acme Page', page_id: 'p1',
};

beforeEach(() => {
  h.ws = 'wsA';
  h.db = makeFakeDb({
    platform_connections: [
      { id: 'c1', workspace_id: 'wsA', platform: 'whatsapp', status: 'connected', last_sync_at: null, credentials: { ...SECRET_CREDS } },
      { id: 'c2', workspace_id: 'wsA', platform: 'facebook', status: 'connected', last_sync_at: null, credentials: { ...SECRET_CREDS, user_access_token_encrypted: 'enc(FBTOKEN)' } },
      { id: 'c3', workspace_id: 'wsB', platform: 'instagram', status: 'connected', last_sync_at: null, credentials: { ...SECRET_CREDS } },
    ],
    workspaces: [{ id: 'wsA', twilio_number: null }],
  }) as FakeDb;
});

describe('getConnectedPlatforms never returns encrypted credentials to the browser', () => {
  it('payload has no *_encrypted / secret keys, only this workspace, display fields kept', async () => {
    const rows: any[] = await getConnectedPlatforms();
    expect(rows.map((r) => r.platform).sort()).toEqual(['facebook', 'sms', 'whatsapp']);
    expect(containsSecretKeys(rows)).toBe(false);
    expect(JSON.stringify(rows)).not.toMatch(/ciphertext|FBTOKEN|encrypted/);
    const wa = rows.find((r) => r.platform === 'whatsapp');
    expect(wa.credentials).toMatchObject({ waba_name: 'Acme', phone_number: '+27 82 555 0101', health_status: 'connected' });
  });
});

describe('getMetaOauthToken no longer hands the decrypted token to the browser', () => {
  it('returns a linked flag, never the token', async () => {
    const s: any = await getMetaOauthToken();
    expect(s).toEqual({ linked: true, isMock: false, status: 'connected' });
    expect(JSON.stringify(s)).not.toMatch(/FBTOKEN/);
    expect('token' in s).toBe(false);
  });

  it('returns null when there is no Facebook session', async () => {
    h.db.tables.platform_connections = h.db.tables.platform_connections.filter((r: any) => r.platform !== 'facebook');
    expect(await getMetaOauthToken()).toBeNull();
  });
});
