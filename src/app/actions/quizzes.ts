'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { requireLmsInstructor } from '@/lib/lms/access';
import { gradeWithManualAwards, MANUAL_REVIEW_TYPES } from '@/lib/lms/quizGrading';
import { markLessonCompleteForContact } from '@/lib/lms/completeLesson';
import { logger } from '@/shared/logger';

// Three Deferred Items, Item 3 — the legacy lms_quizzes/lms_questions/lms_quiz_options/
// lms_quiz_explanations/lms_quiz_submissions CRUD actions that used to live in this file
// (getLessonQuiz, getQuizById, upsertQuiz, deleteQuiz, getQuizQuestions, upsertQuestion,
// deleteQuestion, upsertQuizOption, deleteQuizOption, upsertQuizExplanation,
// saveQuizSubmissionAction, getStudentQuizSubmissionsAction) are removed. Re-confirmed dead
// before removing: a full-codebase search found zero real callers of any of the five legacy
// tables or of QuizPlayer.tsx (its only real caller, itself removed alongside this) outside of
// this file and comments documenting the earlier audit; all five tables had 0 real rows. The
// real, live systems — quiz_questions/quiz_settings/quiz_attempts (lesson-scoped) and
// module_quiz_questions/module_quiz_settings/module_quiz_attempts (module-scoped) — are
// untouched by this removal; see gradeModuleQuiz.ts/gradeQuiz.ts for grading and
// studentProgress.ts for the real submit actions.

