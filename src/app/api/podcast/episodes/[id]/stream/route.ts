import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { googleDriveLinkProvider } from '@/lib/lms/audio/googleDriveLinkProvider';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Public podcast streaming — deliberately a SEPARATE route from /api/audio/[id]/stream (which is
// enrolment-gated by design and must stay that way). No auth, no user lookup, no enrollment
// check — this route's ONLY gate is the episode's own publish state, checked here in code (not
// relied on via RLS alone, since this uses the service-role client which bypasses RLS entirely).
//
// The query below joins podcast_episodes -> audio_assets ONLY. It never touches content_blocks,
// course_lessons, courses, or enrollments — the same audio_asset backing a paid course lesson
// (via audio_asset_attachments, a completely separate table this route never queries) is
// reachable here with zero risk of leaking course/lesson/pricing structure, because there is no
// code path here that could ever return it.
async function resolveEpisode(episodeId: string) {
  const adminClient = createAdminClient();

  const { data: episode, error } = await adminClient
    .from('podcast_episodes')
    .select('id, status, publish_at, audio_assets!inner(id, google_drive_file_id, status)')
    .eq('id', episodeId)
    .maybeSingle();
  if (error) throw error;
  if (!episode) return { error: 'Not found', status: 404 } as const;

  const isLive = episode.status === 'published' && new Date(episode.publish_at).getTime() <= Date.now();
  if (!isLive) return { error: 'Not found', status: 404 } as const;

  const asset = (episode as any).audio_assets;
  if (asset.status !== 'ready') return { error: 'Audio unavailable', status: 404 } as const;

  return { fileId: asset.google_drive_file_id as string, ok: true } as const;
}

function parseRange(header: string | null): { start: number; end?: number } | undefined {
  if (!header) return undefined;
  const match = /^bytes=(\d+)-(\d*)$/.exec(header.trim());
  if (!match) return undefined;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : undefined;
  if (!Number.isFinite(start)) return undefined;
  return { start, end };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await resolveEpisode(id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const range = parseRange(req.headers.get('range'));
    const stream = await googleDriveLinkProvider.getStream(access.fileId, range);

    return new NextResponse(stream.body as any, {
      status: stream.status,
      // Podcast apps/CDNs are expected to cache the audio bytes themselves — a short
      // public cache here just saves re-hitting Drive on back-to-back range requests from the
      // same player during scrubbing, not a claim that un-publishing propagates instantly to
      // every downstream cache (the RSS/page routes are what must reflect status immediately;
      // see their own no-store headers).
      headers: { ...stream.headers, 'Cache-Control': 'public, max-age=300' },
    });
  } catch (err: any) {
    logger.error({ err, params }, 'lms.podcast.stream.failed');
    return NextResponse.json({ error: 'Failed to stream audio' }, { status: 500 });
  }
}

export async function HEAD(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await resolveEpisode(id);
    if (!access.ok) {
      return new NextResponse(null, { status: access.status });
    }

    const stream = await googleDriveLinkProvider.getStream(access.fileId, { start: 0, end: 0 });
    const headers = { ...stream.headers };
    delete headers['content-length'];
    return new NextResponse(null, { status: 200, headers });
  } catch (err: any) {
    logger.error({ err, params }, 'lms.podcast.stream.head_failed');
    return new NextResponse(null, { status: 500 });
  }
}
