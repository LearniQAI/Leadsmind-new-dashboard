'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, getUser, requireWorkspaceAccess } from '@/lib/auth';
import { stripe as defaultStripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { getOrCreateStudentContact } from './studentEnrollments';
import { getPortalSession } from '@/lib/portal/session';
import { getGatewayCredentials } from '@/lib/paymentGateways/credentials';
import { logger } from '@/shared/logger';
import { toClientError } from '@/shared/errors/AppError';

/**
 * Saves/updates course pricing settings in public.courses.
 */
export async function updateCoursePricing(
  courseId: string,
  payload: {
    pricing_model: 'free' | 'one_time' | 'subscription' | 'hybrid';
    price: number;
    subscription_interval?: 'month' | 'year' | null;
    enrolment_cap?: number | null;
    // Course Start Methods — all optional so existing callers (and older client bundles
    // mid-deploy) keep working unchanged; undefined = "don't touch this field".
    start_method?: 'email_access_link' | 'instant_payment' | 'free_preview_then_paywall' | 'payment_plan';
    email_access_auto_send?: boolean;
    free_lesson_count?: number | null;
    number_of_payments?: number | null;
    payment_failure_policy?: 'pause_immediately' | 'grace_period' | 'retry_keep_access' | null;
    grace_period_days?: number | null;
  }
) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();

    // Verify workspace ownership
    const { data: course, error: fetchErr } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('workspace_id', workspaceId)
      .single();

    if (fetchErr || !course) return { error: 'Course node not found or unauthorized' };

    const updatePayload: Record<string, any> = {
      pricing_model: payload.pricing_model,
      price: payload.price,
      subscription_interval: payload.pricing_model === 'subscription' ? payload.subscription_interval : null,
      enrolment_cap: payload.enrolment_cap || null,
      updated_at: new Date().toISOString()
    };
    if (payload.start_method !== undefined) updatePayload.start_method = payload.start_method;
    if (payload.email_access_auto_send !== undefined) updatePayload.email_access_auto_send = payload.email_access_auto_send;
    if (payload.free_lesson_count !== undefined) updatePayload.free_lesson_count = payload.free_lesson_count;
    if (payload.number_of_payments !== undefined) updatePayload.number_of_payments = payload.number_of_payments;
    if (payload.payment_failure_policy !== undefined) updatePayload.payment_failure_policy = payload.payment_failure_policy;
    if (payload.grace_period_days !== undefined) updatePayload.grace_period_days = payload.grace_period_days;

    const { error: updateErr } = await supabase
      .from('courses')
      .update(updatePayload)
      .eq("id", courseId).eq("workspace_id", workspaceId);

    if (updateErr) throw updateErr;

    // Course Start Method 3: a changed start_method or free_lesson_count can change which
    // lessons are derived-preview. recomputeCoursePreviewLessons() is a no-op for any course
    // not currently on free_preview_then_paywall — including one that just switched AWAY
    // from it, which is deliberate: is_preview simply reverts to being the plain,
    // independent, hand-editable marketing flag it always was for every other start method,
    // rather than this save silently mass-clearing values an admin may now want to set
    // manually. Switching TO Method 3 with no free_lesson_count yet is handled inside that
    // function (clears is_preview until a real count is saved).
    if (payload.start_method !== undefined || payload.free_lesson_count !== undefined) {
      const { recomputeCoursePreviewLessons } = await import('@/lib/lms/coursePreview');
      await recomputeCoursePreviewLessons(courseId);
    }

    return { success: true };
  } catch (error: any) {
    logger.error({ err: error, courseId }, 'course_commerce.pricing.update.failed');
    const clientError = toClientError(error);
    return { error: clientError.error };
  }
}

/**
 * Checks Stripe Connect (real OAuth) integration for workspace and returns connection status.
 */
