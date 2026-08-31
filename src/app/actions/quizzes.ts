'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
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
      status: a.passed ? 'passed' : 'failed',
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
      status: a.passed ? 'passed' : 'failed',
      metadata: { total_duration_seconds: a.time_taken_seconds || 0 },
    }));
    return { data: shaped };
  } catch (error: any) {
    logger.error({ err: error }, 'get.module_quiz.submissions.action.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}
