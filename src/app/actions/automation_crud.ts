'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function createWorkflow(data: { name: string; trigger_type: string; description?: string }) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data: workflow, error } = await supabase
   .from('workflows')
   .insert({ workspace_id: workspaceId, ...data, is_active: false })
   .select()
   .single();

  if (error) throw error;
  revalidatePath('/automations');
  return { data: workflow };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function updateWorkflow(id: string, updates: any) {
 try {
  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('workflows')
   .update(updates)
   .eq('id', id)
   .select()
   .single();

  if (error) throw error;
  revalidatePath('/automations');
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function deleteWorkflow(id: string) {
 try {
  const supabase = await createServerClient();
  const { error } = await supabase.from('workflows').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/automations');
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}
