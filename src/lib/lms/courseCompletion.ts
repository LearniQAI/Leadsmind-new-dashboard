import type { createAdminClient } from '@/lib/supabase/server';

// Single definition of "this student has genuinely completed this course" for CERTIFICATE issuance,
// shared by the download route and the assign_certificate automation (Batch 3 / fix 1).
//
// Requirements — all must hold:
//   1. every lesson in a REQUIRED module is complete. "Required" is is_active AND
//      publish_status NOT IN ('coming_soon', 'draft'). 'coming_soon' is genuinely locked to
//      students (lock-utils.ts); 'draft', by contrast, is NOT locked in the player today —
//      lock-utils only special-cases 'coming_soon', so a student CAN open and complete a draft
//      module's lessons. It is excluded here anyway, by policy (Batch 4 / fix 1): a course's
//      certificate requirement shouldn't be held hostage by an instructor's in-progress draft
//      content, even though a student who does finish it isn't penalized for it either (its
//      lessons still count toward `completedLessonIds` if genuinely done — they're just not
//      REQUIRED). Confirmed live: 'draft' and 'published' are the only publish_status values in
//      use today; 'coming_soon' has real code support but 0 live rows.
//   2. every visible lesson that has quiz questions has a PASSED lesson-quiz attempt.
//   3. every visible module that has module-quiz questions has a PASSED module-quiz attempt
//      (a 'pending_review' attempt has passed = null and does not count).
//   4. every visible lesson containing an assignment block has an assignment submission whose
//      grade_status is 'passed' (submitted-but-ungraded or failed does not count).
//
// NOTE: modules with required_for_completion = false are still counted here (the spec is "all
// active lessons"). That flag today only drives sequential unlock in lock-utils.

type Db = ReturnType<typeof createAdminClient>;

export interface CompletionInput {
  modules: { id: string; is_active: boolean | null; publish_status: string | null }[];
  lessons: { id: string; module_id: string | null; is_active: boolean | null }[];
  completedLessonIds: string[];
  lessonIdsWithQuiz: string[];
  passedLessonQuizIds: string[];
  moduleIdsWithQuiz: string[];
  passedModuleQuizIds: string[];
  lessonIdsWithAssignment: string[];
  passedAssignmentLessonIds: string[];
}

export interface CompletionStatus {
  complete: boolean;
  totals: { lessons: number; lessonQuizzes: number; moduleQuizzes: number; assignments: number };
  missing: { lessons: number; lessonQuizzes: number; moduleQuizzes: number; assignments: number };
  /** Human-readable reason, null when complete. */
  reason: string | null;
}

export function evaluateCourseCompletion(input: CompletionInput): CompletionStatus {
  const HIDDEN_MODULE_STATUSES = new Set(['coming_soon', 'draft']);
  const visibleModules = new Map(
    input.modules
      .filter((m) => m.is_active !== false && !HIDDEN_MODULE_STATUSES.has(m.publish_status || ''))
      .map((m) => [m.id, m])
  );
  const visibleLessons = input.lessons.filter(
    (l) => l.is_active !== false && (l.module_id === null || visibleModules.has(l.module_id))
  );
  const visibleLessonIds = new Set(visibleLessons.map((l) => l.id));

  const done = new Set(input.completedLessonIds);
  const missingLessons = visibleLessons.filter((l) => !done.has(l.id)).length;

  const quizLessons = input.lessonIdsWithQuiz.filter((id) => visibleLessonIds.has(id));
  const passedLessonQuiz = new Set(input.passedLessonQuizIds);
  const missingLessonQuizzes = quizLessons.filter((id) => !passedLessonQuiz.has(id)).length;

  const quizModules = input.moduleIdsWithQuiz.filter((id) => visibleModules.has(id));
  const passedModuleQuiz = new Set(input.passedModuleQuizIds);
  const missingModuleQuizzes = quizModules.filter((id) => !passedModuleQuiz.has(id)).length;

  const assignmentLessons = input.lessonIdsWithAssignment.filter((id) => visibleLessonIds.has(id));
  const passedAssignments = new Set(input.passedAssignmentLessonIds);
  const missingAssignments = assignmentLessons.filter((id) => !passedAssignments.has(id)).length;

  const totals = {
    lessons: visibleLessons.length,
    lessonQuizzes: quizLessons.length,
    moduleQuizzes: quizModules.length,
    assignments: assignmentLessons.length,
  };
  const missing = {
    lessons: missingLessons,
    lessonQuizzes: missingLessonQuizzes,
    moduleQuizzes: missingModuleQuizzes,
    assignments: missingAssignments,
  };

  let reason: string | null = null;
  if (totals.lessons === 0) {
    reason = 'This course has no lessons to complete.';
  } else if (missingLessons > 0) {
    reason = `Course not fully completed yet (${totals.lessons - missingLessons}/${totals.lessons} lessons).`;
  } else if (missingLessonQuizzes > 0) {
    reason = 'Course not fully completed yet — one or more lesson quizzes have not been passed.';
  } else if (missingModuleQuizzes > 0) {
    reason = 'Course not fully completed yet — one or more module quizzes have not been passed.';
  } else if (missingAssignments > 0) {
    reason = 'Course not fully completed yet — one or more assignments have not been graded as passed.';
  }

  return { complete: reason === null, totals, missing, reason };
}

