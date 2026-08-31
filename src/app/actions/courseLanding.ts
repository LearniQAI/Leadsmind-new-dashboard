'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { sanitizeSlug } from '@/lib/slug';
import { logger } from '@/shared/logger';
import { toClientError } from '@/shared/errors/AppError';

// Shared by every real lookup mode below (global slug/id, and domain-scoped) — access-control
// + modules/lessons fetch is identical either way; only how `course` itself gets found differs.
// Pulled out during the Custom-Domain Course Serving pass specifically so the new domain-scoped
// lookup reuses this real logic instead of re-implementing it.
async function loadCourseLandingPayload(
  adminClient: ReturnType<typeof createAdminClient>,
  course: any,
  preview: boolean
) {
  // Access control check: Must be published OR preview mode enabled
  const isPublished = course.published || course.status === 'published';
  if (!isPublished && !preview) {
    return { error: 'This course node is not currently online' };
  }

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
}

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

    return await loadCourseLandingPayload(adminClient, course, preview);
  } catch (error: any) {
    logger.error({ err: error, slugOrId }, 'course_landing.data.fetch.failed');
    const clientError = toClientError(error);
    return { error: clientError.error };
  }
}

/**
 * Custom-Domain Course Serving — the domain-scoped counterpart to getCourseLandingData()
 * above, reusing the exact same access-control + modules/lessons fetch (loadCourseLandingPayload)
 * so this is genuinely the same rendering path, not a second implementation. The real
 * difference is the lookup key: matched by the real FK (courses.domain_id ->
 * domain_configurations.id) + url_path, NOT a bare global slug — domainConfigId is resolved by
 * src/middleware.ts from the verified (status='active') domain_configurations row for the
 * inbound hostname, so a course can only ever be found here if it's explicitly attached to
 * THIS exact domain. There is no path from here to any other workspace's course, even one
 * sharing the same url_path string on a different domain — matching on domain_id, not
 * workspace_id, is what makes that structurally impossible rather than just checked.
 */
export async function getCourseLandingDataByDomain(domainConfigId: string, urlPath: string, preview: boolean = false) {
  try {
    const adminClient = createAdminClient();

    const { data: course, error: courseErr } = await adminClient
      .from('courses')
      .select('*')
      .eq('domain_id', domainConfigId)
      .eq('url_path', urlPath)
      .maybeSingle();

    if (courseErr) throw courseErr;
    if (!course) return { error: 'Course node not found' };

    return await loadCourseLandingPayload(adminClient, course, preview);
  } catch (error: any) {
    logger.error({ err: error, domainConfigId, urlPath }, 'course_landing.data.fetch_by_domain.failed');
    const clientError = toClientError(error);
    return { error: clientError.error };
  }
}

/**
 * Real published-course listing for a domain's root path ("/") — the Custom-Domain Course
 * Serving pass's root-path decision (Step 0): if the domain hosts exactly one published
 * course, middleware redirects straight to it; otherwise this powers a real, minimal
 * "workspace portal" listing every published course on that domain, rather than a blank or
 * broken root. Draft courses are intentionally excluded — root is the domain's real public
 * face, unlike the single-course path which can carry ?preview=true for an admin's own check.
 */
export async function getPublishedCoursesForDomain(domainConfigId: string) {
  try {
    const adminClient = createAdminClient();
    const [coursesRes, domainRes] = await Promise.all([
      adminClient
        .from('courses')
        .select('id, title, slug, url_path, thumbnail_url, status, published')
        .eq('domain_id', domainConfigId)
        .not('url_path', 'is', null)
        .order('created_at', { ascending: true }),
      adminClient
        .from('domain_configurations')
        .select('hostname, workspace_id, workspaces(name)')
        .eq('id', domainConfigId)
        .maybeSingle(),
    ]);

    if (coursesRes.error) throw coursesRes.error;
    const published = (coursesRes.data || []).filter((c) => c.published || c.status === 'published');
    const workspaceName = (domainRes.data as any)?.workspaces?.name || null;
    return { data: published, workspaceName, hostname: domainRes.data?.hostname || null };
  } catch (error: any) {
    logger.error({ err: error, domainConfigId }, 'course_landing.published_for_domain.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

/**
 * Saves/updates course landing settings in the JSONB column.
 */
export async function updateCourseLandingSettings(courseId: string, settings: any) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

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
      .eq("id", courseId).eq("workspace_id", workspaceId);

    if (updateErr) throw updateErr;

    return { success: true, settings: updatedSettings };
  } catch (error: any) {
    logger.error({ err: error, courseId }, 'course_landing.settings.update.failed');
    const clientError = toClientError(error);
    return { error: clientError.error };
  }
}

/**
 * Updates a course's slug, verifying uniqueness and formatting.
 */
export async function updateCourseSlug(courseId: string, slug: string) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const sanitizedSlug = sanitizeSlug(slug);
    if (!sanitizedSlug) {
      return { error: 'Slug cannot be empty' };
    }

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
      .eq("id", courseId).eq("workspace_id", workspaceId);

    if (updateErr) throw updateErr;

    return { success: true, slug: sanitizedSlug };
  } catch (error: any) {
    logger.error({ err: error, courseId }, 'course_landing.slug.update.failed');
    const clientError = toClientError(error);
    return { error: clientError.error };
  }
}
