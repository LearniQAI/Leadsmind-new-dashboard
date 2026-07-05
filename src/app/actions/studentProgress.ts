'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getUser, getCurrentWorkspaceId } from '@/lib/auth';
import { getOrCreateStudentContact } from './studentEnrollments';
import { logger } from '@/shared/logger';

/**
 * Marks a lesson complete for the student.
 */
export async function markLessonComplete(courseId: string, lessonId: string) {
  try {
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace context' };

    const contactId = await getOrCreateStudentContact(workspaceId);
    if (!contactId) return { error: 'Failed to resolve student contact' };

    const adminClient = createAdminClient();

    // Check if already completed using admin client to bypass RLS
    const { data: existing } = await adminClient
      .from('course_progress')
      .select('id')
      .eq('contact_id', contactId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (existing) {
      return { success: true };
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

    // Hook telemetry triggers
    try {
      const { emitLMSEvent } = await import('../../../libs/core/src/events/lms-event-bus');
      await emitLMSEvent('lesson.completed', {
        workspaceId,
        contactId,
        courseId,
        lessonId
      });

      // Check if module is completed
      const { data: lesson } = await adminClient
        .from('course_lessons')
        .select('module_id')
        .eq('id', lessonId)
        .single();

      if (lesson?.module_id) {
        const { data: moduleLessons } = await adminClient
          .from('course_lessons')
          .select('id')
          .eq('module_id', lesson.module_id);

        const { data: completedLessons } = await adminClient
          .from('course_progress')
          .select('lesson_id')
          .eq('contact_id', contactId)
          .eq('course_id', courseId)
          .in('lesson_id', (moduleLessons || []).map(l => l.id));

        if (completedLessons && completedLessons.length === moduleLessons?.length) {
          await emitLMSEvent('section.completed', {
            workspaceId,
            contactId,
            courseId,
            moduleId: lesson.module_id
          });
        }
      }

      // Check if course is completed
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
        await emitLMSEvent('course.completed', {
          workspaceId,
          contactId,
          courseId
        });
      }
    } catch (telemetryErr) {
      logger.error({ err: telemetryErr, workspaceId, contactId, courseId }, 'student_progress.telemetry_hook.failed');
    }

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

    // Evaluate student struggle profile in background
    try {
      const { evaluateStudentStruggle } = await import('../../../libs/core/src/analytics/struggle-processor');
      await evaluateStudentStruggle(contactId, courseId, workspaceId);
    } catch (struggleErr) {
      logger.error({ err: struggleErr, workspaceId, contactId, courseId }, 'student_progress.struggle_processor.failed');
    }

    return { success: true, progressPercentage: percentage };
  } catch (err: any) {
    logger.error({ err, courseId, lessonId }, 'student_progress.mark_lesson_complete.failed');
    return { error: 'Failed to mark lesson complete.' };
  }
}

/**
 * Marks a lesson incomplete by removing the progress record.
 */
export async function markLessonIncomplete(courseId: string, lessonId: string) {
  try {
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace context' };

    const contactId = await getOrCreateStudentContact(workspaceId);
    if (!contactId) return { error: 'Failed to resolve student contact' };

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
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace context' };

    const contactId = await getOrCreateStudentContact(workspaceId);
    if (!contactId) return { data: [] };

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
 */
export async function submitQuizAttempt(payload: {
  courseId: string;
  lessonId: string;
  score: number;
  passed: boolean;
  answers: any;
}) {
  try {
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace context' };

    const contactId = await getOrCreateStudentContact(workspaceId);
    if (!contactId) return { error: 'Failed to resolve student contact' };

    const adminClient = createAdminClient();

    // 1. Insert quiz attempt using admin client to bypass RLS
    const { error: attemptErr } = await adminClient
      .from('quiz_attempts')
      .insert({
        workspace_id: workspaceId,
        lesson_id: payload.lessonId,
        student_id: contactId,
        score: payload.score,
        passed: payload.passed,
        answers: payload.answers
      });

    if (attemptErr) throw attemptErr;

    // 2. If passed, mark lesson complete in course_progress
    if (payload.passed) {
      await markLessonComplete(payload.courseId, payload.lessonId);
    }

    // Evaluate student struggle profile in background
    try {
      const { evaluateStudentStruggle } = await import('../../../libs/core/src/analytics/struggle-processor');
      await evaluateStudentStruggle(contactId, payload.courseId, workspaceId);
    } catch (struggleErr) {
      logger.error({ err: struggleErr, workspaceId, contactId, courseId: payload.courseId }, 'student_progress.struggle_processor.failed');
    }

    return { success: true };
  } catch (err: any) {
    logger.error({ err, courseId: payload.courseId, lessonId: payload.lessonId }, 'student_progress.quiz_attempt.submit.failed');
    return { error: 'Failed to submit quiz attempt.' };
  }
}
