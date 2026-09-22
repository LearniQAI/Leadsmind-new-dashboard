import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Reorder / re-timestamp / retype an existing line, or reassign its speaker — the Transcript
// Editor's "edit in place" path (create+delete alone can't cheaply support drag-reorder).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data: row } = await adminClient
      .from('transcript_segments')
      .select('id, content_blocks!inner(course_lessons!inner(workspace_id))')
      .eq('id', id)
      .eq('content_blocks.course_lessons.workspace_id', workspaceId)
      .maybeSingle();
    if (!row) throw new NotFoundError('Transcript line');

    const body = await req.json();
    const { start_time_ms, end_time_ms, text, speaker_id, sequence } = body;
    const updatePayload: any = {};
    if (start_time_ms !== undefined) updatePayload.start_time_ms = start_time_ms;
    if (end_time_ms !== undefined) updatePayload.end_time_ms = end_time_ms;
    if (text !== undefined) updatePayload.text = text;
    if (speaker_id !== undefined) updatePayload.speaker_id = speaker_id;
    if (sequence !== undefined) updatePayload.sequence = sequence;

    const { data, error } = await adminClient
      .from('transcript_segments')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'lms.transcript_segments.update.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data: row } = await adminClient
      .from('transcript_segments')
      .select('id, content_blocks!inner(course_lessons!inner(workspace_id))')
      .eq('id', id)
      .eq('content_blocks.course_lessons.workspace_id', workspaceId)
      .maybeSingle();
    if (!row) return NextResponse.json({ success: true });

    const { error } = await adminClient.from('transcript_segments').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'lms.transcript_segments.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
