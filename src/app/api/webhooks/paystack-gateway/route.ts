import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getGatewayCredentials } from '@/lib/paymentGateways/credentials';
import { verifyWebhookSignature } from '@/lib/paymentGateways/paystackGateway';
import { completeFunnelOrder } from '@/lib/paymentGateways/completeFunnelOrder';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Separate route from src/app/api/webhooks/paystack/route.ts (LeadsMind's own
// SaaS-billing Paystack account, verified against the single global
// PAYSTACK_SECRET_KEY env var). This route is for workspaces' own
// customer-facing Paystack accounts — a different signing key per workspace,
// so which workspace's key to verify against can't be known until the
// order/reference is resolved first (see credentials.ts's audit note on this).
// A funnel_orders reference is always `fo_<orderId>` (set in
// funnelOrders.ts), so the workspace is looked up from that row BEFORE the
// signature is recomputed — the signature itself is still what decides
// whether anything is trusted, this only resolves *whose* key to check it
// against.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const reference: string | undefined = payload?.data?.reference;
  if (!reference || !reference.startsWith('fo_')) {
    // Not a funnel-order reference this route knows how to resolve — accept
    // with 200 so Paystack doesn't retry indefinitely, but do nothing.
    return NextResponse.json({ received: true });
  }
  const orderId = reference.slice('fo_'.length);

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from('funnel_orders')
    .select('id, workspace_id, amount')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) {
    logger.error({ reference }, 'webhook.paystack_gateway.order_not_found');
    return NextResponse.json({ received: true });
  }

  const creds = await getGatewayCredentials(order.workspace_id, 'paystack');
  if (!creds) {
    logger.error({ workspaceId: order.workspace_id }, 'webhook.paystack_gateway.no_credentials');
    return NextResponse.json({ received: true });
  }

  const validSignature = verifyWebhookSignature(rawBody, signature, creds.secretKey);
  if (!validSignature) {
    logger.warn({ workspaceId: order.workspace_id }, 'webhook.paystack_gateway.invalid_signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (payload.event === 'charge.success' && payload.data?.status === 'success') {
    await completeFunnelOrder({
      orderId: order.id,
      gateway: 'paystack',
      gatewayRef: reference,
      paidAmount: Number(payload.data.amount) / 100, // kobo/cents -> rands
      itemDescription: 'Funnel order (Paystack)',
    });
  }

  return NextResponse.json({ received: true });
}
