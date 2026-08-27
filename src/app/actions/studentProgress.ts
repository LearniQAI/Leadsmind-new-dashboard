'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import { getOrCreateStudentContact } from './studentEnrollments';
import { gradeQuizAttempt } from '@/lib/lms/gradeQuiz';
import { markLessonCompleteForContact } from '@/lib/lms/completeLesson';
import { logger } from '@/shared/logger';

/**
 * Resolves { workspaceId, contactId } for the current student **from the course itself**,
 * not from the active_workspace_id cookie.
 *
 * Root-cause fix: the cookie can point at a different workspace than the course's, and
 * getOrCreateStudentContact() would then look up (or auto-CREATE) a contact in that wrong
 * workspace — a contact with no enrolment for this course — making every progress read/write
 * fail with "Not enrolled in this course" even for a genuinely enrolled student. The course
 * page already resolves the contact against course.workspace_id; these actions now match it.
 */
async function resolveCourseContext(
  courseId: string
): Promise<{ workspaceId: string; contactId: string } | { error: string }> {
  const user = await getUser();
  if (!user) return { error: 'Not authenticated' };

  const adminClient = createAdminClient();
  const { data: course } = await adminClient
    .from('courses')
    .select('workspace_id')
    .eq('id', courseId)
    .maybeSingle();

  if (!course?.workspace_id) return { error: 'Course not found' };

  const contactId = await getOrCreateStudentContact(course.workspace_id);
  if (!contactId) return { error: 'Failed to resolve student contact' };

  return { workspaceId: course.workspace_id, contactId };
}

/**
 * Marks a lesson complete for the current session's student. Resolves the real
 * workspace/contact from the session, then delegates the actual completion (including the
 * per-block gate) to the shared markLessonCompleteForContact — every other real completion
 * path (quiz pass, assignment grading, remedial-assignment pass) uses the same function
 * rather than duplicating this logic with its own course_progress write.
 */
export async function markLessonComplete(courseId: string, lessonId: string) {
  const ctx = await resolveCourseContext(courseId);
  if ('error' in ctx) return { error: ctx.error };

  return markLessonCompleteForContact(ctx.workspaceId, ctx.contactId, courseId, lessonId);
}

/**
 * Marks a lesson incomplete by removing the progress record.
 */
export async function markLessonIncomplete(courseId: string, lessonId: string) {
  try {
    const ctx = await resolveCourseContext(courseId);
    if ('error' in ctx) return { error: ctx.error };
    const { contactId } = ctx;

    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('course_progress')
      .delete()
      .eq('contact_id', contactId)
      .eq('lesson_id', lessonId);

    if (error) throw error;

    // Calculate updated percentage
    const { data: allLessons } = await adminClient
      .from('course_lessons')
      .select('id')
      .eq('course_id', courseId);

    const { data: allCompleted } = await adminClient
      .from('course_progress')
      .select('lesson_id')
      .eq('contact_id', contactId)
      .eq('course_id', courseId);

    const total = allLessons?.length || 0;
    const completed = allCompleted?.length || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { success: true, progressPercentage: percentage };
  } catch (err: any) {
    logger.error({ err, courseId, lessonId }, 'student_progress.mark_lesson_incomplete.failed');
    return { error: 'Failed to mark lesson incomplete.' };
  }
}

/**
 * Fetches completed lesson IDs for a student in a course.
 */
export async function getCompletedLessons(courseId: string) {
  try {
    const ctx = await resolveCourseContext(courseId);
    if ('error' in ctx) return ctx.error === 'Failed to resolve student contact' ? { data: [] } : { error: ctx.error };
    const { contactId } = ctx;

    const adminClient = createAdminClient();
    const { data: progressList, error } = await adminClient
      .from('course_progress')
      .select('lesson_id')
      .eq('contact_id', contactId)
      .eq('course_id', courseId);

    if (error) throw error;
    return { data: (progressList || []).map((p: any) => p.lesson_id) };
  } catch (err: any) {
    logger.error({ err, courseId }, 'student_progress.completed_lessons.fetch.failed');
    return { error: 'Failed to fetch completed lessons.' };
  }
}

/**
 * Logs a quiz attempt and conditionally completes the lesson if the student passed.
 *
 * The score and pass/fail status are always recomputed here from the real question/answer
 * data — a client-supplied score or pass field is never accepted. The client may still
 * compute its own score for immediate UI feedback, but only this server-side result is ever
 * persisted or used to gate lesson completion, certificates, or automation.
 */
export async function submitQuizAttempt(payload: {
  courseId: string;
  lessonId: string;
  answers: any;
}) {
  try {
    const ctx = await resolveCourseContext(payload.courseId);
    if ('error' in ctx) return { error: ctx.error };
    const { workspaceId, contactId } = ctx;

    const adminClient = createAdminClient();

    // 1. Independently recompute score/pass from the real quiz_questions data — never trust
    // a client-supplied score or pass field.
    const { score, passed, rawScore, maxScore } = await gradeQuizAttempt(payload.lessonId, payload.answers);

    // 2. Insert quiz attempt using admin client to bypass RLS
    const { error: attemptErr } = await adminClient
      .from('quiz_attempts')
      .insert({
        workspace_id: workspaceId,
        lesson_id: payload.lessonId,
        student_id: contactId,
        score,
        max_score: maxScore,
        percentage: score,
        passed,
        answers: payload.answers
      });

    if (attemptErr) throw attemptErr;

    // 3. If passed (server-computed), record completion for any quiz content_blocks on this
    // lesson, then mark the lesson complete — matches how every other block type writes its
    // own lesson_block_completions row on real completion (Phase C).
    if (passed) {
      const { data: quizBlocks } = await adminClient
        .from('content_blocks')
        .select('id')
        .eq('lesson_id', payload.lessonId)
        .eq('type', 'quiz');

      for (const block of quizBlocks || []) {
        await adminClient
          .from('lesson_block_completions')
          .upsert(
            { content_block_id: block.id, contact_id: contactId, metric: { score, passed }, completed_at: new Date().toISOString() },
            { onConflict: 'content_block_id,contact_id' }
          );
      }

      await markLessonComplete(payload.courseId, payload.lessonId);
    }

    // Evaluate student struggle profile in background
    try {
      const { evaluateStudentStruggle } = await import('../../../libs/core/src/analytics/struggle-processor');
      await evaluateStudentStruggle(contactId, payload.courseId, workspaceId);
    } catch (struggleErr) {
      logger.error({ err: struggleErr, workspaceId, contactId, courseId: payload.courseId }, 'student_progress.struggle_processor.failed');
    }

    return { success: true, score, passed, maxScore, rawScore };
  } catch (err: any) {
    logger.error({ err, courseId: payload.courseId, lessonId: payload.lessonId }, 'student_progress.quiz_attempt.submit.failed');
    return { error: 'Failed to submit quiz attempt.' };
  }
}
