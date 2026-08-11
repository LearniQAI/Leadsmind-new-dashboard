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
    // the real authenticated user + their real workspace — never trust its raw value. `extra`
    // carries the PKCE code_verifier generated alongside this nonce in getXAuthUrl().
    const { workspaceId, extra } = await consumeOAuthStateNonce(state, 'x');
    const codeVerifier = extra?.code_verifier;
    if (!codeVerifier) throw new Error('Missing PKCE code_verifier for X OAuth flow');

    const supabase = createAdminClient();

    // 1. Exchange code for access token (X requires PKCE code_verifier even for confidential
    // clients; confidential clients also authenticate via HTTP Basic auth with client_id:secret)
    const basicAuth = Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString('base64');
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.X_CLIENT_ID!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/x`,
        code_verifier: codeVerifier,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange token');

    const { access_token, refresh_token, expires_in } = tokenData;

    // 2. Fetch user profile from X to get account name/handle
    const profileResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profileData = await profileResponse.json();
    if (!profileResponse.ok) throw new Error(profileData.detail || profileData.title || 'Failed to fetch X profile');

    const accountId = profileData.data?.id;
    const accountName = profileData.data?.username ? `@${profileData.data.username}` : profileData.data?.name;

    // 3. Store in platform_connections — same shape/table as the fixed LinkedIn/TikTok
    // callbacks and the real Meta pattern (saveMetaConnections).
    const { error } = await supabase.from('platform_connections').upsert({
      workspace_id: workspaceId,
      platform: 'x',
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

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social?success=x_connected`);
  } catch (error: any) {
    logger.error({ err: error }, 'auth.x_callback.failed');
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social?error=auth_failed`);
  }
}
