import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) return NextResponse.redirect(new URL('/settings?error=AccessDenied', request.url));
  if (!code) return NextResponse.redirect(new URL('/settings?error=NoCodeProvided', request.url));

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

    if (!tokenResponse.ok) throw new Error('Failed to fetch tokens from Google');
    const tokens = await tokenResponse.json();

    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

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

    if (dbError) throw dbError;

    return NextResponse.redirect(new URL('/settings?success=GoogleCalendarConnected', request.url));
  } catch (err) {
    return NextResponse.redirect(new URL('/settings?error=OAuthFailed', request.url));
  }
}
