import { NextResponse } from 'next/server';
import { createOAuthStateNonce } from '@/lib/oauth/stateNonce';
import { GMAIL_OAUTH_SCOPES } from '@/lib/gmail/connection';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Gmail mailbox connect (Conversations). Same shape as /api/auth/google-calendar:
// same GOOGLE_CLIENT_ID multi-scope app, same single-use CSRF nonce, but its own
// route + redirect URI and its own provider='gmail' row. Redirect URI to register
// in Google Cloud:
//   https://www.leadsmind.io/api/auth/gmail/callback
//
// include_granted_scopes merges this grant with any the user already gave the
// app (Calendar, YouTube), exactly as the Calendar flow does.

export async function GET(request: Request) {
  const settingsUrl = new URL('/settings/integrations-hub', request.url);

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      settingsUrl.searchParams.set('gmail_error', 'config_missing');
      return NextResponse.redirect(settingsUrl);
    }

    const { nonce } = await createOAuthStateNonce('gmail');

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/gmail/callback`;

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', GMAIL_OAUTH_SCOPES);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent'); // force a refresh_token every time
    authUrl.searchParams.set('include_granted_scopes', 'true');
    authUrl.searchParams.set('state', nonce);

    return NextResponse.redirect(authUrl.toString());
  } catch (err) {
    logger.error({ err }, 'gmail_oauth.init.failed');
    settingsUrl.searchParams.set('gmail_error', 'init_failed');
    return NextResponse.redirect(settingsUrl);
  }
}
