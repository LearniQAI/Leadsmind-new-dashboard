'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';

// Task 54: Add course categories
export async function getCourseCategories() {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('course_categories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true });

    if (error) {
      // If the table doesn't exist yet, return an empty array gracefully
      return { success: true, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    logger.error({ err: error }, 'lms.categories.fetch_failed');
    return { success: false, error: 'Failed to load course categories.' };
  }
}

export async function createCourseCategory(name: string, description?: string) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('course_categories')
      .insert({
        workspace_id: workspaceId,
        name: name,
        description: description || null
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    logger.error({ err: error, categoryName: name }, 'lms.categories.create_failed');
    return { success: false, error: 'Failed to create category.' };
  }
}

export async function assignCourseCategory(courseId: string, categoryId: string) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('courses')
      .update({ category_id: categoryId })
      .eq('id', courseId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    logger.error({ err: error, courseId, categoryId }, 'lms.categories.assign_failed');
    return { success: false, error: 'Failed to assign category to course.' };
  }
}
