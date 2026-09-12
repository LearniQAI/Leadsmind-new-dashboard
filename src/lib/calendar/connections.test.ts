import { describe, expect, it, vi, beforeEach } from 'vitest';

// Reversible fake so tests can assert "stored encrypted, read back plain".
vi.mock('@/lib/encryption', () => ({
  encrypt: (v: string) => `ENC(${v})`,
  decrypt: (v: string) => {
    if (typeof v === 'string' && v.startsWith('ENC(') && v.endsWith(')')) return v.slice(4, -1);
    throw new Error('bad ciphertext');
  },
}));

const from = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from }),
}));

vi.mock('@/shared/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  buildStoredCredentials,
  decryptCalendarCredentials,
  toCalendarConnectionRow,
  getFreshCalendarAccessToken,
  syncWorkspaceCalendarIntegrationRow,
  type CalendarConnectionRow,
} from './connections';

describe('calendar connections — credential shape', () => {
  it('round-trips: buildStoredCredentials encrypts, decryptCalendarCredentials reads back', () => {
    const stored = buildStoredCredentials({
      accessToken: 'AT-1',
      refreshTokenPlain: 'RT-1',
      expiresAt: 1_800_000,
      email: 'host@example.com',
      scope: 'calendar.events',
    });

    expect(stored.access_token_encrypted).toBe('ENC(AT-1)');
    expect(stored.refresh_token_encrypted).toBe('ENC(RT-1)');
    expect(stored.expires_at).toBe(1_800_000);
    expect(stored.email).toBe('host@example.com');

    const decrypted = decryptCalendarCredentials(stored);
    expect(decrypted).toEqual({
      accessToken: 'AT-1',
      refreshToken: 'RT-1',
      expiresAt: 1_800_000,
      email: 'host@example.com',
      scope: 'calendar.events',
    });
  });

  it('keeps a previously-stored refresh token when the provider does not re-issue one', () => {
    const stored = buildStoredCredentials({
      accessToken: 'AT-2',
      refreshTokenPlain: null,
      refreshTokenEncrypted: 'ENC(RT-OLD)',
      expiresAt: 42,
      preserve: { google_channel_id: 'chan-1' },
    });
    expect(stored.refresh_token_encrypted).toBe('ENC(RT-OLD)');
    // non-token webhook keys are preserved
    expect(stored.google_channel_id).toBe('chan-1');
  });

  it('decryptCalendarCredentials tolerates a row with only webhook keys (no tokens)', () => {
    const d = decryptCalendarCredentials({ google_channel_id: 'x', google_channel_token: 'y' });
    expect(d.accessToken).toBeNull();
    expect(d.refreshToken).toBeNull();
  });
});

