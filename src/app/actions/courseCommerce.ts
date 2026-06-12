'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, getUser } from '@/lib/auth';
import { stripe as defaultStripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { getOrCreateStudentContact } from './studentEnrollments';

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

    const { error: updateErr } = await supabase
      .from('courses')
      .update({
        pricing_model: payload.pricing_model,
        price: payload.price,
        subscription_interval: payload.pricing_model === 'subscription' ? payload.subscription_interval : null,
        enrolment_cap: payload.enrolment_cap || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId);

    if (updateErr) throw updateErr;

    return { success: true };
  } catch (error: any) {
    console.error('[updateCoursePricing Error]:', error);
    return { error: error.message || 'Failed to update pricing settings' };
  }
}

/**
 * Checks Stripe Connect integration for workspace and returns status/keys.
 */
export async function getWorkspacePaymentIntegration() {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { connected: false };

    const adminClient = createAdminClient();
    const { data: integration } = await adminClient
      .from('workspace_integrations')
      .select('connected, credentials')
      .eq('workspace_id', workspaceId)
      .eq('provider', 'stripe')
      .maybeSingle();

    if (integration?.connected && integration.credentials) {
      return {
        connected: true,
        publishableKey: (integration.credentials as any).publishable_key || '',
        hasSecretKey: !!(integration.credentials as any).secret_key
      };
    }

    return { connected: false };
  } catch (error) {
    console.error('[getWorkspacePaymentIntegration Error]:', error);
    return { connected: false };
  }
}

/**
 * Instantiates custom Stripe client using the admin's secret key from workspace integrations.
 * If not connected, returns the system default Stripe client.
 */
async function getStripeClientForWorkspace(workspaceId: string): Promise<Stripe> {
  const adminClient = createAdminClient();
  const { data: integration } = await adminClient
    .from('workspace_integrations')
    .select('connected, credentials')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'stripe')
    .maybeSingle();

  if (integration?.connected && (integration.credentials as any)?.secret_key) {
    return new Stripe((integration.credentials as any).secret_key, {
      apiVersion: '2026-04-22.dahlia' as any, // Matches system version/compatibility
    });
  }

  return defaultStripe;
}

/**
 * Creates a checkout session routing payments directly through the creator's Stripe gateway.
 */
export async function createDirectCourseCheckoutSession(courseId: string) {
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
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/student/courses/${course.id}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/student/checkout/${course.id}?payment=canceled`,
      customer_email: user.email || undefined,
    });

    return { url: session.url };
  } catch (err: any) {
    console.error('[createDirectCourseCheckoutSession Error]:', err);
    return { error: err.message || 'Failed to create direct checkout session' };
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
    console.error('[verifyLessonAccess Error]:', error);
    return { allowed: false, reason: 'internal_error' };
  }
}
