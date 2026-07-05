'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { ForbiddenError, UnauthorizedError } from '@/lib/errors';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';

export async function createWatchlist(name: string, monitoringType: string, criteria: any) {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) throw new ForbiddenError('No active workspace');
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return { success: false, error: 'Unauthorized' };

  const { error } = await supabase.from('lead_watchlists').insert({
    user_id: userId,
    name,
    monitoring_type: monitoringType,
    criteria
  });

  if (error) {
    logger.error({ err: error, userId }, 'watchlist_workspace.watchlist.create.failed');
    return { success: false, error: 'Failed to create watchlist.' };
  }

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

  if (error) {
    logger.error({ err: error }, 'watchlist_workspace.watchlists.fetch.failed');
    return { success: false, error: 'Failed to fetch watchlists.' };
  }
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

  if (error) {
    logger.error({ err: error }, 'watchlist_workspace.alerts.fetch.failed');
    return { success: false, error: 'Failed to fetch alerts.' };
  }
  return { success: true, data };
}

export async function deleteWatchlist(id: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) throw new ForbiddenError('No active workspace');
  const { error } = await supabase.from('lead_watchlists').delete().eq("id", id).eq("workspace_id", workspaceId);
  if (error) {
    logger.error({ err: error, workspaceId, watchlistId: id }, 'watchlist_workspace.watchlist.delete.failed');
    return { success: false, error: 'Failed to delete watchlist.' };
  }
  revalidatePath('/lead-finder/watchlists');
  return { success: true };
}

export async function toggleWatchlistStatus(id: string, isActive: boolean) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) throw new ForbiddenError('No active workspace');
  const { error } = await supabase.from('lead_watchlists').update({ is_active: isActive }).eq("id", id).eq("workspace_id", workspaceId);
  if (error) {
    logger.error({ err: error, workspaceId, watchlistId: id }, 'watchlist_workspace.status.toggle.failed');
    return { success: false, error: 'Failed to toggle watchlist status.' };
  }
  revalidatePath('/lead-finder/watchlists');
  return { success: true };
}

export async function markAlertRead(id: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) throw new ForbiddenError('No active workspace');
  await supabase.from('lead_alerts').update({ is_read: true }).eq("id", id).eq("workspace_id", workspaceId);
  revalidatePath('/lead-finder/watchlists');
  return { success: true };
}
