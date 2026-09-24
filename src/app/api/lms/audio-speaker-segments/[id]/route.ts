import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { advancedAuthoringLockedResponse } from '@/lib/lms/audio/advancedAuthoringGuard';

export const dynamic = 'force-dynamic';

async function getOwnedSegment(adminClient: ReturnType<typeof createAdminClient>, id: string, workspaceId: string) {
  const { data, error } = await adminClient
    .from('audio_speaker_segments')
    .select('id, content_blocks!inner(course_lessons!inner(workspace_id))')
    .eq('id', id)
    .eq('content_blocks.course_lessons.workspace_id', workspaceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Drag-to-adjust commit from AudioTimeline (start/end) or a speaker reassignment.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const locked = await advancedAuthoringLockedResponse();
  if (locked) return locked;
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    if (!(await getOwnedSegment(adminClient, id, workspaceId))) throw new NotFoundError('Segment');

    const body = await req.json();
    const { start_time_ms, end_time_ms, speaker_id } = body;
    const updatePayload: any = {};
    if (start_time_ms !== undefined) updatePayload.start_time_ms = start_time_ms;
    if (end_time_ms !== undefined) updatePayload.end_time_ms = end_time_ms;
    if (speaker_id !== undefined) updatePayload.speaker_id = speaker_id;

    if (
      updatePayload.start_time_ms !== undefined &&
      updatePayload.end_time_ms !== undefined &&
      updatePayload.end_time_ms <= updatePayload.start_time_ms
    ) {
      return NextResponse.json({ error: 'end_time_ms must be greater than start_time_ms' }, { status: 400 });
    }

    const { data, error } = await adminClient
      .from('audio_speaker_segments')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'lms.audio_speaker_segments.update.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const locked = await advancedAuthoringLockedResponse();
  if (locked) return locked;
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    if (!(await getOwnedSegment(adminClient, id, workspaceId))) return NextResponse.json({ success: true });

    const { error } = await adminClient.from('audio_speaker_segments').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'lms.audio_speaker_segments.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
