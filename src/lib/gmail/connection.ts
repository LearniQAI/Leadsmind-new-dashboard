// Gmail mailbox connection (Conversations, PRD Section A).
//
// NOT a new token store: a provider='gmail' row in user_calendar_connections,
// written by storeCalendarConnection, refreshed by getFreshCalendarAccessToken,
// removed by deleteCalendarConnection — the same encrypted (AES-256-GCM) shape
// and owner-only RLS as Calendar/Zoom. Deliberately separate from the managed
// sending-domain system (sender_domains / getWorkspaceEmailConfig): this is one
// user's own mailbox, not a bulk-sending path.

import { createAdminClient } from '@/lib/supabase/server';
import {
  GMAIL_REQUIRED_SCOPE,
  hasGmailScope,
  getFreshCalendarAccessToken,
  markCalendarConnectionError,
  syncWorkspaceCalendarIntegrationRow,
  toCalendarConnectionRow,
} from '@/lib/calendar/connections';
import { logger } from '@/shared/logger';

export const GMAIL_OAUTH_SCOPES = [GMAIL_REQUIRED_SCOPE, 'openid', 'email'].join(' ');

export const GMAIL_PROFILE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/profile';

export type GmailReconnectReason = 'authorization_revoked' | 'missing_permission';

export type GmailConnectionStatus =
  | { state: 'not_connected' }
  | { state: 'connected'; email: string | null }
  | { state: 'needs_reconnect'; email: string | null; reason: GmailReconnectReason };

/** The mailbox address Gmail itself reports for this token (authoritative), or null. */
export async function fetchGmailProfileEmail(accessToken: string): Promise<{ ok: boolean; status: number; email: string | null }> {
  const res = await fetch(GMAIL_PROFILE_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return { ok: false, status: res.status, email: null };
  const body = await res.json().catch(() => ({}));
  return { ok: true, status: res.status, email: typeof body?.emailAddress === 'string' ? body.emailAddress : null };
}

/**
 * Points the user's email_mailboxes row for this address at their live Gmail connection (creating
 * the mailbox on first connect). Messages link to the mailbox, not the token row, so a reconnect
 * with a DIFFERENT Google account (same connection row, new address) must detach the old mailbox
 * first — otherwise mail already synced from the old address would be relabelled as the new one.
 */
export async function linkGmailMailbox(workspaceId: string, userId: string, email: string): Promise<string> {
  const supabase = createAdminClient();
  const address = email.trim().toLowerCase();

  const { data: connection, error: connErr } = await supabase
    .from('user_calendar_connections')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('provider', 'gmail')
    .maybeSingle();
  if (connErr) throw connErr;
  if (!connection) throw new Error('Gmail connection row not found for mailbox link');

  const { error: detachErr } = await supabase
    .from('email_mailboxes')
    .update({ connection_id: null, updated_at: new Date().toISOString() })
    .eq('connection_id', connection.id)
    .neq('email_address', address);
  if (detachErr) throw detachErr;

  const { data: mailbox, error } = await supabase
    .from('email_mailboxes')
    .upsert(
      {
        workspace_id: workspaceId,
        user_id: userId,
        provider: 'gmail',
        email_address: address,
        connection_id: connection.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,user_id,provider,email_address' }
    )
    .select('id')
    .single();
  if (error) throw error;
  return mailbox.id;
}

async function flagError(connectionId: string, workspaceId: string) {
  await markCalendarConnectionError(connectionId);
  await syncWorkspaceCalendarIntegrationRow(workspaceId, 'gmail');
}

/**
 * The caller's own Gmail connection in this workspace, verified LIVE against
 * Gmail: a revoked grant or an expired refresh token is only discoverable by
 * using the token, and a stored status alone would keep saying "Connected".
 * A Google outage (5xx / network) is not treated as a revocation.
 */
export async function getGmailConnectionStatus(workspaceId: string, userId: string): Promise<GmailConnectionStatus> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('user_calendar_connections')
    .select('id, workspace_id, user_id, provider, status, credentials')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('provider', 'gmail')
    .maybeSingle();

  if (!data) return { state: 'not_connected' };
  const row = toCalendarConnectionRow(data);
  const email = row.credentials.email;

  if (row.status === 'error') return { state: 'needs_reconnect', email, reason: 'authorization_revoked' };
  if (!hasGmailScope(row.credentials.scope)) return { state: 'needs_reconnect', email, reason: 'missing_permission' };

  let token: string;
  try {
    // Throws after flipping the row to 'error' when Google rejects the refresh
    // (invalid_grant = revoked in Google Account, password change, 6-month idle).
    token = await getFreshCalendarAccessToken(row);
  } catch (err) {
    logger.warn({ err, workspaceId, userId }, 'gmail.connection.refresh_failed');
    await syncWorkspaceCalendarIntegrationRow(workspaceId, 'gmail');
    return { state: 'needs_reconnect', email, reason: 'authorization_revoked' };
  }

  try {
    const profile = await fetchGmailProfileEmail(token);
    if (!profile.ok) {
      if (profile.status === 401) {
        await flagError(row.id, workspaceId);
        return { state: 'needs_reconnect', email, reason: 'authorization_revoked' };
      }
      if (profile.status === 403) {
        // Token is valid but Gmail refuses it: the scope was removed, or the
        // Gmail API isn't enabled on the Google Cloud project. Either way the
        // user-facing fix starts with a reconnect.
        logger.warn({ workspaceId, userId }, 'gmail.connection.profile_forbidden');
        return { state: 'needs_reconnect', email, reason: 'missing_permission' };
      }
      logger.warn({ workspaceId, userId, status: profile.status }, 'gmail.connection.profile_unavailable');
      return { state: 'connected', email };
    }

    if (profile.email && profile.email !== email) {
      // Re-read: getFreshCalendarAccessToken may just have written a new
      // access token, which row.rawCredentials predates.
      const { data: current } = await supabase.from('user_calendar_connections').select('credentials').eq('id', row.id).maybeSingle();
      if (current) {
        await supabase
          .from('user_calendar_connections')
          .update({ credentials: { ...(current.credentials as Record<string, any>), email: profile.email }, updated_at: new Date().toISOString() })
          .eq('id', row.id);
        await linkGmailMailbox(workspaceId, userId, profile.email);
      }
    }
    return { state: 'connected', email: profile.email ?? email };
  } catch (err) {
    logger.warn({ err, workspaceId, userId }, 'gmail.connection.profile_check_failed');
    return { state: 'connected', email };
  }
}
