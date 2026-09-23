import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { ForbiddenError, NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { AUDIO_ARTWORK_PATH_PREFIX, isOwnedAudioArtworkUrl } from '@/lib/lms/audio/artworkUrl';

export const dynamic = 'force-dynamic';

// Sets / clears an audio block's per-lesson cover art (content_blocks.audio_artwork_url — a real
// column, deliberately not a key inside `content`; see 20260925100001_lms_audio_block_artwork.sql).
// Its own endpoint rather than the generic PATCH so it writes exactly one column and can
// validate that the URL is an image this workspace uploaded to its artwork folder.
//
// Removing/replacing only changes the pointer: the old file stays in storage and in the Media
// Center (the upload registered it there), same as replacing a Speaker Library photo.

async function getOwnedAudioBlock(adminClient: ReturnType<typeof createAdminClient>, id: string, workspaceId: string) {
  const { data: block, error } = await adminClient
    .from('content_blocks')
    .select('id, type, course_lessons!inner(workspace_id)')
    .eq('id', id)
    .eq('course_lessons.workspace_id', workspaceId)
    .maybeSingle();
  if (error) throw error;
  if (!block) throw new NotFoundError('Content block');
  if ((block as any).type !== 'audio') throw new ForbiddenError('Artwork can only be set on an audio block');
  return block;
}

async function writeArtwork(adminClient: ReturnType<typeof createAdminClient>, id: string, url: string | null) {
  const { data, error } = await adminClient
    .from('content_blocks')
    .update({ audio_artwork_url: url, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, audio_artwork_url')
    .single();
  if (error) throw error;
  return data;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();
    await getOwnedAudioBlock(adminClient, id, workspaceId);

    const body = await req.json().catch(() => ({}));
    const expectedPrefix = adminClient.storage
      .from('media')
      .getPublicUrl(`${workspaceId}/${AUDIO_ARTWORK_PATH_PREFIX}/`).data.publicUrl;
    if (!isOwnedAudioArtworkUrl(body?.artwork_url, expectedPrefix)) {
      return NextResponse.json(
        { error: 'That image link isn’t valid artwork for this workspace. Upload the image again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: await writeArtwork(adminClient, id, body.artwork_url) });
  } catch (err: any) {
    logger.error({ err }, 'lms.content-blocks.artwork.set_failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();
    await getOwnedAudioBlock(adminClient, id, workspaceId);
    return NextResponse.json({ data: await writeArtwork(adminClient, id, null) });
  } catch (err: any) {
    logger.error({ err }, 'lms.content-blocks.artwork.clear_failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
