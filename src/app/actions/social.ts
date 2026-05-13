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

  const { data, error } = await supabase
   .from('social_posts')
   .insert({
    workspace_id: workspaceId,
    platforms: postData.platforms,
    content: postData.content,
    media_urls: postData.media_urls || [],
    scheduled_at: postData.scheduled_at,
    status: postData.scheduled_at ? 'scheduled' : 'draft',
    created_by: user?.id
   })
   .select('id')
   .single();

  if (error) throw error;
  return { success: true, id: data.id };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function publishSocialPost(postId: string) {
 try {
  const supabase = await createServerClient();
  const { error } = await supabase
   .from('social_posts')
   .update({ status: 'published', published_at: new Date().toISOString() })
   .eq('id', postId);

  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}

// OAUTH URL GENERATORS
export async function getMetaAuthUrl() {
 const workspaceId = await getCurrentWorkspaceId();
 const appId = process.env.META_APP_ID;
 const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/facebook`;
 return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=pages_manage_posts,instagram_basic,instagram_content_publish&state=${workspaceId}`;
}

export async function getLinkedInAuthUrl() {
 const workspaceId = await getCurrentWorkspaceId();
 const clientId = process.env.LINKEDIN_CLIENT_ID;
 const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/linkedin`;
 return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=w_member_social&state=${workspaceId}`;
}

export async function getTikTokAuthUrl() {
 const workspaceId = await getCurrentWorkspaceId();
 const clientKey = process.env.TIKTOK_CLIENT_KEY;
 const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/tiktok`;
 return `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&redirect_uri=${redirectUri}&scope=user.info.basic,video.upload,video.publish&response_type=code&state=${workspaceId}`;
}
