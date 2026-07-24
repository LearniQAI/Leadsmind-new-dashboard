import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';

const supabaseAdmin = createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL!,
 process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
 const payload = await req.text();
 const signature = req.headers.get('stripe-signature')!;
 let event;

 try {
  event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!);
 } catch (err: any) {
  logger.error({ err }, 'webhook.stripe.verification.failed');
  return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
 }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const { workspaceId, tierId, invoiceId, courseId, contactId } = session.metadata || {};

    // Subscription-mode checkout sessions don't carry a payment_intent on the session itself
    // (the first invoice's payment_intent lives on the Stripe Invoice, not here) — this will be
    // null for those, same as for any historical row from before this capture existed. Refund
    // actions must treat a null stripe_payment_intent_id as "no real API refund is possible,
    // fall back to record-only" rather than assuming it's always populated.
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;

    if (courseId && contactId) {
      const { data: existing } = await supabaseAdmin
        .from('enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('contact_id', contactId)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabaseAdmin
          .from('enrollments')
          .insert({
            course_id: courseId,
            contact_id: contactId,
            status: 'active',
            payment_status: 'paid',
            stripe_payment_intent_id: paymentIntentId,
          });

        if (error) {
          logger.error({ err: error, contactId, courseId }, 'webhook.stripe.enrollment_insert.failed');
        } else {
          logger.info({ contactId, courseId }, 'webhook.stripe.enrollment.success');
        }
      } else {
        logger.info({ contactId, courseId }, 'webhook.stripe.enrollment.already_exists');
      }
    } else if (invoiceId) {
    const { error } = await supabaseAdmin
     .from('invoices')
     .update({
       status: 'paid',
       amount_paid: Number(session.amount_total || 0) / 100,
       amount_due: 0,
       stripe_payment_intent_id: paymentIntentId,
       updated_at: new Date().toISOString()
     })
     .eq('id', invoiceId);

    if (error) {
     logger.error({ err: error, invoiceId }, 'webhook.stripe.invoice_update.failed');
    } else {
     logger.info({ invoiceId }, 'webhook.stripe.invoice.paid');
     try {
       const { AttributionEngine } = await import('@/lib/analytics/AttributionEngine');
       await AttributionEngine.trackInvoicePayment(invoiceId);
     } catch (aeError) {
       logger.error({ err: aeError, invoiceId }, 'webhook.stripe.attribution_engine.failed');
     }
    }
   } else if (workspaceId && tierId) {
    const { error } = await supabaseAdmin
     .from('workspaces')
     .update({
       plan_tier: tierId,
       stripe_customer_id: session.customer,
       stripe_subscription_id: session.subscription
     })
     .eq('id', workspaceId);

    if (error) {
     logger.error({ err: error, workspaceId, tierId }, 'webhook.stripe.workspace_update.failed');
    } else {
     logger.info({ workspaceId, tierId }, 'webhook.stripe.workspace.tier_updated');
    }
   }
  } else if (event.type === 'charge.refunded') {
    // Reflects refunds initiated directly in the Stripe dashboard (not via LeadsMind's own
    // refund action) back into invoice/enrollment status + the refunds audit table. Idempotent
    // on gateway_refund_id, so this is safe to receive more than once for the same refund
    // (Stripe webhook retries) and safe even if LeadsMind's own admin action already recorded
    // the same refund moments earlier.
    const charge = event.data.object as any;
    const paymentIntentId: string | null = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
    const latestRefund = charge.refunds?.data?.[charge.refunds.data.length - 1];
    const gatewayRefundId: string | null = latestRefund?.id ?? null;
    const amountRefunded = Number(charge.amount_refunded || 0) / 100;

    if (paymentIntentId && gatewayRefundId) {
      const { data: existingRefundRecord } = await supabaseAdmin
        .from('refunds')
        .select('id')
        .eq('gateway_refund_id', gatewayRefundId)
        .maybeSingle();

      if (existingRefundRecord) {
        logger.info({ gatewayRefundId }, 'webhook.stripe.charge_refunded.already_recorded');
      } else {
        const { data: matchedInvoice } = await supabaseAdmin
          .from('invoices')
          .select('id, workspace_id, status')
          .eq('stripe_payment_intent_id', paymentIntentId)
          .maybeSingle();

        const { data: matchedEnrollment } = await supabaseAdmin
          .from('enrollments')
          .select('id, course_id, courses(workspace_id)')
          .eq('stripe_payment_intent_id', paymentIntentId)
          .maybeSingle();

        const workspaceId = matchedInvoice?.workspace_id ?? (matchedEnrollment as any)?.courses?.workspace_id;

        if (matchedInvoice && matchedInvoice.status !== 'refunded') {
          await supabaseAdmin.from('invoices').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('id', matchedInvoice.id);
        }
        if (matchedEnrollment) {
          await supabaseAdmin.from('enrollments').update({ payment_status: 'refunded' }).eq('id', matchedEnrollment.id);
        }

        if (workspaceId && (matchedInvoice || matchedEnrollment)) {
          const { error: refundInsertErr } = await supabaseAdmin.from('refunds').insert({
            workspace_id: workspaceId,
            invoice_id: matchedInvoice?.id ?? null,
            enrollment_id: matchedEnrollment?.id ?? null,
            gateway: 'stripe',
            record_only: false,
            gateway_refund_id: gatewayRefundId,
            amount: amountRefunded,
            reason: 'Refunded directly via Stripe dashboard',
            triggered_by: null,
            source: 'stripe_webhook',
          });
          if (refundInsertErr) {
            logger.error({ err: refundInsertErr, gatewayRefundId }, 'webhook.stripe.charge_refunded.record.failed');
          } else {
            logger.info({ gatewayRefundId, paymentIntentId }, 'webhook.stripe.charge_refunded.recorded');
          }
        } else {
          logger.warn({ paymentIntentId, gatewayRefundId }, 'webhook.stripe.charge_refunded.no_matching_record');
        }
      }
    }
  }

 return NextResponse.json({ received: true });
}
