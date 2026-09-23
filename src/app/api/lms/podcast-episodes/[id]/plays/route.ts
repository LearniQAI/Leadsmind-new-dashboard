import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Lifetime + last-30-days request counts for one episode — plain aggregate sums over the
// per-day counter rows, no per-request data exists anywhere to aggregate more granularly than
// this (see the migration's own privacy reasoning).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data: episode } = await adminClient
      .from('podcast_episodes')
      .select('id, podcast_shows!inner(workspace_id)')
      .eq('id', id)
      .eq('podcast_shows.workspace_id', workspaceId)
      .maybeSingle();
    if (!episode) throw new NotFoundError('Podcast episode');

    const { data: rows, error } = await adminClient
      .from('podcast_episode_plays')
      .select('play_date, request_count')
      .eq('podcast_episode_id', id)
      .order('play_date', { ascending: false });
    if (error) throw error;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const lifetimeTotal = (rows || []).reduce((sum, r) => sum + r.request_count, 0);
    const last30DaysTotal = (rows || []).filter((r) => r.play_date >= thirtyDaysAgo).reduce((sum, r) => sum + r.request_count, 0);

    return NextResponse.json({ data: { lifetimeTotal, last30DaysTotal } });
  } catch (err: any) {
    logger.error({ err }, 'lms.podcast_episode_plays.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
