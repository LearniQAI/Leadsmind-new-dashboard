import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, ForbiddenError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { googleDriveLinkProvider } from '@/lib/lms/audio/googleDriveLinkProvider';

export const dynamic = 'force-dynamic';

// Audio Library (Phase 3 Part B, Screen 1): every audio_assets row in the caller's workspace,
// with EVERY content_block/lesson/course it's attached to — real "one audio file, many uses"
// (audio_asset_attachments is a real many-to-many join table as of the reuse-enabling
// migration; audio_assets itself no longer carries a content_block_id). Queried from the
// attachment side (workspace-filterable there) and grouped client-side into one row per asset.
export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const courseId = searchParams.get('courseId');
    const q = searchParams.get('q');

    let attachQuery = adminClient
      .from('audio_asset_attachments')
      .select(
        'audio_asset_id, content_block_id, content_blocks!inner(id, lesson_id, course_lessons!inner(id, title, course_id, workspace_id, courses!inner(id, title)))'
      )
      .eq('content_blocks.course_lessons.workspace_id', workspaceId);
    if (courseId) {
      attachQuery = attachQuery.eq('content_blocks.course_lessons.course_id', courseId);
    }

    const { data: attachments, error: attachErr } = await attachQuery;
    if (attachErr) throw attachErr;

    const assetIds = Array.from(new Set((attachments || []).map((a: any) => a.audio_asset_id)));
    if (assetIds.length === 0) return NextResponse.json({ data: [] });

    let assetQuery = adminClient
      .from('audio_assets')
      .select('id, filename, mime_type, duration_seconds, size_bytes, status, last_validation_error, created_at')
      .in('id', assetIds)
      .order('created_at', { ascending: false });
    if (status && ['pending', 'ready', 'broken'].includes(status)) {
      assetQuery = assetQuery.eq('status', status);
    }
    if (q) {
      assetQuery = assetQuery.ilike('filename', `%${q}%`);
    }

    const { data: assets, error: assetErr } = await assetQuery;
    if (assetErr) throw assetErr;

    const attachmentsByAsset = new Map<string, any[]>();
    for (const a of attachments || []) {
      const list = attachmentsByAsset.get((a as any).audio_asset_id) || [];
      list.push({
        content_block_id: (a as any).content_block_id,
        lesson: (a as any).content_blocks?.course_lessons,
      });
      attachmentsByAsset.set((a as any).audio_asset_id, list);
    }

    const data = (assets || []).map((asset: any) => ({
      ...asset,
      attachments: attachmentsByAsset.get(asset.id) || [],
    }));

    return NextResponse.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'lms.audio_assets.list.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// Validates a pasted Drive link and attaches it to a content block via audio_asset_attachments.
// Real reuse: if this workspace already has a READY asset for the same Drive file (same
// google_drive_file_id), that existing row is reused — attached again, not re-validated and not
// duplicated — which is what makes "one audio file, many uses" actually show up in the Audio
// Library rather than just being schema-possible. Re-pasting a different link into an
// already-configured block re-points its one attachment (content_block_id stays UNIQUE on the
// join table — a block still plays exactly one asset).
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

    // Reuse check: any existing, already-validated asset for this exact Drive file, already
    // attached to something in this workspace.
    const { data: existingAttachments } = await adminClient
      .from('audio_asset_attachments')
      .select('audio_asset_id, content_blocks!inner(course_lessons!inner(workspace_id))')
      .eq('content_blocks.course_lessons.workspace_id', workspaceId);
    const candidateAssetIds = Array.from(new Set((existingAttachments || []).map((a: any) => a.audio_asset_id)));

    let asset: any = null;
    if (candidateAssetIds.length > 0) {
      const { data: reusable } = await adminClient
        .from('audio_assets')
        .select('*')
        .in('id', candidateAssetIds)
        .eq('google_drive_file_id', fileId)
        .eq('status', 'ready')
        .limit(1)
        .maybeSingle();
      asset = reusable ?? null;
    }

    if (!asset) {
      const validation = await googleDriveLinkProvider.validate(fileId);

      const assetPayload = {
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

      const { data: created, error: insertErr } = await adminClient
        .from('audio_assets')
        .insert(assetPayload)
        .select()
        .single();
      if (insertErr) throw insertErr;
      asset = created;
    }

    if (asset.status === 'ready') {
      const { error: attachErr } = await adminClient
        .from('audio_asset_attachments')
        .upsert({ audio_asset_id: asset.id, content_block_id }, { onConflict: 'content_block_id' });
      if (attachErr) throw attachErr;

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
