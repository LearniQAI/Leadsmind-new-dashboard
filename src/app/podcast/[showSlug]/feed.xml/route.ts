import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { buildRssFeed, type FeedEpisode } from '@/lib/lms/podcast/rssBuilder';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Public RSS 2.0 + iTunes feed — no auth. Same publish predicate as the streaming route
// (status = 'published' AND publish_at <= now()), enforced here in the query itself rather than
// relied on via RLS alone (service-role client). no-store so an un-publish takes effect on the
// very next fetch, never serving a cached "still live" episode list — podcast-reader-side
// caching (the normal ~30-60min directory poll interval) is expected and unaffected by this;
// this only controls what OUR server itself will ever hand back.
export async function GET(req: NextRequest, { params }: { params: Promise<{ showSlug: string }> }) {
  try {
    const { showSlug } = await params;
    const adminClient = createAdminClient();

    const { data: show, error: showErr } = await adminClient
      .from('podcast_shows')
      .select('*')
      .eq('slug', showSlug)
      .maybeSingle();
    if (showErr) throw showErr;
    if (!show) return NextResponse.json({ error: 'Show not found' }, { status: 404 });

    const nowIso = new Date().toISOString();
    const { data: episodes, error: epErr } = await adminClient
      .from('podcast_episodes')
      .select('id, title, description, episode_number, season_number, slug, publish_at, source_content_block_id, audio_assets!inner(duration_seconds, size_bytes, mime_type)')
      .eq('podcast_show_id', show.id)
      .eq('status', 'published')
      .lte('publish_at', nowIso)
      .order('publish_at', { ascending: false });
    if (epErr) throw epErr;

    const blockIds = (episodes || []).map((e: any) => e.source_content_block_id).filter(Boolean);
    const chaptersByBlock = new Map<string, { title: string; startTimeMs: number }[]>();
    if (blockIds.length > 0) {
      const { data: chapters } = await adminClient
        .from('audio_chapters')
        .select('content_block_id, title, start_time_ms')
        .in('content_block_id', blockIds)
        .order('display_order', { ascending: true });
      for (const c of chapters || []) {
        const list = chaptersByBlock.get(c.content_block_id) || [];
        list.push({ title: c.title, startTimeMs: c.start_time_ms });
        chaptersByBlock.set(c.content_block_id, list);
      }
    }

    const baseUrl = `${req.nextUrl.protocol}//${req.headers.get('host') || req.nextUrl.host}`;

    const feedEpisodes: FeedEpisode[] = (episodes || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      episodeNumber: e.episode_number,
      seasonNumber: e.season_number,
      slug: e.slug,
      publishAt: e.publish_at,
      durationSeconds: e.audio_assets?.duration_seconds ?? null,
      sizeBytes: e.audio_assets?.size_bytes ?? null,
      mimeType: e.audio_assets?.mime_type ?? null,
      chapters: e.source_content_block_id ? chaptersByBlock.get(e.source_content_block_id) : undefined,
    }));

    const xml = buildRssFeed(
      {
        title: show.title,
        description: show.description,
        artworkUrl: show.artwork_url,
        ownerName: show.owner_name,
        ownerEmail: show.owner_email,
        category: show.category,
        explicit: show.explicit,
        language: show.language,
        slug: show.slug,
      },
      feedEpisodes,
      baseUrl
    );

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    logger.error({ err, params }, 'lms.podcast.feed.failed');
    return NextResponse.json({ error: 'Failed to generate feed' }, { status: 500 });
  }
}
