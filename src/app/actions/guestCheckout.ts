'use server';

import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';
import { stripe as defaultStripe } from '@/lib/stripe';
import { getGatewayCredentials } from '@/lib/paymentGateways/credentials';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { logger } from '@/shared/logger';
import {
  findOrCreateContactByEmail,
  insertEnrollmentIfAbsent,
  isWorkspaceStaffEmail,
  welcomeGuestStudent,
} from '@/lib/lms/guestEnrollment';

/**
 * Public, UNAUTHENTICATED course checkout for logged-out visitors coming from a course landing
 * page. Companion to the authenticated actions in studentEnrollments.ts / courseCommerce.ts —
 * it never touches the admin-gated /api/lms/enrollments route.
 *
 * Abuse controls on this fresh anonymous-writable surface:
 *  - honeypot field (`hp`) — same convention as public form submit (lm_hp_field); a filled
 *    value returns a fake success and does nothing.
 *  - in-memory rate limit (src/lib/security/rateLimit) keyed per IP and, where we have it,
 *    per email — the same 5/60s the sibling unauthenticated auth + form endpoints use.
 *
 * Payment trust: the paid path here ONLY creates a Stripe Checkout Session. No enrollment is
 * ever created from a server action or a browser redirect — that happens exclusively in the
 * signature-verified checkout.session.completed webhook (see lib/lms/guestEnrollment.ts).
 */

function clientIp(): string {
  const h = headers();
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown'
  );
}

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

async function stripeForWorkspace(workspaceId: string): Promise<Stripe> {
  const creds = await getGatewayCredentials(workspaceId, 'stripe');
  if (creds) {
    return new Stripe(creds.accessToken, { apiVersion: '2026-04-22.dahlia' as any });
  }
  return defaultStripe;
}

type GuestFreeInput = {
  courseId: string;
  name: string;
  email: string;
  hp?: string; // honeypot
};

export async function guestFreeEnroll(input: GuestFreeInput) {
  const { courseId } = input;
  const name = (input.name || '').trim();
  const email = (input.email || '').trim().toLowerCase();

  // Honeypot — pretend everything is fine, do nothing.
  if (input.hp && input.hp.trim().length > 0) {
    logger.warn({ ip: clientIp() }, 'guest_checkout.free.honeypot_tripped');
    return { success: true, alreadyEnrolled: false, emailSent: false };
  }

  if (!email || !email.includes('@')) return { error: 'Please enter a valid email address.' };
  if (!name) return { error: 'Please enter your name.' };

  const ip = clientIp();
  if (!checkRateLimit(`guest-free-enroll:ip:${ip}`, 5, 60_000)) {
    return { error: 'Too many attempts. Please try again in a minute.' };
  }
  if (!checkRateLimit(`guest-free-enroll:email:${email}`, 5, 60_000)) {
    return { error: 'Too many attempts. Please try again in a minute.' };
  }

  try {
    const admin = createAdminClient();

    const { data: course } = await admin
      .from('courses')
      .select('id, workspace_id, pricing_model, published, status, enrolment_cap')
      .eq('id', courseId)
      .maybeSingle();

    if (!course) return { error: 'Course not found.' };
    const isPublished = course.published || course.status === 'published';
    if (!isPublished) return { error: 'This course is not currently available.' };

    const workspaceId: string | null = course.workspace_id;
    if (!workspaceId) return { error: 'Course is not attached to a workspace.' };

    // Free path is only for courses that actually grant free access: fully free, or hybrid
    // (free preview). A one_time / subscription course must go through paid checkout.
    const isFree = course.pricing_model === 'free';
    const isHybrid = course.pricing_model === 'hybrid';
    if (!isFree && !isHybrid) {
      return { error: 'This course requires payment. Please use the checkout option.' };
    }
    const accessType = isHybrid ? 'preview' : 'full';

    // Enrolment cap
    if (course.enrolment_cap !== null && course.enrolment_cap > 0) {
      const { count } = await admin
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);
      if (count !== null && count >= course.enrolment_cap) {
        return { error: 'Enrolment for this course is closed (capacity reached).' };
      }
    }

    if (await isWorkspaceStaffEmail(admin, workspaceId, email)) {
      return { error: 'This email belongs to a workspace administrator. Please sign in instead.' };
    }

    const { contactId } = await findOrCreateContactByEmail(admin, workspaceId, email, name);
    if (!contactId) return { error: 'Could not create your student profile. Please try again.' };

    const { enrolled, alreadyEnrolled } = await insertEnrollmentIfAbsent(admin, {
      courseId,
      contactId,
      workspaceId,
      paymentStatus: 'free',
      accessType,
    });

    if (alreadyEnrolled) {
      return { success: true, alreadyEnrolled: true, emailSent: false };
    }

    if (enrolled) {
      try {
        const { emitLMSEvent } = await import('../../../libs/core/src/events/lms-event-bus');
        // 'enrollment_created' matches the automation-rule builder dropdown (was 'student.enrolled').
        await emitLMSEvent('enrollment_created', { workspaceId, contactId, courseId });
      } catch (e) {
        logger.error({ err: e, courseId, contactId }, 'guest_checkout.free.event.failed');
      }
      try {
        const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
        dispatchWebhook(workspaceId, 'course.enrolment', {
          enrolment: {
            contact_id: contactId,
            course_id: courseId,
            enrolled_at: new Date().toISOString(),
          },
        }).catch(() => {});
      } catch {
        /* non-fatal */
      }
    }

    const { emailSent, emailReason } = await welcomeGuestStudent({
      courseId,
      contactId,
      workspaceId,
      email,
      accessType,
    });

    return { success: true, alreadyEnrolled: false, emailSent, emailReason };
  } catch (err: any) {
    logger.error({ err, courseId }, 'guest_checkout.free.failed');
    return { error: 'Something went wrong finishing your enrolment. Please try again.' };
  }
}

