import { NextResponse } from 'next/server';
import { createOAuthStateNonce } from '@/lib/oauth/stateNonce';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Task 62 — dedicated Google Calendar connect flow.
//
// Deliberately its OWN route, NOT /api/auth/google/* — that pair is shared
// with the Search Console (GSC) connect flow (src/app/actions/seo.ts) and its
// callback contains GSC-unaware calendar logic. Keeping this separate means
// zero risk to SEO. Redirect URI registered:
//   https://www.leadsmind.io/api/auth/google-calendar/callback
//
// Uses the same GOOGLE_CLIENT_ID/SECRET app as GSC/Gmail/YouTube (a
// multi-scope Google Cloud project) — distinct from the Supabase-auth Google
// *login* client, which goes through Supabase's provider config + /auth/callback.

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'openid',
  'email',
].join(' ');

export async function GET(request: Request) {
  const settingsUrl = new URL('/settings/integrations-hub', request.url);

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      settingsUrl.searchParams.set('calendar_error', 'config_missing');
      return NextResponse.redirect(settingsUrl);
    }

    // Random opaque nonce bound server-side to the real authenticated user +
    // their session-verified workspace. Throws if unauthenticated / not a member.
    const { nonce } = await createOAuthStateNonce('google_calendar');

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google-calendar/callback`;

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent'); // force a refresh_token every time
    authUrl.searchParams.set('include_granted_scopes', 'true');
    authUrl.searchParams.set('state', nonce);

    return NextResponse.redirect(authUrl.toString());
  } catch (err) {
    logger.error({ err }, 'google_calendar_oauth.init.failed');
    settingsUrl.searchParams.set('calendar_error', 'init_failed');
    return NextResponse.redirect(settingsUrl);
  }
}
