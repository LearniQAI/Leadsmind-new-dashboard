import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Real duplication (Section C, Step 4 "Duplicate") — a genuinely independent copy, not a
// reference/alias: a new course_lessons row with a new id, plus a new content_blocks row
// (new id) for every block the original had. Appended at the end of the same module so no
// other lesson's position needs to shift.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data: original, error: fetchErr } = await adminClient
      .from('course_lessons')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!original) throw new NotFoundError('Lesson');

    const { count } = await adminClient
      .from('course_lessons')
      .select('id', { count: 'exact', head: true })
      .eq('module_id', original.module_id);

    const { id: _origId, created_at: _c, updated_at: _u, ...copyable } = original;

    const { data: newLesson, error: insertErr } = await adminClient
      .from('course_lessons')
      .insert({
        ...copyable,
        title: `${original.title} (Copy)`,
        position: count || 0
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    const { data: originalBlocks, error: blocksErr } = await adminClient
      .from('content_blocks')
      .select('*')
      .eq('lesson_id', id)
      .order('position', { ascending: true });

    if (blocksErr) throw blocksErr;

    if (originalBlocks && originalBlocks.length > 0) {
      const newBlocks = originalBlocks.map((b) => {
        const { id: _bid, created_at: _bc, updated_at: _bu, ...rest } = b;
        return { ...rest, lesson_id: newLesson.id };
      });
      const { error: blockInsertErr } = await adminClient.from('content_blocks').insert(newBlocks);
      if (blockInsertErr) throw blockInsertErr;
    }

    return NextResponse.json({ data: newLesson, blocksCopied: originalBlocks?.length || 0 });
  } catch (err: any) {
    logger.error({ err }, 'lms.lessons.duplicate.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
