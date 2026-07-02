import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { getUser, getCurrentWorkspaceId, getUserAccessInfo } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import { markLessonComplete, markLessonIncomplete } from '@/app/actions/studentProgress';

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
    const { lessonId, courseId, workspaceId, textSubmission, fileUrl, fileName, fileSize } = body;

    if (!lessonId || !courseId || !workspaceId) {
      return NextResponse.json({ error: 'Missing required parameters: lessonId, courseId, workspaceId' }, { status: 400 });
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
      .eq("id", submissionId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Conditionally mark lesson complete/incomplete based on status
    if (gradeStatus === 'passed') {
      await markLessonComplete(submission.course_id, submission.lesson_id);
    } else if (gradeStatus === 'failed') {
      await markLessonIncomplete(submission.course_id, submission.lesson_id);
    }

    return NextResponse.json({ success: true, submission });
  } catch (err: any) {
    console.error('[PATCH /api/lms/assignments error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
