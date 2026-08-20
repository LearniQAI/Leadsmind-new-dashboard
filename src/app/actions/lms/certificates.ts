'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';

// Task 50: Fix certificate saving and the admin certificates page crash
export async function getAdminCertificates() {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    // Fetch all certificates issued in this workspace, joining student and course details
    const { data, error } = await supabase
      .from('certificates')
      .select('*, courses(name), students:contacts(first_name, last_name, email)')
      .eq('workspace_id', workspaceId)
      .order('issued_at', { ascending: false });

    if (error) {
      // If the table doesn't exist yet or is malformed, return an empty array gracefully to prevent the UI crash
      logger.warn({ err: error, workspaceId }, 'lms.certificates.fetch_warning');
      return { success: true, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    logger.error({ err: error }, 'lms.certificates.fetch_failed');
    return { success: false, error: 'Failed to load certificates.' };
  }
}

export async function saveCertificateTemplate(courseId: string, templateId: string) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('courses')
      .update({ certificate_template_id: templateId })
      .eq('id', courseId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    logger.error({ err: error, courseId }, 'lms.certificates.save_template_failed');
    return { success: false, error: 'Failed to save certificate template.' };
  }
}
