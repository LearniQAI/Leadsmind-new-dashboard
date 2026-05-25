'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getAutomationDashboardData() {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };

  // Fetch workflows
  const { data: workflows } = await supabase
    .from('automation_workflows')
    .select('*, workflow_triggers(*), workflow_actions(*)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  // Fetch recent executions
  const { data: executions } = await supabase
    .from('workflow_execution_logs')
    .select('*, automation_workflows(name)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch unread failures
  const { data: failures } = await supabase
    .from('workflow_failures')
    .select('*, automation_workflows!inner(name, workspace_id)')
    .eq('automation_workflows.workspace_id', workspaceId)
    .eq('is_resolved', false);

  return { 
    success: true, 
    data: { 
      workflows: workflows || [],
      executions: executions || [],
      failures: failures || []
    } 
  };
}

export async function toggleWorkflowActive(workflowId: string, currentState: boolean) {
  const supabase = await createServerClient();
  await supabase.from('automation_workflows').update({ is_active: !currentState }).eq('id', workflowId);
  revalidatePath('/automation');
  return { success: true };
}

export async function deleteWorkflow(workflowId: string) {
  const supabase = await createServerClient();
  await supabase.from('automation_workflows').delete().eq('id', workflowId);
  revalidatePath('/automation');
  return { success: true };
}
