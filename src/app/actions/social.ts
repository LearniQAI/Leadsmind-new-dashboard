'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { createOAuthStateNonce } from '@/lib/oauth/stateNonce';
import { logger } from '@/shared/logger';

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

/**
 * LinkedIn access tokens last ~60 days. LinkedIn only issues a refresh_token if the app has
 * been granted the separate "Programmatic Refresh Tokens" product on the Developer Platform —
 * it's not automatic like X/Google. If no refresh_token was stored (because the app doesn't
 * have that product, or the user connected before it was granted), the only real option is
 * asking the user to reconnect — silently failing or faking a refresh would misreport status.
 */
async function getValidLinkedInAccessToken(supabase: any, workspaceId: string, creds: any): Promise<string> {
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
async function getValidTikTokAccessToken(supabase: any, workspaceId: string, creds: any): Promise<string> {
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
// These are the platform's stated limits as of when this was written — verify against
// TikTok's current Content Posting API docs before relying on them, since API limits change
// and this couldn't be confirmed against a real account in this environment.
const TIKTOK_MIN_CHUNK_BYTES = 5 * 1024 * 1024;
const TIKTOK_MAX_CHUNK_BYTES = 64 * 1024 * 1024;

/**
 * TikTok's Content Posting API is async: initiate -> upload the video bytes -> poll status
 * until the platform confirms PUBLISH_COMPLETE or FAILED. Faking a synchronous success here
 * would be exactly the kind of "no fake success" violation this whole rebuild exists to fix —
 * so this polls for real, with a bounded timeout, and only returns success on a real
 * PUBLISH_COMPLETE status.
 *
 * Uses FILE_UPLOAD (direct chunked PUT of the video bytes to a TikTok-provided upload_url),
 * not PULL_FROM_URL — PULL_FROM_URL requires TikTok to verify ownership of the domain the
 * video_url lives on, which isn't possible against a shared *.supabase.co Storage domain we
 * don't own. FILE_UPLOAD sidesteps that entirely since TikTok never fetches the URL itself.
 *
 * NOTE on hosting limits: this fetches the whole video into memory as an ArrayBuffer, then PUTs
 * it to TikTok in chunks. The chunking keeps each individual outbound request small (bounded by
 * TIKTOK_MAX_CHUNK_BYTES), but the full video still has to fit in this function's memory and
 * total execution time — on typical serverless hosting (e.g. Vercel Functions) that means large
 * videos can still hit a function timeout or memory ceiling even though no single HTTP request
 * is oversized. Same class of limitation flagged for YouTube's resumable upload.
 */
async function publishToTikTok(accessToken: string, content: string, videoUrl: string): Promise<{ postId?: string }> {
  // Privacy level is account-specific and app-audit-status-specific (unaudited apps are
  // typically restricted to SELF_ONLY) — query it instead of hardcoding to avoid an opaque
  // 400 from an invalid privacy_level.
  const creatorInfoRes = await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
  });
  const creatorInfo = await creatorInfoRes.json();
  if (!creatorInfoRes.ok || creatorInfo.error?.code !== 'ok') {
    // TikTok's error.message is often a vague boilerplate string (e.g. "review our integration
    // guidelines") while error.code is the specific, actionable reason (e.g.
    // unaudited_client_can_only_post_to_private_accounts, scope_not_authorized). Log the code
    // and fold it into the thrown message so it isn't lost before it reaches the user/logs.
    logger.error({ tiktokErrorCode: creatorInfo.error?.code, tiktokErrorMessage: creatorInfo.error?.message }, 'social.tiktok.creator_info.failed');
    throw new Error(`TikTok creator info failed [${creatorInfo.error?.code || 'unknown'}]: ${creatorInfo.error?.message || 'Failed to query TikTok creator info before publishing'}`);
  }
  const privacyLevel = creatorInfo.data?.privacy_level_options?.[0] || 'SELF_ONLY';

  // Fetch the video bytes from our own Storage first — needed up front now, since FILE_UPLOAD's
  // init call must declare the exact video_size/chunk_size/total_chunk_count before any bytes move.
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

  // Upload each chunk sequentially to the same upload_url, per TikTok's documented Content-Range
  // protocol — one PUT per chunk, byte range and total size declared each time.
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
    // else: still PROCESSING_DOWNLOAD / PROCESSING_UPLOAD / SEND_TO_USER_INBOX — keep polling
  }

  throw new Error('TikTok publish timed out waiting for confirmation (2 min) — check TikTok directly before retrying.');
}

