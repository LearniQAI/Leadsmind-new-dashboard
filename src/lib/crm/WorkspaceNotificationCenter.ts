import { createServerClient } from '@/lib/supabase/server';

export class WorkspaceNotificationCenter {
  /**
   * Pushes a universal notification to a specific user or all workspace admins.
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
    const supabase = await createServerClient();
    
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
