import { NextResponse } from 'next/server';
import { consumeOAuthStateNonce } from '@/lib/oauth/stateNonce';
import { storeCalendarConnection, hasGmailScope } from '@/lib/calendar/connections';
import { fetchGmailProfileEmail, linkGmailMailbox } from '@/lib/gmail/connection';
import { ensureWatch } from '@/lib/gmail/sync';
import { logger } from '@/shared/logger';
import { newRequestId } from '@/shared/logger/requestId';
import { createStepTimer, logRequestComplete } from '@/shared/logger/requestTiming';

export const dynamic = 'force-dynamic';

// Gmail connect callback. Writes ONLY the caller's provider='gmail' row in
// user_calendar_connections — never their 'google' calendar row.

export async function GET(request: Request) {
  // Browser redirect, not a client fetch — request_id is generated server-side and the query
  // string (code/state) is never logged, only the static route name/status/steps/sanitized error.
  const requestId = newRequestId();
  const timer = createStepTimer();
  let workspaceIdForLog: string | null = null;
  let userIdForLog: string | null = null;
  let status = 200;

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  const settingsUrl = new URL('/settings/integrations-hub', request.url);

  const finish = () => logRequestComplete({
    requestId,
    route: '/api/auth/gmail/callback',
    method: 'GET',
    status,
    durationMs: timer.totalMs(),
    steps: timer.steps(),
    workspaceId: workspaceIdForLog,
    userId: userIdForLog,
  });

  if (oauthError) {
    status = 400;
    settingsUrl.searchParams.set('gmail_error', oauthError === 'access_denied' ? 'access_denied' : 'oauth_error');
    finish();
    return NextResponse.redirect(settingsUrl);
  }
  if (!code || !state) {
    status = 400;
    settingsUrl.searchParams.set('gmail_error', 'missing_params');
    finish();
    return NextResponse.redirect(settingsUrl);
  }

  // CSRF: resolve the real user + workspace from the single-use nonce.
  let userId: string;
  let workspaceId: string;
  try {
    ({ userId, workspaceId } = await consumeOAuthStateNonce(state, 'gmail'));
    workspaceIdForLog = workspaceId;
    userIdForLog = userId;
    timer.mark('state_nonce_verify');
  } catch (err) {
    status = 400;
    logger.error({ err }, 'gmail_oauth.state.invalid');
    settingsUrl.searchParams.set('gmail_error', 'invalid_state');
    finish();
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
    timer.mark('token_exchange');
    if (!tokenRes.ok || !tokens.access_token) {
      throw new Error(tokens.error_description || tokens.error || 'token exchange failed');
    }

    // Google's granular consent lets the user untick the Gmail permission and
    // still returns a token. Storing that would show "Connected" for a mailbox
    // we can't read or send from — reject it and tell the user why instead.
    if (!hasGmailScope(tokens.scope)) {
      status = 400;
      logger.warn({ workspaceId, userId, scope: tokens.scope }, 'gmail_oauth.callback.scope_not_granted');
      settingsUrl.searchParams.set('gmail_error', 'missing_permission');
      return NextResponse.redirect(settingsUrl);
    }

    // The mailbox address comes from Gmail itself (the account actually
    // connected), not from the LeadsMind user's login email.
    const profile = await fetchGmailProfileEmail(tokens.access_token);
    timer.mark('profile_fetch');
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
    timer.mark('store_calendar_connection');

    // The mailbox identity messages link to (survives disconnect/reconnect).
    if (!profile.email) throw new Error('Gmail profile returned no email address');
    const mailboxId = await linkGmailMailbox(workspaceId, userId, profile.email);
    timer.mark('link_gmail_mailbox');

    // Start ongoing sync (Pub/Sub watch when configured; otherwise the cron polls from the history
    // cursor this sets). Best-effort: the gmail-sync cron retries it, and the connect has succeeded.
    try {
      await ensureWatch(mailboxId);
    } catch (err) {
      logger.warn({ err, mailboxId }, 'gmail_oauth.callback.watch_failed');
    }
    timer.mark('ensure_watch');

    settingsUrl.searchParams.set('gmail_connected', '1');
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    status = 500;
    logger.error({ err, workspaceId, userId }, 'gmail_oauth.callback.failed');
    settingsUrl.searchParams.set('gmail_error', 'connection_failed');
    return NextResponse.redirect(settingsUrl);
  } finally {
    finish();
  }
}
