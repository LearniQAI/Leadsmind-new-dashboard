'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { createOAuthStateNonce } from '@/lib/oauth/stateNonce';
import { logger } from '@/shared/logger';
import { publishToPlatform } from '@/lib/social/publish';

// getMetaAuthUrl below is confirmed dead in this file — messaging.ts's getMetaAuthUrl is what's
// actually wired up for Meta. getLinkedInAuthUrl/getTikTokAuthUrl now mint a real opaque nonce
// via createOAuthStateNonce() (same pattern as messaging.ts's getMetaAuthUrl), so they're safe
// to wire to a real "Connect" button.

export async function getSocialAccounts() {
  try {
    const supabase = await createServerClient()
    const { workspaceId } = await requireWorkspaceAccess()
    const { data, error } = await supabase
      .from('platform_connections')
      .select('platform, status, credentials')
      .eq('workspace_id', workspaceId)
      .in('platform', ['facebook', 'instagram', 'linkedin', 'tiktok', 'youtube'])
      .eq('status', 'connected')
    if (error) throw error
    return { data: data || [] }
  } catch (error: any) {
    logger.error({ err: error }, 'social.accounts.fetch.failed')
    return { error: 'Failed to fetch social accounts.', data: [] }
  }
}

export async function getSocialPosts() {
 try {
  const supabase = await createServerClient();
  const { workspaceId } = await requireWorkspaceAccess();

  const { data, error } = await supabase
   .from('social_posts')
   .select('*')
   .eq('workspace_id', workspaceId)
   .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'social.posts.fetch.failed');
  return { error: 'Failed to fetch social posts.' };
 }
}

