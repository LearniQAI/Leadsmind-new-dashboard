'use server';

import { createPartnerReferral } from '@/lib/paymentGateways/paypalGateway';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { createOAuthStateNonce } from '@/lib/oauth/stateNonce';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

// Same role tier as every other financial credential action (finance/*,
// settings/integrations) and as getStripeConnectAuthUrl.
const ALLOWED_PAYPAL_CONNECT_ROLES = ['admin', 'owner'];

/**
 * Builds the real PayPal Partner Referrals onboarding link for the caller's
 * workspace. Unlike Stripe Connect's `state` query param, PayPal's Partner
 * Referrals flow has no built-in state passthrough — the return_url itself
 * carries our nonce as a query param, and PayPal appends its own
 * (merchantId/merchantIdInPayPal/permissionsGranted) params after it. The
 * same nonce also becomes the `tracking_id` sent to PayPal, so the callback
 * can cross-check the nonce-resolved workspace against PayPal's own
 * tracking_id echo — belt and braces, since the nonce is what's actually
 * trusted either way.
 */
export async function getPaypalConnectAuthUrl(): Promise<string> {
  try {
    await requireWorkspaceRole(ALLOWED_PAYPAL_CONNECT_ROLES);

    const { nonce } = await createOAuthStateNonce('paypal');
    const redirectBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${redirectBase}/api/integrations/paypal/callback?state=${nonce}`;

    const { actionUrl } = await createPartnerReferral(nonce, returnUrl);

    logger.info({}, 'paypal_connect.auth_url.generated');
    return actionUrl;
  } catch (err: any) {
    logger.error({ err }, 'paypal_connect.auth_url.failed');
    if (err instanceof AppError) throw err;
    throw new Error('Unable to start PayPal Connect. Please try again.');
  }
}
