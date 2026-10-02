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
  // Browser redirect from Google — code/state/query string are never logged.
  const requestId = newRequestId();
  const timer = createStepTimer();
  let workspaceIdForLog: string | null = null;
  let status = 302;
  let failure: unknown;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const finish = () => logRequestComplete({
    requestId, route: '/api/auth/callback/youtube', method: 'GET', status,
    durationMs: timer.totalMs(), steps: timer.steps(), workspaceId: workspaceIdForLog, error: failure,
  });

  // User cancelled or denied on Google's consent screen.
  if (searchParams.get('error')) {
    status = 400;
    finish();
    return socialConnectionsRedirect('youtube', { error: 'access_denied' });
  }
  if (!code || !state) {
    status = 400;
    finish();
    return socialConnectionsRedirect('youtube', { error: 'missing_parameters' });
  }

  try {
    // state is a random opaque nonce minted at flow-initiation time, bound server-side to
    // the real authenticated user + their real workspace — never trust its raw value.
    const { workspaceId } = await consumeOAuthStateNonce(state, 'youtube');
    workspaceIdForLog = workspaceId;
    timer.mark('state_nonce_verify');

    const supabase = createAdminClient();

    // 1. Exchange code for access token — same Google OAuth client/endpoint as the existing
    // GSC/Gmail/Calendar flows (src/app/api/auth/google/callback/route.ts), different redirect_uri.
    const tokenResponse = await providerFetch('https://oauth2.googleapis.com/token', {
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

    const tokenData = await readJson(tokenResponse);
    timer.mark('token_exchange');
    if (!tokenResponse.ok || !tokenData.access_token) throw new OAuthFlowError('provider_error');

    // Google only sends refresh_token on first consent or when prompt=consent is used
    // (getYouTubeAuthUrl always passes prompt=consent, so this should be present).
    const { access_token, refresh_token, expires_in } = tokenData;
    if (!refresh_token) {
      logger.warn({ workspaceId }, 'auth.youtube_callback.no_refresh_token');
    }

    // 2. Fetch the connected YouTube channel's name
    const channelResponse = await providerFetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const channelData = await readJson(channelResponse);
    timer.mark('channel_fetch');
    if (!channelResponse.ok) throw new OAuthFlowError('provider_error');

    const channel = channelData.items?.[0];
    if (!channel?.id) throw new OAuthFlowError('no_channel');
    const accountName = channel.snippet?.title || 'YouTube Channel';

    // 3. Store in platform_connections — same table/shape every other publish platform uses.
    const { error } = await supabase.from('platform_connections').upsert({
      workspace_id: workspaceId,
      platform: 'youtube',
      credentials: {
        account_id: channel.id,
        account_name: accountName,
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
    return socialConnectionsRedirect('youtube', { success: true });
  } catch (error) {
    status = 500;
    failure = error;
    logger.error(safeErrorInfo(error), 'auth.youtube_callback.failed');
    finish();
    return socialConnectionsRedirect('youtube', { error: failureCodeOf(error) });
  }
}
