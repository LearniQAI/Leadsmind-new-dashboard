import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getGatewayCredentials } from '@/lib/paymentGateways/credentials';
import { captureOrder } from '@/lib/paymentGateways/paypalGateway';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// PayPal's Orders v2 API (server-side / non-JS-SDK integration) requires an
// explicit capture call after the buyer approves — unlike PayFast/Paystack/
// Flutterwave/Ozow, approval alone doesn't move funds. This route is the
// `return_url` the buyer's browser lands on after approving on PayPal's
// hosted page; its only job is to trigger the capture and send the browser
// on to the real Order Form return page. It does NOT mark the funnel_orders
// row paid itself — that write happens in the webhook handler
// (PAYMENT.CAPTURE.COMPLETED), same as every other gateway here, so a buyer
// closing the tab mid-redirect can't produce a false "paid" state with no
// corresponding gateway confirmation.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paypalOrderId = searchParams.get('token');
  const orderId = searchParams.get('order');
  const next = searchParams.get('next');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const fallback = next ? decodeURIComponent(next) : baseUrl;

  if (!paypalOrderId || !orderId) {
    return NextResponse.redirect(fallback.includes('?') ? `${fallback}&payment=error` : `${fallback}?payment=error`);
  }

  try {
    const supabase = createAdminClient();
    const { data: order } = await supabase
      .from('funnel_orders')
      .select('id, workspace_id')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) throw new Error('Order not found');

    const creds = await getGatewayCredentials(order.workspace_id, 'paypal');
    if (!creds) throw new Error('PayPal is not connected for this workspace');

    await captureOrder(paypalOrderId, creds.merchantId);

    logger.info({ orderId, paypalOrderId }, 'paypal.checkout_return.capture_triggered');
    return NextResponse.redirect(fallback);
  } catch (err: any) {
    logger.error({ err, orderId, paypalOrderId }, 'paypal.checkout_return.failed');
    return NextResponse.redirect(fallback.includes('?') ? `${fallback}&payment=error` : `${fallback}?payment=error`);
  }
}
