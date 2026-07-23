import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import { ForbiddenError, NotFoundError, UnauthorizedError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const enrolmentId = params.id;
    const user = await getUser();
    if (!user) throw new UnauthorizedError();

    const adminClient = createAdminClient();

    // Resolve the enrollment's real contact_id/course_id first — the enrolmentId in the
    // URL is not itself proof of ownership. `enrollments` has no workspace_id column of
    // its own, so the real workspace is resolved via the course it belongs to.
    const { data: enrollmentRow, error: fetchErr } = await adminClient
      .from('enrollments')
      .select('id, contact_id, course_id')
      .eq('id', enrolmentId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!enrollmentRow) throw new NotFoundError('Enrollment');

    const { data: courseRow, error: courseErr } = await adminClient
      .from('courses')
      .select('workspace_id')
      .eq('id', enrollmentRow.course_id)
      .maybeSingle();

    if (courseErr) throw courseErr;
    if (!courseRow) throw new NotFoundError('Course');

    const workspaceId = courseRow.workspace_id;

    // This is a student self-tracking heartbeat — only the enrolled student themself may
    // update their own last-active/progress state, never an arbitrary authenticated user.
    const studentContactId = await getOrCreateStudentContact(workspaceId);
    if (!studentContactId || studentContactId !== enrollmentRow.contact_id) {
      throw new ForbiddenError('You do not have access to this enrollment');
    }

    const body = await req.json();
    const { lessonId, progressSeconds } = body;

    const updates: any = { last_active_at: new Date().toISOString() };
    if (lessonId) {
      updates.last_lesson_id = lessonId;
    }
    if (typeof progressSeconds === 'number') {
      updates.last_position_seconds = progressSeconds;
    }

    // 1. Update last_active_at on the enrollment row
    const { data: enrollment, error: enrollErr } = await adminClient
      .from('enrollments')
      .update(updates)
      .eq('id', enrolmentId)
      .select('contact_id, course_id')
      .single();

    if (enrollErr || !enrollment) throw new NotFoundError('Enrollment');

    // 2. If lessonId and progressSeconds are provided, log watch tracking position
    if (lessonId && typeof progressSeconds === 'number') {
      const { data: existing } = await adminClient
        .from('course_progress')
        .select('id, completed_at')
        .eq('contact_id', enrollment.contact_id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (existing) {
        const progressUpdates: any = { progress_seconds: progressSeconds };
        if (!existing.completed_at) {
          progressUpdates.completed_at = null;
        }
        const { error: updateErr } = await adminClient
          .from('course_progress')
          .update(progressUpdates)
          .eq('id', existing.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await adminClient
          .from('course_progress')
          .insert({
            workspace_id: workspaceId,
            contact_id: enrollment.contact_id,
            course_id: enrollment.course_id,
            lesson_id: lessonId,
            progress_seconds: progressSeconds,
            completed_at: null
          });
        if (insertErr) throw insertErr;
      }

      // Trigger struggle evaluation in the background
      try {
        const { evaluateStudentStruggle } = await import('../../../../../../libs/core/src/analytics/struggle-processor');
        await evaluateStudentStruggle(enrollment.contact_id, enrollment.course_id, workspaceId);
      } catch (err) {
        logger.error({ err, enrolmentId }, 'enrolments.activity.struggle_evaluation.failed');
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'enrolments.activity.patch.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
