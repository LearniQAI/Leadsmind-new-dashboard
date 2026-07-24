import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/server';
import { consumeOAuthStateNonce } from '@/lib/oauth/stateNonce';
import { encrypt } from '@/lib/encryption';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

const REDIRECT_PAGE = '/finance/payment-gateways';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Stripe reports denial/errors via ?error=... rather than omitting code — surface a generic
  // "declined" state rather than treating it as a missing-parameter failure.
  if (oauthError) {
    logger.warn({ oauthError }, 'stripe_connect.callback.provider_error');
    return NextResponse.redirect(`${baseUrl}${REDIRECT_PAGE}?stripe_error=declined`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}${REDIRECT_PAGE}?stripe_error=missing_parameters`);
  }

  try {
    // state is a random opaque nonce minted at flow-initiation time (getStripeConnectAuthUrl),
    // bound server-side to the real authenticated user + their real (role-verified) workspace
    // — never trust the raw state value itself. Rejects if missing/expired/already-used/wrong
    // platform, before any token exchange or workspace data write happens.
    const { workspaceId } = await consumeOAuthStateNonce(state, 'stripe');

    const tokenResponse = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    const { access_token, stripe_user_id, stripe_publishable_key, scope, livemode } = tokenResponse;
    if (!access_token || !stripe_user_id) {
      throw new Error('Stripe OAuth token exchange returned an incomplete response');
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient.from('workspace_integrations').upsert({
      workspace_id: workspaceId,
      provider: 'stripe',
      category: 'payment_gateway',
      connected: true,
      account_label: stripe_user_id,
      credentials: {
        access_token_encrypted: encrypt(access_token),
        stripe_user_id,
        stripe_publishable_key: stripe_publishable_key ?? null,
        scope: scope ?? null,
        livemode: !!livemode,
      },
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,provider' });

    if (error) throw error;

    logger.info({ workspaceId, livemode }, 'stripe_connect.callback.success');
    return NextResponse.redirect(`${baseUrl}${REDIRECT_PAGE}?stripe_success=1`);
  } catch (err: any) {
    // Never forward raw Stripe API error bodies or exception messages to the client — only a
    // generic redirect state.
    logger.error({ err }, 'stripe_connect.callback.failed');
    return NextResponse.redirect(`${baseUrl}${REDIRECT_PAGE}?stripe_error=auth_failed`);
  }
}
