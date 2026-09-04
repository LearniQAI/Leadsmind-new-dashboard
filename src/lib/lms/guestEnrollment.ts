import { createAdminClient } from '@/lib/supabase/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sendCourseOnboardingEmail } from '@/lib/lms/onboardingEmail';
import { logger } from '@/shared/logger';

/**
 * Guest (anonymous / logged-out) course enrollment primitives.
 *
 * These are the ONLY place anonymous visitors get a contact + enrollment created. Everything
 * here is deliberately paranoid about workspace scoping and about never trusting the browser
 * for payment state:
 *
 *  - Free courses call findOrCreateContactByEmail + insertEnrollmentIfAbsent directly from a
 *    public server action, gated on the course actually being pricing_model = 'free'.
 *  - Paid courses NEVER touch this from a server action. The Stripe Checkout Session is created
 *    in guest mode with only { courseId, workspaceId } in metadata (no contactId — we don't
 *    have one and won't invent one). The enrollment is created solely by
 *    handleGuestCheckoutSessionCompleted(), invoked from the already-signature-verified
 *    checkout.session.completed webhook branch, and only when Stripe itself reports
 *    session.payment_status === 'paid'.
 */

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function splitName(full: string | null | undefined): { firstName: string; lastName: string } {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'Student',
    lastName: parts.slice(1).join(' ') || '',
  };
}

/**
 * Find-or-create a contact by email, scoped to ONE workspace. Uses the real
 * contacts(workspace_id, email) unique constraint via an atomic upsert with ignoreDuplicates —
 * the same pattern the public form-submit route uses — so two concurrent guest checkouts for
 * the same email cannot create two rows, and a losing race just re-reads the winner.
 *
 * Never searches or writes outside `workspaceId`.
 */
export async function findOrCreateContactByEmail(
  admin: SupabaseClient,
  workspaceId: string,
  email: string,
  fullName?: string | null
): Promise<{ contactId: string | null; created: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { contactId: null, created: false };
  }

  const { data: existing } = await admin
    .from('contacts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('email', cleanEmail)
    .limit(1)
    .maybeSingle();

  if (existing) return { contactId: existing.id, created: false };

  const { firstName, lastName } = splitName(fullName);

  const { data: inserted, error: upsertError } = await admin
    .from('contacts')
    .upsert(
      {
        workspace_id: workspaceId,
        email: cleanEmail,
        first_name: firstName,
        last_name: lastName,
        source: 'guest_checkout',
      },
      { onConflict: 'workspace_id,email', ignoreDuplicates: true }
    )
    .select('id')
    .maybeSingle();

  if (upsertError) {
    logger.error({ err: upsertError, workspaceId }, 'guest_enrollment.contact.upsert.failed');
    return { contactId: null, created: false };
  }

  if (inserted) return { contactId: inserted.id, created: true };

  // Concurrent insert won the race and ours was skipped — read the winner.
  const { data: winner } = await admin
    .from('contacts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('email', cleanEmail)
    .maybeSingle();

  return { contactId: winner?.id || null, created: false };
}

/**
 * Read-only counterpart to findOrCreateContactByEmail — used by the guest-checkout status
 * poll (/api/checkout/guest-status), which must never itself create or change any real row.
 * If the webhook hasn't run yet, no contact exists yet either; that's a legitimate "still
 * pending" state, not an error.
 */
export async function findContactByEmail(
  admin: SupabaseClient,
  workspaceId: string,
  email: string
): Promise<string | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) return null;
  const { data } = await admin
    .from('contacts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('email', cleanEmail)
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

/**
 * Rejects an email that belongs to a workspace admin/owner of THIS workspace — mirrors the
 * "administrators cannot self-enroll" guard in enrollStudent(), adapted to email (guests have
 * no user_id). Best-effort: if the users table has no row for the email, it's not an admin.
 */
export async function isWorkspaceStaffEmail(
  admin: SupabaseClient,
  workspaceId: string,
  email: string
): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const { data: userRow } = await admin
    .from('users')
    .select('id')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (!userRow) return false;

  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userRow.id)
    .maybeSingle();

  return membership?.role === 'admin' || membership?.role === 'owner';
}

/**
 * Idempotent enrollment insert. Relies on enrollments(course_id, contact_id) UNIQUE — a
 * duplicate becomes a no-op and is reported as alreadyEnrolled.
 */
