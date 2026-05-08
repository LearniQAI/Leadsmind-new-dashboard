'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';

export async function getSocialAccounts() {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getSocialPosts() {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('social_posts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createSocialPost(postData: {
  platforms: string[];
  content: string;
  media_urls?: string[];
  scheduled_at?: string;
}) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('social_posts')
      .insert({
        workspace_id: workspaceId,
        platforms: postData.platforms,
        content: postData.content,
        media_urls: postData.media_urls || [],
        scheduled_at: postData.scheduled_at,
        status: postData.scheduled_at ? 'scheduled' : 'draft',
        created_by: user?.id
      });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
