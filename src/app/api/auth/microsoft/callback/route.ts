import { NextResponse } from 'next/server';
import { consumeOAuthStateNonce } from '@/lib/oauth/stateNonce';
import { storeCalendarConnection, MICROSOFT_CALENDAR_SCOPES } from '@/lib/calendar/connections';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Task 62 — Outlook / Microsoft 365 calendar connect callback.
// Rewritten: consumes the CSRF nonce, writes ONLY to user_calendar_connections
// (provider 'outlook'). The old version wrote platform_connections
// 'outlook_calendar', which fails that table's platform CHECK constraint and
// was never wired to any sync consumer.

const REDIRECT_PATH = '/settings/integrations-hub';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  const settingsUrl = new URL(REDIRECT_PATH, request.url);

  if (oauthError) {
    settingsUrl.searchParams.set(
      'calendar_error',
      oauthError === 'access_denied' ? 'access_denied' : 'oauth_error'
    );
    return NextResponse.redirect(settingsUrl);
  }
  if (!code || !state) {
    settingsUrl.searchParams.set('calendar_error', 'missing_params');
    return NextResponse.redirect(settingsUrl);
  }

  let userId: string;
  let workspaceId: string;
  try {
    ({ userId, workspaceId } = await consumeOAuthStateNonce(state, 'outlook_calendar'));
  } catch (err) {
    logger.error({ err }, 'outlook_calendar_oauth.state.invalid');
    settingsUrl.searchParams.set('calendar_error', 'invalid_state');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/microsoft/callback`;

    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.OUTLOOK_CLIENT_ID!,
        client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: MICROSOFT_CALENDAR_SCOPES,
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      throw new Error(tokens.error_description || tokens.error || 'token exchange failed');
    }

    // Resolve the connected mailbox address.
    let email: string | null = null;
    try {
      const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        email = me?.mail || me?.userPrincipalName || null;
      }
    } catch {
      /* non-fatal */
    }

    await storeCalendarConnection({
      workspaceId,
      userId,
      provider: 'outlook',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: Date.now() + (Number(tokens.expires_in) || 3600) * 1000,
      email,
      scope: tokens.scope ?? null,
    });

    settingsUrl.searchParams.set('calendar_connected', 'outlook');
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    logger.error({ err, workspaceId, userId }, 'outlook_calendar_oauth.callback.failed');
    settingsUrl.searchParams.set('calendar_error', 'connection_failed');
    return NextResponse.redirect(settingsUrl);
  }
}
