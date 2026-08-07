import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';

// Generic version of the funnel_order-paid branch in
// src/app/api/webhooks/payfast/route.ts (next-step resolution + mirroring
// invoice + idempotent status flip), parameterized by gateway so the 3 new
// webhook routes don't each re-implement it. PayFast's own webhook route is
// left untouched — this is not a refactor of existing behavior, just a shared
// path for the new gateways.
export async function completeFunnelOrder(params: {
  orderId: string;
  gateway: 'paystack' | 'flutterwave' | 'ozow' | 'paypal';
  gatewayRef: string;
  paidAmount: number;
  itemDescription?: string;
}) {
  const { orderId, gateway, gatewayRef, paidAmount, itemDescription } = params;
  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from('funnel_orders')
    .select('id, status, funnel_id, funnel_step_id, amount, currency, contact_id, workspace_id')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) {
    logger.error({ orderId, gateway }, `webhook.${gateway}.funnel_order.not_found`);
    return;
  }
  if (order.status === 'paid') {
    logger.info({ orderId: order.id, gateway }, `webhook.${gateway}.funnel_order.already_paid`);
    return;
  }

  const { data: paidStep } = await supabase
    .from('funnel_steps')
    .select('id, order, config')
    .eq('id', order.funnel_step_id)
    .single();

  let nextStepId: string | null = (paidStep?.config as any)?.on_success_step_id || null;
  if (!nextStepId && paidStep) {
    const { data: siblingSteps } = await supabase
      .from('funnel_steps')
      .select('id, order')
      .eq('funnel_id', order.funnel_id);
    nextStepId = siblingSteps?.find((s) => s.order === (paidStep as any).order + 1)?.id || null;
  }

  const { error: invoiceErr } = await supabase
    .from('invoices')
    .insert({
      workspace_id: order.workspace_id,
      contact_id: order.contact_id,
      invoice_number: `${gateway.toUpperCase().slice(0, 2)}-${gatewayRef}`,
      items: [{ description: itemDescription || 'Funnel order', quantity: 1, unit_amount: paidAmount }],
      subtotal: paidAmount,
      tax_total: 0,
      total_amount: paidAmount,
      amount_due: paidAmount,
      amount_paid: paidAmount,
      currency: order.currency || 'ZAR',
      status: 'paid',
      payment_method: gateway,
      metadata: { funnelOrderId: order.id, funnelId: order.funnel_id, gatewayRef, type: 'funnel_order' },
    })
    .select('id')
    .single();

  if (invoiceErr) {
    logger.error({ err: invoiceErr, orderId: order.id, gateway }, `webhook.${gateway}.funnel_order_invoice.create.failed`);
  }

  const { error: updateErr } = await supabase
    .from('funnel_orders')
    .update({
      status: 'paid',
      gateway_ref: gatewayRef,
      next_step_id: nextStepId,
    })
    .eq('id', order.id)
    .eq('status', 'pending');

  if (updateErr) {
    logger.error({ err: updateErr, orderId: order.id, gateway }, `webhook.${gateway}.funnel_order.mark_paid.failed`);
  } else {
    logger.info({ orderId: order.id, nextStepId, gateway }, `webhook.${gateway}.funnel_order.paid`);
  }
}
