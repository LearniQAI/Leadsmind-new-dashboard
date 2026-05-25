import { createServerClient } from '@/lib/supabase/server';

export class WorkspaceAuditEngine {
  /**
   * Logs a governance action into the workspace audit timeline.
   */
  public static async logAction(
    workspaceId: string, 
    actorId: string, 
    action: string, 
    resourceType: string, 
    resourceId?: string, 
    details?: any
  ) {
    const supabase = await createServerClient();
    
    await supabase.from('workspace_audit_logs').insert({
      workspace_id: workspaceId,
      actor_id: actorId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: details || {}
    });
  }

  /**
   * Retrieves the recent audit timeline for the workspace.
   */
  public static async getAuditTimeline(workspaceId: string, limit = 50) {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('workspace_audit_logs')
      .select('*, auth_user:actor_id(email)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
}
