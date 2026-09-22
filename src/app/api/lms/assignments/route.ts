import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { getUser, getCurrentWorkspaceId, getUserAccessInfo } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import { publishEvent } from '@/lib/events/EventBus';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/lms/assignments
// If admin/member: returns all submissions for a lesson or course
// If student: returns the student's submission for a lesson
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId');
    const courseId = searchParams.get('courseId');

    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No active workspace context' }, { status: 400 });
    }

    const { role } = await getUserAccessInfo();
    const isInstructor = role !== null && ['admin', 'member'].includes(role);

    if (isInstructor) {
      // Return all submissions for this course or lesson
      let query = supabaseAdmin
        .from('lms_assignment_submissions')
        .select('*, contact:contacts(first_name, last_name, email)')
        .eq('workspace_id', workspaceId);

      if (lessonId) {
        query = query.eq('lesson_id', lessonId);
      } else if (courseId) {
        query = query.eq('course_id', courseId);
      } else {
        return NextResponse.json({ error: 'Missing courseId or lessonId parameter' }, { status: 400 });
      }

      const { data: submissions, error } = await query.order('submitted_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json({ success: true, submissions });
    } else {
      // Student: return their own submission for this lesson
      if (!lessonId) {
        return NextResponse.json({ error: 'Missing lessonId parameter' }, { status: 400 });
      }

      const contactId = await getOrCreateStudentContact(workspaceId);
      if (!contactId) {
        return NextResponse.json({ error: 'Failed to resolve student contact' }, { status: 400 });
      }

      const { data: submission, error } = await supabaseAdmin
        .from('lms_assignment_submissions')
        .select('*')
        .eq('contact_id', contactId)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ success: true, submission });
    }
  } catch (err: any) {
    console.error('[GET /api/lms/assignments error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST /api/lms/assignments
// Submit an assignment (student action)
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { lessonId, courseId, textSubmission, fileUrl, fileName, fileSize } = body;
    // workspaceId is intentionally read from the session, never the client body — a
    // client-supplied workspaceId would let a student submit into an arbitrary workspace.

    if (!lessonId || !courseId) {
      return NextResponse.json({ error: 'Missing required parameters: lessonId, courseId' }, { status: 400 });
    }

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No active workspace context' }, { status: 400 });
    }

    const contactId = await getOrCreateStudentContact(workspaceId);
    if (!contactId) {
      return NextResponse.json({ error: 'Failed to resolve student contact' }, { status: 400 });
    }

    // Upsert the student submission
    const { data: submission, error } = await supabaseAdmin
      .from('lms_assignment_submissions')
      .upsert({
        workspace_id: workspaceId,
        course_id: courseId,
        lesson_id: lessonId,
        contact_id: contactId,
        text_submission: textSubmission || '',
        file_url: fileUrl || null,
        file_name: fileName || null,
        file_size: fileSize || null,
        grade_status: 'pending',
        feedback_comments: null,
        submitted_at: new Date().toISOString(),
        graded_at: null,
        graded_by_user_id: null
      }, { onConflict: 'contact_id,lesson_id' })
      .select()
      .single();

    if (error) throw error;

    publishEvent(workspaceId, 'assignment_submitted', contactId, {
      submissionId: submission.id,
      courseId,
      lessonId,
    }).catch((err) => console.error('[POST /api/lms/assignments publishEvent error]:', err));

    return NextResponse.json({ success: true, submission });
  } catch (err: any) {
    console.error('[POST /api/lms/assignments error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// PATCH /api/lms/assignments
// Grade a student submission (instructor action)
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role } = await getUserAccessInfo();
    const isInstructor = role !== null && ['admin', 'member'].includes(role);
    if (!isInstructor) {
      return NextResponse.json({ error: 'Forbidden: Instructor access required' }, { status: 403 });
    }

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No active workspace context' }, { status: 400 });
    }

    const body = await req.json();
    const { submissionId, gradeStatus, feedbackComments } = body;

    if (!submissionId || !gradeStatus) {
      return NextResponse.json({ error: 'Missing required parameters: submissionId, gradeStatus' }, { status: 400 });
    }

    // Update submission
    const { data: submission, error: updateErr } = await supabaseAdmin
      .from('lms_assignment_submissions')
      .update({
        grade_status: gradeStatus,
        feedback_comments: feedbackComments || '',
        graded_at: new Date().toISOString(),
        graded_by_user_id: user.id
      })
      .eq("id", submissionId).eq("workspace_id", workspaceId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Conditionally mark lesson complete/incomplete based on status. For an assignment
    // content_block, completion (Phase C) is recorded by this same grading flow — the
    // block's completion_rule is 'graded_passed', not submission time.
    //
    // Batch 4 / fix 3 discovery: this used to call markLessonComplete()/markLessonIncomplete()
    // (the session-based wrappers in studentProgress.ts), which resolve the contact from the
    // GRADING INSTRUCTOR's own session, not from `submission.contact_id` — an instructor
    // grading someone else's submission would silently no-op (or, in the vanishingly unlikely
    // case they share a contact record, mark it for themselves). The per-block
    // lesson_block_completions upsert just above was already correctly keyed by
    // submission.contact_id; only the lesson-level call had the wrong identity. Fixed to call
    // the identity-explicit functions directly with the real student's contact id.
    if (gradeStatus === 'passed') {
      const { data: assignmentBlocks } = await supabaseAdmin
        .from('content_blocks')
        .select('id')
        .eq('lesson_id', submission.lesson_id)
        .eq('type', 'assignment');

      for (const block of assignmentBlocks || []) {
        await supabaseAdmin
          .from('lesson_block_completions')
          .upsert(
            { content_block_id: block.id, contact_id: submission.contact_id, metric: { grade_status: gradeStatus }, completed_at: new Date().toISOString() },
            { onConflict: 'content_block_id,contact_id' }
          );
      }

      const { markLessonCompleteForContact } = await import('@/lib/lms/completeLesson');
      await markLessonCompleteForContact(workspaceId, submission.contact_id, submission.course_id, submission.lesson_id);

      // A graded assignment can be the final missing piece for course_completed — see
      // courseCompletionEvent.ts. markLessonCompleteForContact above already re-checks this via
      // its own emit, but only when the LESSON itself is the transition point; an assignment
      // graded 'passed' after every lesson was already complete needs its own check here.
      const { maybeFireCourseCompleted } = await import('@/lib/lms/courseCompletionEvent');
      await maybeFireCourseCompleted(supabaseAdmin, workspaceId, submission.contact_id, submission.course_id);
    } else if (gradeStatus === 'failed') {
      await supabaseAdmin
        .from('course_progress')
        .delete()
        .eq('contact_id', submission.contact_id)
        .eq('lesson_id', submission.lesson_id);
    }

    publishEvent(workspaceId, 'assignment_graded', submission.contact_id, {
      submissionId: submission.id,
      courseId: submission.course_id,
      lessonId: submission.lesson_id,
      gradeStatus,
    }).catch((err) => console.error('[PATCH /api/lms/assignments publishEvent error]:', err));

    return NextResponse.json({ success: true, submission });
  } catch (err: any) {
    console.error('[PATCH /api/lms/assignments error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
