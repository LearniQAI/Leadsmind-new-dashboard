'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

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
  const { data, error } = await supabase
   .from('tasks')
   .insert({ workspace_id: workspaceId, ...taskData })
   .select()
   .single();

  if (error) throw error;
  revalidatePath('/tasks');
  return { data };
 } catch (error: any) {
  console.error('Error creating task:', error);
  return { error: error.message || 'Failed to create task' };
 }
}

export async function updateTask(taskId: string, updates: {
 title?: string;
 description?: string;
 priority?: string;
 status?: string;
 due_date?: string;
}) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('tasks')
   .update(updates)
   .eq('id', taskId)
   .eq('workspace_id', workspaceId)
   .select()
   .single();

  if (error) throw error;
  revalidatePath('/tasks');
  return { data };
 } catch (error: any) {
  return { error: error.message || 'Failed to update task' };
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

export async function deleteTask(taskId: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { error } = await supabase
   .from('tasks')
   .delete()
   .eq('id', taskId)
   .eq('workspace_id', workspaceId);

  if (error) throw error;
  revalidatePath('/tasks');
  return { success: true };
 } catch (error: any) {
  return { error: error.message || 'Failed to delete task' };
 }
}
