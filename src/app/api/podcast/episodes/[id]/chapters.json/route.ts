import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Podcast Namespace chapters JSON (https://github.com/Podcastindex-org/podcast-namespace/blob/main/chapters/jsonChapters.md)
// — what the RSS feed's <podcast:chapters> tag points modern podcast apps at. Same publish gate
// as the stream/feed routes, same isolation (only reads podcast_episodes -> audio_chapters via
// source_content_block_id, never course/enrollment tables).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const adminClient = createAdminClient();

    const { data: episode, error } = await adminClient
      .from('podcast_episodes')
      .select('id, status, publish_at, source_content_block_id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;

    const isLive = !!episode && episode.status === 'published' && new Date(episode.publish_at).getTime() <= Date.now();
    if (!isLive) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!episode.source_content_block_id) {
      return NextResponse.json({ version: '1.2.0', chapters: [] }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const { data: chapters } = await adminClient
      .from('audio_chapters')
      .select('title, start_time_ms')
      .eq('content_block_id', episode.source_content_block_id)
      .order('display_order', { ascending: true });

    return NextResponse.json(
      {
        version: '1.2.0',
        chapters: (chapters || []).map((c) => ({ startTime: c.start_time_ms / 1000, title: c.title })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    logger.error({ err, params }, 'lms.podcast.chapters_json.failed');
    return NextResponse.json({ error: 'Failed to load chapters' }, { status: 500 });
  }
}
