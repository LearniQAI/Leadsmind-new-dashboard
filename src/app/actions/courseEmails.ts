'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';

/**
 * Saves/updates course custom welcome onboarding email templates in public.courses.
 */
export async function updateCourseEmailTemplate(
  courseId: string,
  payload: {
    onboarding_email_subject: string;
    onboarding_email_body: string;
  }
) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();

    // Verify workspace ownership
    const { data: course, error: fetchErr } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('workspace_id', workspaceId)
      .single();

    if (fetchErr || !course) return { error: 'Course not found or unauthorized' };

    const { error: updateErr } = await supabase
      .from('courses')
      .update({
        onboarding_email_subject: payload.onboarding_email_subject,
        onboarding_email_body: payload.onboarding_email_body,
        updated_at: new Date().toISOString()
      })
      .eq("id", courseId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);

    if (updateErr) throw updateErr;

    return { success: true };
  } catch (error: any) {
    console.error('[updateCourseEmailTemplate Error]:', error);
    return { error: error.message || 'Failed to update email templates' };
  }
}
