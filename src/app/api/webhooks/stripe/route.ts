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
            status: 'active'
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
  }

 return NextResponse.json({ received: true });
}