describe('syncWorkspaceCalendarIntegrationRow — Microsoft Teams derived status', () => {
  beforeEach(() => {
    from.mockReset();
  });

  // active outlook rows as they'd come back from the select() chain
  function mockOutlookRows(rows: Array<{ status: string; scope: string | null }>) {
    const upsertCalls: any[] = [];
    from.mockImplementation((table: string) => {
      if (table === 'user_calendar_connections') {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({
                data: rows.map(r => ({ status: r.status, credentials: { scope: r.scope, email: 'a@b.com' } })),
              }),
            }),
          }),
        };
      }
      if (table === 'workspace_integrations') {
        return {
          upsert: (payload: any) => {
            upsertCalls.push(payload);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
    return upsertCalls;
  }

  it('marks Teams connected when the active outlook connection has the OnlineMeetings.ReadWrite scope', async () => {
    const upsertCalls = mockOutlookRows([
      { status: 'connected', scope: 'openid https://graph.microsoft.com/OnlineMeetings.ReadWrite' },
    ]);

    await syncWorkspaceCalendarIntegrationRow('ws-1', 'outlook');

    const teamsUpsert = upsertCalls.find(c => c.provider === 'Microsoft Teams');
    expect(teamsUpsert.connected).toBe(true);
    expect(teamsUpsert.needs_reconnect).toBe(false);
  });

  it('marks Teams as needing reconnect when outlook is connected but lacks the Teams scope', async () => {
    const upsertCalls = mockOutlookRows([
      { status: 'connected', scope: 'openid https://graph.microsoft.com/Calendars.ReadWrite' },
    ]);

    await syncWorkspaceCalendarIntegrationRow('ws-1', 'outlook');

    const teamsUpsert = upsertCalls.find(c => c.provider === 'Microsoft Teams');
    expect(teamsUpsert.connected).toBe(false);
    expect(teamsUpsert.needs_reconnect).toBe(true);
  });

  it('treats a legacy connection with no recorded scope at all as needing reconnect, not connected', async () => {
    const upsertCalls = mockOutlookRows([{ status: 'connected', scope: null }]);

    await syncWorkspaceCalendarIntegrationRow('ws-1', 'outlook');

    const teamsUpsert = upsertCalls.find(c => c.provider === 'Microsoft Teams');
    expect(teamsUpsert.connected).toBe(false);
    expect(teamsUpsert.needs_reconnect).toBe(true);
  });

  it('leaves Teams disconnected with no reconnect prompt when there is no outlook connection at all', async () => {
    const upsertCalls = mockOutlookRows([]);

    await syncWorkspaceCalendarIntegrationRow('ws-1', 'outlook');

    const teamsUpsert = upsertCalls.find(c => c.provider === 'Microsoft Teams');
    expect(teamsUpsert.connected).toBe(false);
    expect(teamsUpsert.needs_reconnect).toBe(false);
  });

  it('does not touch the Microsoft Teams row when syncing an unrelated provider', async () => {
    const upsertCalls = mockOutlookRows([{ status: 'connected', scope: null }]);

    await syncWorkspaceCalendarIntegrationRow('ws-1', 'google');

    expect(upsertCalls.find(c => c.provider === 'Microsoft Teams')).toBeUndefined();
    expect(upsertCalls.find(c => c.provider === 'Google Calendar')).toBeDefined();
  });
});

describe('getFreshCalendarAccessToken', () => {
  beforeEach(() => {
    from.mockReset();
    vi.unstubAllGlobals();
  });

  const baseRow = (overrides: Partial<Record<string, any>> = {}): CalendarConnectionRow =>
    toCalendarConnectionRow({
      id: 'conn-1',
      workspace_id: 'ws-1',
      user_id: 'u-1',
      provider: 'google',
      status: 'connected',
      last_sync_at: null,
      credentials: {
        access_token_encrypted: 'ENC(AT-live)',
        refresh_token_encrypted: 'ENC(RT-live)',
        expires_at: Date.now() + 60 * 60 * 1000,
        ...overrides,
      },
    });

  it('returns the stored token unchanged when it is comfortably unexpired', async () => {
    const token = await getFreshCalendarAccessToken(baseRow());
    expect(token).toBe('AT-live');
  });

  it('refreshes, re-encrypts and persists when the token is within the 5-minute expiry window', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    from.mockReturnValue({ update });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'AT-new', expires_in: 3600 }),
      })
    );

    const token = await getFreshCalendarAccessToken(
      baseRow({ expires_at: Date.now() + 60 * 1000 }) // 1 min left → refresh
    );

    expect(token).toBe('AT-new');
    expect(from).toHaveBeenCalledWith('user_calendar_connections');
    const persisted = update.mock.calls[0][0];
    expect(persisted.credentials.access_token_encrypted).toBe('ENC(AT-new)');
    // Google didn't rotate the refresh token → the old one is retained
    expect(persisted.credentials.refresh_token_encrypted).toBe('ENC(RT-live)');
    expect(persisted.status).toBe('connected');
  });

  it('marks the connection status=error and throws when there is no refresh token', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    from.mockReturnValue({ update });

    await expect(
      getFreshCalendarAccessToken(
        baseRow({ refresh_token_encrypted: undefined, expires_at: Date.now() - 1000 })
      )
    ).rejects.toThrow(/reconnect/i);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error' })
    );
  });

  it('marks status=error and throws when the provider rejects the refresh', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    from.mockReturnValue({ update });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }),
      })
    );

    await expect(
      getFreshCalendarAccessToken(baseRow({ expires_at: Date.now() - 1000 }))
    ).rejects.toThrow(/expired or revoked/i);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });
});
