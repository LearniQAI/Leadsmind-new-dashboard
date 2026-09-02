'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { logger } from '@/shared/logger';
import { toClientError } from '@/shared/errors/AppError';

// Batch 6 (G9) — real course categories. Flat, workspace-scoped, single-category-per-course
// (see migration 20260903000028_course_categories.sql for the schema + scope decision).

export interface CourseCategory {
  id: string;
  name: string;
  color: string;
  position: number;
}

/** List the current workspace's categories, ordered for display. Admin-side (course settings). */
export async function getWorkspaceCourseCategories(): Promise<
  { data: CourseCategory[] } | { error: string }
> {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const db = createAdminClient();

    const { data, error } = await db
      .from('course_categories')
      .select('id, name, color, position')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return { data: data || [] };
  } catch (err: any) {
    logger.error({ err }, 'course_categories.list.failed');
    const clientError = toClientError(err);
    return { error: clientError.error };
  }
}

export async function createCourseCategory(input: {
  name: string;
  color?: string;
}): Promise<{ data: CourseCategory } | { error: string }> {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const db = createAdminClient();

    const name = (input.name || '').trim();
    if (!name) return { error: 'Category name is required.' };
    if (name.length > 60) return { error: 'Category name must be 60 characters or fewer.' };

    const color = /^#[0-9a-fA-F]{6}$/.test(input.color || '') ? input.color! : '#0284c7';

    const { count } = await db
      .from('course_categories')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    const { data, error } = await db
      .from('course_categories')
      .insert({ workspace_id: workspaceId, name, color, position: count || 0 })
      .select('id, name, color, position')
      .single();

    if (error) {
      if (error.code === '23505') return { error: 'A category with this name already exists.' };
      throw error;
    }
    return { data };
  } catch (err: any) {
    logger.error({ err }, 'course_categories.create.failed');
    const clientError = toClientError(err);
    return { error: clientError.error };
  }
}

/** Deleting a category never deletes or hides its courses — ON DELETE SET NULL, they just
 *  become uncategorized again. */
export async function deleteCourseCategory(categoryId: string): Promise<{ success: true } | { error: string }> {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const db = createAdminClient();

    const { error } = await db
      .from('course_categories')
      .delete()
      .eq('id', categoryId)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    logger.error({ err, categoryId }, 'course_categories.delete.failed');
    const clientError = toClientError(err);
    return { error: clientError.error };
  }
}