export async function createSocialPost(postData: {
  platforms: string[];
  content: string;
  media_urls?: string[];
  scheduled_at?: string;
}) {
  let workspaceId: string | null = null;
  try {
    const supabase = await createServerClient();
    ({ workspaceId } = await requireWorkspaceAccess());

    if (!postData.platforms?.length) return { error: 'Select at least one platform.' };
    if (!postData.content?.trim()) return { error: 'Post content is required.' };

    // Scheduled path: persist a 'scheduled' row and let the cron dispatch worker
    // (src/app/api/cron/workers/social-scheduled-dispatch) do the actual publish
    // at the scheduled time. Never publish immediately here when scheduled_at is set —
    // that would make "Schedule" silently behave like "Publish now".
    if (postData.scheduled_at) {
      const scheduledDate = new Date(postData.scheduled_at);
      if (Number.isNaN(scheduledDate.getTime())) return { error: 'Invalid scheduled date/time.' };
      if (scheduledDate.getTime() <= Date.now()) return { error: 'Scheduled time must be in the future.' };

      const { data: connections } = await supabase
        .from('platform_connections')
        .select('platform')
        .eq('workspace_id', workspaceId)
        .eq('status', 'connected')
        .in('platform', postData.platforms);
      const connectedSet = new Set((connections || []).map((c: any) => c.platform));
      const notConnected = postData.platforms.filter(p => !connectedSet.has(p));
      if (notConnected.length) return { error: `Not connected: ${notConnected.join(', ')}` };

      const { data: inserted, error: insertErr } = await supabase
        .from('social_posts')
        .insert({
          workspace_id: workspaceId,
          platforms: postData.platforms,
          content: postData.content,
          media_urls: postData.media_urls || [],
          status: 'scheduled',
          scheduled_at: scheduledDate.toISOString(),
        })
        .select('id, scheduled_at')
        .single();
      if (insertErr) throw insertErr;

      return { success: true, scheduled: true, post: inserted };
    }

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

      const result = await publishToPlatform(supabase, workspaceId, platform, conn.credentials, postData.content, postData.media_urls);
      if ('error' in result) {
        results[platform] = { error: result.error };
      } else {
        results[platform] = { success: true, postId: result.postId };
      }

      if (results[platform]?.success) {
        // Comment polling (social_comments) keys off platform_results[platform].postId to
        // know which post/media to fetch comments for — without this, immediately-published
        // posts (as opposed to scheduled ones, which the dispatch worker already stamps)
        // would be invisible to the comment sync worker even though they published fine.
        await supabase.from('social_posts').insert({
          workspace_id: workspaceId,
          platforms: [platform],
          content: postData.content,
          media_urls: postData.media_urls || [],
          status: 'published',
          published_at: new Date().toISOString(),
          platform_results: { [platform]: { success: true, postId: results[platform].postId } },
        });
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
    logger.error({ err: error, workspaceId }, 'social.post.create.failed');
    return { error: 'Failed to create social post.' };
  }
}

export async function updateScheduledPost(postId: string, updates: {
  content?: string;
  media_urls?: string[];
  platforms?: string[];
  scheduled_at?: string;
}) {
  try {
    const supabase = await createServerClient();
    const { workspaceId } = await requireWorkspaceAccess();

    const { data: existing, error: fetchErr } = await supabase
      .from('social_posts')
      .select('id, status')
      .eq('id', postId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return { error: 'Post not found.' };
    if (existing.status !== 'scheduled') return { error: `Cannot edit a post with status "${existing.status}".` };

    const patch: any = {};
    if (updates.content !== undefined) {
      if (!updates.content.trim()) return { error: 'Post content is required.' };
      patch.content = updates.content;
    }
    if (updates.media_urls !== undefined) patch.media_urls = updates.media_urls;
    if (updates.platforms !== undefined) {
      if (!updates.platforms.length) return { error: 'Select at least one platform.' };
      patch.platforms = updates.platforms;
    }
    if (updates.scheduled_at !== undefined) {
      const scheduledDate = new Date(updates.scheduled_at);
      if (Number.isNaN(scheduledDate.getTime())) return { error: 'Invalid scheduled date/time.' };
      if (scheduledDate.getTime() <= Date.now()) return { error: 'Scheduled time must be in the future.' };
      patch.scheduled_at = scheduledDate.toISOString();
    }
    patch.updated_at = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from('social_posts')
      .update(patch)
      .eq('id', postId)
      .eq('workspace_id', workspaceId)
      .eq('status', 'scheduled');
    if (updateErr) throw updateErr;

    return { success: true };
  } catch (error: any) {
    logger.error({ err: error }, 'social.post.update_scheduled.failed');
    return { error: 'Failed to update scheduled post.' };
  }
}

export async function cancelScheduledPost(postId: string) {
  try {
    const supabase = await createServerClient();
    const { workspaceId } = await requireWorkspaceAccess();

    const { data, error } = await supabase
      .from('social_posts')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', postId)
      .eq('workspace_id', workspaceId)
      .eq('status', 'scheduled')
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return { error: 'Post is not in a cancellable (scheduled) state.' };

    return { success: true };
  } catch (error: any) {
    logger.error({ err: error }, 'social.post.cancel_scheduled.failed');
    return { error: 'Failed to cancel scheduled post.' };
  }
}

// OAUTH URL GENERATORS
export async function getMetaAuthUrl() {
 const { workspaceId } = await requireWorkspaceAccess();
 const appId = process.env.META_APP_ID;
 const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/facebook`;
 return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=pages_manage_posts,instagram_content_publish&state=${workspaceId}`;
}

export async function getLinkedInAuthUrl() {
 // Mints a real opaque nonce bound server-side to the authenticated user + workspace — never
 // pass the raw workspaceId as `state` (see file header note: that was the pre-fix bug).
 const { nonce } = await createOAuthStateNonce('linkedin');
 const clientId = process.env.LINKEDIN_CLIENT_ID;
 const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/linkedin`;
 return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('openid profile w_member_social')}&state=${nonce}`;
}

export async function getTikTokAuthUrl() {
 const { nonce } = await createOAuthStateNonce('tiktok');
 const clientKey = process.env.TIKTOK_CLIENT_KEY;
 const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/tiktok`;
 return `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('user.info.basic,video.publish')}&response_type=code&state=${nonce}`;
}

/**
 * Reuses the same Google OAuth client (GOOGLE_CLIENT_ID/SECRET) already registered for GSC/
 * Gmail/Calendar (see src/app/actions/seo.ts's getGoogleAuthUrl) — a single Google Cloud OAuth
 * client can request multiple scopes and have multiple authorized redirect URIs, so this only
 * needs youtube.upload added to that project's consent screen and this route's redirect URI
 * added to the authorized list, not a whole new client.
 */
export async function getYouTubeAuthUrl() {
 const { nonce } = await createOAuthStateNonce('youtube');
 const clientId = process.env.GOOGLE_CLIENT_ID;
 const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/youtube`;
 const scope = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly';
 return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${nonce}`;
}
