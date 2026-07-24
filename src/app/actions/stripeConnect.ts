'use server';

import { stripe } from '@/lib/stripe';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { createOAuthStateNonce } from '@/lib/oauth/stateNonce';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

// Only workspace admins/owners may initiate a payment-gateway connection — same role tier as
// every other financial credential action in this app (finance/*, settings/integrations).
const ALLOWED_STRIPE_CONNECT_ROLES = ['admin', 'owner'];

/**
 * Builds the real Stripe Connect (OAuth) authorization URL for the caller's workspace.
 * Mints a CSRF-safe state nonce via the same oauth_state_nonces mechanism used by every other
 * OAuth connect flow in this app (Task 15 Batch 4) — the nonce, not a client-supplied
 * workspaceId, is what the callback later trusts to resolve which workspace this connection
 * belongs to.
 */
export async function getStripeConnectAuthUrl(): Promise<string> {
  try {
    await requireWorkspaceRole(ALLOWED_STRIPE_CONNECT_ROLES);

    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
    if (!clientId) {
      throw new Error('[FATAL] STRIPE_CONNECT_CLIENT_ID is not configured');
    }

    const { nonce } = await createOAuthStateNonce('stripe');
    const redirectBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${redirectBase}/api/integrations/stripe/callback`;

    const url = stripe.oauth.authorizeUrl({
      client_id: clientId,
      response_type: 'code',
      scope: 'read_write',
      redirect_uri: redirectUri,
      state: nonce,
    });

    logger.info({}, 'stripe_connect.auth_url.generated');
    return url;
  } catch (err: any) {
    // Server Action errors forward their thrown message to the client verbatim (unlike route
    // handlers) — AppError subclasses (Unauthorized/Forbidden) already carry client-safe
    // messages by design, but anything else (e.g. a missing env var) must be rethrown as a
    // generic message instead of leaking internal configuration details.
    logger.error({ err }, 'stripe_connect.auth_url.failed');
    if (err instanceof AppError) throw err;
    throw new Error('Unable to start Stripe Connect. Please try again.');
  }
}
