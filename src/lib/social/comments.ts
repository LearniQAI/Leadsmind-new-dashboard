import { logger } from '@/shared/logger';
import { getValidYouTubeAccessToken } from '@/lib/social/publish';

/**
 * Comment read/reply for the three platforms where our current app tier actually supports
 * it (see Task 93 audit): Facebook (pages_read_engagement / pages_manage_engagement),
 * Instagram (instagram_manage_comments), YouTube (youtube.force-ssl). LinkedIn's comment API
 * needs Marketing Developer Platform partner access (same tier that blocks refresh tokens)
 * and TikTok's public Content Posting API has no comment endpoints at any tier — neither has
 * a handler here, and the inbox UI/cron worker must never claim otherwise.
 */

export type FetchedComment = {
  commentId: string;
  parentCommentId?: string;
  authorName?: string;
  authorHandle?: string;
  text: string;
  permalink?: string;
  createdAt: string;
};

export type ReplyResult = { success: true; replyId: string } | { success: false; error: string };

const GRAPH_VERSION = 'v18.0';

export async function getFacebookComments(pageToken: string, postId: string): Promise<FetchedComment[]> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${postId}/comments?fields=id,from,message,created_time,permalink_url&access_token=${encodeURIComponent(pageToken)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Facebook comments fetch failed (${res.status})`);
  return (data.data || []).map((c: any) => ({
    commentId: c.id,
    authorName: c.from?.name,
    authorHandle: c.from?.id,
    text: c.message || '',
    permalink: c.permalink_url,
    createdAt: c.created_time,
  }));
}

export async function replyToFacebookComment(pageToken: string, commentId: string, message: string): Promise<ReplyResult> {
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${commentId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, access_token: pageToken }),
    });
    const data = await res.json();
    if (!res.ok || !data.id) throw new Error(data.error?.message || `Facebook reply failed (${res.status})`);
    return { success: true, replyId: data.id };
  } catch (err: any) {
    logger.error({ err, commentId }, 'social.comments.facebook.reply_failed');
    return { success: false, error: err.message || 'Facebook reply failed' };
  }
}

export async function getInstagramComments(pageToken: string, mediaId: string): Promise<FetchedComment[]> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}/comments?fields=id,username,text,timestamp&access_token=${encodeURIComponent(pageToken)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Instagram comments fetch failed (${res.status})`);
  return (data.data || []).map((c: any) => ({
    commentId: c.id,
    authorHandle: c.username,
    text: c.text || '',
    createdAt: c.timestamp,
  }));
}

export async function replyToInstagramComment(pageToken: string, commentId: string, message: string): Promise<ReplyResult> {
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${commentId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, access_token: pageToken }),
    });
    const data = await res.json();
    if (!res.ok || !data.id) throw new Error(data.error?.message || `Instagram reply failed (${res.status})`);
    return { success: true, replyId: data.id };
  } catch (err: any) {
    logger.error({ err, commentId }, 'social.comments.instagram.reply_failed');
    return { success: false, error: err.message || 'Instagram reply failed' };
  }
}

/**
 * commentThreads.list works with the narrower youtube.readonly scope, but insert (replying)
 * needs youtube.force-ssl — if the stored token was granted before that scope was added to the
 * consent screen, reads may succeed while replies 403 with insufficientPermissions. That's a
 * real "reconnect YouTube" case, not a bug to swallow.
 */
export async function getYouTubeComments(accessToken: string, videoId: string): Promise<FetchedComment[]> {
  const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${encodeURIComponent(videoId)}&maxResults=50&order=time`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `YouTube comments fetch failed (${res.status})`);
  return (data.items || []).map((item: any) => {
    const top = item.snippet.topLevelComment.snippet;
    return {
      commentId: item.snippet.topLevelComment.id,
      authorName: top.authorDisplayName,
      authorHandle: top.authorChannelId?.value,
      text: top.textDisplay || '',
      createdAt: top.publishedAt,
    };
  });
}

export async function replyToYouTubeComment(accessToken: string, parentCommentId: string, text: string): Promise<ReplyResult> {
  try {
    const res = await fetch('https://www.googleapis.com/youtube/v3/comments?part=snippet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ snippet: { parentId: parentCommentId, textOriginal: text } }),
    });
    const data = await res.json();
    if (!res.ok || !data.id) {
      throw new Error(
        data.error?.message ||
        `YouTube reply failed (${res.status})${res.status === 403 ? ' — token may be missing youtube.force-ssl scope; reconnect YouTube.' : ''}`
      );
    }
    return { success: true, replyId: data.id };
  } catch (err: any) {
    logger.error({ err, parentCommentId }, 'social.comments.youtube.reply_failed');
    return { success: false, error: err.message || 'YouTube reply failed' };
  }
}

/**
 * One dispatcher per platform, mirroring publishToPlatform()'s shape, reused by both the
 * polling cron worker and the manual "sync now" path if one is ever added.
 */
export async function fetchCommentsForPlatform(
  platform: string,
  creds: any,
  platformPostId: string,
  supabase: any,
  workspaceId: string
): Promise<FetchedComment[]> {
  const { decrypt } = await import('@/lib/encryption');

  if (platform === 'facebook') {
    return getFacebookComments(decrypt(creds.page_access_token_encrypted), platformPostId);
  }
  if (platform === 'instagram') {
    return getInstagramComments(decrypt(creds.page_access_token_encrypted), platformPostId);
  }
  if (platform === 'youtube') {
    const accessToken = await getValidYouTubeAccessToken(supabase, workspaceId, creds);
    return getYouTubeComments(accessToken, platformPostId);
  }
  throw new Error(`No comment-fetch handler for ${platform}`);
}

export async function replyToPlatformComment(
  platform: string,
  creds: any,
  commentId: string,
  message: string,
  supabase: any,
  workspaceId: string
): Promise<ReplyResult> {
  const { decrypt } = await import('@/lib/encryption');

  if (platform === 'facebook') {
    return replyToFacebookComment(decrypt(creds.page_access_token_encrypted), commentId, message);
  }
  if (platform === 'instagram') {
    return replyToInstagramComment(decrypt(creds.page_access_token_encrypted), commentId, message);
  }
  if (platform === 'youtube') {
    const accessToken = await getValidYouTubeAccessToken(supabase, workspaceId, creds);
    return replyToYouTubeComment(accessToken, commentId, message);
  }
  return { success: false, error: `No reply handler for ${platform}` };
}
