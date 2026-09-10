import { NextResponse } from 'next/server';
import { consumeOAuthStateNonce } from '@/lib/oauth/stateNonce';
import { storeCalendarConnection } from '@/lib/calendar/connections';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Task 70 — Zoom connect callback. Exchanges the auth code (HTTP Basic client
// auth, Zoom's flavour), resolves the connected Zoom account's email, and
// writes ONLY to user_calendar_connections (provider 'zoom') via the shared
// storeCalendarConnection — same encrypted-at-rest token store as Google/Outlook.

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
    ({ userId, workspaceId } = await consumeOAuthStateNonce(state, 'zoom'));
  } catch (err) {
    logger.error({ err }, 'zoom_oauth.state.invalid');
    settingsUrl.searchParams.set('calendar_error', 'invalid_state');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/zoom/callback`;
    const basic = Buffer.from(
      `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
    ).toString('base64');

    const tokenRes = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      throw new Error(tokens.reason || tokens.error || 'token exchange failed');
    }

    let email: string | null = null;
    try {
      const meRes = await fetch('https://api.zoom.us/v2/users/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        email = me?.email ?? null;
      }
    } catch {
      /* non-fatal */
    }

    await storeCalendarConnection({
      workspaceId,
      userId,
      provider: 'zoom',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: Date.now() + (Number(tokens.expires_in) || 3600) * 1000,
      email,
      scope: tokens.scope ?? null,
    });

    settingsUrl.searchParams.set('calendar_connected', 'zoom');
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    logger.error({ err, workspaceId, userId }, 'zoom_oauth.callback.failed');
    settingsUrl.searchParams.set('calendar_error', 'connection_failed');
    return NextResponse.redirect(settingsUrl);
  }
}
