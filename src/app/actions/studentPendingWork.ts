'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { getStudentContactIds } from './studentEnrollments';
import { isEnrolmentActive } from '@/lib/lms/enrolment';
import { logger } from '@/shared/logger';

// Batch 8 (G12) — a unified cross-course "what needs my attention" view. Reuses the same
// contact-resolution pattern as getStudentResults/getStudentFlashcardSets (every `contacts`
// row matching the logged-in user's email, across every workspace) rather than a second,
// separate lookup.
//
// STEP 0 findings this is built against:
//   - Assignment content_blocks have NO due-date field anywhere in their schema or admin
//     editor (confirmed: AssignmentBlockEditor only ever writes `content.instructions`).
//     "Not submitted" here means exactly that — not yet submitted — never "overdue". No
//     deadline feature exists to imply one.
//   - lms_assignment_submissions.grade_status: 'pending' | 'passed' | 'failed'.
//   - quiz_attempts / module_quiz_attempts.grade_status (Batch 2): 'auto' | 'pending_review'
//     | 'reviewed'. Only 'pending_review' (a quiz containing a file_upload question) and a
//     recently-'reviewed' one are real, actionable/visible states for this inbox — a plain
//     'auto' attempt is already fully resolved the instant it's submitted and has nothing to
//     wait on, so it does not appear here (it already shows in My Results' Quiz History).
//   - A failed quiz has no real "resubmit with revision" flow the way a failed assignment
//     does — retaking it is the existing attempt-limit / AI-remedial path, not a distinct
//     "needs revision" state. So `needsRevision` here is assignments only, by real design,
//     not an oversight.

const RECENT_GRADED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type PendingWorkStatus =
  | 'not_submitted'
  | 'awaiting_review'
  | 'needs_revision'
  | 'graded_passed'
  | 'graded_failed';

export interface PendingWorkItem {
  id: string;
  kind: 'assignment' | 'lesson_quiz' | 'module_quiz';
  status: PendingWorkStatus;
  title: string;
  courseTitle: string;
  courseId: string;
  href: string;
  feedback?: string | null;
  /** submitted_at / graded_at — whichever is most relevant to the status, for sorting/display. */
  timestamp: string | null;
}

const uniq = <T,>(a: T[]): T[] => Array.from(new Set(a));

