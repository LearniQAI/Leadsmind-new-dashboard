import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data: row } = await adminClient
      .from('audio_chapters')
      .select('id, content_blocks!inner(course_lessons!inner(workspace_id))')
      .eq('id', id)
      .eq('content_blocks.course_lessons.workspace_id', workspaceId)
      .maybeSingle();
    if (!row) throw new NotFoundError('Chapter');

    const body = await req.json();
    const { title, start_time_ms, end_time_ms, display_order } = body;
    const updatePayload: any = {};
    if (title !== undefined) updatePayload.title = title;
    if (start_time_ms !== undefined) updatePayload.start_time_ms = start_time_ms;
    if (end_time_ms !== undefined) updatePayload.end_time_ms = end_time_ms;
    if (display_order !== undefined) updatePayload.display_order = display_order;

    const { data, error } = await adminClient
      .from('audio_chapters')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'lms.audio_chapters.update.failed');
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
      .from('audio_chapters')
      .select('id, content_blocks!inner(course_lessons!inner(workspace_id))')
      .eq('id', id)
      .eq('content_blocks.course_lessons.workspace_id', workspaceId)
      .maybeSingle();
    if (!row) return NextResponse.json({ success: true });

    const { error } = await adminClient.from('audio_chapters').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'lms.audio_chapters.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
