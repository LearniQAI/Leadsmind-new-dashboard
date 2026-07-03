'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { TaskPriorityEngine } from '@/lib/execution/TaskPriorityEngine';
import { UnifiedActivityEngine } from '@/lib/crm/UnifiedActivityEngine';

export async function getTaskDashboardData() {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  // Fetch all tasks for the workspace
  const { data: tasks } = await supabase
    .from('crm_tasks')
    .select('*, company:company_id(name), contact:contact_id(first_name, last_name, email), opportunity:opportunity_id(name)')
    .eq('workspace_id', workspaceId)
    .order('due_date', { ascending: true });

  // Fetch escalations
  const { data: escalations } = await supabase
    .from('overdue_escalations')
    .select('*, crm_tasks!inner(title, owner_id)')
    .eq('workspace_id', workspaceId)
    .eq('status', 'Open');

  return { 
    success: true, 
    data: { 
      tasks: tasks || [],
      escalations: escalations || [],
      currentUserId: userId
    } 
  };
}

export async function createTask(taskData: any) {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };

  const priority = TaskPriorityEngine.evaluatePriority(taskData.due_date, taskData.task_type || 'general');

  const { data, error } = await supabase.from('crm_tasks').insert({
    workspace_id: workspaceId,
    priority,
    ...taskData
  }).select().single();

  if (error) return { success: false, error: error.message };

  await UnifiedActivityEngine.logActivity(
    workspaceId,
    taskData.owner_id || null,
    'opportunity', // abstract wrapper
    data.id,
    'note',
    `Created task: ${data.title}`
  );

  revalidatePath('/tasks');
  return { success: true, data };
}

export async function updateTaskStatus(taskId: string, status: string) {
  const supabase = await createServerClient();
  
  const updates: any = { status, updated_at: new Date().toISOString() };
  if (status === 'Completed') updates.completed_at = new Date().toISOString();

  const { error } = await supabase.from('crm_tasks').update(updates).eq("id", taskId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);
  if (error) return { success: false, error: error.message };
  
  revalidatePath('/tasks');
  return { success: true };
}
