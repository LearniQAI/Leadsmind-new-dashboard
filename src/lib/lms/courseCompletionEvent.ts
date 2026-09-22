import type { createAdminClient } from '@/lib/supabase/server';
import { getCourseCompletionStatus } from './courseCompletion';
import { logger } from '@/shared/logger';

type Db = ReturnType<typeof createAdminClient>;

/**
 * The single trigger point for the `course_completed` event (Batch 4 / fix 3).
 *
 * Before this, `course_completed` fired on a plain lesson-count equality computed inline in
 * completeLesson.ts — looser than, and independently drifting from, the real completion
 * definition the certificate route uses (courseCompletion.ts, Batch 3 / fix 1: lesson AND
 * module quizzes passed, required assignments graded 'passed', draft/coming_soon/inactive
 * content excluded). A student could hit the old lesson-count match — and so fire the event,
 * and any certificate/notification automation chained off it — without actually qualifying for
 * a certificate.
 *
 * This now calls the exact same evaluateCourseCompletion() the certificate route calls, so
 * "course completed" and "certificate eligible" become true at the same moment, not just
 * eventually consistent with each other.
 *
 * Completion can now be reached from more than one place — a lesson completing, a lesson- or
 * module-quiz pass, or an assignment being graded 'passed' — so this is called from all of
 * those, not only from completeLesson.ts. `enrollments.course_completed_at` is the fire-once
 * guard: an atomic conditional UPDATE (`IS NULL`) makes it safe if two of those land at once.
 */
export async function maybeFireCourseCompleted(
  db: Db,
  workspaceId: string,
  contactId: string,
  courseId: string
): Promise<void> {
  try {
    const { data: enrollment } = await db
      .from('enrollments')
      .select('id, course_completed_at')
      .eq('contact_id', contactId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (!enrollment || enrollment.course_completed_at) return;

    const status = await getCourseCompletionStatus(db, contactId, courseId);
    if (!status.complete) return;

    // Atomic claim — whoever's UPDATE actually matches a NULL row is the one real firer.
    const { data: claimed } = await db
      .from('enrollments')
      .update({ course_completed_at: new Date().toISOString() })
      .eq('id', enrollment.id)
      .is('course_completed_at', null)
      .select('id')
      .maybeSingle();

    if (!claimed) return;

    const { publishEvent } = await import('@/lib/events/EventBus');
    const { emitLMSEvent } = await import('../../../libs/core/src/events/lms-event-bus');
    await publishEvent(workspaceId, 'course_completed', contactId, { courseId });
    await emitLMSEvent('course_completed', { workspaceId, contactId, courseId });
  } catch (err) {
    logger.error({ err, workspaceId, contactId, courseId }, 'lms.course_completed_event.failed');
  }
}
