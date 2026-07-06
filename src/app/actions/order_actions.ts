'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';

export async function updateOrderStatus(orderId: string, status: string) {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

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
  logger.error({ err: error, orderId }, 'order_actions.status.update.failed');
  return { error: 'Failed to update order status.' };
 }
}

export async function deleteOrder(orderId: string) {
 try {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const { error } = await supabase
   .from('orders')
   .delete()
   .eq('id', orderId)
   .eq('workspace_id', workspaceId);

  if (error) throw error;
  revalidatePath('/orders');
  return { success: true };
 } catch (error: any) {
  logger.error({ err: error, orderId }, 'order_actions.delete.failed');
  return { error: 'Failed to delete order.' };
 }
}
