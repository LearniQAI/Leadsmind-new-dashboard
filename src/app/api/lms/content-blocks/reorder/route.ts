import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { ForbiddenError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Persists a full new block order for one lesson in a single request — reordering
// updates `position` on content_blocks immediately, no separate "save" step (PRD Section 4).
export async function PATCH(req: NextRequest) {
  try {
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const body = await req.json();
    const { lesson_id, order } = body as { lesson_id: string; order: string[] };

    if (!lesson_id || !Array.isArray(order) || order.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: lesson_id, order' }, { status: 400 });
    }

    const { data: lessonRow, error: lessonErr } = await adminClient
      .from('course_lessons')
      .select('id')
      .eq('id', lesson_id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (lessonErr) throw lessonErr;
    if (!lessonRow) throw new ForbiddenError('You do not have access to this lesson');

    const { data: existingBlocks, error: existingErr } = await adminClient
      .from('content_blocks')
      .select('id')
      .eq('lesson_id', lesson_id);

    if (existingErr) throw existingErr;

    const existingIds = new Set((existingBlocks || []).map((b) => b.id));
    if (order.length !== existingIds.size || order.some((id) => !existingIds.has(id))) {
      return NextResponse.json({ error: 'Order must include exactly the blocks belonging to this lesson' }, { status: 400 });
    }

    await Promise.all(
      order.map((id, position) =>
        adminClient
          .from('content_blocks')
          .update({ position, updated_at: new Date().toISOString() })
          .eq('id', id)
      )
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'lms.content-blocks.reorder.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
