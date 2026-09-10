import { NextResponse } from 'next/server';
import { createOAuthStateNonce } from '@/lib/oauth/stateNonce';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Task 70 — Zoom connect initiation. Mirrors /api/auth/google-calendar and
// /api/auth/microsoft: mint a CSRF nonce bound server-side to the real
// authenticated user + workspace, then redirect to Zoom's consent screen.
// Writes to user_calendar_connections (provider 'zoom') on callback.
//
// External setup required (see docs/calendar-task70-video-conferencing.md):
//   - a Zoom Marketplace "User-managed OAuth" app
//   - scopes: meeting:write:meeting  (create), meeting:update, meeting:delete
//   - redirect URL registered: {NEXT_PUBLIC_APP_URL}/api/auth/zoom/callback
//   - env: ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET

export async function GET(request: Request) {
  const settingsUrl = new URL('/settings/integrations-hub', request.url);

  try {
    const clientId = process.env.ZOOM_CLIENT_ID;
    if (!clientId) {
      settingsUrl.searchParams.set('calendar_error', 'config_missing');
      return NextResponse.redirect(settingsUrl);
    }

    const { nonce } = await createOAuthStateNonce('zoom');

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/zoom/callback`;

    const authUrl = new URL('https://zoom.us/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', nonce);

    return NextResponse.redirect(authUrl.toString());
  } catch (err) {
    logger.error({ err }, 'zoom_oauth.init.failed');
    settingsUrl.searchParams.set('calendar_error', 'init_failed');
    return NextResponse.redirect(settingsUrl);
  }
}
