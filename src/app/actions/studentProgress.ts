'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import { getOrCreateStudentContact } from './studentEnrollments';
import { gradeQuizAttempt } from '@/lib/lms/gradeQuiz';
import { gradeModuleQuizAttempt } from '@/lib/lms/gradeModuleQuiz';
import { getModuleCompletionStatus } from '@/lib/lms/moduleCompletion';
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
export async function markLessonComplete(
  courseId: string,
  lessonId: string,
  opts?: { confirmedOverride?: boolean }
) {
  const ctx = await resolveCourseContext(courseId);
  if ('error' in ctx) return { error: ctx.error };

  // The student's own "Mark complete" button is always enabled; when content isn't finished
  // they confirm a soft dialog, which sets confirmedOverride. That lets the per-block /
  // reading gates accept — the server still re-checks the real signals itself to decide
  // whether the stored completion is genuine or an override.
  return markLessonCompleteForContact(ctx.workspaceId, ctx.contactId, courseId, lessonId, {
    allowIncomplete: opts?.confirmedOverride === true,
  });
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
      .eq('course_id', courseId)
      .not('completed_at', 'is', null);

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
    // Only real completions — a completed_at:null row is just the heartbeat remembering a
    // video's playback position, not a finished lesson.
    const { data: progressList, error } = await adminClient
      .from('course_progress')
      .select('lesson_id')
      .eq('contact_id', contactId)
      .eq('course_id', courseId)
      .not('completed_at', 'is', null);

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

// Module-Level Quiz — the module-scoped counterpart to submitQuizAttempt above, same real
// shape (resolve context -> grade server-side -> insert the real attempt row), against
// module_quiz_questions/module_quiz_attempts per the Step 1 schema decision instead of the
// lesson-scoped tables. Step 3 access-timing decision: a student can only submit after
// completing every lesson in the module (getModuleCompletionStatus, backed by the same real
// course_progress completion tracking every other completion path in this codebase uses) —
// enforced here server-side, not just as a UI affordance, since a client-side-only gate could
// be bypassed by calling this action directly.
export async function submitModuleQuizAttempt(payload: {
  courseId: string;
  moduleId: string;
  answers: any;
}) {
  try {
    const ctx = await resolveCourseContext(payload.courseId);
    if ('error' in ctx) return { error: ctx.error };
    const { workspaceId, contactId } = ctx;

    const completion = await getModuleCompletionStatus(contactId, payload.moduleId);
    if (!completion.allComplete) {
      return { error: 'Complete every lesson in this module before taking its quiz.' };
    }

    const adminClient = createAdminClient();

    const { score, passed, rawScore, maxScore } = await gradeModuleQuizAttempt(payload.moduleId, payload.answers);

    const { error: attemptErr } = await adminClient
      .from('module_quiz_attempts')
      .insert({
        workspace_id: workspaceId,
        module_id: payload.moduleId,
        student_id: contactId,
        score,
        max_score: maxScore,
        percentage: score,
        passed,
        answers: payload.answers
      });

    if (attemptErr) throw attemptErr;

    return { success: true, score, passed, maxScore, rawScore };
  } catch (err: any) {
    logger.error({ err, courseId: payload.courseId, moduleId: payload.moduleId }, 'student_progress.module_quiz_attempt.submit.failed');
    return { error: 'Failed to submit quiz attempt.' };
  }
}

// Module-Level Quiz — real gate check the student-facing UI calls before even rendering the
// quiz-taking screen (so a student sees a real "complete these lessons first" message rather
// than an empty/broken quiz), backed by the same getModuleCompletionStatus the submit action
// above enforces server-side.
export async function getModuleQuizAccessStatus(courseId: string, moduleId: string) {
  try {
    const ctx = await resolveCourseContext(courseId);
    if ('error' in ctx) return { error: ctx.error };

    const completion = await getModuleCompletionStatus(ctx.contactId, moduleId);
    return { data: completion };
  } catch (err: any) {
    logger.error({ err, courseId, moduleId }, 'student_progress.module_quiz_access.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

/**
 * Aggregate quiz stats for the current student's dashboard cards ("Quizzes passed",
 * "Avg. quiz score").
 *
 * Resolves every `contacts` row for the logged-in user's email (a student can hold a contact
 * in more than one workspace) exactly the way getEnrolledCoursesWithProgress does, then reads
 * BOTH real attempt tables:
 *   - quiz_attempts         (lesson-level quizzes)   — student_id = contact id
 *   - module_quiz_attempts  (module-level quizzes)   — student_id = contact id
 * Both share the same shape: a real `passed` boolean and a 0-100 `percentage`. The dashboard
 * numbers are a genuine combined view over the two, not two separate stats.
 *
 * Root-cause of the two stacked bugs this replaces (old inline query in student/page.tsx):
 *   1. it selected a `score_pct` column that does not exist on the live table (real column is
 *      `percentage`; `score_pct` was never a real column, only an artifact of a since-deleted
 *      stale schema file), so the select errored and the result was always null.
 *   2. it filtered `student_id` by the auth user id, but attempts are written with the
 *      contact id — the two never matched.
 * Module-quiz passes were also never counted at all.
 *
 * Definitions:
 *   - quizzesPassed: number of DISTINCT quizzes (a lesson quiz or a module quiz) the student
 *     has passed at least once — retaking an already-passed quiz does not inflate it.
 *   - avgQuizScore: mean `percentage` across every attempt (passed or failed), matching the
 *     original card's "average score" intent — a failed attempt is a real data point and
 *     drags the average down; it just never counts as a pass.
 */
export async function getStudentQuizStats(): Promise<{
  data: { quizzesPassed: number; avgQuizScore: number; totalAttempts: number };
}> {
  const empty = { data: { quizzesPassed: 0, avgQuizScore: 0, totalAttempts: 0 } };
  try {
    const user = await getUser();
    if (!user?.email) return empty;

    const adminClient = createAdminClient();

    const { data: contacts } = await adminClient
      .from('contacts')
      .select('id')
      .eq('email', user.email);

    const contactIds = (contacts || []).map((c: any) => c.id);
    if (contactIds.length === 0) return empty;

    const [lessonRes, moduleRes] = await Promise.all([
      adminClient
        .from('quiz_attempts')
        .select('lesson_id, percentage, passed')
        .in('student_id', contactIds),
      adminClient
        .from('module_quiz_attempts')
        .select('module_id, percentage, passed')
        .in('student_id', contactIds),
    ]);

    if (lessonRes.error) throw lessonRes.error;
    if (moduleRes.error) throw moduleRes.error;

    const lessonAttempts = lessonRes.data || [];
    const moduleAttempts = moduleRes.data || [];
    const allAttempts = [...lessonAttempts, ...moduleAttempts];
    const totalAttempts = allAttempts.length;

    const passedQuizKeys = new Set<string>();
    for (const a of lessonAttempts) {
      if (a.passed && a.lesson_id) passedQuizKeys.add(`lesson:${a.lesson_id}`);
    }
    for (const a of moduleAttempts) {
      if (a.passed && a.module_id) passedQuizKeys.add(`module:${a.module_id}`);
    }

    const avgQuizScore =
      totalAttempts > 0
        ? Math.round(
            allAttempts.reduce((sum: number, a: any) => sum + Number(a.percentage || 0), 0) /
              totalAttempts
          )
        : 0;

    return {
      data: { quizzesPassed: passedQuizKeys.size, avgQuizScore, totalAttempts },
    };
  } catch (err: any) {
    logger.error({ err }, 'student_progress.quiz_stats.fetch.failed');
    return empty;
  }
}