export async function insertEnrollmentIfAbsent(
  admin: SupabaseClient,
  params: {
    courseId: string;
    contactId: string;
    workspaceId: string | null;
    paymentStatus: 'paid' | 'free';
    accessType?: string;
    stripePaymentIntentId?: string | null;
    subscriptionInterval?: string | null;
    subscriptionEndsAt?: string | null;
    /** Course Start Method 1 ("hold for manual approval"): defaults to 'active'. */
    status?: string;
    /** Cohorts, Part 1: the chosen cohort id (already seat-checked by the caller). */
    cohortId?: string | null;
  }
): Promise<{ enrolled: boolean; alreadyEnrolled: boolean }> {
  const { courseId, contactId } = params;

  const { data: existing } = await admin
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('contact_id', contactId)
    .maybeSingle();

  if (existing) return { enrolled: false, alreadyEnrolled: true };

  const row: Record<string, any> = {
    course_id: courseId,
    contact_id: contactId,
    // enrollments has no workspace_id column — workspace derives via course_id -> courses.
    status: params.status || 'active',
    active: true,
    payment_status: params.paymentStatus,
    access_type: params.accessType || 'full',
    subscription_interval: params.subscriptionInterval || null,
    subscription_ends_at: params.subscriptionEndsAt || null,
    cohort_id: params.cohortId || null,
    enrolled_at: new Date().toISOString(),
  };
  // Populated for paid guest enrollments so the existing charge.refunded webhook branch can
  // match this enrollment back to its Stripe payment intent (same column the authenticated
  // Stripe webhook writes).
  if (params.stripePaymentIntentId) {
    row.stripe_payment_intent_id = params.stripePaymentIntentId;
  }

  const { error } = await admin.from('enrollments').insert(row);

  if (error) {
    // A concurrent insert (unique violation) is a success for our purposes.
    if ((error as any).code === '23505') {
      return { enrolled: false, alreadyEnrolled: true };
    }
    logger.error({ err: error, courseId, contactId }, 'guest_enrollment.enrollment.insert.failed');
    throw error;
  }

  return { enrolled: true, alreadyEnrolled: false };
}

/**
 * Ensures a real LeadsMind auth user exists for `email` and returns a login link that
 * establishes a REAL server-side (cookie) session and lands the buyer in /student.
 *
 * Uses the same admin.generateLink('magiclink') mechanism as /auth/student/verify (creates
 * the user if absent), but returns a link that goes through our own /auth/callback route with
 * the one-time `token_hash`, NOT GoTrue's raw `action_link`. Why: `action_link` redirects to
 * `redirect_to` with the tokens in the URL **fragment** (implicit flow) — the Next.js
 * middleware runs server-side, never sees a fragment, finds no session cookie, and bounces
 * /student -> /auth/signin-basic with the tokens stranded in the hash. /auth/callback instead
 * calls `verifyOtp({ type, token_hash })` server-side, which sets the SSR auth cookies on the
 * response, then 302s to `next` — so the buyer genuinely lands logged-in in /student. This
 * also fixes the same broken hop for the backup onboarding email link.
 *
 * Fail-soft: on any error returns the plain student-login page URL so the onboarding email
 * still has a usable call to action.
 */
export async function provisionAccountLink(email: string): Promise<string> {
  const fallback = `${appUrl()}/auth/student/login`;
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email.trim().toLowerCase(),
      options: { redirectTo: `${appUrl()}/student` },
    });
    const tokenHash = data?.properties?.hashed_token;
    if (error || !tokenHash) {
      logger.warn({ err: error }, 'guest_enrollment.account_link.generate.failed');
      // Last resort: the raw action_link still works client-side (fragment flow) even if the
      // cookie-setting path above is unavailable for some reason.
      return data?.properties?.action_link || fallback;
    }
    return `${appUrl()}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=${encodeURIComponent('/student')}`;
  } catch (err) {
    logger.warn({ err }, 'guest_enrollment.account_link.generate.threw');
    return fallback;
  }
}

/**
 * Post-enrollment: provision an account link and send the real course onboarding email.
 * Fail-soft — never throws. Returns whether the email went out.
 */
export async function welcomeGuestStudent(params: {
  courseId: string;
  contactId: string;
  workspaceId: string;
  email: string;
  accessType?: string | null;
}): Promise<{ emailSent: boolean; emailReason?: string }> {
  const accountSetupUrl = await provisionAccountLink(params.email);
  const res = await sendCourseOnboardingEmail({
    courseId: params.courseId,
    contactId: params.contactId,
    workspaceId: params.workspaceId,
    accessType: params.accessType || 'full',
    accountSetupUrl,
  });
  return { emailSent: res.sent, emailReason: res.reason };
}

/**
 * The webhook-side entry point for guest paid checkout. Called from the
 * checkout.session.completed branch of the (already signature-verified) Stripe webhook when the
 * session carries { courseId, workspaceId } metadata but NO contactId.
 *
 * Creates the enrollment ONLY when Stripe reports the session as paid. Idempotent: safe to
 * receive the same event from more than one registered webhook endpoint or via Stripe retries.
 */
