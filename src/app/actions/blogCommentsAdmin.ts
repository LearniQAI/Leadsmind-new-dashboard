'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';
import { UnauthorizedError, toClientError } from '@/shared/errors/AppError';

export async function updateCommentStatus(commentId: string, status: 'approved' | 'spam' | 'rejected' | 'pending') {
  try {
    const supabase = await createServerClient();
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) throw new UnauthorizedError();

    const { error } = await supabase.from('blog_comments')
      .update({ status })
      .eq('id', commentId)
      .eq('workspace_id', workspaceId);
      
    if (error) throw error;
    revalidatePath('/blog/comments');
    return { success: true };
  } catch (err: any) {
    logger.error({ err, commentId }, 'blog_comments.status_update.failed');
    const clientError = toClientError(err);
    return { error: clientError.error };
  }
}

export async function deleteComment(commentId: string) {
  try {
    const supabase = await createServerClient();
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) throw new UnauthorizedError();

    const { error } = await supabase.from('blog_comments')
      .delete()
      .eq('id', commentId)
      .eq('workspace_id', workspaceId);
      
    if (error) throw error;
    revalidatePath('/blog/comments');
    return { success: true };
  } catch (err: any) {
    logger.error({ err, commentId }, 'blog_comments.delete.failed');
    const clientError = toClientError(err);
    return { error: clientError.error };
  }
}

export async function updateBlogSettings(payload: {
  comments_engine: string;
  disqus_shortname?: string;
  analytics_enabled: boolean;
  layout_style?: string;
  header_style?: string;
  sidebar_style?: string;
  lead_capture_style?: string;
  sa_province?: string;
  sa_city?: string;
  sa_area?: string;
}) {
  let workspaceId: string | null = null;
  try {
    const supabase = await createServerClient();
    workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) throw new UnauthorizedError();

    const { error } = await supabase.from('blog_settings')
      .upsert({
        workspace_id: workspaceId,
        ...payload
      }, { onConflict: 'workspace_id' });

    if (error) throw error;
    revalidatePath('/blog/comments');
    return { success: true };
  } catch (err: any) {
    logger.error({ err, workspaceId }, 'blog_settings.update.failed');
    const clientError = toClientError(err);
    return { error: clientError.error };
  }
}
