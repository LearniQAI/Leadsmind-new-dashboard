'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';

// Task 51: Build a true "Cohort" grouping for courses
export async function createCourseCohort(courseId: string, name: string, startDate?: string, endDate?: string) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('course_cohorts')
      .insert({
        workspace_id: workspaceId,
        course_id: courseId,
        name: name,
        start_date: startDate || null,
        end_date: endDate || null
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    logger.error({ err: error, courseId, name }, 'lms.cohorts.create_failed');
    return { success: false, error: 'Failed to create cohort.' };
  }
}

export async function assignStudentToCohort(cohortId: string, studentId: string) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    // 1. Assign student to cohort
    const { data, error } = await supabase
      .from('cohort_students')
      .insert({
        cohort_id: cohortId,
        student_id: studentId
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Automatically enroll them in the Course
    const { data: cohort } = await supabase.from('course_cohorts').select('course_id').eq('id', cohortId).single();
    if (cohort) {
      await supabase
        .from('student_portal_assignments')
        .insert({
          student_id: studentId,
          course_id: cohort.course_id,
          assigned_by: workspaceId 
        });
    }

    return { success: true, data };
  } catch (error: any) {
    logger.error({ err: error, cohortId, studentId }, 'lms.cohorts.assign_student_failed');
    return { success: false, error: 'Failed to assign student to cohort.' };
  }
}

export async function getCourseCohorts(courseId: string) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('course_cohorts')
      .select('*, cohort_students(count)')
      .eq('workspace_id', workspaceId)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (error) return { success: true, data: [] };
    return { success: true, data: data || [] };
  } catch (error: any) {
    logger.error({ err: error }, 'lms.cohorts.fetch_failed');
    return { success: false, error: 'Failed to load cohorts.' };
  }
}
