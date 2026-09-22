import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, ForbiddenError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { googleDriveLinkProvider } from '@/lib/lms/audio/googleDriveLinkProvider';

export const dynamic = 'force-dynamic';

// Audio Library (Phase 3 Part B, Screen 1): every audio_assets row in the caller's workspace,
// with the course/lesson it's attached to. NOTE on "one audio file, many uses" (the PRD's own
// architecture principle): audio_assets.content_block_id is UNIQUE (Phase 1's migration) — this
// schema is 1:1 today, an asset belongs to exactly one block. Pasting the same Drive link into a
// second lesson creates a SEPARATE row with the same google_drive_file_id, which is genuine
// duplication, not reuse. Real cross-lesson reuse would need dropping that UNIQUE constraint for
// a join table instead — a real schema change, out of scope for this pass; flagged here rather
// than built as UI that implies a capability that doesn't exist yet.
export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const courseId = searchParams.get('courseId');
    const q = searchParams.get('q');

    let query = adminClient
      .from('audio_assets')
      .select(
        'id, filename, mime_type, duration_seconds, size_bytes, status, last_validation_error, last_validated_at, created_at, content_block_id, content_blocks!inner(id, lesson_id, course_lessons!inner(id, title, course_id, workspace_id, courses!inner(id, title)))'
      )
      .eq('content_blocks.course_lessons.workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (status && ['pending', 'ready', 'broken'].includes(status)) {
      query = query.eq('status', status);
    }
    if (courseId) {
      query = query.eq('content_blocks.course_lessons.course_id', courseId);
    }
    if (q) {
      query = query.ilike('filename', `%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'lms.audio_assets.list.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// Creates (or re-points) the one audio_assets row for a drive-mode audio content block: parses
// the pasted Google Drive share link, validates it server-side (public + actually audio), and —
// only on success — flips content_blocks.content.mode to 'drive' and attaches the asset id. A
// failed validation still returns the asset row (status: 'broken') with the actionable error, so
// the admin UI can show it without the block ever silently switching to drive mode on a bad link.
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
      .select('id, type, content, course_lessons!inner(workspace_id)')
      .eq('id', content_block_id)
      .eq('course_lessons.workspace_id', workspaceId)
      .maybeSingle();
    if (blockErr) throw blockErr;
    if (!block) throw new NotFoundError('Content block');
    if ((block as any).type !== 'audio') {
      throw new ForbiddenError('This isn’t an audio block');
    }

    const fileId = googleDriveLinkProvider.parseSourceId(share_url);
    if (!fileId) {
      return NextResponse.json(
        { error: 'That doesn’t look like a Google Drive file link. Paste a link like "https://drive.google.com/file/d/.../view".' },
        { status: 400 }
      );
    }

    const validation = await googleDriveLinkProvider.validate(fileId);

    const assetPayload = {
      content_block_id,
      google_drive_file_id: fileId,
      share_url,
      filename: validation.metadata?.filename ?? null,
      mime_type: validation.metadata?.mimeType ?? null,
      duration_seconds: validation.metadata?.durationSeconds ?? null,
      size_bytes: validation.metadata?.sizeBytes ?? null,
      status: validation.ok ? 'ready' : 'broken',
      last_validation_error: validation.ok ? null : validation.error,
      last_validated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: asset, error: upsertErr } = await adminClient
      .from('audio_assets')
      .upsert(assetPayload, { onConflict: 'content_block_id' })
      .select()
      .single();
    if (upsertErr) throw upsertErr;

    if (validation.ok) {
      const currentContent = (block as any).content || {};
      const { error: patchErr } = await adminClient
        .from('content_blocks')
        .update({
          content: { ...currentContent, mode: 'drive', audio_asset_id: asset.id },
          completion_rule: 'watched_threshold',
          completion_threshold: 90,
          updated_at: new Date().toISOString(),
        })
        .eq('id', content_block_id);
      if (patchErr) throw patchErr;
    }

    return NextResponse.json({ data: asset });
  } catch (err: any) {
    logger.error({ err }, 'lms.audio_assets.create.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
