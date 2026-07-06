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
  const signature = req.headers.get('stripe-signature');
  let event: any;

  try {
    if (signature && process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      // Direct body parse fallback for sandbox testing or mock calls
      event = JSON.parse(payload);
    }
  } catch (err: any) {
    logger.error({ err }, 'webhook.payments.signature_verification.failed');
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const eventType = event.type || event.kind;

  if (eventType === 'checkout.session.completed') {
    const session = event.data.object;
    const { courseId, contactId, workspaceId, pricingModel, subscriptionInterval } = session.metadata || {};

    if (courseId && contactId) {
      // 1. Fetch course details to check for drip scheduling modules
      const { data: modules } = await supabaseAdmin
        .from('course_modules')
        .select('drip_days')
        .eq('course_id', courseId);
      
      const hasDrip = (modules || []).some((m: any) => m.drip_days > 0);
      const accessType = hasDrip ? 'drip' : 'full';

      // Calculate subscription end date if subscription
      let subscriptionEndsAt = null;
      if (pricingModel === 'subscription') {
        const interval = subscriptionInterval || 'month';
        const date = new Date();
        if (interval === 'year') {
          date.setFullYear(date.getFullYear() + 1);
        } else {
          date.setMonth(date.getMonth() + 1);
        }
        subscriptionEndsAt = date.toISOString();
      }

      // Check if enrollment exists
      const { data: existing } = await supabaseAdmin
        .from('enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('contact_id', contactId)
        .maybeSingle();

      if (existing) {
        // Update existing enrollment
        const { error: updateErr } = await supabaseAdmin
          .from('enrollments')
          .update({
            payment_status: 'paid',
            access_type: accessType,
            subscription_interval: pricingModel === 'subscription' ? subscriptionInterval : null,
            subscription_ends_at: subscriptionEndsAt,
            active: true,
            status: 'active'
          })
          .eq('id', existing.id);

        if (updateErr) {
          logger.error({ err: updateErr, enrollmentId: existing.id }, 'webhook.payments.enrollment_update.failed');
        }
      } else {
        // Insert new enrollment
        const { error: insertErr } = await supabaseAdmin
          .from('enrollments')
          .insert({
            course_id: courseId,
            contact_id: contactId,
            workspace_id: workspaceId || null,
            payment_status: 'paid',
            access_type: accessType,
            subscription_interval: pricingModel === 'subscription' ? subscriptionInterval : null,
            subscription_ends_at: subscriptionEndsAt,
            active: true,
            status: 'active'
          });

        if (insertErr) {
          logger.error({ err: insertErr, courseId, contactId }, 'webhook.payments.enrollment_insert.failed');
        }
      }

      // Hook telemetry triggers
      const { emitLMSEvent } = await import('../../../../../libs/core/src/events/lms-event-bus');
      await emitLMSEvent('student.enrolled', {
        workspaceId,
        contactId,
        courseId
      });
      await emitLMSEvent('payment.completed', {
        workspaceId,
        contactId,
        courseId
      });

      logger.info({ contactId, courseId }, 'webhook.payments.session_completed');
    }
  }

  // Handle subscription billing cycles
  if (eventType === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;
    
    if (subscriptionId) {
      // Find checkout session or enrollment with this subscription details if saved
      // In a real connect flow, metadata might also be passed, let's update subscription_ends_at
      const periodEnd = new Date(invoice.lines.data[0].period.end * 1000).toISOString();
      
      // Update matching subscription enrollment
      const { error: updateErr } = await supabaseAdmin
        .from('enrollments')
        .update({
          payment_status: 'paid',
          subscription_ends_at: periodEnd,
          active: true,
          status: 'active'
        })
        .eq('metadata->>stripe_subscription_id', subscriptionId); // Matching metadata if stored

      if (updateErr) {
        logger.warn({ err: updateErr, subscriptionId }, 'webhook.payments.subscription_match.failed');
      }
    }
  }

  if (eventType === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const subscriptionId = subscription.id;

    // Mark subscription enrollment as inactive/cancelled
    const { error: cancelErr } = await supabaseAdmin
      .from('enrollments')
      .update({
        active: false,
        status: 'cancelled',
        payment_status: 'failed'
      })
      .eq('metadata->>stripe_subscription_id', subscriptionId);

    if (cancelErr) {
      logger.error({ err: cancelErr, subscriptionId }, 'webhook.payments.subscription_cancel.failed');
    }

    // Hook telemetry triggers
    const { data: enrollData } = await supabaseAdmin
      .from('enrollments')
      .select('workspace_id, contact_id, course_id')
      .eq('metadata->>stripe_subscription_id', subscriptionId)
      .maybeSingle();

    if (enrollData) {
      const { emitLMSEvent } = await import('../../../../../libs/core/src/events/lms-event-bus');
      await emitLMSEvent('payment.failed', {
        workspaceId: enrollData.workspace_id,
        contactId: enrollData.contact_id,
        courseId: enrollData.course_id
      });
    }
  }

  return NextResponse.json({ received: true });
}
