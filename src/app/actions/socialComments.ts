'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';
import { replyToPlatformComment } from '@/lib/social/comments';

const SUPPORTED_PLATFORMS = ['facebook', 'instagram', 'youtube'] as const;

export async function getSocialComments(filterPlatform?: string) {
  try {
    const supabase = await createServerClient();
    const { workspaceId } = await requireWorkspaceAccess();

    let query = supabase
      .from('social_comments')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('comment_created_at', { ascending: false })
      .limit(200);

    if (filterPlatform && (SUPPORTED_PLATFORMS as readonly string[]).includes(filterPlatform)) {
      query = query.eq('platform', filterPlatform);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [] };
  } catch (error: any) {
    logger.error({ err: error }, 'social.comments.fetch.failed');
    return { error: 'Failed to fetch comments.', data: [] };
  }
}

export async function replyToSocialComment(commentRowId: string, message: string) {
  let workspaceId: string | null = null;
  try {
    const supabase = await createServerClient();
    ({ workspaceId } = await requireWorkspaceAccess());

    if (!message?.trim()) return { error: 'Reply text is required.' };

    const { data: comment, error: fetchErr } = await supabase
      .from('social_comments')
      .select('*')
      .eq('id', commentRowId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!comment) return { error: 'Comment not found.' };
    if (!(SUPPORTED_PLATFORMS as readonly string[]).includes(comment.platform)) {
      return { error: `Replying is not available for ${comment.platform}.` };
    }

    const { data: conn } = await supabase
      .from('platform_connections')
      .select('credentials, status')
      .eq('workspace_id', workspaceId)
      .eq('platform', comment.platform)
      .maybeSingle();
    if (!conn?.credentials || conn.status !== 'connected') {
      return { error: `${comment.platform} is not connected.` };
    }

    // Success-gated exactly like publish: the row is only ever marked 'replied' after a
    // real confirmed API response, never optimistically.
    const result = await replyToPlatformComment(comment.platform, conn.credentials, comment.comment_id, message, supabase, workspaceId);
    if (result.success === false) return { error: result.error };

    const { error: updateErr } = await supabase
      .from('social_comments')
      .update({
        status: 'replied',
        our_reply_id: result.replyId,
        our_reply_text: message,
        replied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentRowId);
    if (updateErr) throw updateErr;

    return { success: true, replyId: result.replyId };
  } catch (error: any) {
    logger.error({ err: error, workspaceId, commentRowId }, 'social.comments.reply.failed');
    return { error: 'Failed to send reply.' };
  }
}
