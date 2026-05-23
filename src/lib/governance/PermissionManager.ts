import { createServerClient } from '@/lib/supabase/server';

export class PermissionManager {
  /**
   * Verifies if a user has a specific permission in a workspace.
   */
  public static async checkPermission(workspaceId: string, userId: string, resource: string, action: string): Promise<boolean> {
    const supabase = await createServerClient();
    
    // 1. Get the user's role in the workspace
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single();

    if (!member || !member.role_id) {
      // Fallback logic if role system is not fully populated yet (default to true for owners)
      const { data: ws } = await supabase.from('workspaces').select('owner_id').eq('id', workspaceId).single();
      return ws?.owner_id === userId;
    }

    // 2. Check if the role has the requested permission
    const { data: permission } = await supabase
      .from('workspace_permissions')
      .select('id')
      .eq('role_id', member.role_id)
      .eq('resource', resource)
      .eq('action', action)
      .maybeSingle();

    return !!permission;
  }
}
