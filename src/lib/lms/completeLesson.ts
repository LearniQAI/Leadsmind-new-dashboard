import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';
import { isEnrolmentActive } from '@/lib/lms/enrolment';
import { getBlockIdsForLesson } from '@/lib/lms/lessonBlockTree';

// Core "mark a lesson complete" logic, taking an already-resolved/validated contactId rather
// than resolving it from the current session — this is deliberately NOT a 'use server' export
// (which would let any client call it with an arbitrary contactId and complete lessons for
// other students). It exists so every real completion path (the student's own session via
// markLessonComplete, and server-validated paths like the remedial-assignment grading route
// that already knows which contact it graded) shares one implementation of the per-block
// completion gate, rather than each duplicating — or forgetting — it.
export async function markLessonCompleteForContact(
  workspaceId: string,
  contactId: string,
  courseId: string,
  lessonId: string
): Promise<{ success: true; progressPercentage?: number } | { error: string }> {
  try {
    const adminClient = createAdminClient();

    const { data: existing } = await adminClient
      .from('course_progress')
      .select('id')
      .eq('contact_id', contactId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (existing) {
      return { success: true };
    }

    const { data: enrollment } = await adminClient
      .from('enrollments')
      .select('id, status, active')
      .eq('contact_id', contactId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (!enrollment) return { error: 'Not enrolled in this course' };
    if (!isEnrolmentActive(enrollment)) {
      return { error: 'Your enrolment in this course is no longer active.' };
    }

    const { data: lesson } = await adminClient
      .from('course_lessons')
      .select('id')
      .eq('id', lessonId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (!lesson) return { error: 'Lesson not found in this course' };

    // Phase C: a lesson built from content_blocks can only be marked complete once every
    // block has a real lesson_block_completions row for this student. Part 2: for a lesson
    // with a Lesson Builder canvas, "every block" means every block still actually placed on
    // the tree (see getBlockIdsForLesson) — not every content_blocks row that happens to
    // still exist for this lesson_id, which could include one orphaned by a bulk
    // Section/Row deletion that removed it from the canvas without deleting its row.
    const blockIds = await getBlockIdsForLesson(adminClient, lessonId);

    if (blockIds.length > 0) {
      const { data: completions } = await adminClient
        .from('lesson_block_completions')
        .select('content_block_id')
        .eq('contact_id', contactId)
        .in('content_block_id', blockIds);

      const completedCount = new Set((completions || []).map((c) => c.content_block_id)).size;
      if (completedCount < blockIds.length) {
        return { error: `Complete every block in this lesson first (${completedCount}/${blockIds.length} done)` };
      }
    } else {
      const { data: quizQuestions } = await adminClient
        .from('quiz_questions')
        .select('id')
        .eq('lesson_id', lessonId)
        .limit(1);

      if (quizQuestions && quizQuestions.length > 0) {
        const { data: passedAttempt } = await adminClient
          .from('quiz_attempts')
          .select('id')
          .eq('student_id', contactId)
          .eq('lesson_id', lessonId)
          .eq('passed', true)
          .maybeSingle();

        if (!passedAttempt) return { error: 'This lesson requires passing its quiz first' };
      }
    }

    const { error } = await adminClient
      .from('course_progress')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        course_id: courseId,
        lesson_id: lessonId
      });

    if (error) throw error;

    try {
      const { publishEvent } = await import('@/lib/events/EventBus');
      await publishEvent(workspaceId, 'lesson_completed', contactId, { courseId, lessonId });

      const { data: lessonRow } = await adminClient
        .from('course_lessons')
        .select('module_id')
        .eq('id', lessonId)
        .single();

      if (lessonRow?.module_id) {
        const { data: moduleLessons } = await adminClient
          .from('course_lessons')
          .select('id')
          .eq('module_id', lessonRow.module_id);

        const { data: completedLessons } = await adminClient
          .from('course_progress')
          .select('lesson_id')
          .eq('contact_id', contactId)
          .eq('course_id', courseId)
          .in('lesson_id', (moduleLessons || []).map((l) => l.id));

        if (completedLessons && completedLessons.length === moduleLessons?.length) {
          await publishEvent(workspaceId, 'module_completed', contactId, { courseId, moduleId: lessonRow.module_id });
        }
      }

      const { data: allCourseLessons } = await adminClient
        .from('course_lessons')
        .select('id')
        .eq('course_id', courseId);

      const { data: allCompletedCourseLessons } = await adminClient
        .from('course_progress')
        .select('lesson_id')
        .eq('contact_id', contactId)
        .eq('course_id', courseId);

      if (allCompletedCourseLessons && allCompletedCourseLessons.length === allCourseLessons?.length) {
        await publishEvent(workspaceId, 'course_completed', contactId, { courseId });
      }
    } catch (telemetryErr) {
      logger.error({ err: telemetryErr, workspaceId, contactId, courseId }, 'complete_lesson.telemetry_hook.failed');
    }

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

    try {
      const { evaluateStudentStruggle } = await import('../../../libs/core/src/analytics/struggle-processor');
      await evaluateStudentStruggle(contactId, courseId, workspaceId);
    } catch (struggleErr) {
      logger.error({ err: struggleErr, workspaceId, contactId, courseId }, 'complete_lesson.struggle_processor.failed');
    }

    return { success: true, progressPercentage: percentage };
  } catch (err: any) {
    logger.error({ err, workspaceId, contactId, courseId, lessonId }, 'complete_lesson.failed');
    return { error: 'Failed to mark lesson complete.' };
  }
}
