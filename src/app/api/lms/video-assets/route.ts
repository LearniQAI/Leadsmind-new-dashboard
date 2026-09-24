import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { ForbiddenError, NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { googleDriveVideoProvider } from '@/lib/lms/video/googleDriveVideoProvider';

export const dynamic = 'force-dynamic';

// Validates a pasted Google Drive video link and, once it's genuinely playable, points a video
// block at it (video_provider = 'gdrive', content_blocks.video_asset_id). One video_assets row per
// (workspace, Drive file): pasting the same file into another lesson reuses the row, and
// re-validating a previously broken link updates that row rather than piling up orphans. Always
// re-validates — pressing Validate is an explicit "check this now", and a file that was ready last
// week may have been unshared since.
//
// A failed validation never touches the block: a block only flips to 'gdrive' once a link is
// really ready, so switching the provider dropdown alone can't leave students with an
// uncompletable, unplayable block.
export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const body = await req.json();
    const { content_block_id, share_url } = body;
    if (!content_block_id || !share_url) {
      return NextResponse.json({ error: 'Missing required fields: content_block_id, share_url' }, { status: 400 });
    }

    const { data: block, error: blockErr } = await adminClient
      .from('content_blocks')
      .select('id, type, completion_threshold, course_lessons!inner(workspace_id)')
      .eq('id', content_block_id)
      .eq('course_lessons.workspace_id', workspaceId)
      .maybeSingle();
    if (blockErr) throw blockErr;
    if (!block) throw new NotFoundError('Content block');
    if ((block as any).type !== 'video') {
      throw new ForbiddenError('This isn’t a video block');
    }

    const fileId = googleDriveVideoProvider.parseSourceId(share_url);
    if (!fileId) {
      return NextResponse.json(
        { error: 'That doesn’t look like a Google Drive file link. Paste a link like "https://drive.google.com/file/d/.../view".' },
        { status: 400 }
      );
    }

    const { data: existing, error: existingErr } = await adminClient
      .from('video_assets')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('google_drive_file_id', fileId)
      .maybeSingle();
    if (existingErr) throw existingErr;

    const validation = await googleDriveVideoProvider.validate(fileId);
    const now = new Date().toISOString();
    const meta = validation.metadata;

    const { data: asset, error: upsertErr } = await adminClient
      .from('video_assets')
      .upsert(
        {
          workspace_id: workspaceId,
          google_drive_file_id: fileId,
          share_url,
          filename: meta?.filename ?? existing?.filename ?? null,
          mime_type: meta?.mimeType ?? existing?.mime_type ?? null,
          size_bytes: meta?.sizeBytes ?? existing?.size_bytes ?? null,
          // Drive only reports duration once it has processed the upload — never overwrite a
          // known duration with a transient null.
          duration_seconds: meta?.durationSeconds ?? existing?.duration_seconds ?? null,
          width: meta?.width ?? existing?.width ?? null,
          height: meta?.height ?? existing?.height ?? null,
          status: validation.ok ? 'ready' : 'broken',
          last_validation_error: validation.ok ? null : validation.error,
          last_validated_at: now,
          updated_at: now,
        },
        { onConflict: 'workspace_id,google_drive_file_id' }
      )
      .select()
      .single();
    if (upsertErr) throw upsertErr;

    if (asset.status === 'ready') {
      const { error: patchErr } = await adminClient
        .from('content_blocks')
        .update({
          video_provider: 'gdrive',
          video_asset_id: asset.id,
          // A native <video> element reports real playback position, so the block keeps (or
          // gains) real watched_threshold tracking — and keeps the instructor's own threshold
          // rather than resetting it to 90 on every re-validate.
          completion_rule: 'watched_threshold',
          completion_threshold: (block as any).completion_threshold ?? 90,
          updated_at: now,
        })
        .eq('id', content_block_id);
      if (patchErr) throw patchErr;
    }

    return NextResponse.json({ data: asset });
  } catch (err: any) {
    logger.error({ err }, 'lms.video_assets.create.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
