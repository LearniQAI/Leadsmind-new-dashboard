'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';

export async function getConversionAnalytics() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('conversion_events')
   .select('*')
   .eq('workspace_id', workspaceId)
   .order('occurred_at', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function getDashboardStats() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  
  // Fetch counts from various tables for the "System Audit" / Dashboard
  const [leads, orders, tasks, conversations] = await Promise.all([
   supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
   supabase.from('orders').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
   supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
   supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
  ]);

  return {
   data: {
    leads: leads.count || 0,
    orders: orders.count || 0,
    tasks: tasks.count || 0,
    conversations: conversations.count || 0,
   }
  };
 } catch (error: any) {
  return { error: error.message };
 }
}
