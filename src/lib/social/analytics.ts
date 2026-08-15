import { logger } from '@/shared/logger';
import { getValidYouTubeAccessToken } from '@/lib/social/publish';

/**
 * Engagement-metrics read for the three platforms where our current app tier actually supports
 * it (see Task 94 audit, same tier ceiling as Task 93's comment inbox): Facebook Page/post
 * Insights (read_insights), Instagram media Insights (instagram_manage_insights), YouTube
 * Analytics (yt-analytics.readonly). LinkedIn analytics need Marketing Developer Platform
 * partner access and TikTok's public Content Posting API has no analytics/insights endpoints at
 * any tier — neither has a handler here, and the analytics UI/cron worker must never claim
 * otherwise. None of the three scopes above were previously requested by any connect flow, so
 * every currently-connected token is missing them until the workspace reconnects.
 */

export type EngagementMetricPoint = {
  metricType: string;
  value: number;
  metricDate: string; // YYYY-MM-DD
};

const GRAPH_VERSION = 'v18.0';

// Post-level metrics available via read_insights on a Page post. Live-tested against a real
// published post (not assumed from docs): post_impressions / post_impressions_unique /
// post_engaged_users all 400 with "must be a valid insights metric" on the currently-connected
// token's API version — Meta has deprecated those names. post_clicks, post_reactions_like_total,
// and post_video_views are the scalar metrics that actually returned 200. post_reactions_by_type_total
// also returns 200 but its value is a breakdown object (per reaction type), not a scalar — excluded
// here rather than coerced to a number, since Number({...}) silently becomes 0/NaN, which would be
// exactly the "fake a value that isn't real" failure mode this ingestion is required to avoid.
const FACEBOOK_POST_METRICS = ['post_clicks', 'post_reactions_like_total', 'post_video_views'];

export async function getFacebookPostInsights(pageToken: string, postId: string): Promise<EngagementMetricPoint[]> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${postId}/insights?metric=${FACEBOOK_POST_METRICS.join(',')}&access_token=${encodeURIComponent(pageToken)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Facebook post insights fetch failed (${res.status})`);
  const today = new Date().toISOString().slice(0, 10);
  return (data.data || []).map((m: any) => ({
    metricType: m.name,
    value: Number(m.values?.[0]?.value) || 0,
    metricDate: m.values?.[0]?.end_time ? String(m.values[0].end_time).slice(0, 10) : today,
  }));
}

// 'impressions' is omitted deliberately: Meta deprecated it for IG media insights on current
// Graph API versions (requesting it 400s), not an oversight.
const INSTAGRAM_MEDIA_METRICS = ['reach', 'saved', 'likes', 'comments', 'shares'];

export async function getInstagramMediaInsights(pageToken: string, mediaId: string): Promise<EngagementMetricPoint[]> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}/insights?metric=${INSTAGRAM_MEDIA_METRICS.join(',')}&access_token=${encodeURIComponent(pageToken)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Instagram media insights fetch failed (${res.status})`);
  const today = new Date().toISOString().slice(0, 10);
  return (data.data || []).map((m: any) => ({
    metricType: m.name,
    value: Number(m.values?.[0]?.value) || 0,
    metricDate: today,
  }));
}

const YOUTUBE_VIDEO_METRICS = ['views', 'likes', 'comments', 'shares', 'estimatedMinutesWatched', 'subscribersGained'];

/**
 * youtubeAnalytics.reports.query with dimensions=day over [publishedAt, today] returns a real
 * per-day series in one call (unlike Facebook/Instagram's lifetime-snapshot insights) — ingest
 * every row rather than collapsing to a single current total.
 */
export async function getYouTubeVideoInsights(accessToken: string, videoId: string, publishedAt: string): Promise<EngagementMetricPoint[]> {
  const startDate = publishedAt.slice(0, 10);
  const endDate = new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({
    ids: 'channel==MINE',
    startDate,
    endDate,
    metrics: YOUTUBE_VIDEO_METRICS.join(','),
    dimensions: 'day',
    filters: `video==${videoId}`,
  });
  const res = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data.error?.message ||
      `YouTube Analytics fetch failed (${res.status})${res.status === 403 ? ' — token may be missing yt-analytics.readonly scope; reconnect YouTube.' : ''}`
    );
  }

  const columnNames: string[] = (data.columnHeaders || []).map((c: any) => c.name);
  const dayIdx = columnNames.indexOf('day');
  const points: EngagementMetricPoint[] = [];
  for (const row of data.rows || []) {
    const metricDate = dayIdx >= 0 ? row[dayIdx] : endDate;
    columnNames.forEach((name, i) => {
      if (name === 'day') return;
      points.push({ metricType: name, value: Number(row[i]) || 0, metricDate });
    });
  }
  return points;
}

/**
 * One dispatcher per platform, mirroring fetchCommentsForPlatform()'s shape, reused by the
 * polling cron worker.
 */
export async function fetchEngagementMetricsForPlatform(
  platform: string,
  creds: any,
  platformPostId: string,
  supabase: any,
  workspaceId: string,
  publishedAt: string
): Promise<EngagementMetricPoint[]> {
  const { decrypt } = await import('@/lib/encryption');

  if (platform === 'facebook') {
    return getFacebookPostInsights(decrypt(creds.page_access_token_encrypted), platformPostId);
  }
  if (platform === 'instagram') {
    return getInstagramMediaInsights(decrypt(creds.page_access_token_encrypted), platformPostId);
  }
  if (platform === 'youtube') {
    const accessToken = await getValidYouTubeAccessToken(supabase, workspaceId, creds);
    return getYouTubeVideoInsights(accessToken, platformPostId, publishedAt);
  }
  throw new Error(`No engagement-metrics handler for ${platform}`);
}
