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
    const { workspaceId } = await consumeOAuthStateNonce(state, 'tiktok');

    const supabase = createAdminClient();

    // 1. Exchange code for access token
    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/tiktok`,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error(tokenData.error_description || 'Failed to exchange token');

    const { access_token, expires_in, refresh_token, open_id: accountId } = tokenData;

    // 2. Fetch user profile (Optional, TikTok returns open_id in token response)
    const accountName = `TikTok User (${accountId.substring(0, 8)})`;

    // 3. Store in platform_connections — the table createSocialPost()/getConnectedPlatforms()
    // actually read from (matches the Meta/WhatsApp pattern in messaging.ts's
    // saveMetaConnections). social_accounts is a separate, unread table; writing there left
    // this connection permanently invisible to the publish flow.
    const { error } = await supabase.from('platform_connections').upsert({
      workspace_id: workspaceId,
      platform: 'tiktok',
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

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social?success=tiktok_connected`);
  } catch (error: any) {
    logger.error({ err: error }, 'auth.tiktok_callback.failed');
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social?error=auth_failed`);
  }
}
