'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function updateOrderStatus(orderId: string, status: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('orders')
   .update({ status, updated_at: new Date().toISOString() })
   .eq('id', orderId)
   .eq('workspace_id', workspaceId)
   .select()
   .single();

  if (error) throw error;
  revalidatePath('/orders');
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function deleteOrder(orderId: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { error } = await supabase
   .from('orders')
   .delete()
   .eq('id', orderId)
   .eq('workspace_id', workspaceId);

  if (error) throw error;
  revalidatePath('/orders');
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}
