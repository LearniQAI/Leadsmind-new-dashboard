import { createAdminClient } from '@/lib/supabase/server';
import { consumeOAuthStateNonce } from '@/lib/oauth/stateNonce';
import { OAuthFlowError, providerFetch, readJson, safeErrorInfo, failureCodeOf, socialConnectionsRedirect } from '@/lib/oauth/socialOAuth';
import { logger } from '@/shared/logger';
import { encrypt } from '@/lib/encryption';
import { newRequestId } from '@/shared/logger/requestId';
import { createStepTimer, logRequestComplete } from '@/shared/logger/requestTiming';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: Request) {
  // Browser redirect from LinkedIn — code/state/query string are never logged; only the static
  // route name, status, step timings and a sanitized error go into the completion log.
  const requestId = newRequestId();
  const timer = createStepTimer();
  let workspaceIdForLog: string | null = null;
  let status = 302;
  let failure: unknown;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const finish = () => logRequestComplete({
    requestId, route: '/api/auth/callback/linkedin', method: 'GET', status,
    durationMs: timer.totalMs(), steps: timer.steps(), workspaceId: workspaceIdForLog, error: failure,
  });

  // User cancelled or denied on LinkedIn's consent screen.
  if (searchParams.get('error')) {
    status = 400;
    finish();
    return socialConnectionsRedirect('linkedin', { error: 'access_denied' });
  }
  if (!code || !state) {
    status = 400;
    finish();
    return socialConnectionsRedirect('linkedin', { error: 'missing_parameters' });
  }

  try {
    // state is a random opaque nonce minted at flow-initiation time, bound server-side to
    // the real authenticated user + their real workspace — never trust its raw value.
    const { workspaceId } = await consumeOAuthStateNonce(state, 'linkedin');
    workspaceIdForLog = workspaceId;
    timer.mark('state_nonce_verify');

    const supabase = createAdminClient();

    // 1. Exchange code for access token
    const tokenResponse = await providerFetch('https://www.linkedin.com/oauth/v2/accessToken', {
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
    const tokenData = await readJson(tokenResponse);
    timer.mark('token_exchange');
    if (!tokenResponse.ok || !tokenData.access_token) throw new OAuthFlowError('provider_error');

    // refresh_token is only present if this app has LinkedIn's separate "Programmatic Refresh
    // Tokens" product granted — not automatic. getValidLinkedInAccessToken() in social.ts
    // handles its absence by requiring reconnect rather than assuming a refresh is possible.
    const { access_token, expires_in, refresh_token } = tokenData;

    // 2. Fetch user profile from LinkedIn to get account name
    const profileResponse = await providerFetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profileData = await readJson(profileResponse);
    timer.mark('profile_fetch');
    if (!profileResponse.ok || !profileData.sub) throw new OAuthFlowError('provider_error');

    // 3. Store in platform_connections — the table createSocialPost()/getConnectedPlatforms()
    // actually read from (matches the Meta/WhatsApp pattern in messaging.ts's
    // saveMetaConnections). social_accounts is a separate, unread table; writing there left
    // this connection permanently invisible to the publish flow.
    const { error } = await supabase.from('platform_connections').upsert({
      workspace_id: workspaceId,
      platform: 'linkedin',
      credentials: {
        account_id: profileData.sub,
        account_name: profileData.name ?? null,
        access_token_encrypted: encrypt(access_token),
        refresh_token_encrypted: refresh_token ? encrypt(refresh_token) : null,
        token_expires_at: new Date(Date.now() + (Number(expires_in) || 0) * 1000).toISOString(),
        health_status: 'connected'
      },
      status: 'connected',
      last_sync_at: new Date().toISOString()
    }, { onConflict: 'workspace_id,platform' });
    timer.mark('connection_upsert');

    if (error) throw new OAuthFlowError('save_failed');

    finish();
    return socialConnectionsRedirect('linkedin', { success: true });
  } catch (error) {
    status = 500;
    failure = error;
    logger.error(safeErrorInfo(error), 'auth.linkedin_callback.failed');
    finish();
    return socialConnectionsRedirect('linkedin', { error: failureCodeOf(error) });
  }
}
