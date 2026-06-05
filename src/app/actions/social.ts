'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';

export async function getSocialAccounts() {
  try {
    const workspaceId = await getCurrentWorkspaceId()
    if (!workspaceId) return { data: [] }
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('platform_connections')
      .select('platform, status, credentials')
      .eq('workspace_id', workspaceId)
      .in('platform', ['facebook', 'instagram'])
      .eq('status', 'connected')
    if (error) throw error
    return { data: data || [] }
  } catch (error: any) {
    return { error: error.message, data: [] }
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
    const results: any = {};

    for (const platform of postData.platforms) {
      const { data: conn } = await supabase
        .from('platform_connections')
        .select('credentials')
        .eq('workspace_id', workspaceId)
        .eq('platform', platform)
        .eq('status', 'connected')
        .maybeSingle();

      if (!conn?.credentials) {
        results[platform] = { error: `${platform} not connected` };
        continue;
      }

      const creds = conn.credentials as any;

      try {
        if (platform === 'facebook') {
          const { decrypt } = await import('@/lib/encryption');
          const pageToken = decrypt(creds.page_access_token_encrypted);
          const pageId = creds.page_id;

          const body: any = {
            message: postData.content,
            access_token: pageToken
          };

          if (postData.media_urls?.[0]) {
            body.link = postData.media_urls[0];
          }

          const res = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error?.message || 'Facebook post failed');
          results[platform] = { success: true, postId: data.id };
        }

        if (platform === 'instagram') {
          const { decrypt } = await import('@/lib/encryption');
          const pageToken = decrypt(creds.page_access_token_encrypted);
          const igId = creds.instagram_id;

          if (!igId) throw new Error('Instagram not connected. Please connect Instagram first.');

          const imageUrl = postData.media_urls?.[0];
          if (!imageUrl) throw new Error('Instagram requires an image URL to publish.');

          const containerRes = await fetch(`https://graph.facebook.com/v18.0/${igId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              caption: postData.content,
              image_url: imageUrl,
              access_token: pageToken
            })
          });
          const container = await containerRes.json();
          if (!containerRes.ok) throw new Error(container.error?.message || 'Instagram media creation failed');

          const publishRes = await fetch(`https://graph.facebook.com/v18.0/${igId}/media_publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creation_id: container.id,
              access_token: pageToken
            })
          });
          const publishData = await publishRes.json();
          if (!publishRes.ok) throw new Error(publishData.error?.message || 'Instagram publish failed');
          results[platform] = { success: true, postId: publishData.id };
        }

        // Save to DB
        await supabase.from('social_posts').insert({
          workspace_id: workspaceId,
          platforms: [platform],
          content: postData.content,
          media_urls: postData.media_urls || [],
          status: 'published',
          published_at: new Date().toISOString()
        });

      } catch (err: any) {
        results[platform] = { error: err.message };
      }
    }

    const anySuccess = Object.values(results).some((r: any) => r.success);
    const errors = Object.entries(results)
      .filter(([, r]: any) => r.error)
      .map(([platform, r]: any) => `${platform}: ${r.error}`)
      .join(', ');

    if (!anySuccess && errors) return { error: errors };

    return { success: true, results };
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
 return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=pages_manage_posts,instagram_content_publish&state=${workspaceId}`;
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