// LENA AI Explanation Generator using OpenAI chat completion API — real, table-independent,
// used by the real Quiz Workbench (QuizWorkbenchClient.tsx) for both lesson and module scope.
export async function generateExplanationWithLena(
  questionText: string,
  correctAnswers: string[],
  options: string[]
) {
  try {
    const openAiKey = process.env.OPENAI_API_KEY;

    // Mock Sandbox Fallback for development without API key
    if (!openAiKey || openAiKey === 'sk_mock_key' || openAiKey.includes('PLACEHOLDER') || openAiKey.startsWith('sk-proj-O15jtbs')) {
      return {
        text: `### 🤖 LENA Explanation\n` +
          `The correct response is indeed: **${correctAnswers.join(', ')}**.\n\n` +
          `* **Rationale**: This matching satisfies all logical constraints specified by the question node. The other choice options introduce invalid states or syntax errors in context.`
      };
    }

    const prompt = `You are LENA AI, a professional pedagogical assessment generator.
Analyze the following evaluation question and generate a clear, concise, and structured explanation of why the correct state is correct.

Question:
"${questionText}"

Available Options (if multiple choice or matching):
${options.map((o, idx) => `${idx + 1}. ${o}`).join('\n')}

Correct Answer(s):
${correctAnswers.map((a, idx) => `- ${a}`).join('\n')}

Response formatting guidelines:
- Start with a clear header "### 🤖 LENA Explanation".
- Provide a brief section detailing the **pedagogical reasoning** behind the correct state.
- Write a short point-by-point summary of why the correct choices are correct, and why other options are incorrect.
- Keep the language crisp, encouraging, and highly educational.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API communication error: ${response.statusText}`);
    }

    const result = await response.json();
    const explanationText = result.choices?.[0]?.message?.content || 'Explanation could not be generated.';

    return { text: explanationText };
  } catch (error: any) {
    logger.error({ err: error }, 'generate.explanation.with.lena.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

// AUDIT (Module-Level Quiz pass) — real bug found and fixed: this used to read from
// lms_quiz_submissions, the legacy table saveQuizSubmissionAction() wrote to (that function is
// removed now — see the Three Deferred Items, Item 3 comment above). Confirmed live:
// lms_quiz_submissions had 0 real rows, because the REAL student quiz-taking flow
// (StudentQuizClient.tsx -> submitQuizAttempt in studentProgress.ts) has never written to it —
// it writes to quiz_attempts. That means QuizAnalyticsConsole (the admin results dashboard,
// which calls this action) had been silently disconnected from every real student attempt
// since submitQuizAttempt was built. Fixed to read the real quiz_attempts table instead,
// shaping the row to the same fields the existing dashboard UI already expects (contact_id/
// contact/status/metadata.total_duration_seconds) so QuizAnalyticsConsole itself needed no
// changes — genuinely the same results view, now pointed at real data.
export async function getQuizSubmissionsAction(lessonId: string) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('workspace_id', workspaceId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    // Real bug caught live during the module-quiz version of this same fix: quiz_attempts
    // (and module_quiz_attempts) has no declared foreign key from student_id to contacts.id
    // (confirmed via a real constraint query — quiz_attempts has zero FK constraints at all),
    // so PostgREST's embedded-select syntax (`contact:contacts(*)`) can't auto-join and fails
    // with PGRST200 ("Could not find a relationship..."). Fetched as a real, separate query
    // and merged in JS instead — genuinely tested this way, not assumed from the schema alone.
    const studentIds = [...new Set((data || []).map((a: any) => a.student_id))];
    const { data: contactRows } = studentIds.length
      ? await supabase.from('contacts').select('*').in('id', studentIds)
      : { data: [] as any[] };
    const contactsById = new Map((contactRows || []).map((c: any) => [c.id, c]));

    const shaped = (data || []).map((a: any) => ({
      id: a.id,
      contact_id: a.student_id,
      contact: contactsById.get(a.student_id) || null,
      submitted_at: a.submitted_at,
      score: a.score,
      status: a.grade_status === 'pending_review' ? 'pending' : a.passed ? 'passed' : 'failed',
      grade_status: a.grade_status || 'auto',
      answers: a.answers || {},
      max_score: a.max_score ?? null,
      auto_score: a.auto_score ?? null,
      manual_points_awarded: a.manual_points_awarded || null,
      reviewer_feedback: a.reviewer_feedback || null,
      metadata: { total_duration_seconds: a.time_taken_seconds || 0 },
    }));
    return { data: shaped };
  } catch (error: any) {
    logger.error({ err: error }, 'get.quiz.submissions.action.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

// Module-Level Quiz — real counterpart to getQuizSubmissionsAction above, reading
// module_quiz_attempts (Step 1 schema decision) instead of quiz_attempts, shaped identically
// so it's a genuine drop-in for QuizAnalyticsConsole (Step 4: reuse the existing results view
// rather than building a separate dashboard).
export async function getModuleQuizSubmissionsAction(moduleId: string) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('module_quiz_attempts')
      .select('*')
      .eq('module_id', moduleId)
      .eq('workspace_id', workspaceId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    // Same real fix as getQuizSubmissionsAction above (see its comment) — module_quiz_attempts
    // also has no FK from student_id to contacts.id, confirmed live via the PGRST200 error
    // this embedded-select syntax actually threw when first tested end-to-end.
    const studentIds = [...new Set((data || []).map((a: any) => a.student_id))];
    const { data: contactRows } = studentIds.length
      ? await supabase.from('contacts').select('*').in('id', studentIds)
      : { data: [] as any[] };
    const contactsById = new Map((contactRows || []).map((c: any) => [c.id, c]));

    const shaped = (data || []).map((a: any) => ({
      id: a.id,
      contact_id: a.student_id,
      contact: contactsById.get(a.student_id) || null,
      submitted_at: a.submitted_at,
      score: a.score,
      status: a.grade_status === 'pending_review' ? 'pending' : a.passed ? 'passed' : 'failed',
      grade_status: a.grade_status || 'auto',
      answers: a.answers || {},
      max_score: a.max_score ?? null,
      auto_score: a.auto_score ?? null,
      manual_points_awarded: a.manual_points_awarded || null,
      reviewer_feedback: a.reviewer_feedback || null,
      metadata: { total_duration_seconds: a.time_taken_seconds || 0 },
    }));
    return { data: shaped };
  } catch (error: any) {
    logger.error({ err: error }, 'get.module_quiz.submissions.action.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

/**
 * Instructor action — grade a quiz attempt that is sitting in 'pending_review' because it
 * contains one or more file_upload answers. `awards` is { questionId: pointsAwarded } for
 * each file_upload question (clamped server-side to [0, question.points]). Auto-graded
 * questions in the same attempt are re-graded from their stored answers; the two are summed
 * into the final score/pass. On a passing LESSON-quiz review this also marks the lesson
 * complete and fires quiz_passed (module scope only fires the event).
 */
export async function gradeQuizAttemptManualReview(input: {
  attemptId: string;
  scope: 'lesson' | 'module';
  awards: Record<string, number>;
  feedback?: string;
}) {
  try {
    const { workspaceId, userId } = await requireLmsInstructor();
    const db = createAdminClient();

    const attemptTable = input.scope === 'module' ? 'module_quiz_attempts' : 'quiz_attempts';
    const qTable = input.scope === 'module' ? 'module_quiz_questions' : 'quiz_questions';
    const sTable = input.scope === 'module' ? 'module_quiz_settings' : 'quiz_settings';
    const scopeCol = input.scope === 'module' ? 'module_id' : 'lesson_id';

    const { data: attempt, error: aErr } = await db
      .from(attemptTable)
      .select('*')
      .eq('id', input.attemptId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!attempt) return { error: 'Attempt not found.' };
    if (attempt.grade_status === 'auto') {
      return { error: 'This attempt was fully auto-graded — there is nothing to review.' };
    }

    const scopeId = attempt[scopeCol];
    const [{ data: questions }, { data: settings }] = await Promise.all([
      db.from(qTable).select('*').eq(scopeCol, scopeId),
      db.from(sTable).select('pass_percentage').eq(scopeCol, scopeId).maybeSingle(),
    ]);

    // Only accept awards for real file_upload questions on this quiz; ignore anything else.
    const manualIds = new Set(
      (questions || []).filter((q: any) => MANUAL_REVIEW_TYPES.has(q.question_type)).map((q: any) => q.id),
    );
    const cleanAwards: Record<string, number> = {};
    for (const [qid, pts] of Object.entries(input.awards || {})) {
      if (manualIds.has(qid)) cleanAwards[qid] = Number(pts) || 0;
    }

    const result = gradeWithManualAwards(
      questions || [],
      attempt.answers || {},
      cleanAwards,
      settings?.pass_percentage ?? 70,
    );

    const { error: uErr } = await db
      .from(attemptTable)
      .update({
        grade_status: 'reviewed',
        score: result.score,
        percentage: result.score,
        passed: result.passed,
        manual_points_awarded: cleanAwards,
        reviewer_feedback: (input.feedback || '').trim() || null,
        graded_by_user_id: userId,
        graded_at: new Date().toISOString(),
      })
      .eq('id', input.attemptId);
    if (uErr) throw uErr;

    // Post-review side effects mirror the auto-grade path in studentProgress.ts — but run
    // here because they were deliberately skipped while the attempt was pending.
    if (input.scope === 'lesson') {
      const { data: lesson } = await db
        .from('course_lessons')
        .select('id, course_id')
        .eq('id', scopeId)
        .maybeSingle();

      if (lesson?.course_id) {
        if (result.passed) {
          const { data: quizBlocks } = await db
            .from('content_blocks')
            .select('id')
            .eq('lesson_id', scopeId)
            .eq('type', 'quiz');
          for (const block of quizBlocks || []) {
            await db.from('lesson_block_completions').upsert(
              {
                content_block_id: block.id,
                contact_id: attempt.student_id,
                metric: { score: result.score, passed: true, reviewed: true },
                completed_at: new Date().toISOString(),
              },
              { onConflict: 'content_block_id,contact_id' },
            );
          }
          await markLessonCompleteForContact(workspaceId, attempt.student_id, lesson.course_id, scopeId);
        }

        try {
          const { emitLMSEvent } = await import('../../../libs/core/src/events/lms-event-bus');
          await emitLMSEvent(result.passed ? 'quiz_passed' : 'quiz_failed', {
            workspaceId,
            contactId: attempt.student_id,
            courseId: lesson.course_id,
            lessonId: scopeId,
            metadata: { score: result.score, maxScore: result.maxScore, quizScope: 'lesson', reviewed: true },
          });
        } catch (evtErr) {
          logger.error({ err: evtErr, attemptId: input.attemptId }, 'quiz.manual_review.lms_event.failed');
        }
      }
    } else {
      const { data: courseModule } = await db
        .from('course_modules')
        .select('course_id')
        .eq('id', scopeId)
        .maybeSingle();
      if (courseModule?.course_id) {
        try {
          const { emitLMSEvent } = await import('../../../libs/core/src/events/lms-event-bus');
          await emitLMSEvent(result.passed ? 'quiz_passed' : 'quiz_failed', {
            workspaceId,
            contactId: attempt.student_id,
            courseId: courseModule.course_id,
            moduleId: scopeId,
            metadata: { score: result.score, maxScore: result.maxScore, quizScope: 'module', reviewed: true },
          });
        } catch (evtErr) {
          logger.error({ err: evtErr, attemptId: input.attemptId }, 'quiz.manual_review.lms_event.failed');
        }
      }
    }

    return { success: true, score: result.score, passed: result.passed, maxScore: result.maxScore };
  } catch (error: any) {
    logger.error({ err: error }, 'quiz.manual_review.grade.failed');
    return { error: 'Failed to save the review.' };
  }
}
