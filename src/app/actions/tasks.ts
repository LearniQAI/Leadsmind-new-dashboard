'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';

export async function getTasks() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('tasks')
   .select(`
    id,
    title,
    description,
    status,
    priority,
    due_date,
    due_time,
    contact_id,
    contacts (first_name, last_name, avatar_url)
   `)
   .eq('workspace_id', workspaceId)
   .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  console.error('Error fetching tasks:', error);
  return { error: error.message || 'Failed to fetch tasks' };
 }
}

export async function createTask(taskData: {
 title: string;
 description?: string;
 priority?: string;
 status?: string;
 due_date?: string;
 contact_id?: string;
}) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { error } = await supabase
   .from('tasks')
   .insert({
    workspace_id: workspaceId,
    ...taskData
   });

  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  console.error('Error creating task:', error);
  return { error: error.message || 'Failed to create task' };
 }
}

export async function updateTaskStatus(taskId: string, status: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { error } = await supabase
   .from('tasks')
   .update({ status })
   .eq('id', taskId)
   .eq('workspace_id', workspaceId);

  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  return { error: error.message || 'Failed to update task' };
 }
}
