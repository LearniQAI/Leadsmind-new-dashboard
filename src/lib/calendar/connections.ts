// Task 62 — Calendar-provider OAuth connection store.
//
// SINGLE SOURCE OF TRUTH: public.user_calendar_connections (per-user rows,
// provider IN ('google','outlook')). Confirmed decision — see the migration
// 20260909000000_calendar_oauth_connection_store.sql for the full rationale.
//
// This module owns the read/write shape so every consumer (OAuth callbacks,
// calendarSync.ts, googleMeet.ts) agrees on it. OAuth token material is
// encrypted at rest with lib/encryption.ts (AES-256-GCM), same as the Meta
// tokens; non-secret metadata + the pre-existing webhook keys stay plaintext.

import { createAdminClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/encryption';
import { logger } from '@/shared/logger';

// 'google' / 'outlook' are calendar providers (busy-sync + events). 'zoom' is a
// meeting-only provider (Task 70) — same per-user encrypted OAuth token store
// and connect/refresh/disconnect lifecycle, but it never participates in
// busy-slot sync. Microsoft Teams meetings reuse the 'outlook' connection
// (Graph /me/onlineMeetings) with one extra scope — there is no 'teams' provider.
export type CalendarProvider = 'google' | 'outlook' | 'zoom';

export interface DecryptedCalendarCredentials {
  accessToken: string | null;
  refreshToken: string | null;
  /** ms epoch */
  expiresAt: number | null;
  email: string | null;
  scope: string | null;
}

export interface CalendarConnectionRow {
  id: string;
  workspaceId: string;
  userId: string;
  provider: CalendarProvider;
  status: 'connected' | 'error' | 'pending';
  lastSyncAt: string | null;
  /** raw credentials JSON as stored (still contains *_encrypted fields) */
  rawCredentials: Record<string, any>;
  credentials: DecryptedCalendarCredentials;
}

function safeDecrypt(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null;
  try {
    return decrypt(value);
  } catch (err) {
    logger.error({ err }, 'calendar.connection.decrypt_failed');
    return null;
  }
}

export function decryptCalendarCredentials(raw: any): DecryptedCalendarCredentials {
  const c = raw || {};
  return {
    accessToken: safeDecrypt(c.access_token_encrypted),
    refreshToken: safeDecrypt(c.refresh_token_encrypted),
    expiresAt: typeof c.expires_at === 'number' ? c.expires_at : null,
    email: typeof c.email === 'string' ? c.email : null,
    scope: typeof c.scope === 'string' ? c.scope : null,
  };
}

/**
 * Builds the stored `credentials` JSON. `preserve` carries forward any
 * non-token keys already on the row (webhook channel/subscription ids, an
 * earlier refresh_token_encrypted when the provider didn't re-issue one).
 */
export function buildStoredCredentials(params: {
  accessToken: string;
  refreshTokenEncrypted?: string | null;
  refreshTokenPlain?: string | null;
  expiresAt: number;
  email?: string | null;
  scope?: string | null;
  preserve?: Record<string, any>;
}): Record<string, any> {
  const out: Record<string, any> = { ...(params.preserve || {}) };
  out.access_token_encrypted = encrypt(params.accessToken);

  if (params.refreshTokenPlain) {
    out.refresh_token_encrypted = encrypt(params.refreshTokenPlain);
  } else if (params.refreshTokenEncrypted) {
    out.refresh_token_encrypted = params.refreshTokenEncrypted;
  }

  out.expires_at = params.expiresAt;
  if (params.email !== undefined) out.email = params.email;
  if (params.scope !== undefined) out.scope = params.scope;
  out.connected_at = out.connected_at || new Date().toISOString();
  out.last_sync_at = new Date().toISOString();
  return out;
}

/**
 * Upsert a freshly-authorised connection. Called from the OAuth callbacks.
 * Preserves pre-existing non-token keys and, on a reconnect where the provider
 * did not re-issue a refresh token (Google's normal behaviour after the first
 * consent), keeps the previously-stored refresh token.
 */
export async function storeCalendarConnection(params: {
  workspaceId: string;
  userId: string;
  provider: CalendarProvider;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: number;
  email?: string | null;
  scope?: string | null;
}): Promise<void> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('user_calendar_connections')
    .select('credentials')
    .eq('workspace_id', params.workspaceId)
    .eq('user_id', params.userId)
    .eq('provider', params.provider)
    .maybeSingle();

  const preserve: Record<string, any> = { ...((existing?.credentials as any) || {}) };
  const existingRefreshEnc = preserve.refresh_token_encrypted as string | undefined;
  delete preserve.access_token_encrypted;
  delete preserve.refresh_token_encrypted;
  delete preserve.expires_at;
  delete preserve.email;
  delete preserve.scope;
  delete preserve.connected_at;

  const credentials = buildStoredCredentials({
    accessToken: params.accessToken,
    refreshTokenPlain: params.refreshToken ?? null,
    refreshTokenEncrypted: params.refreshToken ? null : existingRefreshEnc ?? null,
    expiresAt: params.expiresAt,
    email: params.email ?? null,
    scope: params.scope ?? null,
    preserve,
  });

  const { error } = await supabase
    .from('user_calendar_connections')
    .upsert(
      {
        workspace_id: params.workspaceId,
        user_id: params.userId,
        provider: params.provider,
        credentials,
        status: 'connected',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,user_id,provider' }
    );

  if (error) throw error;

  await syncWorkspaceCalendarIntegrationRow(params.workspaceId, params.provider);
}

/** Maps a raw `user_calendar_connections` DB row to the decrypted shape. */
export function toCalendarConnectionRow(data: any): CalendarConnectionRow {
  return {
    id: data.id,
    workspaceId: data.workspace_id,
    userId: data.user_id,
    provider: data.provider,
    status: data.status,
    lastSyncAt: (data.credentials as any)?.last_sync_at ?? null,
    rawCredentials: (data.credentials as Record<string, any>) || {},
    credentials: decryptCalendarCredentials(data.credentials),
  };
}

/**
 * Recomputes the workspace-level `workspace_integrations` status row (what the
 * Integrations Hub UI reads) from the current per-user `user_calendar_connections`
 * rows for this provider. Call after any connect/disconnect.
 */
const PROVIDER_LABELS: Record<CalendarProvider, string> = {
  google: 'Google Calendar',
  outlook: 'Outlook & Microsoft 365',
  zoom: 'Zoom',
};

export async function syncWorkspaceCalendarIntegrationRow(
  workspaceId: string,
  provider: CalendarProvider
): Promise<void> {
  const label = PROVIDER_LABELS[provider];
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('user_calendar_connections')
    .select('credentials, status')
    .eq('workspace_id', workspaceId)
    .eq('provider', provider);

  const active = (data || []).filter((r: any) => r.status === 'connected');
  const connected = active.length > 0;
  const emails = active.map((r: any) => (r.credentials as any)?.email).filter(Boolean);
  const accountLabel = !connected
    ? null
    : emails.length === 1
      ? emails[0]
      : `${active.length} connected`;

  const { error } = await supabase.from('workspace_integrations').upsert(
    {
      workspace_id: workspaceId,
      provider: label,
      category: provider === 'zoom' ? 'video_conferencing' : 'email_calendar',
      connected,
      account_label: accountLabel,
      connected_at: connected ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'workspace_id,provider' }
  );
  if (error) throw error;
}

/** The connected calendar connection for one user + provider, or null. */
export async function getCalendarConnection(
  userId: string,
  provider: CalendarProvider
): Promise<CalendarConnectionRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_calendar_connections')
    .select('id, workspace_id, user_id, provider, status, credentials')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('status', 'connected')
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    workspaceId: data.workspace_id,
    userId: data.user_id,
    provider: data.provider,
    status: data.status,
    lastSyncAt: (data.credentials as any)?.last_sync_at ?? null,
    rawCredentials: (data.credentials as Record<string, any>) || {},
    credentials: decryptCalendarCredentials(data.credentials),
  };
}

