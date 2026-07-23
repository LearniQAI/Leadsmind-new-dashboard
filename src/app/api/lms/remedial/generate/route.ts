import { NextRequest, NextResponse } from 'next/server';
import { generateRemedialAssignment } from '../../../../../../libs/services/src/ai/remedial-prompter';
import { requireAuth } from '@/lib/auth/requireAuth';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import { ForbiddenError, NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult;

  try {
    const { contactId, courseId, lessonId, enrollmentId } = await req.json();

    if (!contactId || !courseId || !lessonId || !enrollmentId) {
      return NextResponse.json(
        { error: 'Missing required parameters: contactId, courseId, lessonId, enrollmentId' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Resolve the course's real workspace_id, and confirm the enrollment actually matches
    // the claimed contact/course — none of the client-supplied ids are trusted for
    // authorization on their own.
    const { data: course, error: courseErr } = await adminClient
      .from('courses')
      .select('workspace_id')
      .eq('id', courseId)
      .maybeSingle();

    if (courseErr) throw courseErr;
    if (!course) throw new NotFoundError('Course');

    const { data: enrollment, error: enrollErr } = await adminClient
      .from('enrollments')
      .select('id, contact_id, course_id')
      .eq('id', enrollmentId)
      .maybeSingle();

    if (enrollErr) throw enrollErr;
    if (!enrollment || enrollment.course_id !== courseId || enrollment.contact_id !== contactId) {
      throw new ForbiddenError('Enrollment does not match the supplied contact/course');
    }

    // Caller must be either a team member of the course's workspace (instructor assigning
    // remedial content), or the enrolled student themself.
    const supabaseUser = await createServerClient();
    const { data: membership } = await supabaseUser
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', course.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();

    let authorized = !!membership;
    if (!authorized) {
      const studentContactId = await getOrCreateStudentContact(course.workspace_id);
      authorized = !!studentContactId && studentContactId === contactId;
    }
    if (!authorized) throw new ForbiddenError('You do not have access to this enrollment');

    const res = await generateRemedialAssignment(contactId, courseId, lessonId, enrollmentId);

    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      assignment: res.assignment
    });

  } catch (err: any) {
    logger.error({ err }, 'lms.remedial.generate.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