/** Loads everything evaluateCourseCompletion needs for one student + course (service-role client). */
export async function getCourseCompletionStatus(
  db: Db,
  contactId: string,
  courseId: string
): Promise<CompletionStatus> {
  const [modulesRes, lessonsRes, progressRes] = await Promise.all([
    db.from('course_modules').select('id, is_active, publish_status').eq('course_id', courseId),
    db.from('course_lessons').select('id, module_id, is_active').eq('course_id', courseId),
    db
      .from('course_progress')
      .select('lesson_id')
      .eq('contact_id', contactId)
      .eq('course_id', courseId)
      .not('completed_at', 'is', null),
  ]);
  for (const r of [modulesRes, lessonsRes, progressRes]) if (r.error) throw r.error;

  const modules = modulesRes.data || [];
  const lessons = lessonsRes.data || [];
  const lessonIds = lessons.map((l: any) => l.id);
  const moduleIds = modules.map((m: any) => m.id);

  // .in() with an empty list is a PostgREST error — short-circuit to empty results.
  const inOrEmpty = async (run: (ids: string[]) => PromiseLike<{ data: any[] | null; error: any }>, ids: string[]) =>
    ids.length === 0 ? [] : (await run(ids).then((r) => { if (r.error) throw r.error; return r.data || []; }));

  const [lessonQuizQ, lessonQuizPassed, moduleQuizQ, moduleQuizPassed, assignmentBlocks, assignmentPassed] =
    await Promise.all([
      inOrEmpty((ids) => db.from('quiz_questions').select('lesson_id').in('lesson_id', ids), lessonIds),
      inOrEmpty(
        (ids) => db.from('quiz_attempts').select('lesson_id').eq('student_id', contactId).eq('passed', true).in('lesson_id', ids),
        lessonIds
      ),
      inOrEmpty((ids) => db.from('module_quiz_questions').select('module_id').in('module_id', ids), moduleIds),
      inOrEmpty(
        (ids) => db.from('module_quiz_attempts').select('module_id').eq('student_id', contactId).eq('passed', true).in('module_id', ids),
        moduleIds
      ),
      inOrEmpty((ids) => db.from('content_blocks').select('lesson_id').eq('type', 'assignment').in('lesson_id', ids), lessonIds),
      inOrEmpty(
        (ids) =>
          db.from('lms_assignment_submissions').select('lesson_id').eq('contact_id', contactId).eq('grade_status', 'passed').in('lesson_id', ids),
        lessonIds
      ),
    ]);

  const uniq = (rows: any[], key: string) => Array.from(new Set(rows.map((r) => r[key])));

  return evaluateCourseCompletion({
    modules: modules as any,
    lessons: lessons as any,
    completedLessonIds: (progressRes.data || []).map((p: any) => p.lesson_id),
    lessonIdsWithQuiz: uniq(lessonQuizQ, 'lesson_id'),
    passedLessonQuizIds: uniq(lessonQuizPassed, 'lesson_id'),
    moduleIdsWithQuiz: uniq(moduleQuizQ, 'module_id'),
    passedModuleQuizIds: uniq(moduleQuizPassed, 'module_id'),
    lessonIdsWithAssignment: uniq(assignmentBlocks, 'lesson_id'),
    passedAssignmentLessonIds: uniq(assignmentPassed, 'lesson_id'),
  });
}
