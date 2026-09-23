'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { logger } from '@/shared/logger';

export interface AudioBlockAnalytics {
  totalListeners: number;
  averageListenThroughPercent: number | null;
  completionRate: number | null;
  completionThreshold: number;
  durationSeconds: number | null;
  /** Drop-off point for each listener who has NOT completed — their last recorded (peak)
   *  position, in seconds. This is a real proxy for "where they stopped," not a synthetic
   *  number: audio_progress.position_seconds tracks the actual last reported playback position
   *  (see recordAudioProgress) for exactly this reason. */
  dropOffPositionsSeconds: number[];
  /** Populated only when the block has real audio_chapters — drop-offs bucketed into whichever
   *  chapter each position falls within, degrading gracefully (empty array) when no chapters
   *  exist rather than forcing a correlation that isn't meaningful. */
  dropOffByChapter: { chapterTitle: string; count: number }[];
}

// Phase 5: this is what audio_progress (Phase 1's resume/analytics table) was built for —
// listen-through and drop-off are read here, never counted as a second completion source (that
// stays lesson_block_completions, unchanged).
export async function getAudioBlockAnalytics(contentBlockId: string): Promise<{ data?: AudioBlockAnalytics; error?: string }> {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data: block, error: blockErr } = await adminClient
      .from('content_blocks')
      .select('id, completion_threshold, content, course_lessons!inner(workspace_id)')
      .eq('id', contentBlockId)
      .eq('course_lessons.workspace_id', workspaceId)
      .maybeSingle();
    if (blockErr) throw blockErr;
    if (!block) return { error: 'Content block not found' };

    const threshold = (block as any).completion_threshold ?? 90;
    const assetId = (block as any).content?.audio_asset_id;

    let durationSeconds: number | null = null;
    if (assetId) {
      const { data: asset } = await adminClient.from('audio_assets').select('duration_seconds').eq('id', assetId).maybeSingle();
      durationSeconds = asset?.duration_seconds ?? null;
    }

    const { data: progressRows, error: progressErr } = await adminClient
      .from('audio_progress')
      .select('position_seconds, completion_percentage, completed')
      .eq('content_block_id', contentBlockId);
    if (progressErr) throw progressErr;

    const totalListeners = (progressRows || []).length;
    const averageListenThroughPercent =
      totalListeners > 0
        ? Math.round((progressRows!.reduce((sum, r) => sum + (r.completion_percentage || 0), 0) / totalListeners) * 10) / 10
        : null;
    const completedCount = (progressRows || []).filter((r) => r.completed).length;
    const completionRate = totalListeners > 0 ? Math.round((completedCount / totalListeners) * 100) : null;

    const dropOffPositionsSeconds = (progressRows || [])
      .filter((r) => !r.completed)
      .map((r) => r.position_seconds)
      .filter((s): s is number => typeof s === 'number' && s > 0);

    let dropOffByChapter: { chapterTitle: string; count: number }[] = [];
    if (dropOffPositionsSeconds.length > 0) {
      const { data: chapters } = await adminClient
        .from('audio_chapters')
        .select('title, start_time_ms, end_time_ms, display_order')
        .eq('content_block_id', contentBlockId)
        .order('display_order', { ascending: true });

      if (chapters && chapters.length > 0) {
        const counts = new Map<string, number>();
        for (const posSec of dropOffPositionsSeconds) {
          const posMs = posSec * 1000;
          const chapter = chapters.find((c) => posMs >= c.start_time_ms && posMs < c.end_time_ms) || chapters[chapters.length - 1];
          counts.set(chapter.title, (counts.get(chapter.title) || 0) + 1);
        }
        dropOffByChapter = Array.from(counts.entries())
          .map(([chapterTitle, count]) => ({ chapterTitle, count }))
          .sort((a, b) => b.count - a.count);
      }
      // No chapters authored — degrade gracefully, dropOffByChapter stays empty. The raw
      // dropOffPositionsSeconds is still returned for a timestamp-based view either way.
    }

    return {
      data: {
        totalListeners,
        averageListenThroughPercent,
        completionRate,
        completionThreshold: threshold,
        durationSeconds,
        dropOffPositionsSeconds,
        dropOffByChapter,
      },
    };
  } catch (err: any) {
    logger.error({ err, contentBlockId }, 'audio_analytics.get_block.failed');
    return { error: 'Failed to load audio analytics.' };
  }
}
