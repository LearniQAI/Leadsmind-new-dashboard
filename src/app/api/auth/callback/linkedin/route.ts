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
    const { workspaceId } = await consumeOAuthStateNonce(state, 'linkedin');

    const supabase = createAdminClient();

    // 1. Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/linkedin`,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error(tokenData.error_description || 'Failed to exchange token');

    const { access_token, expires_in } = tokenData;

    // 2. Fetch user profile from LinkedIn to get account name
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profileData = await profileResponse.json();
    const accountId = profileData.sub;
    const accountName = profileData.name;

    // 3. Store in social_accounts table
    const { error } = await supabase.from('social_accounts').upsert({
      workspace_id: workspaceId,
      platform: 'linkedin',
      account_name: accountName,
      account_id: accountId,
      access_token_encrypted: encrypt(access_token),
      token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
    }, { onConflict: 'workspace_id,platform,account_id' });

    if (error) throw error;

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social?success=linkedin_connected`);
  } catch (error: any) {
    logger.error({ err: error }, 'auth.linkedin_callback.failed');
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social?error=auth_failed`);
  }
}
