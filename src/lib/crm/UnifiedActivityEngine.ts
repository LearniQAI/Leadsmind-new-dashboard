import { createServerClient } from '@/lib/supabase/server';

export class UnifiedActivityEngine {
  /**
   * Logs an activity universally across the CRM, attaching it to the relevant entity.
   */
  public static async logActivity(
    workspaceId: string,
    actorId: string | null,
    entityType: 'contact' | 'company' | 'opportunity' | 'form' | 'lead',
    entityId: string,
    activityType: string,
    content: string,
    metadata: any = {}
  ) {
    const supabase = await createServerClient();
    
    const { error } = await supabase.from('crm_activities').insert({
      workspace_id: workspaceId,
      actor_id: actorId,
      entity_type: entityType,
      entity_id: entityId,
      activity_type: activityType,
      content,
      metadata
    });

    if (error) {
      console.error('[UnifiedActivityEngine] Error logging activity:', error);
    }
  }

  /**
   * Fetches the global chronological activity feed for the workspace.
   */
  public static async getGlobalActivity(workspaceId: string, limit = 50) {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('crm_activities')
      .select('*, auth_user:actor_id(id, email, first_name, last_name, full_name, profile_photo_url, avatar_preset_id, job_title, identity_color)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
}
