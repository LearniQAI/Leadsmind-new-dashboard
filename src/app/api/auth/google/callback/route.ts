import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { newRequestId } from '@/shared/logger/requestId';
import { createStepTimer, logRequestComplete } from '@/shared/logger/requestTiming';

export async function GET(request: Request) {
  // Browser redirect, not a client fetch — request_id is generated server-side and the query
  // string (code) is never logged, only the static route name/status/steps/sanitized error.
  const requestId = newRequestId();
  const timer = createStepTimer();
  let workspaceIdForLog: string | null = null;
  let status = 200;

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    status = 400;
    logRequestComplete({ requestId, route: '/api/auth/google/callback', method: 'GET', status, durationMs: timer.totalMs(), steps: timer.steps(), workspaceId: workspaceIdForLog });
    return NextResponse.redirect(new URL('/settings?error=AccessDenied', request.url));
  }
  if (!code) {
    status = 400;
    logRequestComplete({ requestId, route: '/api/auth/google/callback', method: 'GET', status, durationMs: timer.totalMs(), steps: timer.steps(), workspaceId: workspaceIdForLog });
    return NextResponse.redirect(new URL('/settings?error=NoCodeProvided', request.url));
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
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
    timer.mark('token_exchange');

    if (!tokenResponse.ok) throw new Error('Failed to fetch tokens from Google');
    const tokens = await tokenResponse.json();

    const { workspaceId } = await requireWorkspaceAccess();
    workspaceIdForLog = workspaceId;
    const supabase = await createServerClient();
    timer.mark('workspace_resolve');

    const { error: dbError } = await supabase
      .from('platform_connections')
      .upsert({
        workspace_id: workspaceId,
        platform: 'google_calendar',
        status: 'connected',
        credentials: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: Date.now() + tokens.expires_in * 1000,
        }
      }, { onConflict: 'workspace_id, platform' });
    timer.mark('platform_connection_upsert');

    if (dbError) throw dbError;

    return NextResponse.redirect(new URL('/settings?success=GoogleCalendarConnected', request.url));
  } catch (err) {
    status = 500;
    return NextResponse.redirect(new URL('/settings?error=OAuthFailed', request.url));
  } finally {
    logRequestComplete({
      requestId,
      route: '/api/auth/google/callback',
      method: 'GET',
      status,
      durationMs: timer.totalMs(),
      steps: timer.steps(),
      workspaceId: workspaceIdForLog,
    });
  }
}
