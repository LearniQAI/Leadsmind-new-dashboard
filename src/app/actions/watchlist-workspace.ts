'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function createWatchlist(name: string, monitoringType: string, criteria: any) {
  const supabase = await createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return { success: false, error: 'Unauthorized' };

  const { error } = await supabase.from('lead_watchlists').insert({
    user_id: userId,
    name,
    monitoring_type: monitoringType,
    criteria
  });

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/lead-finder/watchlists');
  return { success: true };
}

export async function getWatchlists() {
  const supabase = await createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) return { success: false, error: 'Unauthorized' };

  const { data, error } = await supabase
    .from('lead_watchlists')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getAlerts() {
  const supabase = await createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) return { success: false, error: 'Unauthorized' };

  const { data, error } = await supabase
    .from('lead_alerts')
    .select('*, lead:result_id(business_name, id), watchlist:watchlist_id(name)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function deleteWatchlist(id: string) {
  const supabase = await createServerClient();
  const { error } = await supabase.from('lead_watchlists').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  revalidatePath('/lead-finder/watchlists');
  return { success: true };
}

export async function toggleWatchlistStatus(id: string, isActive: boolean) {
  const supabase = await createServerClient();
  const { error } = await supabase.from('lead_watchlists').update({ is_active: isActive }).eq('id', id);
  if (error) return { success: false, error: error.message };
  revalidatePath('/lead-finder/watchlists');
  return { success: true };
}

export async function markAlertRead(id: string) {
  const supabase = await createServerClient();
  await supabase.from('lead_alerts').update({ is_read: true }).eq('id', id);
  revalidatePath('/lead-finder/watchlists');
  return { success: true };
}
