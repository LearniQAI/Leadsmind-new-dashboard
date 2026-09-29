import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { consumeOAuthStateNonce } from '@/lib/oauth/stateNonce';
import { logger } from '@/shared/logger';
import { encrypt } from '@/lib/encryption';
import { newRequestId } from '@/shared/logger/requestId';
import { createStepTimer, logRequestComplete } from '@/shared/logger/requestTiming';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Generated server-side, never from a header — this is a browser redirect from Meta, not a
  // client fetch, and its query string (code/state) is never logged: only the static route name,
  // status, step timings and a sanitized error go into the completion log below.
  const requestId = newRequestId();
  const timer = createStepTimer();
  let workspaceIdForLog: string | null = null;
  let status = 200;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    status = 400;
    logRequestComplete({ requestId, route: '/api/auth/callback/facebook', method: 'GET', status, durationMs: timer.totalMs(), steps: timer.steps(), workspaceId: workspaceIdForLog });
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social?error=missing_parameters`);
  }

  try {
    // state is a random opaque nonce minted at flow-initiation time, bound server-side to
    // the real authenticated user + their real workspace — never trust its raw value as a
    // workspace_id. Rejects (throws) if missing/expired/already-used/wrong-platform, before
    // any token exchange or workspace data write happens.
    const { workspaceId } = await consumeOAuthStateNonce(state, 'facebook');
    workspaceIdForLog = workspaceId;
    timer.mark('state_nonce_verify');

    const supabase = createAdminClient();

    // 1. Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/facebook&client_secret=${process.env.META_APP_SECRET}&code=${code}`;
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();
    timer.mark('token_exchange');

    if (!tokenResponse.ok) throw new Error(tokenData.error?.message || 'Failed to exchange token');

    const { access_token, expires_in } = tokenData;

    // 2. Fetch user profile
    const profileResponse = await fetch(`https://graph.facebook.com/me?access_token=${access_token}&fields=id,name`);
    const profileData = await profileResponse.json();
    const { id: accountId, name: accountName } = profileData;
    timer.mark('profile_fetch');

    // 3. Store in social_accounts table
    const { error } = await supabase.from('social_accounts').upsert({
      workspace_id: workspaceId,
      platform: 'facebook',
      account_name: accountName,
      account_id: accountId,
      access_token_encrypted: encrypt(access_token),
      token_expires_at: expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null,
    }, { onConflict: 'workspace_id,platform,account_id' });
    timer.mark('social_account_upsert');

    if (error) throw error;

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social?success=facebook_connected`);
  } catch (error: any) {
    status = 500;
    logger.error({ err: error }, 'auth.facebook_callback.failed');
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/social?error=auth_failed`);
  } finally {
    logRequestComplete({
      requestId,
      route: '/api/auth/callback/facebook',
      method: 'GET',
      status,
      durationMs: timer.totalMs(),
      steps: timer.steps(),
      workspaceId: workspaceIdForLog,
    });
  }
}