/** All calendar connections for a workspace — for the settings UI status view. */
export async function listWorkspaceCalendarConnections(workspaceId: string): Promise<
  Array<{ provider: CalendarProvider; email: string | null; status: string; lastSyncAt: string | null; userId: string }>
> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('user_calendar_connections')
    .select('provider, status, user_id, credentials')
    .eq('workspace_id', workspaceId);

  return (data || []).map((r: any) => ({
    provider: r.provider,
    email: (r.credentials as any)?.email ?? null,
    status: r.status,
    lastSyncAt: (r.credentials as any)?.last_sync_at ?? null,
    userId: r.user_id,
  }));
}

/**
 * Best-effort provider-side token revocation. Google supports a real revoke
 * endpoint; Microsoft has no equivalent single-token revoke without tenant
 * admin consent, so for Outlook we only clear local state (the user can remove
 * the app under their Microsoft account security page).
 */
export async function revokeProviderToken(
  provider: CalendarProvider,
  creds: DecryptedCalendarCredentials
): Promise<void> {
  const token = creds.refreshToken || creds.accessToken;
  if (!token) return;

  try {
    if (provider === 'google') {
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token }),
      });
    } else if (provider === 'zoom') {
      // Zoom has a real token-revoke endpoint (Basic client auth).
      const basic = Buffer.from(
        `${process.env.ZOOM_CLIENT_ID || ''}:${process.env.ZOOM_CLIENT_SECRET || ''}`
      ).toString('base64');
      await fetch('https://zoom.us/oauth/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basic}`,
        },
        body: new URLSearchParams({ token }),
      });
    }
    // Microsoft has no single-token revoke without tenant admin consent — the
    // user removes the app under their Microsoft account security page. Local
    // state is cleared by deleteCalendarConnection regardless.
  } catch (err) {
    logger.warn({ err, provider }, 'calendar.connection.revoke.failed');
  }
}

