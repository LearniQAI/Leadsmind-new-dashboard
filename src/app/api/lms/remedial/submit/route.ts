import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import { ForbiddenError, NotFoundError, UnauthorizedError, toClientError } from '@/shared/errors/AppError';
import { markLessonCompleteForContact } from '@/lib/lms/completeLesson';
import { logger } from '@/shared/logger';

// Mock WebSocket to prevent Supabase realtime crash in Node 20
if (typeof global !== 'undefined' && !(global as any).WebSocket) {
  (global as any).WebSocket = class {};
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) throw new UnauthorizedError();

    const { assignmentId, answers } = await req.json();

    if (!assignmentId || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Missing required parameters: assignmentId, answers array' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Fetch assignment record
    const { data: assignment, error: fetchErr } = await adminClient
      .from('lms_remedial_assignments')
      .select('*')
      .eq('id', assignmentId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!assignment) throw new NotFoundError('Remedial assignment');

    // 2. Resolve the assignment's real workspace via its course, then confirm the caller
    // is either a team member of that workspace, or the enrolled student themself — the
    // assignmentId alone is not proof of ownership.
    const { data: course, error: courseErr } = await adminClient
      .from('courses')
      .select('workspace_id')
      .eq('id', assignment.course_id)
      .maybeSingle();

    if (courseErr) throw courseErr;
    if (!course) throw new NotFoundError('Course');

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
      authorized = !!studentContactId && studentContactId === assignment.contact_id;
    }
    if (!authorized) throw new ForbiddenError('You do not have access to this assignment');

    const questions = assignment.validation_questions || [];
    if (questions.length === 0) {
      return NextResponse.json({ error: 'No validation questions found in this assignment' }, { status: 400 });
    }

    // 3. Grade validation answers
    let correctCount = 0;
    questions.forEach((q: any, idx: number) => {
      const studentAns = answers[idx];
      const correctAns = q.correctAnswer;
      if (studentAns === correctAns) {
        correctCount++;
      }
    });

    const totalQuestions = questions.length;
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = scorePercentage >= 80; // passing standard of 80% (4 out of 5 questions)

    // 4. Update assignment state
    const newAttemptsCount = (assignment.incorrect_attempts_count || 0) + 1;
    const updatePayload: any = {
      updated_at: new Date().toISOString()
    };

    if (passed) {
      updatePayload.status = 'passed';
    } else {
      updatePayload.incorrect_attempts_count = newAttemptsCount;
    }

    const { error: updateErr } = await adminClient
      .from('lms_remedial_assignments')
      .update(updatePayload)
      .eq('id', assignmentId);

    if (updateErr) throw updateErr;

    // 5. If passed, record it as real evidence the lesson's quiz requirement was satisfied
    // (a remedial pass is a substitute for the original quiz, not a bypass of it), then mark
    // the lesson complete through the same shared, per-block-gated function every other
    // completion path uses — this used to write course_progress directly, which bypassed
    // both the per-block completion gate (Phase C) and, for legacy lessons, the quiz_attempts
    // check, closing that sibling bug found while auditing every "mark complete" path.
    if (passed) {
      const { data: quizBlocks } = await adminClient
        .from('content_blocks')
        .select('id')
        .eq('lesson_id', assignment.lesson_id)
        .eq('type', 'quiz');

      if (quizBlocks && quizBlocks.length > 0) {
        for (const block of quizBlocks) {
          await adminClient
            .from('lesson_block_completions')
            .upsert(
              { content_block_id: block.id, contact_id: assignment.contact_id, metric: { remedial: true, score: scorePercentage }, completed_at: new Date().toISOString() },
              { onConflict: 'content_block_id,contact_id' }
            );
        }
      } else {
        const { data: quizQuestions } = await adminClient
          .from('quiz_questions')
          .select('id')
          .eq('lesson_id', assignment.lesson_id)
          .limit(1);

        if (quizQuestions && quizQuestions.length > 0) {
          await adminClient
            .from('quiz_attempts')
            .insert({
              workspace_id: course.workspace_id,
              lesson_id: assignment.lesson_id,
              student_id: assignment.contact_id,
              score: scorePercentage,
              max_score: 100,
              percentage: scorePercentage,
              passed: true,
              answers: { remedial: true, answers }
            });
        }
      }

      const completeResult = await markLessonCompleteForContact(
        course.workspace_id,
        assignment.contact_id,
        assignment.course_id,
        assignment.lesson_id
      );
      if ('error' in completeResult) {
        logger.error({ err: completeResult.error, assignmentId }, 'lms.remedial.submit.progress_write.failed');
      }
    }

    return NextResponse.json({
      success: true,
      passed,
      score: scorePercentage,
      correctCount,
      totalQuestions
    });

  } catch (err: any) {
    logger.error({ err }, 'lms.remedial.submit.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
