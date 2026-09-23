import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Plain read — no revalidation. Phase 1's admin editor originally reused the /recheck endpoint
// as a read (it re-validates against Drive on every mount); this is the real GET-by-id it should
// have had, used by both that editor and the new Lesson Builder screen's bootstrap load.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    // Workspace ownership is now proven via ANY real attachment (audio_asset_attachments), not
    // a direct column on audio_assets — an asset can be attached to more than one content block.
    const { data: attachment } = await adminClient
      .from('audio_asset_attachments')
      .select('id, content_blocks!inner(course_lessons!inner(workspace_id))')
      .eq('audio_asset_id', id)
      .eq('content_blocks.course_lessons.workspace_id', workspaceId)
      .limit(1)
      .maybeSingle();
    if (!attachment) throw new NotFoundError('Audio asset');

    const { data, error } = await adminClient.from('audio_assets').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Audio asset');

    return NextResponse.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'lms.audio_assets.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