export async function getStudentPendingWork(): Promise<{
  data: {
    notSubmitted: PendingWorkItem[];
    awaitingReview: PendingWorkItem[];
    needsRevision: PendingWorkItem[];
    recentlyGraded: PendingWorkItem[];
  };
}> {
  const empty = { data: { notSubmitted: [], awaitingReview: [], needsRevision: [], recentlyGraded: [] } };
  try {
    const contactIds = await getStudentContactIds();
    if (contactIds.length === 0) return empty;

    const db = createAdminClient();

    const { data: enrollments } = await db
      .from('enrollments')
      .select('course_id, status, active')
      .in('contact_id', contactIds);
    const activeCourseIds = uniq(
      (enrollments || []).filter((e: any) => isEnrolmentActive(e)).map((e: any) => e.course_id),
    );
    if (activeCourseIds.length === 0) return empty;

    const { data: courses } = await db.from('courses').select('id, title').in('id', activeCourseIds);
    const courseById = new Map((courses || []).map((c: any) => [c.id, c]));

    const [lessonsRes, modulesRes, submissionsRes, laRes, maRes] = await Promise.all([
      db.from('course_lessons').select('id, title, course_id').in('course_id', activeCourseIds).eq('is_active', true),
      db.from('course_modules').select('id, title, course_id').in('course_id', activeCourseIds),
      db.from('lms_assignment_submissions')
        .select('id, lesson_id, course_id, grade_status, feedback_comments, submitted_at, graded_at')
        .in('contact_id', contactIds),
      db.from('quiz_attempts')
        .select('id, lesson_id, grade_status, passed, submitted_at, graded_at')
        .in('student_id', contactIds)
        .in('grade_status', ['pending_review', 'reviewed']),
      db.from('module_quiz_attempts')
        .select('id, module_id, grade_status, passed, submitted_at, graded_at')
        .in('student_id', contactIds)
        .in('grade_status', ['pending_review', 'reviewed']),
    ]);

    const lessons = lessonsRes.data || [];
    const lessonById = new Map(lessons.map((l: any) => [l.id, l]));
    const moduleById = new Map((modulesRes.data || []).map((m: any) => [m.id, m]));

    const lessonIds = lessons.map((l: any) => l.id);
    const { data: assignmentBlocks } = lessonIds.length
      ? await db.from('content_blocks').select('id, lesson_id').eq('type', 'assignment').in('lesson_id', lessonIds)
      : { data: [] as any[] };

    const assignmentLessonIds = uniq((assignmentBlocks || []).map((b: any) => b.lesson_id));
    const submissionByLesson = new Map(
      (submissionsRes.data || []).map((s: any) => [s.lesson_id, s]),
    );

    const notSubmitted: PendingWorkItem[] = [];
    const awaitingReview: PendingWorkItem[] = [];
    const needsRevision: PendingWorkItem[] = [];
    const recentlyGraded: PendingWorkItem[] = [];

    const now = Date.now();
    const isRecent = (iso: string | null) =>
      !!iso && now - new Date(iso).getTime() <= RECENT_GRADED_WINDOW_MS;

    // Assignments — one real state per lesson (submissions are keyed unique(contact, lesson)).
    for (const lessonId of assignmentLessonIds) {
      const lesson = lessonById.get(lessonId);
      if (!lesson) continue;
      const course = courseById.get(lesson.course_id);
      const href = `/student/courses/${lesson.course_id}?lessonId=${lessonId}`;
      const base = {
        id: `assignment-${lessonId}`,
        kind: 'assignment' as const,
        title: lesson.title,
        courseTitle: course?.title ?? 'Course',
        courseId: lesson.course_id,
        href,
      };

      const sub = submissionByLesson.get(lessonId);
      if (!sub) {
        notSubmitted.push({ ...base, status: 'not_submitted', timestamp: null });
        continue;
      }
      const status = String(sub.grade_status || 'pending').toLowerCase();
      if (status === 'pending') {
        awaitingReview.push({ ...base, id: sub.id, status: 'awaiting_review', timestamp: sub.submitted_at });
      } else if (status === 'failed') {
        needsRevision.push({
          ...base,
          id: sub.id,
          status: 'needs_revision',
          timestamp: sub.graded_at || sub.submitted_at,
          feedback: sub.feedback_comments || null,
        });
      } else if (status === 'passed' && isRecent(sub.graded_at)) {
        recentlyGraded.push({
          ...base,
          id: sub.id,
          status: 'graded_passed',
          timestamp: sub.graded_at,
          feedback: sub.feedback_comments || null,
        });
      }
    }

    // Lesson-scoped quizzes with a real manual-review component (file_upload) — pending or
    // recently reviewed. A plain 'auto' quiz never appears here (already resolved instantly).
    for (const a of laRes.data || []) {
      const lesson = a.lesson_id ? lessonById.get(a.lesson_id) : null;
      if (!lesson) continue; // deleted lesson, or one from an inactive/other course — skip
      const course = courseById.get(lesson.course_id);
      const href = `/student/courses/${lesson.course_id}`;
      const base = {
        id: a.id,
        kind: 'lesson_quiz' as const,
        title: `${lesson.title} — quiz`,
        courseTitle: course?.title ?? 'Course',
        courseId: lesson.course_id,
        href,
      };
      if (a.grade_status === 'pending_review') {
        awaitingReview.push({ ...base, status: 'awaiting_review', timestamp: a.submitted_at });
      } else if (a.grade_status === 'reviewed' && isRecent(a.graded_at)) {
        recentlyGraded.push({
          ...base,
          status: a.passed ? 'graded_passed' : 'graded_failed',
          timestamp: a.graded_at,
        });
      }
    }

    // Module-scoped quizzes — same real shape, module_quiz_attempts.
    for (const a of maRes.data || []) {
      const mod = a.module_id ? moduleById.get(a.module_id) : null;
      if (!mod) continue;
      const course = courseById.get(mod.course_id);
      const href = `/student/courses/${mod.course_id}`;
      const base = {
        id: a.id,
        kind: 'module_quiz' as const,
        title: `${mod.title} — module quiz`,
        courseTitle: course?.title ?? 'Course',
        courseId: mod.course_id,
        href,
      };
      if (a.grade_status === 'pending_review') {
        awaitingReview.push({ ...base, status: 'awaiting_review', timestamp: a.submitted_at });
      } else if (a.grade_status === 'reviewed' && isRecent(a.graded_at)) {
        recentlyGraded.push({
          ...base,
          status: a.passed ? 'graded_passed' : 'graded_failed',
          timestamp: a.graded_at,
        });
      }
    }

    const byRecency = (arr: PendingWorkItem[]) =>
      arr.sort((x, y) => new Date(y.timestamp || 0).getTime() - new Date(x.timestamp || 0).getTime());

    return {
      data: {
        notSubmitted: byRecency(notSubmitted),
        awaitingReview: byRecency(awaitingReview),
        needsRevision: byRecency(needsRevision),
        recentlyGraded: byRecency(recentlyGraded),
      },
    };
  } catch (err) {
    logger.error({ err }, 'student_pending_work.fetch.failed');
    return empty;
  }
}
