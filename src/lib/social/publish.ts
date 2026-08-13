import { logger } from '@/shared/logger';

/**
 * Shared with src/app/actions/social.ts's immediate "Publish now" path and
 * src/app/api/cron/workers/social-scheduled-dispatch/route.ts's deferred dispatch —
 * one implementation per platform, not duplicated between the two call sites.
 */

/**
 * LinkedIn access tokens last ~60 days. LinkedIn only issues a refresh_token if the app has
 * been granted the separate "Programmatic Refresh Tokens" product on the Developer Platform —
 * it's not automatic like X/Google. If no refresh_token was stored (because the app doesn't
 * have that product, or the user connected before it was granted), the only real option is
 * asking the user to reconnect — silently failing or faking a refresh would misreport status.
 */
export async function getValidLinkedInAccessToken(supabase: any, workspaceId: string, creds: any): Promise<string> {
  const { decrypt } = await import('@/lib/encryption');
  const expired = !creds.token_expires_at || new Date(creds.token_expires_at).getTime() < Date.now();
  if (!expired) return decrypt(creds.access_token_encrypted);

  if (!creds.refresh_token_encrypted) throw new Error('LinkedIn token expired. Please reconnect LinkedIn.');

  const refreshToken = decrypt(creds.refresh_token_encrypted);
  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Failed to refresh LinkedIn token. Please reconnect LinkedIn.');

  const { encrypt } = await import('@/lib/encryption');
  const newCreds = {
    ...creds,
    access_token_encrypted: encrypt(data.access_token),
    refresh_token_encrypted: data.refresh_token ? encrypt(data.refresh_token) : creds.refresh_token_encrypted,
    token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
  await supabase.from('platform_connections').update({ credentials: newCreds, last_sync_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId).eq('platform', 'linkedin');

  return data.access_token;
}

/**
 * TikTok access tokens expire in ~24h; refresh_token lasts ~365 days and is always issued
 * (unlike LinkedIn's opt-in product). Same token endpoint, grant_type=refresh_token.
 */
export async function getValidTikTokAccessToken(supabase: any, workspaceId: string, creds: any): Promise<string> {
  const { decrypt } = await import('@/lib/encryption');
  const expired = !creds.token_expires_at || new Date(creds.token_expires_at).getTime() < Date.now();
  if (!expired) return decrypt(creds.access_token_encrypted);

  if (!creds.refresh_token_encrypted) throw new Error('TikTok token expired and no refresh token is stored. Please reconnect TikTok.');

  const refreshToken = decrypt(creds.refresh_token_encrypted);
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Failed to refresh TikTok token. Please reconnect TikTok.');

  const { encrypt } = await import('@/lib/encryption');
  const newCreds = {
    ...creds,
    access_token_encrypted: encrypt(data.access_token),
    refresh_token_encrypted: data.refresh_token ? encrypt(data.refresh_token) : creds.refresh_token_encrypted,
    token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
  await supabase.from('platform_connections').update({ credentials: newCreds, last_sync_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId).eq('platform', 'tiktok');

  return data.access_token;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// TikTok's documented chunk bounds for FILE_UPLOAD: each chunk must be 5MB-64MB, except a
// video small enough to fit in one chunk may be sent as a single chunk of its full size.
const TIKTOK_MIN_CHUNK_BYTES = 5 * 1024 * 1024;
const TIKTOK_MAX_CHUNK_BYTES = 64 * 1024 * 1024;

/**
 * TikTok's Content Posting API is async: initiate -> upload the video bytes -> poll status
 * until the platform confirms PUBLISH_COMPLETE or FAILED. Only returns success on a real
 * PUBLISH_COMPLETE status — never fakes a synchronous success.
 */
export async function publishToTikTok(accessToken: string, content: string, videoUrl: string): Promise<{ postId?: string }> {
  const creatorInfoRes = await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
  });
  const creatorInfo = await creatorInfoRes.json();
  if (!creatorInfoRes.ok || creatorInfo.error?.code !== 'ok') {
    logger.error({ tiktokErrorCode: creatorInfo.error?.code, tiktokErrorMessage: creatorInfo.error?.message }, 'social.tiktok.creator_info.failed');
    throw new Error(`TikTok creator info failed [${creatorInfo.error?.code || 'unknown'}]: ${creatorInfo.error?.message || 'Failed to query TikTok creator info before publishing'}`);
  }
  const privacyLevel = creatorInfo.data?.privacy_level_options?.[0] || 'SELF_ONLY';

  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) throw new Error(`Failed to fetch video from storage (${videoRes.status}) before uploading to TikTok`);
  const videoBuffer = new Uint8Array(await videoRes.arrayBuffer());
  const videoSize = videoBuffer.byteLength;
  const contentType = videoRes.headers.get('Content-Type') || 'video/mp4';

  const chunkSize = videoSize <= TIKTOK_MAX_CHUNK_BYTES ? videoSize : TIKTOK_MIN_CHUNK_BYTES;
  const totalChunkCount = Math.max(1, Math.ceil(videoSize / chunkSize));

  const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      post_info: {
        title: content,
        privacy_level: privacyLevel,
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: videoSize,
        chunk_size: chunkSize,
        total_chunk_count: totalChunkCount,
      },
    }),
  });
  const initData = await initRes.json();
  if (!initRes.ok || initData.error?.code !== 'ok') {
    logger.error({ tiktokErrorCode: initData.error?.code, tiktokErrorMessage: initData.error?.message }, 'social.tiktok.publish_init.failed');
    throw new Error(`TikTok publish init failed [${initData.error?.code || 'unknown'}]: ${initData.error?.message || 'TikTok publish init failed'}`);
  }
  const publishId = initData.data.publish_id;
  const uploadUrl = initData.data.upload_url;
  if (!uploadUrl) throw new Error('TikTok did not return an upload_url for FILE_UPLOAD');

  for (let i = 0; i < totalChunkCount; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, videoSize) - 1;
    const chunk = videoBuffer.subarray(start, end + 1);

    const chunkRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(chunk.byteLength),
        'Content-Range': `bytes ${start}-${end}/${videoSize}`,
      },
      body: chunk,
    });
    if (!chunkRes.ok) {
      const errText = await chunkRes.text().catch(() => '');
      throw new Error(`TikTok video chunk upload failed (chunk ${i + 1}/${totalChunkCount}, status ${chunkRes.status}): ${errText || 'no error body'}`);
    }
  }

  const POLL_INTERVAL_MS = 3000;
  const TIMEOUT_MS = 2 * 60 * 1000;
  const deadline = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const statusRes = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ publish_id: publishId }),
    });
    const statusData = await statusRes.json();
    if (!statusRes.ok || statusData.error?.code !== 'ok') {
      logger.error({ tiktokErrorCode: statusData.error?.code, tiktokErrorMessage: statusData.error?.message }, 'social.tiktok.publish_status.failed');
      throw new Error(`TikTok publish status check failed [${statusData.error?.code || 'unknown'}]: ${statusData.error?.message || 'TikTok publish status check failed'}`);
    }
    const status = statusData.data?.status;
    if (status === 'PUBLISH_COMPLETE') {
      return { postId: statusData.data?.publicaly_available_post_id?.[0] || publishId };
    }
    if (status === 'FAILED') {
      throw new Error(statusData.data?.fail_reason || 'TikTok publish failed');
    }
  }

  throw new Error('TikTok publish timed out waiting for confirmation (2 min) — check TikTok directly before retrying.');
}

