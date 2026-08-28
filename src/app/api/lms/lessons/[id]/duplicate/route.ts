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
//
// Lesson Builder Part 2, Step 3 sibling-bug check: a lesson with a canvas (a linked `pages`
// row) needs its TREE deep-copied too, not just its flat content_blocks rows — and the copy's
// tree must reference the NEW content_blocks ids, not the original's. Blocks are inserted one
// at a time (not a single bulk insert) specifically so each new id can be captured and mapped
// back to the original it replaces, for that tree rewrite.
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

    const blockIdMap = new Map<string, string>();

    for (const b of originalBlocks || []) {
      const { id: oldBlockId, created_at: _bc, updated_at: _bu, ...rest } = b;
      const { data: newBlock, error: blockInsertErr } = await adminClient
        .from('content_blocks')
        .insert({ ...rest, lesson_id: newLesson.id })
        .select('id')
        .single();
      if (blockInsertErr) throw blockInsertErr;
      blockIdMap.set(oldBlockId, newBlock.id);
    }

    // Deep-copy the canvas tree, if this lesson has one, rewriting every LessonBlockNode's
    // blockId to point at its newly duplicated content_blocks row.
    const { data: originalPage } = await adminClient
      .from('pages')
      .select('workspace_id, content')
      .eq('course_lesson_id', id)
      .maybeSingle();

    let pageCopied = false;
    if (originalPage) {
      try {
        const tree = typeof originalPage.content === 'string' ? JSON.parse(originalPage.content) : originalPage.content;
        for (const nodeId of Object.keys(tree || {})) {
          const node = tree[nodeId];
          // ContentBox (Part 3) also carries a real blockId reference — same rewrite needed.
          if ((node?.type?.resolvedName === 'LessonBlockNode' || node?.type?.resolvedName === 'ContentBox') && node?.props?.blockId) {
            const mapped = blockIdMap.get(node.props.blockId);
            // A block referenced by the tree but somehow missing from originalBlocks (e.g. a
            // pending block that never finished creating) is left pointing nowhere rather
            // than silently aliasing a random block — the copy will show it as unconfigured.
            node.props.blockId = mapped || null;
          }
        }
        const { error: pageInsertErr } = await adminClient.from('pages').insert({
          workspace_id: originalPage.workspace_id,
          course_lesson_id: newLesson.id,
          name: `${original.title} (Copy)`,
          content: tree
        });
        if (pageInsertErr) throw pageInsertErr;
        pageCopied = true;
      } catch (treeErr) {
        logger.error({ err: treeErr, lessonId: id }, 'lms.lessons.duplicate.tree_copy_failed');
      }
    }

    return NextResponse.json({ data: newLesson, blocksCopied: originalBlocks?.length || 0, pageCopied });
  } catch (err: any) {
    logger.error({ err }, 'lms.lessons.duplicate.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
