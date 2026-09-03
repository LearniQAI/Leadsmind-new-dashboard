import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { stripeForWorkspace } from '@/lib/paymentGateways/stripeForWorkspace';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { findContactByEmail, provisionAccountLink } from '@/lib/lms/guestEnrollment';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

/**
 * Guest-checkout status poll — the "Finalizing your enrollment…" screen calls this every
 * few seconds instead of granting access on the strength of the success-page redirect alone.
 *
 * TRUST BOUNDARY (read this before changing anything here): this route is public and
 * unauthenticated by necessity — a guest has no session yet. It must never itself decide
 * "payment happened"; it only ever repeats back what two INDEPENDENT, server-verified
 * sources already say:
 *   1. Stripe's own API (`checkout.sessions.retrieve`, called with the session's real
 *      Stripe secret key server-side) — never the client-supplied `?status=` or any field
 *      on the request. A forged/expired/foreign `session_id` fails here.
 *   2. A REAL `enrollments` row — written exclusively by the signature-verified
 *      checkout.session.completed webhook (handleGuestCheckoutSessionCompleted). This route
 *      never creates, and could not create, that row itself.
 * Only when BOTH agree does this route hand back a login link — and that link is the same
 * generateLink('magiclink') mechanism /auth/student/verify already uses; this route does not
 * mint any session or cookie itself, it only returns the URL that does.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');
  const sessionId = searchParams.get('session_id');

  if (!courseId || !sessionId) {
    return NextResponse.json({ status: 'invalid', reason: 'missing_params' }, { status: 400 });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  // Generous vs. the 5/60s used elsewhere on this surface — this is legitimate polling by one
  // real buyer (every ~3s for up to a minute or two), not a one-shot form submit.
  if (!checkRateLimit(`guest-checkout-status:ip:${ip}`, 60, 60_000)) {
    return NextResponse.json({ status: 'invalid', reason: 'rate_limited' }, { status: 429 });
  }

  try {
    const admin = createAdminClient();

    const { data: course } = await admin
      .from('courses')
      .select('id, workspace_id')
      .eq('id', courseId)
      .maybeSingle();

    if (!course?.workspace_id) {
      return NextResponse.json({ status: 'invalid', reason: 'course_not_found' }, { status: 404 });
    }

    const stripeClient = await stripeForWorkspace(course.workspace_id);

    let session;
    try {
      session = await stripeClient.checkout.sessions.retrieve(sessionId);
    } catch (err) {
      // Includes a forged/nonexistent id, or one that belongs to a different Stripe
      // account than this workspace's — both are Stripe telling us "this isn't real".
      logger.warn({ err, courseId, sessionId }, 'guest_checkout.status.session_retrieve_failed');
      return NextResponse.json({ status: 'invalid', reason: 'session_not_found' }, { status: 404 });
    }

    // The session must actually belong to THIS course/workspace — refuse a real, paid
    // session_id being replayed against a different course's status page.
    const md = (session.metadata || {}) as Record<string, string>;
    if (md.courseId !== courseId || md.workspaceId !== course.workspace_id) {
      return NextResponse.json({ status: 'invalid', reason: 'session_course_mismatch' }, { status: 400 });
    }

    if (session.status === 'expired') {
      return NextResponse.json({ status: 'failed', reason: 'session_expired' });
    }

    const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
    if (!paid) {
      // Real, open Stripe session, genuinely not paid yet (still on Stripe's page, or an
      // async payment method still settling) — keep polling.
      return NextResponse.json({ status: 'pending' });
    }

    const email = session.customer_details?.email || session.customer_email || null;
    if (!email) {
      return NextResponse.json({ status: 'failed', reason: 'no_email_on_session' });
    }

    const contactId = await findContactByEmail(admin, course.workspace_id, email);
    if (!contactId) {
      // Stripe says paid, but the webhook hasn't created the contact/enrollment yet —
      // this is the real, expected async gap. Keep polling; never treat "Stripe says paid"
      // by itself as enough to log the buyer in.
      return NextResponse.json({ status: 'pending' });
    }

    const { data: enrollment } = await admin
      .from('enrollments')
      .select('id')
      .eq('course_id', courseId)
      .eq('contact_id', contactId)
      .maybeSingle();

    if (!enrollment) {
      return NextResponse.json({ status: 'pending' });
    }

    // Real enrollment row confirmed — safe to hand back a real login link. Same mechanism
    // /auth/student/verify already uses; this route doesn't set any cookie/session itself.
    const redirectUrl = await provisionAccountLink(email);
    return NextResponse.json({ status: 'ready', redirectUrl });
  } catch (err) {
    logger.error({ err, courseId, sessionId }, 'guest_checkout.status.unexpected_error');
    return NextResponse.json({ status: 'invalid', reason: 'internal_error' }, { status: 500 });
  }
}
