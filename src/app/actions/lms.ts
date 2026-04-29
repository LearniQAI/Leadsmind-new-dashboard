'use server';

import { createServerClient } from '@/lib/supabase/server';

/**
 * Enrolls a student in a course.
 */
export async function enrollStudent(courseId: string, studentId: string) {
  try {
    const supabase = await createServerClient();
    
    const { error } = await supabase
      .from('course_enrollments')
      .upsert({
        course_id: courseId,
        student_id: studentId,
        status: 'active',
        enrolled_at: new Date().toISOString()
      });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('[lms] Enrollment error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Updates progress for a student in a specific lesson.
 */
export async function updateProgress(studentId: string, lessonId: string, completed: boolean, progress: number = 0) {
  try {
    const supabase = await createServerClient();
    
    // In a real app, we'd find the enrollment ID first, but for automation 
    // we can use the student/contact ID directly if the schema allows.
    const { error } = await supabase
      .from('lesson_progress')
      .upsert({
        student_id: studentId,
        lesson_id: lessonId,
        progress_percentage: completed ? 100 : progress,
        completed_at: completed ? new Date().toISOString() : null,
        last_accessed_at: new Date().toISOString()
      });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('[lms] Progress update error:', error);
    return { success: false, error: error.message };
  }
}
