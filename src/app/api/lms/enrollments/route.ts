import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { sendCourseOnboardingEmail } from '@/lib/lms/onboardingEmail';
import { ForbiddenError, NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Admin-driven per-course roster + enrollment (Section C quick-actions "Add student" /
// "Students"). Distinct from studentEnrollments.ts's enrollStudent(), which is self-service
// only and explicitly blocks admins from enrolling via that path — this route is the
// admin-facing counterpart, gated the same way every other lms admin route is (requireLmsInstructor).
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId parameter' }, { status: 400 });
    }

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data: courseRow, error: courseErr } = await adminClient
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (courseErr) throw courseErr;
    if (!courseRow) throw new NotFoundError('Course');

    const { data: enrollments, error } = await adminClient
      .from('enrollments')
      .select('id, contact_id, status, active, enrolled_at, access_type, contact:contacts(id, first_name, last_name, email)')
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data: enrollments });
  } catch (err: any) {
    logger.error({ err }, 'lms.enrollments.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const body = await req.json();
    const { course_id, contact_id } = body;

    if (!course_id || !contact_id) {
      return NextResponse.json({ error: 'Missing required fields: course_id, contact_id' }, { status: 400 });
    }

    const { data: courseRow, error: courseErr } = await adminClient
      .from('courses')
      .select('id')
      .eq('id', course_id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (courseErr) throw courseErr;
    if (!courseRow) throw new ForbiddenError('You do not have access to this course');

    const { data: contactRow, error: contactErr } = await adminClient
      .from('contacts')
      .select('id')
      .eq('id', contact_id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (contactErr) throw contactErr;
    if (!contactRow) throw new ForbiddenError('Contact not found in this workspace');

    const { data: existing, error: existingErr } = await adminClient
      .from('enrollments')
      .select('id')
      .eq('course_id', course_id)
      .eq('contact_id', contact_id)
      .maybeSingle();

    if (existingErr) throw existingErr;
    if (existing) {
      return NextResponse.json({ error: 'This contact is already enrolled in this course' }, { status: 409 });
    }

    const { data: enrollment, error } = await adminClient
      .from('enrollments')
      .insert({
        course_id,
        contact_id,
        status: 'active',
        active: true,
        access_type: 'full',
        payment_status: 'free',
        enrolled_at: new Date().toISOString()
      })
      .select('id, contact_id, status, active, enrolled_at, access_type, contact:contacts(id, first_name, last_name, email)')
      .single();

    if (error) throw error;

    // Real invitation email — uses the course's onboarding template (Settings → Emails) with
    // {{variable}} interpolation, delivered via the workspace's own Resend config. Never let
    // an email failure roll back a successful enrollment: it is awaited but fail-soft.
    const emailResult = await sendCourseOnboardingEmail({
      courseId: course_id,
      contactId: contact_id,
      workspaceId,
      accessType: 'full',
    });

    return NextResponse.json({ data: enrollment, emailSent: emailResult.sent });
  } catch (err: any) {
    logger.error({ err }, 'lms.enrollments.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing enrollment id parameter' }, { status: 400 });

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data: enrollmentRow, error: lookupErr } = await adminClient
      .from('enrollments')
      .select('id, course:courses!inner(workspace_id)')
      .eq('id', id)
      .maybeSingle();

    if (lookupErr) throw lookupErr;
    if (!enrollmentRow || (enrollmentRow.course as any)?.workspace_id !== workspaceId) {
      throw new NotFoundError('Enrollment');
    }

    const { error } = await adminClient.from('enrollments').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'lms.enrollments.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
