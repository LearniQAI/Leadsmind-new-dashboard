import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/lib/paymentGateways/paypalGateway';
import { completeFunnelOrder } from '@/lib/paymentGateways/completeFunnelOrder';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// PayPal's webhook auth is structurally different from every other gateway
// here: no per-workspace signing secret to look up (see credentials.ts —
// PayPal stores an identifier, not a key), so unlike paystack-gateway's
// route there's no "resolve the order first to learn whose key to check
// against" step. Verification is against ONE platform-wide PAYPAL_WEBHOOK_ID
// (the webhook this Partner app registered), via PayPal's own
// verify-webhook-signature REST endpoint (see Phase 1 report — chosen over
// local X.509 cert verification).
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const valid = await verifyWebhookSignature({
    transmissionId: req.headers.get('paypal-transmission-id'),
    transmissionTime: req.headers.get('paypal-transmission-time'),
    certUrl: req.headers.get('paypal-cert-url'),
    authAlgo: req.headers.get('paypal-auth-algo'),
    transmissionSig: req.headers.get('paypal-transmission-sig'),
    webhookEvent: payload,
  });

  if (!valid) {
    logger.warn({ eventType: payload?.event_type }, 'webhook.paypal.invalid_signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (payload.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
    // Other subscribed event types (e.g. PAYMENT.CAPTURE.DENIED,
    // MERCHANT.ONBOARDING.COMPLETED) aren't relevant to marking a funnel
    // order paid — acknowledge with 200 so PayPal doesn't retry.
    return NextResponse.json({ received: true });
  }

  const resource = payload.resource || {};
  const customId: string | undefined = resource.custom_id;
  if (!customId || !customId.startsWith('fo_')) {
    return NextResponse.json({ received: true });
  }
  const orderId = customId.slice('fo_'.length);

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from('funnel_orders')
    .select('id')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) {
    logger.error({ customId }, 'webhook.paypal.order_not_found');
    return NextResponse.json({ received: true });
  }

  if (resource.status === 'COMPLETED') {
    await completeFunnelOrder({
      orderId: order.id,
      gateway: 'paypal',
      gatewayRef: customId,
      paidAmount: Number(resource.amount?.value || 0),
      itemDescription: 'Funnel order (PayPal)',
    });
  }

  return NextResponse.json({ received: true });
}
