import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import type Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';
import { handleGuestCheckoutSessionCompleted } from '@/lib/lms/guestEnrollment';
import { createInstallmentSchedule, isCompletedInstallmentCancellation } from '@/lib/lms/installmentSchedule';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEFAULT_GRACE_DAYS = 7;

// Connect webhooks for a workspace's own connected account arrive on this same endpoint with
// `event.account` set; retrieving related objects then needs that account context. No Connect
// account is used in the current test setup, so this is a no-op there.
function stripeForEvent(event: Stripe.Event): Stripe {
  if (event.account) {
    return new (stripe.constructor as any)(process.env.STRIPE_SECRET_KEY, { stripeAccount: event.account });
  }
  return stripe;
}

/**
 * Course Start Method 4: once the FIRST installment has been paid (checkout.session.completed
 * for a mode:subscription session on a payment_plan course), turn the live subscription into
 * a fixed-term Subscription Schedule and record the plan on the enrolment row the normal
 * enrolment path just created. Idempotent — safe on Stripe retries.
 */
async function finalizeInstallmentPlan(session: any, sc: Stripe) {
  if (session.mode !== 'subscription' || !session.subscription) return;
  const md = session.metadata || {};
  const courseId: string | undefined = md.courseId;
  if (!courseId) return;

  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('id, start_method, number_of_payments, subscription_interval, payment_failure_policy, grace_period_days')
    .eq('id', courseId)
    .maybeSingle();
  if (!course || course.start_method !== 'payment_plan') return;

  const n = Number(course.number_of_payments);
  if (!Number.isInteger(n) || n < 2) {
    logger.error({ courseId }, 'webhook.payments.installment.bad_number_of_payments');
    return;
  }

  // Resolve the enrolment row: authenticated checkout carries contactId in metadata; guest
  // checkout resolves it from the Stripe-collected email (same discipline as the guest
  // enrolment handler).
  let contactId: string | null = md.contactId || null;
  if (!contactId) {
    const email = session.customer_details?.email || session.customer_email || null;
    if (email && md.workspaceId) {
      const { data: c } = await supabaseAdmin
        .from('contacts')
        .select('id')
        .eq('workspace_id', md.workspaceId)
        .eq('email', String(email).trim().toLowerCase())
        .maybeSingle();
      contactId = c?.id || null;
    }
  }
  if (!contactId) {
    logger.error({ courseId }, 'webhook.payments.installment.contact_unresolved');
    return;
  }

  const { data: enrolment } = await supabaseAdmin
    .from('enrollments')
    .select('id, metadata')
    .eq('course_id', courseId)
    .eq('contact_id', contactId)
    .maybeSingle();
  if (!enrolment) {
    logger.error({ courseId, contactId }, 'webhook.payments.installment.enrolment_missing');
    return;
  }
  if ((enrolment.metadata as any)?.stripe_schedule_id) {
    logger.info({ enrolmentId: enrolment.id }, 'webhook.payments.installment.already_finalized');
    return; // idempotent
  }

  const subscriptionId = String(session.subscription);
  const interval: 'month' | 'year' = course.subscription_interval === 'year' ? 'year' : 'month';

  let scheduleId: string | null = null;
  try {
    const res = await createInstallmentSchedule(sc, { subscriptionId, numberOfPayments: n, interval });
    scheduleId = res.scheduleId;
  } catch (err) {
    logger.error({ err, subscriptionId, courseId }, 'webhook.payments.installment.schedule_create_failed');
    // Still record the subscription id so the failure/success handlers can find this row.
  }

  const graceDays =
    Number.isInteger(course.grace_period_days) && (course.grace_period_days as number) > 0
      ? (course.grace_period_days as number)
      : DEFAULT_GRACE_DAYS;

  const { error: updErr } = await supabaseAdmin
    .from('enrollments')
    .update({
      subscription_interval: interval,
      metadata: {
        ...((enrolment.metadata as any) || {}),
        stripe_subscription_id: subscriptionId,
        stripe_schedule_id: scheduleId,
        installments_total: n,
        installments_paid: 1,
        payment_failure_policy: course.payment_failure_policy || 'grace_period',
        grace_period_days: graceDays,
      },
    })
    .eq('id', enrolment.id);
  if (updErr) logger.error({ err: updErr, enrolmentId: enrolment.id }, 'webhook.payments.installment.metadata_persist_failed');
  else logger.info({ enrolmentId: enrolment.id, subscriptionId, scheduleId, n }, 'webhook.payments.installment.finalized');
}

// STEP 0 drift finding #2 (verified live, API 2026-08-26.dahlia): the Invoice object no
// longer carries `invoice.subscription` — it moved to
// `invoice.parent.subscription_details.subscription`. The pre-existing invoice.payment_succeeded
// handler read the removed field and had silently stopped matching any enrolment. This reads
// the new location first, then the legacy field, then the line-item fallback.
function subscriptionIdFromInvoice(invoice: any): string | null {
  return (
    invoice?.parent?.subscription_details?.subscription ||
    invoice?.subscription ||
    invoice?.lines?.data?.[0]?.parent?.subscription_item_details?.subscription ||
    null
  );
}

