import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';

export async function debugWorkspaceMembers() {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    const supabase = await createServerClient();
    
    // 1. Raw count of members
    const { count, error: countError } = await supabase
      .from('workspace_members')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    // 2. Fetch with raw data to see what's missing
    const { data: members, error: membersError } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId);

    // 3. Fetch profiles separately to check if users table is the issue
    const { data: profiles, error: profilesError } = await supabase
      .from('users')
      .select('id, email, first_name');

    return {
      workspaceId,
      count,
      membersCount: members?.length,
      profilesCount: profiles?.length,
      errors: { countError, membersError, profilesError },
      members
    };
  } catch (err) {
    return { error: err };
  }
}
