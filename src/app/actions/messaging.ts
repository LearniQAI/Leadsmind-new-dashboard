'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';

export async function getConnectedPlatforms() {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return [];

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('platform_connections')
      .select('platform, status, last_sync_at')
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[messaging] Error fetching platforms:', error);
    return [];
  }
}
