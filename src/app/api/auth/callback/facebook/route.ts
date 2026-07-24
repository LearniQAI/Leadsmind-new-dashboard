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
    // the real authenticated user + their real workspace — never trust its raw value as a
    // workspace_id. Rejects (throws) if missing/expired/already-used/wrong-platform, before
    // any token exchange or workspace data write happens.
    const { workspaceId } = await consumeOAuthStateNonce(state, 'facebook');

    const supabase = createAdminClient();

    // 1. Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/facebook&client_secret=${process.env.META_APP_SECRET}&code=${code}`;
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) throw new Error(tokenData.error?.message || 'Failed to exchange token');

    const { access_token, expires_in } = tokenData;

    // 2. Fetch user profile
    const profileResponse = await fetch(`https://graph.facebook.com/me?access_token=${access_token}&fields=id,name`);
    const profileData = await profileResponse.json();
    const { id: accountId, name: accountName } = profileData;

    // 3. Store in social_accounts table
    const { error } = await supabase.from('social_accounts').upsert({
      workspace_id: workspaceId,
      platform: 'facebook',
      account_name: accountName,
      account_id: accountId,
      access_token_encrypted: encrypt(access_token),
      token_expires_at: expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null,
    }, { onConflict: 'workspace_id,platform,account_id' });

    if (error) throw error;

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social?success=facebook_connected`);
  } catch (error: any) {
    logger.error({ err: error }, 'auth.facebook_callback.failed');
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social?error=auth_failed`);
  }
}
