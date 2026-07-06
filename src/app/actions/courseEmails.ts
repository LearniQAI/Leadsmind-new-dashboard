'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { logger } from '@/shared/logger';
import { toClientError } from '@/shared/errors/AppError';

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
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

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
      .eq("id", courseId).eq("workspace_id", workspaceId);

    if (updateErr) throw updateErr;

    return { success: true };
  } catch (error: any) {
    logger.error({ err: error, courseId }, 'course_emails.template.update.failed');
    const clientError = toClientError(error);
    return { error: clientError.error };
  }
}
