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

    const { data, error } = await adminClient
      .from('audio_assets')
      .select('*, content_blocks!inner(course_lessons!inner(workspace_id))')
      .eq('id', id)
      .eq('content_blocks.course_lessons.workspace_id', workspaceId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Audio asset');

    const { content_blocks, ...clean } = data as any;
    return NextResponse.json({ data: clean });
  } catch (err: any) {
    logger.error({ err }, 'lms.audio_assets.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
