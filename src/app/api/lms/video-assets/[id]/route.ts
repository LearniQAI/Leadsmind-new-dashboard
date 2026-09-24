import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Plain workspace-scoped read for the block editor — no revalidation (that's /recheck).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('video_assets')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Video asset');

    return NextResponse.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'lms.video_assets.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
