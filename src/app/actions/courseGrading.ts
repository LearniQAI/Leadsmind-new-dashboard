'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { logger } from '@/shared/logger';
import { toClientError } from '@/shared/errors/AppError';

// Batch 8 (G12) — the admin-facing half of the same real "needs attention" data already
// assembled for the student My Work view (studentPendingWork.ts), just workspace-scoped
// instead of contact-scoped: a single cross-course queue instead of the two separate places
// (CourseSubmissionsTab per course, QuizAnalyticsConsole per quiz) an instructor previously
// had to check individually — confirmed there was no unified queue before this batch.
//
// Grading itself is NOT duplicated here — this only enumerates real pending rows; the actual
// grade action stays exactly where it already lives (PATCH /api/lms/assignments for
// assignments, gradeQuizAttemptManualReview for quiz attempts), reached via the real deep
// link into the course's Submissions tab / the quiz's Results tab.

export interface GradingQueueItem {
  id: string;
  kind: 'assignment' | 'lesson_quiz' | 'module_quiz';
  studentName: string;
  studentEmail: string | null;
  title: string;
  courseTitle: string;
  courseId: string;
  href: string;
  submittedAt: string | null;
}

export async function getWorkspacePendingGradingQueue(): Promise<
  { data: GradingQueueItem[] } | { error: string }
> {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const db = createAdminClient();

    const [assignmentsRes, laRes, maRes] = await Promise.all([
      db.from('lms_assignment_submissions')
        .select('id, lesson_id, course_id, contact_id, submitted_at')
        .eq('workspace_id', workspaceId)
        .eq('grade_status', 'pending'),
      db.from('quiz_attempts')
        .select('id, lesson_id, student_id, submitted_at')
        .eq('workspace_id', workspaceId)
        .eq('grade_status', 'pending_review'),
      db.from('module_quiz_attempts')
        .select('id, module_id, student_id, submitted_at')
        .eq('workspace_id', workspaceId)
        .eq('grade_status', 'pending_review'),
    ]);

    if (assignmentsRes.error) throw assignmentsRes.error;
    if (laRes.error) throw laRes.error;
    if (maRes.error) throw maRes.error;

    const assignments = assignmentsRes.data || [];
    const lessonAttempts = laRes.data || [];
    const moduleAttempts = maRes.data || [];

    const lessonIds = Array.from(
      new Set([...assignments.map((a: any) => a.lesson_id), ...lessonAttempts.map((a: any) => a.lesson_id)].filter(Boolean)),
    );
    const moduleIds = Array.from(new Set(moduleAttempts.map((a: any) => a.module_id).filter(Boolean)));
    const contactIds = Array.from(
      new Set(
        [...assignments.map((a: any) => a.contact_id), ...lessonAttempts.map((a: any) => a.student_id), ...moduleAttempts.map((a: any) => a.student_id)].filter(
          Boolean,
        ),
      ),
    );

    const [lessonsRes, modulesRes, contactsRes] = await Promise.all([
      lessonIds.length
        ? db.from('course_lessons').select('id, title, course_id').in('id', lessonIds)
        : Promise.resolve({ data: [] as any[] }),
      moduleIds.length
        ? db.from('course_modules').select('id, title, course_id').in('id', moduleIds)
        : Promise.resolve({ data: [] as any[] }),
      contactIds.length
        ? db.from('contacts').select('id, first_name, last_name, email').in('id', contactIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const lessonById = new Map((lessonsRes.data || []).map((l: any) => [l.id, l]));
    const moduleById = new Map((modulesRes.data || []).map((m: any) => [m.id, m]));
    const contactById = new Map((contactsRes.data || []).map((c: any) => [c.id, c]));

    const courseIds = Array.from(
      new Set(
        [
          ...[...lessonById.values()].map((l: any) => l.course_id),
          ...[...moduleById.values()].map((m: any) => m.course_id),
        ].filter(Boolean),
      ),
    );
    const coursesRes = courseIds.length
      ? await db.from('courses').select('id, title').in('id', courseIds)
      : { data: [] as any[] };
    const courseById = new Map((coursesRes.data || []).map((c: any) => [c.id, c]));

    const studentLabel = (contactId: string) => {
      const c = contactById.get(contactId);
      const name = c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : '';
      return { name: name || 'Student', email: c?.email ?? null };
    };

    const items: GradingQueueItem[] = [];

    for (const a of assignments) {
      const lesson = lessonById.get(a.lesson_id);
      if (!lesson) continue;
      const course = courseById.get(lesson.course_id);
      const student = studentLabel(a.contact_id);
      items.push({
        id: a.id,
        kind: 'assignment',
        studentName: student.name,
        studentEmail: student.email,
        title: lesson.title,
        courseTitle: course?.title ?? 'Course',
        courseId: lesson.course_id,
        href: `/courses/${lesson.course_id}?tab=settings&section=submissions`,
        submittedAt: a.submitted_at,
      });
    }

    for (const a of lessonAttempts) {
      const lesson = a.lesson_id ? lessonById.get(a.lesson_id) : null;
      if (!lesson) continue;
      const course = courseById.get(lesson.course_id);
      const student = studentLabel(a.student_id);
      items.push({
        id: a.id,
        kind: 'lesson_quiz',
        studentName: student.name,
        studentEmail: student.email,
        title: `${lesson.title} — quiz`,
        courseTitle: course?.title ?? 'Course',
        courseId: lesson.course_id,
        href: `/courses/${lesson.course_id}/quiz/${lesson.id}?tab=analytics`,
        submittedAt: a.submitted_at,
      });
    }

    for (const a of moduleAttempts) {
      const mod = a.module_id ? moduleById.get(a.module_id) : null;
      if (!mod) continue;
      const course = courseById.get(mod.course_id);
      const student = studentLabel(a.student_id);
      items.push({
        id: a.id,
        kind: 'module_quiz',
        studentName: student.name,
        studentEmail: student.email,
        title: `${mod.title} — module quiz`,
        courseTitle: course?.title ?? 'Course',
        courseId: mod.course_id,
        href: `/courses/${mod.course_id}/module-quiz/${mod.id}?tab=analytics`,
        submittedAt: a.submitted_at,
      });
    }

    items.sort((x, y) => new Date(x.submittedAt || 0).getTime() - new Date(y.submittedAt || 0).getTime());

    return { data: items };
  } catch (err: any) {
    logger.error({ err }, 'course_grading.pending_queue.fetch.failed');
    const clientError = toClientError(err);
    return { error: clientError.error };
  }
}
