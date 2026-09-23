import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { googleDriveLinkProvider } from '@/lib/lms/audio/googleDriveLinkProvider';

export const dynamic = 'force-dynamic';

// Admin-triggered "recheck" — re-validates the stored share link is still accessible, flipping
// status to 'broken' (with the actionable reason) if it no longer is, so a file that gets
// unshared after publishing doesn't silently 404 for students with zero admin-facing signal.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    // Workspace ownership proven via ANY real attachment — see audio-assets/[id]/route.ts.
    const { data: attachment } = await adminClient
      .from('audio_asset_attachments')
      .select('id, content_blocks!inner(course_lessons!inner(workspace_id))')
      .eq('audio_asset_id', id)
      .eq('content_blocks.course_lessons.workspace_id', workspaceId)
      .limit(1)
      .maybeSingle();
    if (!attachment) throw new NotFoundError('Audio asset');

    const { data: asset, error } = await adminClient
      .from('audio_assets')
      .select('id, google_drive_file_id, filename, mime_type, size_bytes')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!asset) throw new NotFoundError('Audio asset');

    const validation = await googleDriveLinkProvider.validate((asset as any).google_drive_file_id);

    const { data: updated, error: updateErr } = await adminClient
      .from('audio_assets')
      .update({
        status: validation.ok ? 'ready' : 'broken',
        last_validation_error: validation.ok ? null : validation.error,
        last_validated_at: new Date().toISOString(),
        filename: validation.metadata?.filename ?? (asset as any).filename,
        mime_type: validation.metadata?.mimeType ?? (asset as any).mime_type,
        size_bytes: validation.metadata?.sizeBytes ?? (asset as any).size_bytes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (updateErr) throw updateErr;

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    logger.error({ err }, 'lms.audio_assets.recheck.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
