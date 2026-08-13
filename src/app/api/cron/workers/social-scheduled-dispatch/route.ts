import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';
import { publishToPlatform } from '@/lib/social/publish';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Composer's "Schedule" button inserts a social_posts row with status='scheduled' and a
// scheduled_at timestamp (src/app/actions/social.ts's createSocialPost); nothing else ever
// picks that row up and actually publishes it. This is that sweep — same shared
// publishToPlatform() implementation the immediate "Publish now" path uses, so scheduled and
// immediate posts get identical real API calls and success-gating (a platform is only ever
// marked published after a real API confirmation, never optimistically).
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const nowIso = new Date().toISOString();
  const batchSize = 25;

  try {
    // Find due rows first, then claim each individually with a status-guarded UPDATE
    // (WHERE status = 'scheduled') so two overlapping worker runs can't both pick up
    // and double-publish the same row — the second run's UPDATE affects 0 rows.
    const { data: due, error: dueErr } = await supabaseAdmin
      .from('social_posts')
      .select('id')
      .eq('status', 'scheduled')
      .lte('scheduled_at', nowIso)
      .order('scheduled_at', { ascending: true })
      .limit(batchSize);
    if (dueErr) throw dueErr;

    if (!due || due.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'No due scheduled posts' });
    }

    let published = 0;
    let failed = 0;

    for (const row of due) {
      const { data: claimed, error: claimErr } = await supabaseAdmin
        .from('social_posts')
        .update({ status: 'publishing', updated_at: new Date().toISOString() })
        .eq('id', row.id)
        .eq('status', 'scheduled')
        .select('*')
        .maybeSingle();
      if (claimErr) {
        logger.error({ err: claimErr, postId: row.id }, 'cron.social_scheduled_dispatch.claim.failed');
        continue;
      }
      if (!claimed) continue; // already claimed by a concurrent run

      try {
        const platforms: string[] = claimed.platforms || [];
        if (!platforms.length) {
          await supabaseAdmin.from('social_posts').update({
            status: 'failed',
            error_message: 'No platforms set on scheduled post.',
            updated_at: new Date().toISOString(),
          }).eq('id', claimed.id);
          failed++;
          continue;
        }

        const { data: connections } = await supabaseAdmin
          .from('platform_connections')
          .select('platform, credentials, status')
          .eq('workspace_id', claimed.workspace_id)
          .in('platform', platforms);
        const connMap = new Map((connections || []).map((c: any) => [c.platform, c]));

        const platformResults: Record<string, { success: boolean; postId?: string; error?: string }> = {};

        for (const platform of platforms) {
          const conn = connMap.get(platform);
          if (!conn || conn.status !== 'connected' || !conn.credentials) {
            // Fail this specific platform clearly rather than crashing the worker run or
            // silently skipping it — same discipline the requirements called out for TikTok's
            // account-privacy failures applies to every "can't actually publish" reason.
            platformResults[platform] = { success: false, error: `${platform} is not connected` };
            continue;
          }

          const result = await publishToPlatform(
            supabaseAdmin,
            claimed.workspace_id,
            platform,
            conn.credentials,
            claimed.content,
            claimed.media_urls
          );
          if ('error' in result) {
            platformResults[platform] = { success: false, error: result.error };
          } else {
            platformResults[platform] = { success: true, postId: result.postId };
          }
        }

        const anySuccess = Object.values(platformResults).some(r => r.success);
        const errorSummary = Object.entries(platformResults)
          .filter(([, r]) => !r.success)
          .map(([platform, r]) => `${platform}: ${r.error}`)
          .join('; ');

        await supabaseAdmin.from('social_posts').update({
          status: anySuccess ? 'published' : 'failed',
          published_at: anySuccess ? new Date().toISOString() : null,
          platform_results: platformResults,
          error_message: errorSummary || null,
          updated_at: new Date().toISOString(),
        }).eq('id', claimed.id);

        if (anySuccess) published++; else failed++;
      } catch (err: any) {
        logger.error({ err, postId: claimed.id }, 'cron.social_scheduled_dispatch.post_failed');
        await supabaseAdmin.from('social_posts').update({
          status: 'failed',
          error_message: err.message || 'Scheduled dispatch failed unexpectedly.',
          updated_at: new Date().toISOString(),
        }).eq('id', claimed.id);
        failed++;
      }
    }

    return NextResponse.json({ success: true, processed: due.length, published, failed });
  } catch (error: any) {
    logger.error({ err: error }, 'cron.social_scheduled_dispatch.failed');
    return NextResponse.json({ error: 'Social scheduled dispatch worker failed.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
