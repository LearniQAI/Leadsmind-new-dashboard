'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function updateCommentStatus(commentId: string, status: 'approved' | 'spam' | 'rejected' | 'pending') {
  try {
    const supabase = await createServerClient();
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) throw new Error('Unauthorized');

    const { error } = await supabase.from('blog_comments')
      .update({ status })
      .eq('id', commentId)
      .eq('workspace_id', workspaceId);
      
    if (error) throw error;
    revalidatePath('/blog/comments');
    return { success: true };
  } catch (err: any) {
    console.error('[Action updateCommentStatus Error]:', err);
    return { error: err.message || 'Failed to update comment' };
  }
}

export async function deleteComment(commentId: string) {
  try {
    const supabase = await createServerClient();
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) throw new Error('Unauthorized');

    const { error } = await supabase.from('blog_comments')
      .delete()
      .eq('id', commentId)
      .eq('workspace_id', workspaceId);
      
    if (error) throw error;
    revalidatePath('/blog/comments');
    return { success: true };
  } catch (err: any) {
    console.error('[Action deleteComment Error]:', err);
    return { error: err.message || 'Failed to delete comment' };
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
  try {
    const supabase = await createServerClient();
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) throw new Error('Unauthorized');

    const { error } = await supabase.from('blog_settings')
      .upsert({
        workspace_id: workspaceId,
        ...payload
      }, { onConflict: 'workspace_id' });
      
    if (error) throw error;
    revalidatePath('/blog/comments');
    return { success: true };
  } catch (err: any) {
    console.error('[Action updateBlogSettings Error]:', err);
    return { error: err.message || 'Failed to update settings' };
  }
}