async function findEnrolmentBySubscription(subscriptionId: string) {
  const { data } = await supabaseAdmin
    .from('enrollments')
    .select('id, course_id, contact_id, status, metadata, grace_period_expires_at')
    .eq('metadata->>stripe_subscription_id', subscriptionId)
    .maybeSingle();
  return data;
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('[FATAL] STRIPE_WEBHOOK_SECRET is not configured');
  }

  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');
  let event: any;

  // Signature verification is mandatory in every environment — a missing signature header
  // or misconfigured secret is always rejected, never silently treated as trusted raw JSON.
  try {
    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    logger.error({ err }, 'webhook.payments.signature_verification.failed');
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const eventType = event.type || event.kind;
  const sc = stripeForEvent(event);

  if (eventType === 'checkout.session.completed') {
    const session = event.data.object;
    const { courseId, contactId, workspaceId, pricingModel, subscriptionInterval, cohortId } = session.metadata || {};

    // Guest (logged-out) course checkout — no contactId in metadata. Contact + enrollment +
    // account provisioning are done here, gated on Stripe's own session.payment_status, in this
    // signature-verified handler only. Never from the success_url redirect. Idempotent.
    if (courseId && workspaceId && !contactId) {
      await handleGuestCheckoutSessionCompleted(session);
    } else if (courseId && contactId) {
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

      // Cohorts, Part 1: session carries the chosen cohort. Seat availability was checked at
      // checkout-session creation; re-check here (defensive) and let the DB trigger backstop.
      let cohortIdToSet: string | null = null;
      if (cohortId) {
        const { checkCohortSeatAvailable } = await import('@/lib/lms/cohorts');
        const seat = await checkCohortSeatAvailable(supabaseAdmin, cohortId, courseId);
        cohortIdToSet = seat.ok ? cohortId : null;
        if (!seat.ok) logger.warn({ courseId, cohortId, reason: seat.reason }, 'webhook.payments.cohort_full_at_finalize');
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
            status: 'active',
            ...(cohortIdToSet ? { cohort_id: cohortIdToSet } : {}),
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
            cohort_id: cohortIdToSet,
            // enrollments has no workspace_id column — workspace is derived via
            // course_id -> courses.workspace_id. The telemetry emits below still use the
            // workspaceId from the session metadata directly.
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
      // 'enrollment_created' — matches the automation-rule builder dropdown; was
      // previously 'student.enrolled', which no rule could match.
      await emitLMSEvent('enrollment_created', {
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

    // Course Start Method 4: attach the fixed-term schedule + plan metadata after the
    // enrolment above exists. Runs for BOTH the guest and authenticated branch (it re-reads
    // the row); a no-op unless the course's start_method is 'payment_plan'.
    try {
      await finalizeInstallmentPlan(session, sc);
    } catch (err) {
      logger.error({ err }, 'webhook.payments.installment.finalize_threw');
    }
  }

  // Subscription billing cycles — a successful charge (first or recurring, incl. a retry
  // after a failure).
  if (eventType === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    const subscriptionId = subscriptionIdFromInvoice(invoice);

    if (subscriptionId) {
      const periodEndUnix = invoice.lines?.data?.[0]?.period?.end;
      const periodEnd = periodEndUnix
        ? new Date(periodEndUnix * 1000).toISOString()
        : null;
      const enrolment = await findEnrolmentBySubscription(String(subscriptionId));

      if (enrolment) {
        const meta: any = enrolment.metadata || {};
        const paidBefore = Number(meta.installments_paid) || 0;
        const { error: updateErr } = await supabaseAdmin
          .from('enrollments')
          .update({
            payment_status: 'paid',
            ...(periodEnd ? { subscription_ends_at: periodEnd } : {}),
            active: true,
            status: 'active',
            // Course Start Method 4: a good payment clears any grace period a prior
            // invoice.payment_failed set — access is fully restored, verified through the
            // same isEnrolmentActive gate (which returns true again once this is null).
            grace_period_expires_at: null,
            metadata: meta.installments_total
              ? { ...meta, installments_paid: Math.min(paidBefore + 1, Number(meta.installments_total)) }
              : meta,
          })
          .eq('id', enrolment.id);

        if (updateErr) {
          logger.warn({ err: updateErr, subscriptionId }, 'webhook.payments.subscription_match.failed');
        } else {
          logger.info({ subscriptionId, enrolmentId: enrolment.id }, 'webhook.payments.invoice_succeeded.applied');
        }
      } else {
        logger.warn({ subscriptionId }, 'webhook.payments.invoice_succeeded.no_enrolment');
      }
    }
  }

  // Course Start Method 4: a scheduled installment failed to charge.
  if (eventType === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const subscriptionId = subscriptionIdFromInvoice(invoice);
    if (subscriptionId) {
      const enrolment = await findEnrolmentBySubscription(String(subscriptionId));
      if (!enrolment) {
        logger.warn({ subscriptionId }, 'webhook.payments.invoice_failed.no_enrolment');
      } else {
        const meta: any = enrolment.metadata || {};
        const policy: string = meta.payment_failure_policy || 'grace_period';

        if (policy === 'pause_immediately') {
          await supabaseAdmin
            .from('enrollments')
            .update({ status: 'suspended', payment_status: 'failed' })
            .eq('id', enrolment.id);
        } else if (policy === 'grace_period') {
          const days = Number(meta.grace_period_days) > 0 ? Number(meta.grace_period_days) : DEFAULT_GRACE_DAYS;
          const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
          // status stays 'active'; isEnrolmentActive() honours grace_period_expires_at live.
          await supabaseAdmin
            .from('enrollments')
            .update({ grace_period_expires_at: expires, payment_status: 'failed' })
            .eq('id', enrolment.id);
        } else {
          // 'retry_keep_access' — leave access untouched; Stripe dunning retries the charge,
          // and if it ultimately gives up the subscription is deleted (handled below).
          await supabaseAdmin
            .from('enrollments')
            .update({ payment_status: 'failed' })
            .eq('id', enrolment.id);
        }

        logger.info({ subscriptionId, enrolmentId: enrolment.id, policy }, 'webhook.payments.invoice_failed.applied');

        const { data: courseRow } = await supabaseAdmin
          .from('courses')
          .select('workspace_id')
          .eq('id', enrolment.course_id)
          .maybeSingle();
        const { emitLMSEvent } = await import('../../../../../libs/core/src/events/lms-event-bus');
        await emitLMSEvent('payment.failed', {
          workspaceId: courseRow?.workspace_id,
          contactId: enrolment.contact_id,
          courseId: enrolment.course_id,
        });
      }
    }
  }

  // Course Start Method 4: the installment schedule finished all N cycles successfully. This
  // is the "they paid in full" signal — access MUST continue. Distinct from a real
  // cancellation (customer.subscription.deleted below), which this handler never sees.
  if (eventType === 'subscription_schedule.completed') {
    const schedule = event.data.object;
    const subscriptionId =
      typeof schedule.subscription === 'string' ? schedule.subscription : schedule.subscription?.id;
    let enrolment = null;
    if (subscriptionId) enrolment = await findEnrolmentBySubscription(subscriptionId);
    if (!enrolment) {
      const { data } = await supabaseAdmin
        .from('enrollments')
        .select('id, metadata')
        .eq('metadata->>stripe_schedule_id', schedule.id)
        .maybeSingle();
      enrolment = data as any;
    }
    if (enrolment) {
      const meta: any = enrolment.metadata || {};
      await supabaseAdmin
        .from('enrollments')
        .update({
          status: 'active',
          active: true,
          payment_status: 'paid',
          grace_period_expires_at: null,
          // The plan is done — no more recurring end date, this is lifetime access now.
          subscription_ends_at: null,
          subscription_interval: null,
          metadata: { ...meta, installments_complete: true, installments_paid: Number(meta.installments_total) || meta.installments_paid },
        })
        .eq('id', enrolment.id);
      logger.info({ scheduleId: schedule.id, enrolmentId: enrolment.id }, 'webhook.payments.schedule_completed.access_kept');
    } else {
      logger.warn({ scheduleId: schedule.id }, 'webhook.payments.schedule_completed.no_enrolment');
    }
  }

  if (eventType === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const subscriptionId = subscription.id;

    // Course Start Method 4: if this deletion is the natural end of a COMPLETED installment
    // plan (schedule end_behavior 'cancel'), it must NOT revoke access — the student paid in
    // full. Only a genuine cancellation (no schedule / schedule not completed) revokes.
    const completedPlan = await isCompletedInstallmentCancellation(sc, subscription);
    if (completedPlan) {
      const enrolment = await findEnrolmentBySubscription(subscriptionId);
      if (enrolment) {
        const meta: any = enrolment.metadata || {};
        await supabaseAdmin
          .from('enrollments')
          .update({
            status: 'active',
            active: true,
            payment_status: 'paid',
            grace_period_expires_at: null,
            subscription_ends_at: null,
            subscription_interval: null,
            metadata: { ...meta, installments_complete: true },
          })
          .eq('id', enrolment.id);
        logger.info({ subscriptionId, enrolmentId: enrolment.id }, 'webhook.payments.subscription_deleted.installments_complete_access_kept');
      }
      return NextResponse.json({ received: true });
    }

    // Genuine cancellation — mark subscription enrollment inactive/cancelled.
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

    // Hook telemetry triggers. enrollments has no workspace_id — resolve it via the course.
    const { data: enrollData } = await supabaseAdmin
      .from('enrollments')
      .select('contact_id, course_id')
      .eq('metadata->>stripe_subscription_id', subscriptionId)
      .maybeSingle();

    if (enrollData) {
      const { data: courseRow } = await supabaseAdmin
        .from('courses')
        .select('workspace_id')
        .eq('id', enrollData.course_id)
        .maybeSingle();

      const { emitLMSEvent } = await import('../../../../../libs/core/src/events/lms-event-bus');
      await emitLMSEvent('payment.failed', {
        workspaceId: courseRow?.workspace_id,
        contactId: enrollData.contact_id,
        courseId: enrollData.course_id
      });
    }
  }

  return NextResponse.json({ received: true });
}
