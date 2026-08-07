import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { consumeOAuthStateNonce } from '@/lib/oauth/stateNonce';
import { getMerchantIntegrationByTrackingId, PaypalApiError, type MerchantIntegrationStatus } from '@/lib/paymentGateways/paypalGateway';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

const REDIRECT_PAGE = '/finance/payment-gateways';

// PayPal's onboarding return redirect. Unlike Stripe's OAuth callback (a
// single `code` traded for a token), PPCP onboarding produces no token at
// all for us to receive here. The preferred confirmation is the
// server-to-server merchant-integrations status check keyed off our own
// nonce/tracking_id (PayPal's documented approach) — but that endpoint
// returns AUTHORIZATION_ERROR for this Partner app's current API access
// tier, confirmed live against a real completed onboarding (a narrower
// permission than Partner Referral creation itself, which does work). When
// that specific error is hit, this falls back to the return-redirect's own
// params (merchantIdInPayPal, permissionsGranted, isEmailConfirmed,
// accountStatus) as PayPal's next-best-documented alternative — still gated
// by the single-use nonce (only reachable via the exact onboarding link this
// app generated), just not an independent server-to-server confirmation. Any
// OTHER failure from the status check (network error, business decline)
// still fails closed.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const state = searchParams.get('state');
  const permissionsGranted = searchParams.get('permissionsGranted');
  const isEmailConfirmed = searchParams.get('isEmailConfirmed');
  const accountStatus = searchParams.get('accountStatus');
  const merchantIdInPayPal = searchParams.get('merchantIdInPayPal');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!state) {
    return NextResponse.redirect(`${baseUrl}${REDIRECT_PAGE}?paypal_error=missing_parameters`);
  }

  if (permissionsGranted === 'false') {
    logger.warn({}, 'paypal_connect.callback.permissions_declined');
    return NextResponse.redirect(`${baseUrl}${REDIRECT_PAGE}?paypal_error=declined`);
  }

  try {
    // state is the same opaque nonce minted at flow-initiation time
    // (getPaypalConnectAuthUrl) and sent to PayPal as tracking_id — resolves
    // the real, role-verified workspace server-side, never trusts client input.
    const { workspaceId } = await consumeOAuthStateNonce(state, 'paypal');

    let status: MerchantIntegrationStatus | null = null;
    try {
      status = await getMerchantIntegrationByTrackingId(state);
    } catch (statusErr: any) {
      if (statusErr instanceof PaypalApiError && statusErr.paypalErrorName === 'AUTHORIZATION_ERROR') {
        logger.warn({ workspaceId }, 'paypal_connect.callback.status_check_unauthorized_falling_back_to_redirect_params');
        if (merchantIdInPayPal && permissionsGranted === 'true') {
          status = {
            merchantId: merchantIdInPayPal,
            paymentsReceivable: true,
            primaryEmailConfirmed: isEmailConfirmed === 'true',
          };
        }
      } else {
        throw statusErr;
      }
    }

    if (!status || !status.paymentsReceivable) {
      throw new Error('PayPal merchant integration is not yet payment-ready');
    }
    if (accountStatus && accountStatus !== 'BUSINESS_ACCOUNT') {
      throw new Error(`Unexpected PayPal account status: ${accountStatus}`);
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient.from('workspace_integrations').upsert(
      {
        workspace_id: workspaceId,
        provider: 'paypal',
        category: 'payment_gateway',
        connected: true,
        account_label: status.merchantId,
        credentials: {
          merchant_id: status.merchantId,
          payments_receivable: status.paymentsReceivable,
          primary_email_confirmed: status.primaryEmailConfirmed,
        },
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,provider' }
    );

    if (error) throw error;

    logger.info({ workspaceId, merchantId: status.merchantId }, 'paypal_connect.callback.success');
    return NextResponse.redirect(`${baseUrl}${REDIRECT_PAGE}?paypal_success=1`);
  } catch (err: any) {
    logger.error({ err }, 'paypal_connect.callback.failed');
    return NextResponse.redirect(`${baseUrl}${REDIRECT_PAGE}?paypal_error=auth_failed`);
  }
}
