'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { WorkspaceAuditEngine } from '@/lib/governance/WorkspaceAuditEngine';

export async function getGovernanceDashboardData() {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };

  // Fetch Team Members
  const { data: members } = await supabase
    .from('workspace_members')
    .select('user_id, role_id, workspace_roles(name), auth_user:user_id(email)')
    .eq('workspace_id', workspaceId);

  // Fetch Teams
  const { data: teams } = await supabase
    .from('workspace_teams')
    .select('*')
    .eq('workspace_id', workspaceId);

  // Fetch Pending Approvals
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  const { data: approvals } = await supabase
    .from('approval_requests')
    .select('*, requester:requester_id(email)')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .eq('approver_id', userId || '');

  // Fetch Audit Logs
  const auditLogs = await WorkspaceAuditEngine.getAuditTimeline(workspaceId, 20);

  return { 
    success: true, 
    data: { 
      members: members || [],
      teams: teams || [],
      approvals: approvals || [],
      auditLogs: auditLogs || []
    } 
  };
}
