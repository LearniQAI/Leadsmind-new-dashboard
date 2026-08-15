import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';
import { fetchCommentsForPlatform } from '@/lib/social/comments';
import { fetchEngagementMetricsForPlatform } from '@/lib/social/analytics';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Only YouTube, Facebook, and Instagram have a real comment-read API at our current app
// tier (Task 93 audit) — LinkedIn and TikTok are intentionally absent, not an oversight.
const SUPPORTED_PLATFORMS = ['facebook', 'instagram', 'youtube'];

// Mirrors social-scheduled-dispatch's claim pattern: select due rows, then claim each
// individually via a status-guarded UPDATE so two overlapping cron runs can't double-fetch
// the same post. Here "due" means published with a real platform post id and not synced in
// the last 5 minutes (comments trickle in continuously, unlike a one-shot scheduled publish).
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const batchSize = 25;
  const staleBefore = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  try {
    const { data: due, error: dueErr } = await supabaseAdmin
      .from('social_posts')
      .select('id')
      .eq('status', 'published')
      .overlaps('platforms', SUPPORTED_PLATFORMS)
      .or(`comments_last_synced_at.is.null,comments_last_synced_at.lte.${staleBefore}`)
      .order('published_at', { ascending: false })
      .limit(batchSize);
    if (dueErr) throw dueErr;

    if (!due || due.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'No posts due for comment sync' });
    }

    let synced = 0;
    let failed = 0;
    let newComments = 0;

    for (const row of due) {
      // Claim by stamping comments_last_synced_at up front (not a status change — sync jobs
      // repeat forever, unlike scheduled-dispatch's one-shot claim) so a slow run doesn't get
      // picked up again by the next cron tick before it finishes.
      const { data: claimed, error: claimErr } = await supabaseAdmin
        .from('social_posts')
        .update({ comments_last_synced_at: new Date().toISOString() })
        .eq('id', row.id)
        .or(`comments_last_synced_at.is.null,comments_last_synced_at.lte.${staleBefore}`)
        .select('*')
        .maybeSingle();
      if (claimErr) {
        logger.error({ err: claimErr, postId: row.id }, 'cron.social_comment_sync.claim.failed');
        continue;
      }
      if (!claimed) continue; // already claimed by a concurrent run

      try {
        const platformResults = claimed.platform_results || {};
        const platforms: string[] = (claimed.platforms || []).filter((p: string) => SUPPORTED_PLATFORMS.includes(p));

        for (const platform of platforms) {
          const platformPostId = platformResults[platform]?.postId;
          if (!platformPostId) continue; // published before postId persistence was added, or platform failed

          const { data: conn } = await supabaseAdmin
            .from('platform_connections')
            .select('credentials, status')
            .eq('workspace_id', claimed.workspace_id)
            .eq('platform', platform)
            .maybeSingle();
          if (!conn || conn.status !== 'connected' || !conn.credentials) continue;

          try {
            const comments = await fetchCommentsForPlatform(platform, conn.credentials, platformPostId, supabaseAdmin, claimed.workspace_id);

            for (const c of comments) {
              const { error: upsertErr, data: upserted } = await supabaseAdmin
                .from('social_comments')
                .upsert({
                  workspace_id: claimed.workspace_id,
                  post_id: claimed.id,
                  platform,
                  platform_post_id: platformPostId,
                  comment_id: c.commentId,
                  parent_comment_id: c.parentCommentId || null,
                  author_name: c.authorName || null,
                  author_handle: c.authorHandle || null,
                  text: c.text,
                  permalink: c.permalink || null,
                  comment_created_at: c.createdAt,
                  fetched_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }, { onConflict: 'platform,comment_id', ignoreDuplicates: true })
                .select('id');
              if (upsertErr) {
                logger.error({ err: upsertErr, platform, commentId: c.commentId }, 'cron.social_comment_sync.upsert.failed');
              } else if (upserted && upserted.length > 0) {
                newComments++;
              }
            }
            synced++;
          } catch (err: any) {
            logger.error({ err, postId: claimed.id, platform }, 'cron.social_comment_sync.platform_fetch.failed');
            failed++;
          }
        }
      } catch (err: any) {
        logger.error({ err, postId: claimed.id }, 'cron.social_comment_sync.post_failed');
        failed++;
      }
    }

    // Engagement-metrics polling (Task 94) reuses this same worker rather than a third cron
    // variant — same connected accounts, same due-post shape as comment sync — but is claimed
    // independently via metrics_last_synced_at since it's a separate set of API calls with its
    // own success/failure, not tied to comment-sync's claim.
    const { data: metricsDue, error: metricsDueErr } = await supabaseAdmin
      .from('social_posts')
      .select('id')
      .eq('status', 'published')
      .overlaps('platforms', SUPPORTED_PLATFORMS)
      .or(`metrics_last_synced_at.is.null,metrics_last_synced_at.lte.${staleBefore}`)
      .order('published_at', { ascending: false })
      .limit(batchSize);
    if (metricsDueErr) throw metricsDueErr;

    let metricsSynced = 0;
    let metricsFailed = 0;
    let metricPointsWritten = 0;

    for (const row of metricsDue || []) {
      const { data: claimed, error: claimErr } = await supabaseAdmin
        .from('social_posts')
        .update({ metrics_last_synced_at: new Date().toISOString() })
        .eq('id', row.id)
        .or(`metrics_last_synced_at.is.null,metrics_last_synced_at.lte.${staleBefore}`)
        .select('*')
        .maybeSingle();
      if (claimErr) {
        logger.error({ err: claimErr, postId: row.id }, 'cron.social_metrics_sync.claim.failed');
        continue;
      }
      if (!claimed) continue; // already claimed by a concurrent run

      try {
        const platformResults = claimed.platform_results || {};
        const platforms: string[] = (claimed.platforms || []).filter((p: string) => SUPPORTED_PLATFORMS.includes(p));

        for (const platform of platforms) {
          const platformPostId = platformResults[platform]?.postId;
          if (!platformPostId) continue; // published before postId persistence was added, or platform failed

          const { data: conn } = await supabaseAdmin
            .from('platform_connections')
            .select('credentials, status')
            .eq('workspace_id', claimed.workspace_id)
            .eq('platform', platform)
            .maybeSingle();
          if (!conn || conn.status !== 'connected' || !conn.credentials) continue;

          try {
            const points = await fetchEngagementMetricsForPlatform(
              platform,
              conn.credentials,
              platformPostId,
              supabaseAdmin,
              claimed.workspace_id,
              claimed.published_at || claimed.created_at
            );

            for (const p of points) {
              const { error: upsertErr } = await supabaseAdmin
                .from('social_engagement_metrics')
                .upsert({
                  workspace_id: claimed.workspace_id,
                  post_id: claimed.id,
                  platform,
                  platform_post_id: platformPostId,
                  metric_type: p.metricType,
                  metric_date: p.metricDate,
                  value: p.value,
                  fetched_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }, { onConflict: 'platform,platform_post_id,metric_type,metric_date' });
              if (upsertErr) {
                logger.error({ err: upsertErr, platform, metricType: p.metricType }, 'cron.social_metrics_sync.upsert.failed');
              } else {
                metricPointsWritten++;
              }
            }
            metricsSynced++;
          } catch (err: any) {
            logger.error({ err, postId: claimed.id, platform }, 'cron.social_metrics_sync.platform_fetch.failed');
            metricsFailed++;
          }
        }
      } catch (err: any) {
        logger.error({ err, postId: claimed.id }, 'cron.social_metrics_sync.post_failed');
        metricsFailed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: due.length,
      synced,
      failed,
      newComments,
      metricsProcessed: (metricsDue || []).length,
      metricsSynced,
      metricsFailed,
      metricPointsWritten,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'cron.social_comment_sync.failed');
    return NextResponse.json({ error: 'Social comment sync worker failed.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
