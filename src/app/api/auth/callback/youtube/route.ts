import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { consumeOAuthStateNonce } from '@/lib/oauth/stateNonce';
import { logger } from '@/shared/logger';
import { encrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social?error=missing_parameters`);
  }

  try {
    // state is a random opaque nonce minted at flow-initiation time, bound server-side to
    // the real authenticated user + their real workspace — never trust its raw value.
    const { workspaceId } = await consumeOAuthStateNonce(state, 'youtube');

    const supabase = createAdminClient();

    // 1. Exchange code for access token — same Google OAuth client/endpoint as the existing
    // GSC/Gmail/Calendar flows (src/app/api/auth/google/callback/route.ts), different redirect_uri.
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/youtube`,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange token');

    // Google only sends refresh_token on first consent or when prompt=consent is used
    // (getYouTubeAuthUrl always passes prompt=consent, so this should be present).
    const { access_token, refresh_token, expires_in } = tokenData;
    if (!refresh_token) {
      logger.warn({ workspaceId }, 'auth.youtube_callback.no_refresh_token');
    }

    // 2. Fetch the connected YouTube channel's name
    const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const channelData = await channelResponse.json();
    if (!channelResponse.ok) throw new Error(channelData.error?.message || 'Failed to fetch YouTube channel');

    const channel = channelData.items?.[0];
    const accountId = channel?.id;
    const accountName = channel?.snippet?.title || 'YouTube Channel';

    // 3. Store in platform_connections — same table/shape every other publish platform uses.
    const { error } = await supabase.from('platform_connections').upsert({
      workspace_id: workspaceId,
      platform: 'youtube',
      credentials: {
        account_id: accountId,
        account_name: accountName,
        access_token_encrypted: encrypt(access_token),
        refresh_token_encrypted: refresh_token ? encrypt(refresh_token) : null,
        token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        health_status: 'connected'
      },
      status: 'connected',
      last_sync_at: new Date().toISOString()
    }, { onConflict: 'workspace_id,platform' });

    if (error) throw error;

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social?success=youtube_connected`);
  } catch (error: any) {
    logger.error({ err: error }, 'auth.youtube_callback.failed');
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social?error=auth_failed`);
  }
}
