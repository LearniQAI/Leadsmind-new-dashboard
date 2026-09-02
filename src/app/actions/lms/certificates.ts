'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';

// Task 50: Fix certificate saving and the admin certificates page crash
export async function getAdminCertificates() {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    // Fetch all certificates issued in this workspace. Persisted certificate rows
    // live in `course_certificates` (id, contact_id, course_id, workspace_id,
    // validation_id, student_name_snapshot, course_title_snapshot, issued_at).
    // `courses` exposes `title` (not `name`); the row snapshots keep the page
    // correct even if the course or contact is later deleted.
    const { data, error } = await supabase
      .from('course_certificates')
      .select('*, courses(title), students:contacts(first_name, last_name, email)')
      .eq('workspace_id', workspaceId)
      .order('issued_at', { ascending: false });

    if (error) {
      logger.warn({ err: error, workspaceId }, 'lms.certificates.fetch_warning');
      return { success: true, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    logger.error({ err: error }, 'lms.certificates.fetch_failed');
    return { success: false, error: 'Failed to load certificates.' };
  }
}

/**
 * Workspace-default certificate design (Certificate System, Part 2/5). Stored on
 * `workspaces.certificate_config` — the fallback for any course whose own
 * `courses.certificate_config` is null. The column already existed (migration
 * 20260903000022); this is the first read/write path for it.
 */
export async function getWorkspaceCertificateConfig() {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('workspaces')
      .select('certificate_config')
      .eq('id', workspaceId)
      .maybeSingle();
    if (error) throw error;
    return { success: true, data: data?.certificate_config ?? null };
  } catch (error: any) {
    logger.error({ err: error }, 'lms.certificates.ws_config.fetch_failed');
    return { success: false, error: 'Failed to load certificate design.' };
  }
}

/** Save (object) or clear (null → LeadsMind built-in default) the workspace-default design. */
export async function saveWorkspaceCertificateConfig(config: Record<string, any> | null) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();
    const payload = config && typeof config === 'object' ? config : null;
    const { data, error } = await supabase
      .from('workspaces')
      .update({ certificate_config: payload })
      .eq('id', workspaceId)
      .select('certificate_config')
      .single();
    if (error) throw error;
    return { success: true, data: data.certificate_config ?? null };
  } catch (error: any) {
    logger.error({ err: error }, 'lms.certificates.ws_config.save_failed');
    return { success: false, error: 'Failed to save certificate design.' };
  }
}
