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
  // Browser redirect from TikTok — code/state/query string are never logged.
  const requestId = newRequestId();
  const timer = createStepTimer();
  let workspaceIdForLog: string | null = null;
  let status = 302;
  let failure: unknown;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const finish = () => logRequestComplete({
    requestId, route: '/api/auth/callback/tiktok', method: 'GET', status,
    durationMs: timer.totalMs(), steps: timer.steps(), workspaceId: workspaceIdForLog, error: failure,
  });

  // User cancelled or denied on TikTok's consent screen.
  if (searchParams.get('error')) {
    status = 400;
    finish();
    return socialConnectionsRedirect('tiktok', { error: 'access_denied' });
  }
  if (!code || !state) {
    status = 400;
    finish();
    return socialConnectionsRedirect('tiktok', { error: 'missing_parameters' });
  }

  try {
    // state is a random opaque nonce minted at flow-initiation time, bound server-side to
    // the real authenticated user + their real workspace — never trust its raw value.
    const { workspaceId } = await consumeOAuthStateNonce(state, 'tiktok');
    workspaceIdForLog = workspaceId;
    timer.mark('state_nonce_verify');

    const supabase = createAdminClient();

    // 1. Exchange code for access token
    const tokenResponse = await providerFetch('https://open.tiktokapis.com/v2/oauth/token/', {
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

    const tokenData = await readJson(tokenResponse);
    timer.mark('token_exchange');
    if (!tokenResponse.ok || !tokenData.access_token || !tokenData.open_id) throw new OAuthFlowError('provider_error');

    const { access_token, expires_in, refresh_token, open_id: accountId } = tokenData;

    // 2. Fetch the real display name so reconnecting with a different TikTok account actually
    // changes what's shown (matches the LinkedIn/YouTube callbacks, which both fetch a real
    // profile name instead of deriving a placeholder from the account id).
    let accountName = `TikTok User (${accountId.substring(0, 8)})`;
    try {
      const profileResponse = await providerFetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=display_name',
        { headers: { Authorization: `Bearer ${access_token}` } }
      );
      const profileData = await readJson(profileResponse);
      if (profileData?.data?.user?.display_name) {
        accountName = profileData.data.user.display_name;
      } else {
        // e.g. user.info.basic not granted/approved for this app — falls back to the
        // placeholder above rather than failing the whole connection.
        logger.warn({ profileErrorCode: profileData?.error?.code }, 'auth.tiktok_callback.profile_fetch_unavailable');
      }
    } catch (err) {
      logger.warn(safeErrorInfo(err), 'auth.tiktok_callback.profile_fetch_failed');
    }
    timer.mark('profile_fetch');

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
        token_expires_at: new Date(Date.now() + (Number(expires_in) || 0) * 1000).toISOString(),
        health_status: 'connected'
      },
      status: 'connected',
      last_sync_at: new Date().toISOString()
    }, { onConflict: 'workspace_id,platform' });
    timer.mark('connection_upsert');

    if (error) throw new OAuthFlowError('save_failed');

    finish();
    return socialConnectionsRedirect('tiktok', { success: true });
  } catch (error) {
    status = 500;
    failure = error;
    logger.error(safeErrorInfo(error), 'auth.tiktok_callback.failed');
    finish();
    return socialConnectionsRedirect('tiktok', { error: failureCodeOf(error) });
  }
}
