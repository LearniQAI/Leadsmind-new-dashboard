import Stripe from 'stripe';
import { getGatewayCredentials } from '@/lib/paymentGateways/credentials';
import { stripe as defaultStripe } from '@/lib/stripe';

/**
 * Resolves the Stripe client a given workspace's checkout sessions were actually created
 * with — its own connected Stripe Connect account when one exists, otherwise the platform's
 * default Stripe client. Extracted from guestCheckout.ts / courseCommerce.ts (both had their
 * own copy of this exact logic) so the guest-checkout status-polling route can retrieve a
 * session with the SAME client that created it — retrieving a Connect-account session with
 * the wrong (platform-default) client 404s, since the session doesn't exist on that account.
 */
export async function stripeForWorkspace(workspaceId: string): Promise<Stripe> {
  const creds = await getGatewayCredentials(workspaceId, 'stripe');
  if (creds) {
    return new Stripe(creds.accessToken, { apiVersion: '2026-04-22.dahlia' as any });
  }
  return defaultStripe;
}
