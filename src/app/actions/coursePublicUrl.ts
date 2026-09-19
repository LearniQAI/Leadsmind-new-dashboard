'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';

/**
 * Where a course is bound, for the course builder's share box: the ACTIVE custom domain's
 * hostname (if any) plus the course's url_path. The client feeds this to the shared pure
 * courseLandingUrl() so its platform-origin fallback can still use the browser's own origin.
 * Workspace-scoped.
 */
export async function getCourseDomainBinding(courseId: string): Promise<{ hostname: string | null; urlPath: string | null }> {
  const none = { hostname: null, urlPath: null };
  try {
    const { workspaceId } = await requireWorkspaceRole();
    const admin = createAdminClient();
    const { data: course } = await admin
      .from('courses')
      .select('url_path, domain_id')
      .eq('id', courseId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (!course) return none;
    if (!course.domain_id) return { hostname: null, urlPath: course.url_path ?? null };

    const { data: domain } = await admin
      .from('domain_configurations')
      .select('hostname, status')
      .eq('id', course.domain_id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    return { hostname: domain?.status === 'active' ? domain.hostname : null, urlPath: course.url_path ?? null };
  } catch {
    return none;
  }
}
