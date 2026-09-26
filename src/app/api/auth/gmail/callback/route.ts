import { NextResponse } from 'next/server';
import { consumeOAuthStateNonce } from '@/lib/oauth/stateNonce';
import { storeCalendarConnection, hasGmailScope } from '@/lib/calendar/connections';
import { fetchGmailProfileEmail, linkGmailMailbox } from '@/lib/gmail/connection';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Gmail connect callback. Writes ONLY the caller's provider='gmail' row in
// user_calendar_connections — never their 'google' calendar row.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  const settingsUrl = new URL('/settings/integrations-hub', request.url);

  if (oauthError) {
    settingsUrl.searchParams.set('gmail_error', oauthError === 'access_denied' ? 'access_denied' : 'oauth_error');
    return NextResponse.redirect(settingsUrl);
  }
  if (!code || !state) {
    settingsUrl.searchParams.set('gmail_error', 'missing_params');
    return NextResponse.redirect(settingsUrl);
  }

  // CSRF: resolve the real user + workspace from the single-use nonce.
  let userId: string;
  let workspaceId: string;
  try {
    ({ userId, workspaceId } = await consumeOAuthStateNonce(state, 'gmail'));
  } catch (err) {
    logger.error({ err }, 'gmail_oauth.state.invalid');
    settingsUrl.searchParams.set('gmail_error', 'invalid_state');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/gmail/callback`;

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

    // Google's granular consent lets the user untick the Gmail permission and
    // still returns a token. Storing that would show "Connected" for a mailbox
    // we can't read or send from — reject it and tell the user why instead.
    if (!hasGmailScope(tokens.scope)) {
      logger.warn({ workspaceId, userId, scope: tokens.scope }, 'gmail_oauth.callback.scope_not_granted');
      settingsUrl.searchParams.set('gmail_error', 'missing_permission');
      return NextResponse.redirect(settingsUrl);
    }

    // The mailbox address comes from Gmail itself (the account actually
    // connected), not from the LeadsMind user's login email.
    const profile = await fetchGmailProfileEmail(tokens.access_token);
    if (!profile.ok) {
      throw new Error(`Gmail profile check failed (${profile.status}) — is the Gmail API enabled on the Google Cloud project?`);
    }

    await storeCalendarConnection({
      workspaceId,
      userId,
      provider: 'gmail',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: Date.now() + (Number(tokens.expires_in) || 3600) * 1000,
      email: profile.email,
      scope: tokens.scope ?? null,
    });

    // The mailbox identity messages link to (survives disconnect/reconnect).
    if (!profile.email) throw new Error('Gmail profile returned no email address');
    await linkGmailMailbox(workspaceId, userId, profile.email);

    settingsUrl.searchParams.set('gmail_connected', '1');
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    logger.error({ err, workspaceId, userId }, 'gmail_oauth.callback.failed');
    settingsUrl.searchParams.set('gmail_error', 'connection_failed');
    return NextResponse.redirect(settingsUrl);
  }
}