export async function getWorkspacePaymentIntegration() {
  try {
    // Previously used createAdminClient() scoped only by a cookie-read
    // workspaceId, no auth/membership check — any caller could learn
    // whether a given workspace has Stripe Connect active. Severity
    // assessment (see security-remediation.md item 6): confirming *which
    // workspaces have payment processing enabled at all* is workspace
    // configuration data and should be gated like any other.
    const { workspaceId } = await requireWorkspaceAccess();

    const adminClient = createAdminClient();
    const { data: integration } = await adminClient
      .from('workspace_integrations')
      .select('connected, credentials')
      .eq('workspace_id', workspaceId)
      .eq('provider', 'stripe')
      .maybeSingle();

    const connected = !!(integration?.connected && (integration.credentials as any)?.stripe_user_id);
    return { connected };
  } catch (error) {
    logger.error({ err: error }, 'course_commerce.payment_integration.fetch.failed');
    return { connected: false };
  }
}

/**
 * Instantiates a Stripe client authenticated as the workspace's connected account (real
 * Stripe Connect OAuth access_token — usable exactly like a secret API key for that
 * account). If not connected, returns the system default Stripe client.
 */
async function getStripeClientForWorkspace(workspaceId: string): Promise<Stripe> {
  // Routed through getGatewayCredentials (src/lib/paymentGateways/credentials.ts) instead of
  // reading+decrypting the row directly — this is what gives Stripe Connect's stored token the
  // same lazy GCM-rotation-on-read the other 4 gateways already get (previously a direct
  // decrypt() call here bypassed that entirely).
  const creds = await getGatewayCredentials(workspaceId, 'stripe');
  if (creds) {
    return new Stripe(creds.accessToken, {
      apiVersion: '2026-04-22.dahlia' as any, // Matches system version/compatibility
    });
  }

  return defaultStripe;
}

/**
 * Creates a checkout session routing payments directly through the creator's Stripe gateway.
 */
