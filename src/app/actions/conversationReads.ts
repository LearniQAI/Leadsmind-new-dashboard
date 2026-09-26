'use server';

// Per-user read state for Communications (all channels). The count comes from the database
// (conversation_unread_counts: inbound, non-imported messages newer than the user's last_read_at),
// never from toast history — dismissing a toast doesn't read the message.

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';

export interface UnreadCounts {
  total: number;
  byConversation: Record<string, number>;
}

export async function getUnreadCounts(): Promise<UnreadCounts> {
  const empty = { total: 0, byConversation: {} };
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return empty;
    const supabase = await createServerClient();
    const { data, error } = await supabase.rpc('conversation_unread_counts', { p_workspace_id: workspaceId });
    if (error) throw error;
    const byConversation: Record<string, number> = {};
    let total = 0;
    for (const row of (data || []) as { conversation_id: string; unread: number }[]) {
      byConversation[row.conversation_id] = row.unread;
      total += row.unread;
    }
    return { total, byConversation };
  } catch (err) {
    logger.error({ err }, 'conversations.unread_counts.failed');
    return empty;
  }
}

/**
 * Marks conversations read for the caller (a consolidated contact entry passes all its channels'
 * conversation ids) and clears the matching "new message" notifications in their bell.
 */
export async function markConversationsRead(conversationIds: string[]): Promise<{ success: boolean }> {
  try {
    const ids = Array.from(new Set((conversationIds || []).filter((id) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)))).slice(0, 50);
    if (!ids.length) return { success: true };
    const { workspaceId, userId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    // Only conversations the caller can actually see in this workspace (RLS + module gate).
    const { data: visible } = await supabase.from('conversations').select('id').eq('workspace_id', workspaceId).in('id', ids);
    const ok = (visible || []).map((c: any) => c.id);
    if (!ok.length) return { success: true };

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('conversation_reads')
      .upsert(ok.map((id) => ({ conversation_id: id, user_id: userId, workspace_id: workspaceId, last_read_at: now })), { onConflict: 'conversation_id,user_id' });
    if (error) throw error;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('type', 'message')
      .eq('read', false)
      .in('metadata->>conversation_id', ok);

    return { success: true };
  } catch (err) {
    logger.error({ err }, 'conversations.mark_read.failed');
    return { success: false };
  }
}
