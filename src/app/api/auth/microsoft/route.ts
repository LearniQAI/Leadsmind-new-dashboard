import { NextResponse } from 'next/server';
import { createOAuthStateNonce } from '@/lib/oauth/stateNonce';
import { MICROSOFT_CALENDAR_SCOPES } from '@/lib/calendar/connections';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Task 62 — Outlook / Microsoft 365 calendar connect initiation.
// Previously only a callback stub existed with nothing to call it. Writes to
// user_calendar_connections (provider 'outlook'), same store as Google.
// Env: OUTLOOK_CLIENT_ID / OUTLOOK_CLIENT_SECRET (matches calendarSync.ts).
//
// Task 70 — the scope list now also carries OnlineMeetings.ReadWrite so this
// SAME connection can create Microsoft Teams meetings (Graph /me/onlineMeetings)
// without a second Microsoft app/connection. Existing connections keep working
// for calendar sync; the Teams scope is picked up when the user reconnects.
const SCOPES = MICROSOFT_CALENDAR_SCOPES;

export async function GET(request: Request) {
  const settingsUrl = new URL('/settings/integrations-hub', request.url);

  try {
    const clientId = process.env.OUTLOOK_CLIENT_ID;
    if (!clientId) {
      settingsUrl.searchParams.set('calendar_error', 'config_missing');
      return NextResponse.redirect(settingsUrl);
    }

    const { nonce } = await createOAuthStateNonce('outlook_calendar');

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/microsoft/callback`;

    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_mode', 'query');
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', nonce);

    return NextResponse.redirect(authUrl.toString());
  } catch (err) {
    logger.error({ err }, 'outlook_calendar_oauth.init.failed');
    settingsUrl.searchParams.set('calendar_error', 'init_failed');
    return NextResponse.redirect(settingsUrl);
  }
}