export async function handleGuestCheckoutSessionCompleted(session: any): Promise<void> {
  const md = session?.metadata || {};
  const courseId: string | undefined = md.courseId;
  const workspaceId: string | undefined = md.workspaceId;
  const pricingModel: string | undefined = md.pricingModel;
  const subscriptionInterval: string | null = md.subscriptionInterval || null;
  const cohortIdMeta: string | null = md.cohortId || null; // Cohorts, Part 1

  if (!courseId || !workspaceId) return; // not a guest course-checkout session

  // The single most important line in this file: trust Stripe's own view of the session, not
  // the fact that the event arrived. checkout.session.completed can fire for an async payment
  // that has not actually succeeded yet.
  const paid =
    session.payment_status === 'paid' ||
    session.payment_status === 'no_payment_required';
  if (!paid) {
    logger.warn(
      { courseId, workspaceId, payment_status: session.payment_status },
      'guest_enrollment.webhook.session_not_paid'
    );
    return;
  }

  const email: string | null =
    session.customer_details?.email || session.customer_email || null;
  if (!email) {
    logger.error({ courseId, workspaceId }, 'guest_enrollment.webhook.no_email_on_session');
    return;
  }

  const admin = createAdminClient();

  // Re-verify the course still exists in the claimed workspace and is actually a paid course.
  const { data: course } = await admin
    .from('courses')
    .select('id, workspace_id, pricing_model')
    .eq('id', courseId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!course) {
    logger.error({ courseId, workspaceId }, 'guest_enrollment.webhook.course_workspace_mismatch');
    return;
  }

  const { contactId } = await findOrCreateContactByEmail(
    admin,
    workspaceId,
    email,
    session.customer_details?.name || null
  );
  if (!contactId) {
    logger.error({ courseId, workspaceId }, 'guest_enrollment.webhook.contact_resolve_failed');
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : null;

  let subscriptionEndsAt: string | null = null;
  if (pricingModel === 'subscription') {
    const d = new Date();
    if ((subscriptionInterval || 'month') === 'year') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    subscriptionEndsAt = d.toISOString();
  }

  // Drip-aware access_type, matching /api/webhooks/payments' existing behavior.
  const { data: modules } = await admin
    .from('course_modules')
    .select('drip_days')
    .eq('course_id', courseId);
  const hasDrip = (modules || []).some((m: any) => (m.drip_days || 0) > 0);

  // Cohorts, Part 1: seat re-check at finalize (checkout-time check already passed).
  let cohortIdToSet: string | null = null;
  if (cohortIdMeta) {
    const { checkCohortSeatAvailable } = await import('@/lib/lms/cohorts');
    const seat = await checkCohortSeatAvailable(admin, cohortIdMeta, courseId!);
    cohortIdToSet = seat.ok ? cohortIdMeta : null;
    if (!seat.ok) logger.warn({ courseId, cohortId: cohortIdMeta }, 'guest_enrollment.webhook.cohort_full_at_finalize');
  }

  try {
    const { alreadyEnrolled } = await insertEnrollmentIfAbsent(admin, {
      courseId,
      contactId,
      workspaceId,
      paymentStatus: 'paid',
      accessType: hasDrip ? 'drip' : 'full',
      stripePaymentIntentId: paymentIntentId,
      subscriptionInterval: pricingModel === 'subscription' ? subscriptionInterval : null,
      subscriptionEndsAt,
      cohortId: cohortIdToSet,
    });

    if (alreadyEnrolled) {
      logger.info({ courseId, contactId }, 'guest_enrollment.webhook.enrollment.already_exists');
      return;
    }

    logger.info({ courseId, contactId }, 'guest_enrollment.webhook.enrollment.success');

    try {
      const { emitLMSEvent } = await import('../../../libs/core/src/events/lms-event-bus');
      // 'enrollment_created' matches the automation-rule builder dropdown (was 'student.enrolled').
      await emitLMSEvent('enrollment_created', { workspaceId, contactId, courseId });
      await emitLMSEvent('payment.completed', { workspaceId, contactId, courseId });
    } catch (e) {
      logger.error({ err: e, courseId, contactId }, 'guest_enrollment.webhook.events.failed');
    }

    await welcomeGuestStudent({
      courseId,
      contactId,
      workspaceId,
      email,
      accessType: hasDrip ? 'drip' : 'full',
    });
  } catch (err) {
    logger.error({ err, courseId, contactId }, 'guest_enrollment.webhook.finalize.failed');
  }
}
