import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { googleDriveVideoProvider } from '@/lib/lms/video/googleDriveVideoProvider';

export const dynamic = 'force-dynamic';

// Admin-triggered "recheck" — re-validates that the stored Drive link is still accessible and
// still a playable video, flipping status to 'broken' (with the actionable reason) if not, so a
// file unshared after publishing doesn't silently fail for students with no admin-facing signal.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data: asset, error } = await adminClient
      .from('video_assets')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (error) throw error;
    if (!asset) throw new NotFoundError('Video asset');

    const validation = await googleDriveVideoProvider.validate(asset.google_drive_file_id);
    const meta = validation.metadata;
    const now = new Date().toISOString();

    const { data: updated, error: updateErr } = await adminClient
      .from('video_assets')
      .update({
        status: validation.ok ? 'ready' : 'broken',
        last_validation_error: validation.ok ? null : validation.error,
        last_validated_at: now,
        filename: meta?.filename ?? asset.filename,
        mime_type: meta?.mimeType ?? asset.mime_type,
        size_bytes: meta?.sizeBytes ?? asset.size_bytes,
        duration_seconds: meta?.durationSeconds ?? asset.duration_seconds,
        width: meta?.width ?? asset.width,
        height: meta?.height ?? asset.height,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();
    if (updateErr) throw updateErr;

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    logger.error({ err }, 'lms.video_assets.recheck.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