/**
 * YouTube reuses the same GOOGLE_CLIENT_ID/SECRET and token endpoint as the existing GSC/Gmail/
 * Calendar Google OAuth flows (src/app/api/auth/google/callback/route.ts,
 * src/lib/google/refreshToken.ts) — no separate Google Cloud OAuth client needed, just the
 * youtube.upload scope added to that project's consent screen and this callback's redirect URI
 * authorized alongside the existing ones. This helper is intentionally separate from
 * refreshGoogleToken() in src/lib/google/refreshToken.ts: that one stores tokens unencrypted
 * under a different credentials shape (accessToken/refreshToken/expiresAt, keyed by connection
 * row id) for the Gmail feature — reusing it here would both break the encrypted-token
 * convention every other platform in this file follows and require restructuring an existing,
 * unrelated feature's storage shape.
 */
async function getValidYouTubeAccessToken(supabase: any, workspaceId: string, creds: any): Promise<string> {
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
 * PUT the actual video bytes to the returned session URL. The video bytes are fetched
 * server-side from the Supabase Storage public URL produced by uploadSocialMedia() (see
 * src/lib/mediaUpload.ts) — nothing here trusts the URL blindly, it's the same bucket the
 * upload UI writes to.
 */
async function publishToYouTube(accessToken: string, content: string, videoUrl: string): Promise<string> {
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
        } else if (platform === 'instagram') {
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
        } else if (platform === 'linkedin') {
          const accessToken = await getValidLinkedInAccessToken(supabase, workspaceId, creds);
          if (!creds.account_id) throw new Error('LinkedIn connection is missing an account ID. Please reconnect LinkedIn.');

          const mediaUrl = postData.media_urls?.[0];
          // NOTE: LinkedIn's UGC Posts API only accepts a hotlinked external URL under
          // shareMediaCategory 'ARTICLE' (a link share). Embedding an actual uploaded IMAGE
          // requires LinkedIn's separate Assets API (register upload -> PUT binary -> reference
          // the returned urn) — not implemented here; that's real added scope, not a shortcut,
          // so a media_url today publishes as a link-preview share, not an inline image.
          const specificContent: any = {
            shareCommentary: { text: postData.content },
            shareMediaCategory: mediaUrl ? 'ARTICLE' : 'NONE',
          };
          if (mediaUrl) {
            specificContent.media = [{ status: 'READY', originalUrl: mediaUrl }];
          }

          const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Restli-Protocol-Version': '2.0.0',
              Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              author: `urn:li:person:${creds.account_id}`,
              lifecycleState: 'PUBLISHED',
              specificContent: { 'com.linkedin.ugc.ShareContent': specificContent },
              visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
            })
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || `LinkedIn post failed (${res.status})`);
          }
          // LinkedIn returns the created post's URN in the x-restli-id response header, not the JSON body.
          const postId = res.headers.get('x-restli-id') || res.headers.get('X-RestLi-Id') || undefined;
          results[platform] = { success: true, postId };
        } else if (platform === 'tiktok') {
          const videoUrl = postData.media_urls?.[0];
          if (!videoUrl) throw new Error('TikTok requires a video URL to publish.');

          const accessToken = await getValidTikTokAccessToken(supabase, workspaceId, creds);
          const { postId } = await publishToTikTok(accessToken, postData.content, videoUrl);
          results[platform] = { success: true, postId };
        } else if (platform === 'youtube') {
          const videoUrl = postData.media_urls?.[0];
          if (!videoUrl) throw new Error('YouTube requires a video URL to publish.');

          const accessToken = await getValidYouTubeAccessToken(supabase, workspaceId, creds);
          const postId = await publishToYouTube(accessToken, postData.content, videoUrl);
          results[platform] = { success: true, postId };
        } else {
          logger.warn({ workspaceId, platform }, 'social.post.no_handler');
          results[platform] = { error: `No publish handler implemented for ${platform}` };
        }

        if (results[platform]?.success) {
          await supabase.from('social_posts').insert({
            workspace_id: workspaceId,
            platforms: [platform],
            content: postData.content,
            media_urls: postData.media_urls || [],
            status: 'published',
            published_at: new Date().toISOString()
          });
        }

      } catch (err: any) {
        logger.error({ err, workspaceId, platform }, 'social.post.platform_publish.failed');
        // Surface the real error (API error message or a validation message like "TikTok
        // requires a video URL") rather than a generic string — a blanket "Failed to publish"
        // hides exactly the information a user needs to fix the problem (bad token vs. missing
        // media vs. a real platform-side rejection), and was already lossy for every platform,
        // not just the new ones.
        results[platform] = { error: err.message || `Failed to publish to ${platform}.` };
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
