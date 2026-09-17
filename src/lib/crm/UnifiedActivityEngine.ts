import { createServerClient, createAdminClient } from '@/lib/supabase/server';

export class UnifiedActivityEngine {
  /**
   * Logs an activity universally across the CRM, attaching it to the relevant entity.
   *
   * Uses the admin client, not createServerClient() — confirmed live (via
   * the task-escalations cron) that the previous session/cookie-scoped
   * client silently failed under RLS with no logged-in user, swallowing the
   * error via console.error rather than throwing, so automation/cron-driven
   * callers (EscalationHandler here, and WorkflowEngine/CRMActionHandler/
   * actions_registry, which run the same way) never actually got a timeline
   * entry. The insert is already trusted server-side — every caller passes
   * an explicit workspaceId/entityId rather than trusting a client-supplied
   * one — so admin-client here doesn't weaken anything RLS was enforcing.
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
    const supabase = createAdminClient();

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
   *
   * Merges two independently-written tables: `crm_activities` (automation/
   * workflow/messaging/task events) and `contact_activities` (contact-detail
   * page actions: create, notes, tags, form submissions). Neither table is
   * legacy — both are actively written by disjoint parts of the app — so the
   * feed aggregates and re-sorts both rather than picking one.
   */
  public static async getGlobalActivity(workspaceId: string, limit = 50) {
    const supabase = await createServerClient();

    const [crmResult, contactResult] = await Promise.all([
      supabase
        .from('crm_activities')
        .select('*, auth_user:actor_id(id, email, first_name, last_name, full_name, profile_photo_url, avatar_preset_id, job_title, identity_color)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('contact_activities')
        .select('*, auth_user:created_by(id, email, first_name, last_name, full_name, profile_photo_url, avatar_preset_id, job_title, identity_color)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);

    if (crmResult.error) throw crmResult.error;
    if (contactResult.error) throw contactResult.error;

    const crmRows = (crmResult.data ?? []).map((row: any) => ({
      id: `crm_${row.id}`,
      workspace_id: row.workspace_id,
      actor_id: row.actor_id,
      auth_user: row.auth_user,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      activity_type: row.activity_type,
      content: row.content,
      metadata: row.metadata,
      created_at: row.created_at,
    }));

    const contactRows = (contactResult.data ?? []).map((row: any) => ({
      id: `contact_${row.id}`,
      workspace_id: row.workspace_id,
      actor_id: row.created_by,
      auth_user: row.auth_user,
      entity_type: 'contact',
      entity_id: row.contact_id,
      activity_type: row.type,
      content: row.description,
      metadata: row.metadata,
      created_at: row.created_at,
    }));

    return [...crmRows, ...contactRows]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }
}
