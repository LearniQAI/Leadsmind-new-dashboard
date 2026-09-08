import { NextResponse } from 'next/server';
import { consumeOAuthStateNonce } from '@/lib/oauth/stateNonce';
import { storeCalendarConnection } from '@/lib/calendar/connections';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Task 62 — Google Calendar connect callback. Writes ONLY to
// user_calendar_connections (the single source of truth, Step 1.3).

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  const settingsUrl = new URL('/settings/integrations-hub', request.url);

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

  // CSRF: resolve the real user + workspace from the single-use nonce — never
  // trust the raw state value.
  let userId: string;
  let workspaceId: string;
  try {
    ({ userId, workspaceId } = await consumeOAuthStateNonce(state, 'google_calendar'));
  } catch (err) {
    logger.error({ err }, 'google_calendar_oauth.state.invalid');
    settingsUrl.searchParams.set('calendar_error', 'invalid_state');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google-calendar/callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      throw new Error(tokens.error_description || tokens.error || 'token exchange failed');
    }

    // Resolve the connected Google account's email (UI label + reconnect aid).
    let email: string | null = null;
    try {
      const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (infoRes.ok) email = (await infoRes.json())?.email ?? null;
    } catch {
      /* non-fatal — connection still works without a label */
    }

    await storeCalendarConnection({
      workspaceId,
      userId,
      provider: 'google',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: Date.now() + (Number(tokens.expires_in) || 3600) * 1000,
      email,
      scope: tokens.scope ?? null,
    });

    settingsUrl.searchParams.set('calendar_connected', 'google');
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    logger.error({ err, workspaceId, userId }, 'google_calendar_oauth.callback.failed');
    settingsUrl.searchParams.set('calendar_error', 'connection_failed');
    return NextResponse.redirect(settingsUrl);
  }
}
