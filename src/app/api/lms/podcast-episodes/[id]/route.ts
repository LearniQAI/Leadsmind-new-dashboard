import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

async function getOwnedEpisode(adminClient: ReturnType<typeof createAdminClient>, id: string, workspaceId: string) {
  const { data, error } = await adminClient
    .from('podcast_episodes')
    .select('id, status, podcast_shows!inner(workspace_id)')
    .eq('id', id)
    .eq('podcast_shows.workspace_id', workspaceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const owned = await getOwnedEpisode(adminClient, id, workspaceId);
    if (!owned) throw new NotFoundError('Podcast episode');

    const body = await req.json();
    const { title, description, episode_number, season_number, status, publish_at } = body;

    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description;
    if (episode_number !== undefined) updatePayload.episode_number = episode_number;
    if (season_number !== undefined) updatePayload.season_number = season_number;
    if (publish_at !== undefined) updatePayload.publish_at = publish_at;
    if (status !== undefined) {
      if (!['draft', 'scheduled', 'published'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updatePayload.status = status;
      // This is the one line in the whole feature that makes something publicly reachable to
      // anyone with no login — logged distinctly from an ordinary metadata edit, on purpose.
      if (status === 'published' && owned.status !== 'published') {
        logger.info({ episodeId: id, workspaceId }, 'lms.podcast_episodes.published');
      } else if (status !== 'published' && owned.status === 'published') {
        logger.info({ episodeId: id, workspaceId }, 'lms.podcast_episodes.unpublished');
      }
    }

    const { data, error } = await adminClient.from('podcast_episodes').update(updatePayload).eq('id', id).select().single();
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'lms.podcast_episodes.update.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const owned = await getOwnedEpisode(adminClient, id, workspaceId);
    if (!owned) return NextResponse.json({ success: true });

    const { error } = await adminClient.from('podcast_episodes').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'lms.podcast_episodes.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
