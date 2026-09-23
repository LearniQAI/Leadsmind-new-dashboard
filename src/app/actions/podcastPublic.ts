'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';

// Public, anonymous-safe podcast data fetching — mirrors courseLanding.ts's shape
// ({ error } | payload). Every query here is scoped to explicitly public-safe fields and gates
// on the SAME publish predicate as the streaming/RSS routes (status = 'published' AND
// publish_at <= now()), enforced in the query, not left to RLS alone. None of these queries ever
// join content_blocks/course_lessons/courses/enrollments — there is no code path here that could
// return course or paid-content structure.

export async function getPublicShow(showSlug: string) {
  const adminClient = createAdminClient();

  const { data: show, error } = await adminClient
    .from('podcast_shows')
    .select('id, title, slug, description, artwork_url, category, explicit, language')
    .eq('slug', showSlug)
    .maybeSingle();
  if (error) {
    logger.error({ err: error, showSlug }, 'podcast.public.show.failed');
    return { error: 'Failed to load show' };
  }
  if (!show) return { error: 'Show not found' };

  return { show };
}

export async function getPublicShowEpisodes(showSlug: string, page = 1, pageSize = 20) {
  const adminClient = createAdminClient();

  const { data: show } = await adminClient.from('podcast_shows').select('id').eq('slug', showSlug).maybeSingle();
  if (!show) return { error: 'Show not found' };

  const nowIso = new Date().toISOString();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: episodes, count, error } = await adminClient
    .from('podcast_episodes')
    .select('id, title, description, episode_number, season_number, slug, publish_at, audio_assets!inner(duration_seconds)', { count: 'exact' })
    .eq('podcast_show_id', show.id)
    .eq('status', 'published')
    .lte('publish_at', nowIso)
    .order('publish_at', { ascending: false })
    .range(from, to);
  if (error) {
    logger.error({ err: error, showSlug }, 'podcast.public.episodes.failed');
    return { error: 'Failed to load episodes' };
  }

  return { episodes: episodes || [], total: count || 0, page, pageSize };
}

export async function getPublicEpisode(showSlug: string, episodeSlug: string) {
  const adminClient = createAdminClient();

  const { data: show, error: showErr } = await adminClient
    .from('podcast_shows')
    .select('id, title, slug, artwork_url, category, explicit, language')
    .eq('slug', showSlug)
    .maybeSingle();
  if (showErr) {
    logger.error({ err: showErr, showSlug }, 'podcast.public.episode.show_lookup.failed');
    return { error: 'Failed to load episode' };
  }
  if (!show) return { error: 'Show not found' };

  const nowIso = new Date().toISOString();
  const { data: episode, error: epErr } = await adminClient
    .from('podcast_episodes')
    .select(
      'id, title, description, episode_number, season_number, slug, publish_at, source_content_block_id, audio_assets!inner(duration_seconds, size_bytes, mime_type)'
    )
    .eq('podcast_show_id', show.id)
    .eq('slug', episodeSlug)
    .eq('status', 'published')
    .lte('publish_at', nowIso)
    .maybeSingle();
  if (epErr) {
    logger.error({ err: epErr, showSlug, episodeSlug }, 'podcast.public.episode.failed');
    return { error: 'Failed to load episode' };
  }
  if (!episode) return { error: 'Episode not found' };

  let chapters: { id: string; title: string; start_time_ms: number; end_time_ms: number }[] = [];
  if (episode.source_content_block_id) {
    const { data } = await adminClient
      .from('audio_chapters')
      .select('id, title, start_time_ms, end_time_ms')
      .eq('content_block_id', episode.source_content_block_id)
      .order('display_order', { ascending: true });
    chapters = data || [];
  }

  return { show, episode, chapters };
}
