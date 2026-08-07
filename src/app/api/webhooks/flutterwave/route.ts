import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getGatewayCredentials } from '@/lib/paymentGateways/credentials';
import { verifyWebhookSecret, verifyTransaction } from '@/lib/paymentGateways/flutterwaveGateway';
import { completeFunnelOrder } from '@/lib/paymentGateways/completeFunnelOrder';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// verif-hash is a static shared-secret compare (weaker than Paystack's/Ozow's
// computed signatures — see the comment on verifyWebhookSecret). Per the
// confirmed build decision: this route treats the header check as a first
// filter only, then independently re-fetches the transaction from
// Flutterwave's own /verify API before ever marking an order paid — the
// webhook body's own amount/status fields are never trusted directly, only
// used to know *which* transaction to go re-check.
export async function POST(req: NextRequest) {
  const verifHash = req.headers.get('verif-hash');

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const txRef: string | undefined = payload?.data?.tx_ref || payload?.txRef;
  const transactionId: string | number | undefined = payload?.data?.id || payload?.data?.transaction_id;

  if (!txRef || !txRef.startsWith('fo_')) {
    return NextResponse.json({ received: true });
  }
  const orderId = txRef.slice('fo_'.length);

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from('funnel_orders')
    .select('id, workspace_id')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) {
    logger.error({ txRef }, 'webhook.flutterwave.order_not_found');
    return NextResponse.json({ received: true });
  }

  const creds = await getGatewayCredentials(order.workspace_id, 'flutterwave');
  if (!creds) {
    logger.error({ workspaceId: order.workspace_id }, 'webhook.flutterwave.no_credentials');
    return NextResponse.json({ received: true });
  }

  if (!verifyWebhookSecret(verifHash, creds.webhookSecretHash)) {
    logger.warn({ workspaceId: order.workspace_id }, 'webhook.flutterwave.invalid_verif_hash');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (!transactionId) {
    logger.error({ txRef }, 'webhook.flutterwave.no_transaction_id');
    return NextResponse.json({ received: true });
  }

  // Independent re-check — do not act on payload.data.status/amount directly.
  let verified: any;
  try {
    verified = await verifyTransaction(creds.secretKey, transactionId);
  } catch (err: any) {
    logger.error({ err, txRef }, 'webhook.flutterwave.verify_call.failed');
    return NextResponse.json({ received: true });
  }

  if (verified?.status === 'successful' && verified?.tx_ref === txRef) {
    await completeFunnelOrder({
      orderId: order.id,
      gateway: 'flutterwave',
      gatewayRef: txRef,
      paidAmount: Number(verified.amount), // Flutterwave = major units already, no conversion
      itemDescription: 'Funnel order (Flutterwave)',
    });
  }

  return NextResponse.json({ received: true });
}
