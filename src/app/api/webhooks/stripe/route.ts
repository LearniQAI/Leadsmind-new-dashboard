import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

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
  console.error(`[Stripe Webhook] Error: ${err.message}`);
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
          console.error(`[Stripe Webhook] Course enrollment insert error: ${error.message}`);
        } else {
          console.log(`[Stripe Webhook] Successfully enrolled contact ${contactId} in course ${courseId}`);
        }
      } else {
        console.log(`[Stripe Webhook] Contact ${contactId} is already enrolled in course ${courseId}`);
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
     console.error(`[Stripe Webhook] Invoice database update error: ${error.message}`);
    } else {
     console.log(`[Stripe Webhook] Invoice ${invoiceId} successfully marked as paid`);
     try {
       const { AttributionEngine } = await import('@/lib/analytics/AttributionEngine');
       await AttributionEngine.trackInvoicePayment(invoiceId);
     } catch (aeError) {
       console.error(`[Stripe Webhook] AttributionEngine failed:`, aeError);
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
     console.error(`[Stripe Webhook] Database update error: ${error.message}`);
    } else {
     console.log(`[Stripe Webhook] Updated workspace ${workspaceId} to tier ${tierId}`);
    }
   }
  }

 return NextResponse.json({ received: true });
}