type GuestPaidInput = {
  courseId: string;
  hp?: string; // honeypot
};

export async function createGuestCourseCheckoutSession(input: GuestPaidInput) {
  const { courseId } = input;

  if (input.hp && input.hp.trim().length > 0) {
    logger.warn({ ip: clientIp() }, 'guest_checkout.paid.honeypot_tripped');
    // Send the bot somewhere harmless; never create a session.
    return { url: `${appUrl()}/checkout/${courseId}?status=pending` };
  }

  const ip = clientIp();
  if (!checkRateLimit(`guest-paid-checkout:ip:${ip}`, 5, 60_000)) {
    return { error: 'Too many attempts. Please try again in a minute.' };
  }

  try {
    const admin = createAdminClient();

    const { data: course } = await admin
      .from('courses')
      .select(
        'id, workspace_id, pricing_model, price, subscription_interval, published, status, enrolment_cap, title, description, thumbnail_url'
      )
      .eq('id', courseId)
      .maybeSingle();

    if (!course) return { error: 'Course not found.' };
    const isPublished = course.published || course.status === 'published';
    if (!isPublished) return { error: 'This course is not currently available.' };

    const workspaceId: string | null = course.workspace_id;
    if (!workspaceId) return { error: 'Course is not attached to a workspace.' };

    const paidModels = ['one_time', 'subscription', 'hybrid'];
    if (!paidModels.includes(course.pricing_model) || !course.price || course.price <= 0) {
      return { error: 'This course is free — no payment is required.' };
    }

    if (course.enrolment_cap !== null && course.enrolment_cap > 0) {
      const { count } = await admin
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);
      if (count !== null && count >= course.enrolment_cap) {
        return { error: 'Enrolment for this course is closed (capacity reached).' };
      }
    }

    const isSubscription = course.pricing_model === 'subscription';
    const stripeClient = await stripeForWorkspace(workspaceId);

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: isSubscription ? 'subscription' : 'payment',
      // Guest mode: no `customer`, no pre-filled `customer_email`. Stripe's own hosted page
      // collects the email; we read it back from customer_details in the webhook.
      billing_address_collection: 'auto',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: course.title,
              description: course.description || undefined,
              images: course.thumbnail_url ? [course.thumbnail_url] : undefined,
            },
            unit_amount: Math.round(course.price * 100),
            ...(isSubscription && {
              recurring: { interval: (course.subscription_interval || 'month') as 'month' | 'year' },
            }),
          },
          quantity: 1,
        },
      ],
      metadata: {
        courseId: String(course.id),
        workspaceId: String(workspaceId),
        pricingModel: String(course.pricing_model),
        ...(course.subscription_interval
          ? { subscriptionInterval: String(course.subscription_interval) }
          : {}),
        guest: 'true',
      },
      // NOTE: reaching this URL is just navigation, NOT proof of payment. No enrollment logic
      // is attached to it — the webhook is the only thing that enrolls.
      success_url: `${appUrl()}/checkout/${course.id}?status=pending`,
      cancel_url: `${appUrl()}/checkout/${course.id}?status=canceled`,
    });

    return { url: session.url };
  } catch (err: any) {
    logger.error({ err, courseId }, 'guest_checkout.paid.session.failed');
    return { error: 'Could not start checkout. Please try again.' };
  }
}
