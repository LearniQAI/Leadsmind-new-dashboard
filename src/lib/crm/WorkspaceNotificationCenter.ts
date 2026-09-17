import { createServerClient, createAdminClient } from '@/lib/supabase/server';

export class WorkspaceNotificationCenter {
  /**
   * Pushes a universal notification to a specific user or all workspace admins.
   *
   * Uses the admin client, not createServerClient() — confirmed live that
   * the previous session/cookie-scoped client silently failed under RLS
   * whenever this ran from a cron (no logged-in user), swallowing the error
   * via console.error rather than throwing. Both current callers
   * (EscalationHandler, ReminderScheduler) are cron-only, and the insert is
   * already trusted server-side (the caller supplies workspaceId/userId
   * directly, same as every other cron-driven notification write in this
   * codebase).
   */
  public static async notify(
    workspaceId: string,
    userId: string,
    title: string,
    message: string,
    type: 'alert' | 'assignment' | 'submission' | 'opportunity',
    referenceId?: string,
    referenceType?: string
  ) {
    const supabase = createAdminClient();

    const { error } = await supabase.from('crm_notifications').insert({
      workspace_id: workspaceId,
      user_id: userId,
      title,
      message,
      type,
      reference_id: referenceId,
      reference_type: referenceType
    });

    if (error) {
      console.error('[WorkspaceNotificationCenter] Failed to send notification:', error);
    }
  }

  /**
   * Retrieves active notifications for the current user.
   */
  public static async getUserNotifications(workspaceId: string, userId: string) {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('crm_notifications')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data;
  }
}