/**
 * YouTube reuses the same GOOGLE_CLIENT_ID/SECRET and token endpoint as the existing GSC/Gmail/
 * Calendar Google OAuth flows — no separate Google Cloud OAuth client needed.
 */
export async function getValidYouTubeAccessToken(supabase: any, workspaceId: string, creds: any): Promise<string> {
  const { decrypt } = await import('@/lib/encryption');
  const expired = !creds.token_expires_at || new Date(creds.token_expires_at).getTime() < Date.now();
  if (!expired) return decrypt(creds.access_token_encrypted);

  if (!creds.refresh_token_encrypted) throw new Error('YouTube token expired and no refresh token is stored. Please reconnect YouTube.');

  const refreshToken = decrypt(creds.refresh_token_encrypted);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Failed to refresh YouTube token. Please reconnect YouTube.');

  const { encrypt } = await import('@/lib/encryption');
  const newCreds = {
    ...creds,
    access_token_encrypted: encrypt(data.access_token),
    token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    // Google does not reissue a refresh_token on a refresh_token grant — keep the original.
  };
  await supabase.from('platform_connections').update({ credentials: newCreds, last_sync_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId).eq('platform', 'youtube');

  return data.access_token;
}

/**
 * Resumable upload per YouTube Data API v3: initiate a resumable session with metadata, then
 * PUT the actual video bytes to the returned session URL.
 */
export async function publishToYouTube(accessToken: string, content: string, videoUrl: string): Promise<string> {
  const title = content.slice(0, 100) || 'Untitled';
  const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Upload-Content-Type': 'video/*',
    },
    body: JSON.stringify({
      snippet: { title, description: content },
      status: { privacyStatus: 'public' },
    }),
  });
  if (!initRes.ok) {
    const errData = await initRes.json().catch(() => ({}));
    throw new Error(errData.error?.message || `YouTube upload session init failed (${initRes.status})`);
  }
  const uploadSessionUrl = initRes.headers.get('Location');
  if (!uploadSessionUrl) throw new Error('YouTube did not return a resumable upload session URL');

  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) throw new Error(`Failed to fetch video from storage (${videoRes.status}) before uploading to YouTube`);
  const videoBuffer = await videoRes.arrayBuffer();

  const uploadRes = await fetch(uploadSessionUrl, {
    method: 'PUT',
    headers: { 'Content-Type': videoRes.headers.get('Content-Type') || 'video/mp4' },
    body: videoBuffer,
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(uploadData.error?.message || `YouTube video upload failed (${uploadRes.status})`);

  return uploadData.id;
}

export type PlatformPublishResult = { success: true; postId?: string } | { success: false; error: string };

/**
 * One implementation of "publish this content to this platform" reused by the immediate
 * "Publish now" path (src/app/actions/social.ts) and the scheduled-dispatch cron worker
 * (src/app/api/cron/workers/social-scheduled-dispatch/route.ts) — same API calls, same
 * success-gating (a platform is only ever reported successful after a real API confirmation),
 * same error surfacing.
 */
export async function publishToPlatform(
  supabase: any,
  workspaceId: string,
  platform: string,
  creds: any,
  content: string,
  media_urls?: string[]
): Promise<PlatformPublishResult> {
  try {
    if (platform === 'facebook') {
      const { decrypt } = await import('@/lib/encryption');
      const pageToken = decrypt(creds.page_access_token_encrypted);
      const pageId = creds.page_id;

      const body: any = { message: content, access_token: pageToken };
      if (media_urls?.[0]) body.link = media_urls[0];

      const res = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Facebook post failed');
      return { success: true, postId: data.id };
    }

    if (platform === 'instagram') {
      const { decrypt } = await import('@/lib/encryption');
      const pageToken = decrypt(creds.page_access_token_encrypted);
      const igId = creds.instagram_id;
      if (!igId) throw new Error('Instagram not connected. Please connect Instagram first.');

      const imageUrl = media_urls?.[0];
      if (!imageUrl) throw new Error('Instagram requires an image URL to publish.');

      const containerRes = await fetch(`https://graph.facebook.com/v18.0/${igId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: content, image_url: imageUrl, access_token: pageToken }),
      });
      const container = await containerRes.json();
      if (!containerRes.ok) throw new Error(container.error?.message || 'Instagram media creation failed');

      const publishRes = await fetch(`https://graph.facebook.com/v18.0/${igId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: container.id, access_token: pageToken }),
      });
      const publishData = await publishRes.json();
      if (!publishRes.ok) throw new Error(publishData.error?.message || 'Instagram publish failed');
      return { success: true, postId: publishData.id };
    }

    if (platform === 'linkedin') {
      const accessToken = await getValidLinkedInAccessToken(supabase, workspaceId, creds);
      if (!creds.account_id) throw new Error('LinkedIn connection is missing an account ID. Please reconnect LinkedIn.');

      const mediaUrl = media_urls?.[0];
      const specificContent: any = {
        shareCommentary: { text: content },
        shareMediaCategory: mediaUrl ? 'ARTICLE' : 'NONE',
      };
      if (mediaUrl) specificContent.media = [{ status: 'READY', originalUrl: mediaUrl }];

      const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          author: `urn:li:person:${creds.account_id}`,
          lifecycleState: 'PUBLISHED',
          specificContent: { 'com.linkedin.ugc.ShareContent': specificContent },
          visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `LinkedIn post failed (${res.status})`);
      }
      const postId = res.headers.get('x-restli-id') || res.headers.get('X-RestLi-Id') || undefined;
      return { success: true, postId };
    }

    if (platform === 'tiktok') {
      const videoUrl = media_urls?.[0];
      if (!videoUrl) throw new Error('TikTok requires a video URL to publish.');
      const accessToken = await getValidTikTokAccessToken(supabase, workspaceId, creds);
      const { postId } = await publishToTikTok(accessToken, content, videoUrl);
      return { success: true, postId };
    }

    if (platform === 'youtube') {
      const videoUrl = media_urls?.[0];
      if (!videoUrl) throw new Error('YouTube requires a video URL to publish.');
      const accessToken = await getValidYouTubeAccessToken(supabase, workspaceId, creds);
      const postId = await publishToYouTube(accessToken, content, videoUrl);
      return { success: true, postId };
    }

    logger.warn({ workspaceId, platform }, 'social.post.no_handler');
    return { success: false, error: `No publish handler implemented for ${platform}` };
  } catch (err: any) {
    logger.error({ err, workspaceId, platform }, 'social.post.platform_publish.failed');
    return { success: false, error: err.message || `Failed to publish to ${platform}.` };
  }
}
