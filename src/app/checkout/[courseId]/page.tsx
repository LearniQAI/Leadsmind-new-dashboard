import React from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getUser, getCurrentWorkspaceId } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import CheckoutClient from '@/app/student/checkout/[courseId]/CheckoutClient';

interface CheckoutPageProps {
  params: { courseId: string };
  searchParams: { status?: string; session_id?: string };
}

/**
 * PUBLIC course checkout. Reachable by logged-out visitors coming from a course landing page
 * (that's the whole point — the landing pages exist to convert people without an account).
 *
 * - Authenticated visitor  -> exactly the previous authenticated behaviour (workspace/contact
 *   resolution, already-enrolled redirect, enrolment-cap gate). This path is unchanged.
 * - Logged-out visitor      -> the guest flow (name+email for free courses; Stripe hosted
 *   checkout in guest mode for paid). No redirect to sign-in.
 *
 * The old route /student/checkout/[courseId] now just redirects here so existing deep links
 * (and the authenticated marketplace) keep working.
 */
export default async function PublicCheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { courseId } = params;
  const status = searchParams?.status;
  const sessionId = searchParams?.session_id;

  const user = await getUser();

  // ---- Guest (logged-out) path --------------------------------------------------------------
  if (!user) {
    const admin = createAdminClient();
    const { data: course } = await admin
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();

    if (!course) notFound();

    const isPublished = course.published || course.status === 'published';
    if (!isPublished) notFound();

    let isCapped = false;
    if (course.enrolment_cap !== null && course.enrolment_cap > 0) {
      const { count } = await admin
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);
      if (count !== null && count >= course.enrolment_cap) isCapped = true;
    }

    return (
      <div className="space-y-6 max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono uppercase tracking-widest">
          <span className="text-white/60">Secure Checkout</span>
        </div>

        <CheckoutClient
          course={course}
          user={null}
          workspaceId={null}
          contactId={null}
          isCapped={isCapped}
          isGuest
          postCheckoutStatus={status ?? null}
          checkoutSessionId={sessionId ?? null}
        />
      </div>
    );
  }

  // ---- Authenticated path (unchanged from the original /student/checkout page) --------------
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    redirect('/student/marketplace');
  }

  const supabase = await createServerClient();

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (!course) {
    notFound();
  }

  const contactId = await getOrCreateStudentContact(workspaceId);
  if (!contactId) {
    redirect('/student/marketplace');
  }

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('contact_id', contactId)
    .maybeSingle();

  if (enrollment) {
    redirect(`/student/courses/${courseId}`);
  }

  let isCapped = false;
  if (course.enrolment_cap !== null && course.enrolment_cap > 0) {
    const { count } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);

    if (count !== null && count >= course.enrolment_cap) {
      isCapped = true;
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono uppercase tracking-widest">
        <Link href="/student/marketplace" className="hover:text-white transition-all flex items-center gap-0.5">
          <ChevronLeft size={12} /> Back to Catalog
        </Link>
        <span>/</span>
        <span className="text-white/60">Secure Checkout</span>
      </div>

      <CheckoutClient
        course={course}
        user={user}
        workspaceId={workspaceId}
        contactId={contactId}
        isCapped={isCapped}
      />
    </div>
  );
}
