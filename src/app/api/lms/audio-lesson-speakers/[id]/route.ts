import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { advancedAuthoringLockedResponse } from '@/lib/lms/audio/advancedAuthoringGuard';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const locked = await advancedAuthoringLockedResponse();
  if (locked) return locked;
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data: row } = await adminClient
      .from('audio_lesson_speakers')
      .select('id, content_blocks!inner(course_lessons!inner(workspace_id))')
      .eq('id', id)
      .eq('content_blocks.course_lessons.workspace_id', workspaceId)
      .maybeSingle();
    if (!row) return NextResponse.json({ success: true });

    const { error } = await adminClient.from('audio_lesson_speakers').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'lms.audio_lesson_speakers.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
