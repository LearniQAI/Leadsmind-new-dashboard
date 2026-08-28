import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Real duplication (Section C, Step 4 "Duplicate") — a new course_modules row, then a new
// course_lessons row for every lesson it had, then a new content_blocks row for every block
// each of those lessons had — all with new ids, a genuinely independent copy. Appended at the
// end of the course so no other module's position needs to shift.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data: originalModule, error: fetchErr } = await adminClient
      .from('course_modules')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!originalModule) throw new NotFoundError('Module');

    const { count: moduleCount } = await adminClient
      .from('course_modules')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', originalModule.course_id);

    const { id: _mid, created_at: _mc, updated_at: _mu, ...copyableModule } = originalModule;

    const { data: newModule, error: moduleInsertErr } = await adminClient
      .from('course_modules')
      .insert({
        ...copyableModule,
        title: `${originalModule.title} (Copy)`,
        position: moduleCount || 0
      })
      .select()
      .single();

    if (moduleInsertErr) throw moduleInsertErr;

    const { data: originalLessons, error: lessonsErr } = await adminClient
      .from('course_lessons')
      .select('*')
      .eq('module_id', id)
      .order('position', { ascending: true });

    if (lessonsErr) throw lessonsErr;

    let lessonsCopied = 0;
    let blocksCopied = 0;

    for (const lesson of originalLessons || []) {
      const { id: origLessonId, created_at: _lc, updated_at: _lu, ...copyableLesson } = lesson;

      const { data: newLesson, error: lessonInsertErr } = await adminClient
        .from('course_lessons')
        .insert({ ...copyableLesson, module_id: newModule.id })
        .select()
        .single();

      if (lessonInsertErr) throw lessonInsertErr;
      lessonsCopied++;

      const { data: originalBlocks, error: blocksErr } = await adminClient
        .from('content_blocks')
        .select('*')
        .eq('lesson_id', origLessonId)
        .order('position', { ascending: true });

      if (blocksErr) throw blocksErr;

      // Inserted one at a time (not a single bulk insert) so each new id can be mapped back
      // to the original it replaces — needed below to rewrite this lesson's canvas tree, the
      // same real requirement as the standalone lesson duplicate route.
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
        blocksCopied++;
      }

      const { data: originalPage } = await adminClient
        .from('pages')
        .select('workspace_id, content')
        .eq('course_lesson_id', origLessonId)
        .maybeSingle();

      if (originalPage) {
        try {
          const tree = typeof originalPage.content === 'string' ? JSON.parse(originalPage.content) : originalPage.content;
          for (const nodeId of Object.keys(tree || {})) {
            const node = tree[nodeId];
            if (node?.type?.resolvedName === 'LessonBlockNode' && node?.props?.blockId) {
              node.props.blockId = blockIdMap.get(node.props.blockId) || null;
            }
          }
          const { error: pageInsertErr } = await adminClient.from('pages').insert({
            workspace_id: originalPage.workspace_id,
            course_lesson_id: newLesson.id,
            name: `${lesson.title} (Copy)`,
            content: tree
          });
          if (pageInsertErr) throw pageInsertErr;
        } catch (treeErr) {
          logger.error({ err: treeErr, lessonId: origLessonId }, 'lms.modules.duplicate.tree_copy_failed');
        }
      }
    }

    return NextResponse.json({ data: newModule, lessonsCopied, blocksCopied });
  } catch (err: any) {
    logger.error({ err }, 'lms.modules.duplicate.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
