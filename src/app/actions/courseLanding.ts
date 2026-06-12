'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { sanitizeSlug } from '@/lib/slug';

/**
 * Retrieves course landing page data including modules, lessons, and configurations.
 * Allows anonymous access if the course is published, or if preview is enabled.
 */
export async function getCourseLandingData(slugOrId: string, preview: boolean = false) {
  try {
    const adminClient = createAdminClient();
    
    // 1. Try fetching course by slug or ID
    let courseQuery = adminClient.from('courses').select('*');
    
    // Check if slugOrId is a valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slugOrId);
    if (isUuid) {
      courseQuery = courseQuery.eq('id', slugOrId);
    } else {
      courseQuery = courseQuery.eq('slug', slugOrId);
    }
    
    const { data: course, error: courseErr } = await courseQuery.maybeSingle();
    
    if (courseErr) throw courseErr;
    if (!course) return { error: 'Course node not found' };

    // 2. Access control check: Must be published OR preview mode enabled
    const isPublished = course.published || course.status === 'published';
    if (!isPublished && !preview) {
      return { error: 'This course node is not currently online' };
    }

    // 3. Fetch modules and lessons
    const [modulesRes, lessonsRes] = await Promise.all([
      adminClient
        .from('course_modules')
        .select('*')
        .eq('course_id', course.id)
        .order('position', { ascending: true }),
      adminClient
        .from('course_lessons')
        .select('*')
        .eq('course_id', course.id)
        .order('position', { ascending: true })
    ]);

    return {
      course,
      modules: modulesRes.data || [],
      lessons: lessonsRes.data || []
    };
  } catch (error: any) {
    console.error('[getCourseLandingData Error]:', error);
    return { error: error.message || 'Failed to resolve course landing data' };
  }
}

/**
 * Saves/updates course landing settings in the JSONB column.
 */
export async function updateCourseLandingSettings(courseId: string, settings: any) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();

    // Verify workspace ownership of course
    const { data: course, error: fetchErr } = await supabase
      .from('courses')
      .select('id, workspace_id, landing_page_settings')
      .eq('id', courseId)
      .eq('workspace_id', workspaceId)
      .single();

    if (fetchErr || !course) return { error: 'Course node not found or unauthorized' };

    // Merge existing and new settings
    const currentSettings = course.landing_page_settings || {};
    const updatedSettings = {
      ...currentSettings,
      ...settings,
      visible_sections: {
        ...(currentSettings.visible_sections || {}),
        ...(settings.visible_sections || {})
      },
      instructor: {
        ...(currentSettings.instructor || {}),
        ...(settings.instructor || {})
      }
    };

    const { error: updateErr } = await supabase
      .from('courses')
      .update({
        landing_page_settings: updatedSettings,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId);

    if (updateErr) throw updateErr;

    return { success: true, settings: updatedSettings };
  } catch (error: any) {
    console.error('[updateCourseLandingSettings Error]:', error);
    return { error: error.message || 'Failed to update course landing page settings' };
  }
}

/**
 * Updates a course's slug, verifying uniqueness and formatting.
 */
export async function updateCourseSlug(courseId: string, slug: string) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const sanitizedSlug = sanitizeSlug(slug);
    if (!sanitizedSlug) {
      return { error: 'Slug cannot be empty' };
    }

    const supabase = await createServerClient();

    // Verify workspace ownership
    const { data: course, error: fetchErr } = await supabase
      .from('courses')
      .select('id, workspace_id')
      .eq('id', courseId)
      .eq('workspace_id', workspaceId)
      .single();

    if (fetchErr || !course) return { error: 'Course node not found or unauthorized' };

    // Check slug uniqueness
    const adminClient = createAdminClient();
    const { data: duplicateCourse, error: checkErr } = await adminClient
      .from('courses')
      .select('id')
      .eq('slug', sanitizedSlug)
      .neq('id', courseId)
      .maybeSingle();

    if (duplicateCourse) {
      return { error: 'This URL slug is already in use by another course node' };
    }

    // Update slug
    const { error: updateErr } = await supabase
      .from('courses')
      .update({
        slug: sanitizedSlug,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId);

    if (updateErr) throw updateErr;

    return { success: true, slug: sanitizedSlug };
  } catch (error: any) {
    console.error('[updateCourseSlug Error]:', error);
    return { error: error.message || 'Failed to update course URL slug' };
  }
}
