'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';

export async function getConnectedPlatforms() {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return [];

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('platform_connections')
      .select('platform, status, last_sync_at')
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[messaging] Error fetching platforms:', error);
    return [];
  }
}

export async function getConversations() {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        platform,
        title,
        last_message_at,
        contact_id,
        contacts (first_name, last_name, avatar_url),
        messages (content, direction, sent_at, status)
      `)
      .eq('workspace_id', workspaceId)
      .order('last_message_at', { ascending: false });

    // Filter messages to just get the latest one per conversation if needed
    
    if (error) throw error;
    return { data };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch conversations' };
  }
}

export async function sendMessage(conversationId: string, content: string) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { error } = await supabase
      .from('messages')
      .insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        direction: 'outbound',
        content,
        status: 'sending'
      });

    if (error) throw error;
    
    // Update conversation last_message_at
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to send message' };
  }
}