/** Remove a user's connection for one provider (best-effort remote revoke first). */
export async function deleteCalendarConnection(
  workspaceId: string,
  userId: string,
  provider: CalendarProvider
): Promise<void> {
  const supabase = createAdminClient();

  const { data: row } = await supabase
    .from('user_calendar_connections')
    .select('credentials')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle();

  if (row) {
    await revokeProviderToken(provider, decryptCalendarCredentials(row.credentials));
  }

  const { error } = await supabase
    .from('user_calendar_connections')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('provider', provider);

  if (error) throw error;

  await syncWorkspaceCalendarIntegrationRow(workspaceId, provider);
}

/** Marks a connection unhealthy (used by the token-refresh path on failure). */
export async function markCalendarConnectionError(connectionId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from('user_calendar_connections')
    .update({ status: 'error', updated_at: new Date().toISOString() })
    .eq('id', connectionId);
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const ZOOM_TOKEN_URL = 'https://zoom.us/oauth/token';

// The Outlook connection now also carries Teams online-meeting rights (Task 70).
// Kept in one place so the initiate route, callback, and this refresh agree.
export const MICROSOFT_CALENDAR_SCOPES =
  'offline_access openid email profile https://graph.microsoft.com/User.Read https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/OnlineMeetings.ReadWrite';

/**
 * Returns a valid access token for a connection row, refreshing + persisting a
 * new one if the stored token is within 5 minutes of expiry. Throws if the
 * connection can't produce a working token (missing refresh token, provider
 * rejected the refresh) after flipping the row to status='error' — callers
 * treat a throw as "this connection needs the user to reconnect", never as a
 * silent no-op.
 */
export async function getFreshCalendarAccessToken(row: CalendarConnectionRow): Promise<string> {
  const { accessToken, refreshToken, expiresAt } = row.credentials;

  if (accessToken && expiresAt && Date.now() < expiresAt - 5 * 60 * 1000) {
    return accessToken;
  }

  if (!refreshToken) {
    await markCalendarConnectionError(row.id);
    throw new Error(`${row.provider} calendar connection is missing a refresh token — reconnect required`);
  }

  const tokenUrl =
    row.provider === 'google' ? GOOGLE_TOKEN_URL
    : row.provider === 'zoom' ? ZOOM_TOKEN_URL
    : MICROSOFT_TOKEN_URL;

  const body = new URLSearchParams({ refresh_token: refreshToken, grant_type: 'refresh_token' });
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };

  if (row.provider === 'zoom') {
    // Zoom OAuth refresh uses HTTP Basic client authentication, not body params.
    const basic = Buffer.from(
      `${process.env.ZOOM_CLIENT_ID || ''}:${process.env.ZOOM_CLIENT_SECRET || ''}`
    ).toString('base64');
    headers.Authorization = `Basic ${basic}`;
  } else {
    const isGoogle = row.provider === 'google';
    body.set('client_id', (isGoogle ? process.env.GOOGLE_CLIENT_ID : process.env.OUTLOOK_CLIENT_ID) || '');
    body.set('client_secret', (isGoogle ? process.env.GOOGLE_CLIENT_SECRET : process.env.OUTLOOK_CLIENT_SECRET) || '');
    if (!isGoogle) body.set('scope', MICROSOFT_CALENDAR_SCOPES);
  }

  let data: any;
  try {
    const res = await fetch(tokenUrl, { method: 'POST', headers, body });
    data = await res.json();
    if (!res.ok || !data.access_token) {
      throw new Error(data.error_description || data.error || `token refresh failed (${res.status})`);
    }
  } catch (err) {
    logger.error({ err, provider: row.provider, connectionId: row.id }, 'calendar.connection.token_refresh.failed');
    await markCalendarConnectionError(row.id);
    throw err instanceof Error ? err : new Error('token refresh failed');
  }

  const newAccessToken: string = data.access_token;
  const newExpiresAt = Date.now() + (Number(data.expires_in) || 3600) * 1000;
  // Google only returns refresh_token on the first consent; Microsoft rotates it.
  const rotatedRefresh: string | null = data.refresh_token || null;

  const supabase = createAdminClient();
  const preserve = { ...row.rawCredentials };
  delete preserve.access_token_encrypted;
  const existingRefreshEnc = preserve.refresh_token_encrypted as string | undefined;
  delete preserve.refresh_token_encrypted;
  delete preserve.expires_at;

  const credentials = buildStoredCredentials({
    accessToken: newAccessToken,
    refreshTokenPlain: rotatedRefresh,
    refreshTokenEncrypted: rotatedRefresh ? null : existingRefreshEnc ?? null,
    expiresAt: newExpiresAt,
    email: row.credentials.email,
    scope: row.credentials.scope,
    preserve,
  });

  await supabase
    .from('user_calendar_connections')
    .update({
      credentials,
      status: 'connected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id);

  return newAccessToken;
}
