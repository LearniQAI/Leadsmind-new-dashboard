'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getUser, getCurrentWorkspaceId } from '@/lib/auth';
import { getOrCreateStudentContact } from './studentEnrollments';

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

    const supabase = await createServerClient();

    // Check if already completed
    const { data: existing } = await supabase
      .from('course_progress')
      .select('id')
      .eq('contact_id', contactId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (existing) {
      return { success: true };
    }

    const { error } = await supabase
      .from('course_progress')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        course_id: courseId,
        lesson_id: lessonId
      });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
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

    const supabase = await createServerClient();

    const { error } = await supabase
      .from('course_progress')
      .delete()
      .eq('contact_id', contactId)
      .eq('lesson_id', lessonId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
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

    const supabase = await createServerClient();
    const { data: progressList, error } = await supabase
      .from('course_progress')
      .select('lesson_id')
      .eq('contact_id', contactId)
      .eq('course_id', courseId);

    if (error) throw error;
    return { data: (progressList || []).map((p: any) => p.lesson_id) };
  } catch (err: any) {
    return { error: err.message };
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

    const supabase = await createServerClient();

    // 1. Insert quiz attempt
    const { error: attemptErr } = await supabase
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

    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
