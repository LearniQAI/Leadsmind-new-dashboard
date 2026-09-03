'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { logger } from '@/shared/logger';
import { toClientError } from '@/shared/errors/AppError';

// Course Start Method 1 (email access link, "hold for manual approval"). Real
// pending_approval enrollment rows are created by studentEnrollments.ts:enrollStudent (a
// signed-in student self-enrolling) and guestCheckout.ts:guestFreeEnroll (a guest) — both only
// when the course's start_method is 'email_access_link' and email_access_auto_send is false.
// This file is the instructor-facing other half: list them, and Approve/Reject.

export interface PendingEnrollmentItem {
  id: string;
  contactId: string;
  studentName: string;
  studentEmail: string | null;
  enrolledAt: string | null;
}

export async function getPendingEnrollmentsForCourse(
  courseId: string
): Promise<{ data: PendingEnrollmentItem[] } | { error: string }> {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const db = createAdminClient();

    // Course ownership check — the same workspace scoping every other course-settings action
    // in this codebase uses (never trust a client-supplied courseId alone).
    const { data: course } = await db
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (!course) return { error: 'Course not found in this workspace.' };

    const { data: rows, error } = await db
      .from('enrollments')
      .select('id, contact_id, enrolled_at')
      .eq('course_id', courseId)
      .eq('status', 'pending_approval')
      .order('enrolled_at', { ascending: true });
    if (error) throw error;

    const contactIds = Array.from(new Set((rows || []).map((r: any) => r.contact_id)));
    const { data: contacts } = contactIds.length
      ? await db.from('contacts').select('id, first_name, last_name, email').in('id', contactIds)
      : { data: [] as any[] };
    const contactById = new Map((contacts || []).map((c: any) => [c.id, c]));

    const items: PendingEnrollmentItem[] = (rows || []).map((r: any) => {
      const c = contactById.get(r.contact_id);
      const name = c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : '';
      return {
        id: r.id,
        contactId: r.contact_id,
        studentName: name || 'Student',
        studentEmail: c?.email ?? null,
        enrolledAt: r.enrolled_at,
      };
    });

    return { data: items };
  } catch (err: any) {
    logger.error({ err, courseId }, 'course_enrollment_approval.list.failed');
    const clientError = toClientError(err);
    return { error: clientError.error };
  }
}

/**
 * Approve: flips the real row to active AND fires the real access-link onboarding email at
 * this exact moment — not before, and not automatically on some other schedule.
 */
export async function approvePendingEnrollment(
  enrollmentId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const db = createAdminClient();

    // Real workspace-scoped ownership check via the enrollment's own course, mirroring every
    // other cross-workspace-reference guard in this codebase — never trust the id alone. The
    // workspace match is verified in JS below (embedded PostgREST filters can't be expressed
    // as a plain .eq() on the related table through supabase-js's query builder).
    const { data: row } = await db
      .from('enrollments')
      .select('id, course_id, contact_id, status, courses(workspace_id)')
      .eq('id', enrollmentId)
      .maybeSingle<{ id: string; course_id: string; contact_id: string; status: string; courses: { workspace_id: string } | null }>();

    if (!row || row.courses?.workspace_id !== workspaceId) {
      return { error: 'Enrollment not found in this workspace.' };
    }
    if (row.status !== 'pending_approval') return { error: 'This enrollment is not awaiting approval.' };

    const { error: updateErr } = await db
      .from('enrollments')
      .update({ status: 'active' })
      .eq('id', enrollmentId);
    if (updateErr) throw updateErr;

    try {
      const { emitLMSEvent } = await import('../../../libs/core/src/events/lms-event-bus');
      await emitLMSEvent('enrollment_created', { workspaceId, contactId: row.contact_id, courseId: row.course_id });
    } catch (e) {
      logger.error({ err: e, enrollmentId }, 'course_enrollment_approval.approve.event_failed');
    }

    // Fires ONLY now — this is the whole point of "hold for manual approval". Same real
    // onboarding-email path every other enrollment (free, guest, Method 1 auto-send) uses.
    const { sendCourseOnboardingEmail } = await import('@/lib/lms/onboardingEmail');
    await sendCourseOnboardingEmail({
      courseId: row.course_id,
      contactId: row.contact_id,
      workspaceId,
      accessType: 'full',
    });

    return { success: true };
  } catch (err: any) {
    logger.error({ err, enrollmentId }, 'course_enrollment_approval.approve.failed');
    const clientError = toClientError(err);
    return { error: clientError.error };
  }
}

/**
 * Reject: a distinct 'rejected' status, not a delete — keeps a real audit trail of the real
 * signup rather than erasing it. isEnrolmentActive() already treats 'rejected' as no-access
 * (see src/lib/lms/enrolment.ts).
 */
export async function rejectPendingEnrollment(
  enrollmentId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const db = createAdminClient();

    const { data: row } = await db
      .from('enrollments')
      .select('id, status, courses(workspace_id)')
      .eq('id', enrollmentId)
      .maybeSingle<{ id: string; status: string; courses: { workspace_id: string } | null }>();

    if (!row || row.courses?.workspace_id !== workspaceId) {
      return { error: 'Enrollment not found in this workspace.' };
    }
    if (row.status !== 'pending_approval') return { error: 'This enrollment is not awaiting approval.' };

    const { error } = await db.from('enrollments').update({ status: 'rejected' }).eq('id', enrollmentId);
    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    logger.error({ err, enrollmentId }, 'course_enrollment_approval.reject.failed');
    const clientError = toClientError(err);
    return { error: clientError.error };
  }
}
