import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getGatewayCredentials } from '@/lib/paymentGateways/credentials';
import { verifyNotifyHash, OzowNotifyPayload } from '@/lib/paymentGateways/ozowGateway';
import { completeFunnelOrder } from '@/lib/paymentGateways/completeFunnelOrder';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// TransactionReference is set to the funnel_orders.id directly at checkout
// (ozowGateway's initializeCheckout is called with transactionReference:
// order.id in funnelOrders.ts) — no `fo_` prefix needed since Ozow's
// reference field isn't reused for anything else in this codebase.
async function parseNotifyPayload(req: NextRequest): Promise<OzowNotifyPayload | null> {
  const contentType = req.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      return await req.json();
    }
    const text = await req.text();
    const params = new URLSearchParams(text);
    const obj: Record<string, string> = {};
    params.forEach((v, k) => { obj[k] = v; });
    return obj as unknown as OzowNotifyPayload;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const payload = await parseNotifyPayload(req);
  if (!payload || !payload.TransactionReference) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const orderId = payload.TransactionReference;

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from('funnel_orders')
    .select('id, workspace_id')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) {
    logger.error({ orderId }, 'webhook.ozow.order_not_found');
    return NextResponse.json({ received: true });
  }

  const creds = await getGatewayCredentials(order.workspace_id, 'ozow');
  if (!creds) {
    logger.error({ workspaceId: order.workspace_id }, 'webhook.ozow.no_credentials');
    return NextResponse.json({ received: true });
  }

  if (payload.SiteCode !== creds.siteCode || !verifyNotifyHash(payload, creds.privateKey)) {
    logger.warn({ workspaceId: order.workspace_id }, 'webhook.ozow.invalid_hash');
    return NextResponse.json({ error: 'Invalid hash' }, { status: 401 });
  }

  if (payload.Status === 'Complete') {
    await completeFunnelOrder({
      orderId: order.id,
      gateway: 'ozow',
      gatewayRef: payload.TransactionId,
      paidAmount: parseFloat(payload.Amount),
      itemDescription: 'Funnel order (Ozow)',
    });
  }

  return NextResponse.json({ received: true });
}
