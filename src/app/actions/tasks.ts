'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, getUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';

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

  // Send notification email to the creator
  const user = await getUser();
  if (user?.email) {
   await sendEmail({
    to: user.email,
    subject: `New Task Assigned: ${taskData.title}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
       <h2 style="color: #6c47ff;">New Task Created</h2>
       <p>Hello,</p>
       <p>A new task has been added to your workspace: <strong>${taskData.title}</strong>.</p>
       <p>Priority: ${taskData.priority || 'Normal'}</p>
       <p>Due Date: ${taskData.due_date || 'Not set'}</p>
       <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
       <p style="font-size: 12px; color: #666;">This is an automated notification from your LeadsMind Dashboard.</p>
      </div>
     `
   }).catch(err => console.error('Failed to send task creation email:', err));
  }

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

  // Send notification email about the update
  const user = await getUser();
  if (user?.email) {
   await sendEmail({
    to: user.email,
    subject: `Task Updated: ${data.title}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
       <h2 style="color: #6c47ff;">Task Updated</h2>
       <p>Hello,</p>
       <p>The task <strong>${data.title}</strong> has been modified.</p>
       <p>New Status: ${data.status}</p>
       <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
       <p style="font-size: 12px; color: #666;">This is an automated notification from your LeadsMind Dashboard.</p>
      </div>
     `
   }).catch(err => console.error('Failed to send task update email:', err));
  }

  revalidatePath('/tasks');
  return { data };
 } catch (error: any) {
  console.error('Error update task:', error);
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
  console.error('Error update task status:', error);
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
  console.error('Error delete task:', error);
  return { error: error.message || 'Failed to delete task' };
 }
}