export async function createDirectCourseCheckoutSession(courseId: string, opts?: { cohortId?: string | null }) {
  try {
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const adminClient = createAdminClient();
    const { data: course, error: courseError } = await adminClient
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !course) return { error: 'Course not found' };

    const workspaceId = course.workspace_id;
    if (!workspaceId) return { error: 'Course workspace invalid' };

    // Enforce cap check before generating checkout
    if (course.enrolment_cap !== null && course.enrolment_cap > 0) {
      const { count } = await adminClient
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);
      
      if (count !== null && count >= course.enrolment_cap) {
        return { error: 'Enrolment cap reached. Course is closed.' };
      }
    }

    const contactId = await getOrCreateStudentContact(workspaceId);
    if (!contactId) return { error: 'Failed to resolve student contact details' };

    // Resolve Stripe client (Direct Connect vs LeadsMind default)
    const stripeClient = await getStripeClientForWorkspace(workspaceId);

    const isSubscription = course.pricing_model === 'subscription';

    // Pricing details mapping
    const unitAmount = Math.round(course.price * 100);
    const lineItem = {
      price_data: {
        currency: 'usd',
        product_data: {
          name: course.title,
          description: course.description || undefined,
          images: course.thumbnail_url ? [course.thumbnail_url] : undefined,
        },
        unit_amount: unitAmount,
        ...(isSubscription && {
          recurring: {
            interval: course.subscription_interval || 'month',
          },
        }),
      },
      quantity: 1,
    };

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: isSubscription ? 'subscription' : 'payment',
      line_items: [lineItem],
      metadata: {
        courseId: course.id,
        contactId: contactId,
        workspaceId: workspaceId,
        pricingModel: course.pricing_model,
        subscriptionInterval: course.subscription_interval || null,
        ...(opts?.cohortId ? { cohortId: opts.cohortId } : {}), // Cohorts, Part 1
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/student/courses/${course.id}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/student/checkout/${course.id}?payment=canceled`,
      customer_email: user.email || undefined,
    });

    return { url: session.url };
  } catch (err: any) {
    logger.error({ err, courseId }, 'course_commerce.direct_checkout.create.failed');
    const clientError = toClientError(err);
    return { error: clientError.error };
  }
}

/**
 * Course Start Method 4 (payment_plan) — authenticated installment checkout.
 *
 * Sits ALONGSIDE createDirectCourseCheckoutSession, not replacing it: open-ended
 * subscriptions and one-time payments still go through that one. This forces
 * mode: 'subscription' (the first installment IS the first billing cycle) and tags the
 * session so the webhook's checkout.session.completed handler knows to attach a fixed-term
 * Subscription Schedule and persist the plan metadata onto the enrolment it already creates
 * — the enrolment-creation path is NOT duplicated here.
 */
export async function createCourseInstallmentCheckoutSession(courseId: string, opts?: { cohortId?: string | null }) {
  try {
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const adminClient = createAdminClient();
    const { data: course, error: courseError } = await adminClient
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !course) return { error: 'Course not found' };
    if (course.start_method !== 'payment_plan') {
      return { error: 'This course is not set up as a payment plan.' };
    }
    const n = Number(course.number_of_payments);
    if (!Number.isInteger(n) || n < 2) {
      return { error: 'This payment plan is missing a valid number of payments.' };
    }
    if (!course.price || course.price <= 0) {
      return { error: 'This payment plan has no per-instalment price set.' };
    }

    const workspaceId = course.workspace_id;
    if (!workspaceId) return { error: 'Course workspace invalid' };

    if (course.enrolment_cap !== null && course.enrolment_cap > 0) {
      const { count } = await adminClient
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);
      if (count !== null && count >= course.enrolment_cap) {
        return { error: 'Enrolment cap reached. Course is closed.' };
      }
    }

    const contactId = await getOrCreateStudentContact(workspaceId);
    if (!contactId) return { error: 'Failed to resolve student contact details' };

    // Same Connect-aware helper Method 2's status-poll route uses — not a second copy.
    const { stripeForWorkspace } = await import('@/lib/paymentGateways/stripeForWorkspace');
    const stripeClient = await stripeForWorkspace(workspaceId);

    const interval: 'month' | 'year' = course.subscription_interval === 'year' ? 'year' : 'month';

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${course.title} — ${n}-payment plan`,
              description: course.description || undefined,
              images: course.thumbnail_url ? [course.thumbnail_url] : undefined,
            },
            unit_amount: Math.round(course.price * 100),
            recurring: { interval },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: { courseId: course.id, contactId, workspaceId, leadsmind_payment_plan: 'true' },
      },
      metadata: {
        courseId: course.id,
        contactId,
        workspaceId,
        pricingModel: 'payment_plan',
        numberOfPayments: String(n),
        subscriptionInterval: interval,
        ...(opts?.cohortId ? { cohortId: opts.cohortId } : {}), // Cohorts, Part 1
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/student/courses/${course.id}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/student/checkout/${course.id}?payment=canceled`,
      customer_email: user.email || undefined,
    });

    return { url: session.url };
  } catch (err: any) {
    logger.error({ err, courseId }, 'course_commerce.installment_checkout.create.failed');
    const clientError = toClientError(err);
    return { error: clientError.error };
  }
}

/**
 * Evaluates lesson visibility, drip timers, and payment statuses to verify student access.
 */
export async function verifyLessonAccess(courseId: string, lessonId: string) {
  try {
    const adminClient = createAdminClient();

    // 1. Fetch course details & lesson details
    const { data: lesson, error: lessonErr } = await adminClient
      .from('course_lessons')
      .select('*, module:course_modules(*)')
      .eq('id', lessonId)
      .single();

    if (lessonErr || !lesson) return { allowed: false, reason: 'lesson_not_found' };

    const { data: course, error: courseErr } = await adminClient
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseErr || !course) return { allowed: false, reason: 'course_not_found' };

    // A. Public lessons bypass all checks
    if (lesson.access_level === 'public') {
      return { allowed: true };
    }

    // 2. Resolve user authentication status
    const user = await getUser();
    if (!user) return { allowed: false, reason: 'not_authenticated' };

    const contactId = await getOrCreateStudentContact(course.workspace_id);
    if (!contactId) return { allowed: false, reason: 'no_contact_profile' };

    // 3. Resolve enrollment status
    const { data: enrollment } = await adminClient
      .from('enrollments')
      .select('*')
      .eq('course_id', courseId)
      .eq('contact_id', contactId)
      .maybeSingle();

    if (!enrollment) return { allowed: false, reason: 'not_enrolled' };

    // B. Enrolled lessons check payment logic if course is paid/hybrid
    const isPaidCourse = course.pricing_model === 'one_time' || course.pricing_model === 'subscription' || course.pricing_model === 'hybrid';
    const hasPaid = enrollment.payment_status === 'paid';

    if (lesson.access_level === 'paid' && isPaidCourse && !hasPaid) {
      return { allowed: false, reason: 'paid_locked' };
    }

    // 4. Relative Timeline Drip scheduling checks
    const lessonModule = lesson.module;
    const dripDays = lessonModule?.drip_days || 0;

    if (dripDays > 0) {
      const enrolledAt = new Date(enrollment.enrolled_at).getTime();
      const now = Date.now();
      const unlockTime = enrolledAt + dripDays * 24 * 60 * 60 * 1000;

      if (now < unlockTime) {
        const diffMs = unlockTime - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return {
          allowed: false,
          reason: 'drip_locked',
          unlockInDays: diffDays,
          unlockDate: new Date(unlockTime).toISOString()
        };
      }
    }

    return { allowed: true };
  } catch (error: any) {
    logger.error({ err: error, courseId, lessonId }, 'course_commerce.lesson_access.verify.failed');
    return { allowed: false, reason: 'internal_error' };
  }
}

/**
 * Creates a PayFast checkout URL for purchasing a course.
 */
export async function createCoursePayFastCheckout(courseId: string) {
  try {
    const session = await getPortalSession();
    if (!session) return { error: 'Not authenticated' };

    const { contact, workspace } = session;
    const adminClient = createAdminClient();

    // Fetch course details
    const { data: course, error: courseError } = await adminClient
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return { error: 'Course not found' };
    }

    // Check if the user is already enrolled
    const { data: existing } = await adminClient
      .from('enrollments')
      .select('id')
      .eq('course_id', courseId)
      .eq('contact_id', contact.id)
      .maybeSingle();

    if (existing) {
      return { error: 'You are already enrolled in this course.' };
    }

    // Enforce cap check
    if (course.enrolment_cap !== null && course.enrolment_cap > 0) {
      const { count } = await adminClient
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);
      
      if (count !== null && count >= course.enrolment_cap) {
        return { error: 'Enrolment cap reached. Course is closed.' };
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const notifyUrl = `${appUrl}/api/webhooks/payfast`;
    const returnUrl = `${appUrl}/portal/courses?payment=success`;
    const cancelUrl = `${appUrl}/portal/courses?payment=canceled`;

    const { generatePayFastCheckoutUrl } = await import('@/lib/calendar/payfast');

    const redirectUrl = generatePayFastCheckoutUrl({
      merchantId: process.env.PAYFAST_MERCHANT_ID || '10000100',
      merchantKey: process.env.PAYFAST_MERCHANT_KEY || '46f0z550522ac',
      returnUrl,
      cancelUrl,
      notifyUrl,
      amount: Number(course.price || 0),
      itemName: course.title,
      paymentId: course.id,
      firstName: contact.first_name || 'Student',
      lastName: contact.last_name || '',
      email: contact.email || '',
      custom_str1: workspace.id,
      custom_str2: contact.id,
      custom_str3: course.id,
      custom_str4: 'course',
    });

    return { url: redirectUrl };
  } catch (err: any) {
    logger.error({ err, courseId }, 'course_commerce.payfast_checkout.create.failed');
    const clientError = toClientError(err);
    return { error: clientError.error };
  }
}
