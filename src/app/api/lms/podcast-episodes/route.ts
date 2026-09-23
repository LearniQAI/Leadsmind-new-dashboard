import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { googleDriveLinkProvider } from '@/lib/lms/audio/googleDriveLinkProvider';

export const dynamic = 'force-dynamic';

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { searchParams } = new URL(req.url);
    const showId = searchParams.get('showId');
    if (!showId) return NextResponse.json({ error: 'Missing showId parameter' }, { status: 400 });

    const { data: show } = await adminClient.from('podcast_shows').select('id').eq('id', showId).eq('workspace_id', workspaceId).maybeSingle();
    if (!show) throw new NotFoundError('Podcast show');

    const { data, error } = await adminClient
      .from('podcast_episodes')
      .select('*, audio_assets(id, filename, status, duration_seconds)')
      .eq('podcast_show_id', showId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'lms.podcast_episodes.list.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// Creating an episode NEVER publishes it — always lands as status: 'draft' regardless of what
// audio source was used. "Attach audio" and "make public" are deliberately separate actions
// (see the phase report) — publishing is its own explicit PATCH the admin UI gates behind a real
// confirmation step.
//
// Two audio sources, both supported: `existing_audio_asset_id` (reusing a course lesson's
// already-validated asset — the real "one audio file, many uses" case this was built for) OR
// `share_url` (a fresh Drive link for podcast-only content with no course lesson at all).
export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const body = await req.json();
    const { podcast_show_id, title, description, episode_number, season_number, existing_audio_asset_id, share_url } = body;

    if (!podcast_show_id || !title) {
      return NextResponse.json({ error: 'Missing required fields: podcast_show_id, title' }, { status: 400 });
    }
    if (!existing_audio_asset_id && !share_url) {
      return NextResponse.json({ error: 'Provide either existing_audio_asset_id or share_url' }, { status: 400 });
    }

    const { data: show } = await adminClient
      .from('podcast_shows')
      .select('id')
      .eq('id', podcast_show_id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (!show) throw new NotFoundError('Podcast show');

    let audioAssetId: string;
    let sourceContentBlockId: string | null = null;

    if (existing_audio_asset_id) {
      // Prove this asset is genuinely reachable from THIS workspace (via any real attachment)
      // before letting an episode reference it — the same ownership check every other
      // audio_assets route uses.
      const { data: attachment } = await adminClient
        .from('audio_asset_attachments')
        .select('content_block_id, content_blocks!inner(course_lessons!inner(workspace_id))')
        .eq('audio_asset_id', existing_audio_asset_id)
        .eq('content_blocks.course_lessons.workspace_id', workspaceId)
        .limit(1)
        .maybeSingle();
      if (!attachment) throw new NotFoundError('Audio asset');

      const { data: asset } = await adminClient.from('audio_assets').select('id, status').eq('id', existing_audio_asset_id).maybeSingle();
      if (!asset || asset.status !== 'ready') {
        return NextResponse.json({ error: 'This audio asset is not ready — recheck it in the Audio Library first.' }, { status: 400 });
      }
      audioAssetId = asset.id;
      sourceContentBlockId = attachment.content_block_id;
    } else {
      const fileId = googleDriveLinkProvider.parseSourceId(share_url);
      if (!fileId) {
        return NextResponse.json(
          { error: 'That doesn’t look like a Google Drive file link. Paste a link like "https://drive.google.com/file/d/.../view".' },
          { status: 400 }
        );
      }
      const validation = await googleDriveLinkProvider.validate(fileId);
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      const { data: created, error: createErr } = await adminClient
        .from('audio_assets')
        .insert({
          google_drive_file_id: fileId,
          share_url,
          filename: validation.metadata?.filename ?? null,
          mime_type: validation.metadata?.mimeType ?? null,
          duration_seconds: validation.metadata?.durationSeconds ?? null,
          size_bytes: validation.metadata?.sizeBytes ?? null,
          status: 'ready',
          last_validated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (createErr) throw createErr;
      audioAssetId = created.id;
    }

    const baseSlug = slugify(title) || 'episode';
    let slug = baseSlug;
    let attempt = 0;
    while (attempt < 20) {
      const { data: existing } = await adminClient
        .from('podcast_episodes')
        .select('id')
        .eq('podcast_show_id', podcast_show_id)
        .eq('slug', slug)
        .maybeSingle();
      if (!existing) break;
      attempt += 1;
      slug = `${baseSlug}-${attempt + 1}`;
    }

    const { data: episode, error: epErr } = await adminClient
      .from('podcast_episodes')
      .insert({
        podcast_show_id,
        audio_asset_id: audioAssetId,
        source_content_block_id: sourceContentBlockId,
        title,
        description: description || null,
        episode_number: episode_number ?? null,
        season_number: season_number ?? null,
        slug,
        status: 'draft',
        publish_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (epErr) throw epErr;

    return NextResponse.json({ data: episode });
  } catch (err: any) {
    logger.error({ err }, 'lms.podcast_episodes.create.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
