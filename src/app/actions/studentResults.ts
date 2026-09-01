'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { getStudentContactIds } from './studentEnrollments';
import { logger } from '@/shared/logger';

export interface QuizHistoryItem {
  id: string;
  kind: 'lesson' | 'module';
  title: string;
  courseTitle: string | null;
  courseId: string | null;
  scorePct: number;
  passed: boolean;
  submittedAt: string;
}

export interface AssignmentStatusItem {
  id: string;
  lessonTitle: string;
  courseTitle: string | null;
  courseId: string | null;
  lessonId: string | null;
  status: 'pending' | 'passed' | 'failed';
  hasFeedback: boolean;
  submittedAt: string;
  gradedAt: string | null;
}

const uniq = <T,>(a: T[]): T[] => Array.from(new Set(a));

/**
 * Everything the student "My Results" page shows beyond the per-course progress summary
 * (that comes from getEnrolledCoursesWithProgress): a combined lesson+module quiz history and
 * a cross-course assignment status list. All keyed on the student's contact id(s) across
 * every workspace, same as the dashboard.
 *
 * lesson_id / module_id on the attempt tables are nullable FKs (ON DELETE SET NULL) — a quiz
 * whose lesson/module was deleted still shows in history as a real past result, just without
 * a live title/course link.
 */
export async function getStudentResults(): Promise<{
  data: { quizHistory: QuizHistoryItem[]; assignments: AssignmentStatusItem[] };
}> {
  const empty = { data: { quizHistory: [], assignments: [] } };
  try {
    const contactIds = await getStudentContactIds();
    if (contactIds.length === 0) return empty;

    const db = createAdminClient();

    const [laRes, maRes, asRes] = await Promise.all([
      db.from('quiz_attempts')
        .select('id, lesson_id, percentage, score, passed, submitted_at')
        .in('student_id', contactIds),
      db.from('module_quiz_attempts')
        .select('id, module_id, percentage, score, passed, submitted_at')
        .in('student_id', contactIds),
      db.from('lms_assignment_submissions')
        .select('id, lesson_id, course_id, grade_status, feedback_comments, submitted_at, graded_at')
        .in('contact_id', contactIds),
    ]);

    const lessonAttempts = laRes.data || [];
    const moduleAttempts = maRes.data || [];
    const assignmentRows = asRes.data || [];

    const lessonIds = uniq(
      [...lessonAttempts.map((a: any) => a.lesson_id), ...assignmentRows.map((a: any) => a.lesson_id)].filter(Boolean)
    );
    const moduleIds = uniq(moduleAttempts.map((a: any) => a.module_id).filter(Boolean));

    const [lessonsRes, modulesRes] = await Promise.all([
      lessonIds.length
        ? db.from('course_lessons').select('id, title, course_id').in('id', lessonIds)
        : Promise.resolve({ data: [] as any[] }),
      moduleIds.length
        ? db.from('course_modules').select('id, title, course_id').in('id', moduleIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const lessonById = new Map((lessonsRes.data || []).map((l: any) => [l.id, l]));
    const moduleById = new Map((modulesRes.data || []).map((m: any) => [m.id, m]));

    const courseIds = uniq(
      [
        ...[...lessonById.values()].map((l: any) => l.course_id),
        ...[...moduleById.values()].map((m: any) => m.course_id),
        ...assignmentRows.map((a: any) => a.course_id),
      ].filter(Boolean)
    );
    const coursesRes = courseIds.length
      ? await db.from('courses').select('id, title').in('id', courseIds)
      : { data: [] as any[] };
    const courseById = new Map((coursesRes.data || []).map((c: any) => [c.id, c]));

    const quizHistory: QuizHistoryItem[] = [
      ...lessonAttempts.map((a: any): QuizHistoryItem => {
        const l = a.lesson_id ? lessonById.get(a.lesson_id) : null;
        const c = l?.course_id ? courseById.get(l.course_id) : null;
        return {
          id: a.id,
          kind: 'lesson',
          title: l?.title || 'Removed lesson quiz',
          courseTitle: c?.title ?? null,
          courseId: l?.course_id ?? null,
          scorePct: Math.round(Number(a.percentage ?? a.score ?? 0)),
          passed: !!a.passed,
          submittedAt: a.submitted_at,
        };
      }),
      ...moduleAttempts.map((a: any): QuizHistoryItem => {
        const m = a.module_id ? moduleById.get(a.module_id) : null;
        const c = m?.course_id ? courseById.get(m.course_id) : null;
        return {
          id: a.id,
          kind: 'module',
          title: m?.title ? `${m.title} — module quiz` : 'Removed module quiz',
          courseTitle: c?.title ?? null,
          courseId: m?.course_id ?? null,
          scorePct: Math.round(Number(a.percentage ?? a.score ?? 0)),
          passed: !!a.passed,
          submittedAt: a.submitted_at,
        };
      }),
    ].sort((x, y) => new Date(y.submittedAt).getTime() - new Date(x.submittedAt).getTime());

    const assignments: AssignmentStatusItem[] = assignmentRows
      .map((a: any): AssignmentStatusItem => {
        const l = a.lesson_id ? lessonById.get(a.lesson_id) : null;
        const c = a.course_id ? courseById.get(a.course_id) : null;
        const gs = String(a.grade_status || '').toLowerCase();
        return {
          id: a.id,
          lessonTitle: l?.title || 'Assignment',
          courseTitle: c?.title ?? null,
          courseId: a.course_id ?? null,
          lessonId: a.lesson_id ?? null,
          status: gs === 'passed' ? 'passed' : gs === 'failed' ? 'failed' : 'pending',
          hasFeedback: !!a.feedback_comments,
          submittedAt: a.submitted_at,
          gradedAt: a.graded_at ?? null,
        };
      })
      .sort((x, y) => new Date(y.submittedAt).getTime() - new Date(x.submittedAt).getTime());

    return { data: { quizHistory, assignments } };
  } catch (err) {
    logger.error({ err }, 'student_results.fetch.failed');
    return empty;
  }
}
