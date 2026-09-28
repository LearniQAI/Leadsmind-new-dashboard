// Duplicate Module.
//   - brand-new module id; the original is only ever READ
//   - always DRAFT (publish_status 'draft', active, no published_at), whatever the original's state,
//     so a copy can never silently become student-visible
//   - appended at the end of the course (max position + 1), so no other module's order moves
//   - every lesson, content block and canvas page is copied under brand-new ids (the canvas tree's
//     block references are rewritten to the new block ids)
//   - student progress / attempts / submissions are never copied: the new lessons start empty
//   - all-or-nothing: if any step fails, the new module is deleted (its lessons, blocks and pages
//     cascade with it) and the error is rethrown, so a failed duplicate leaves nothing behind

import type { SupabaseClient } from '@supabase/supabase-js';

export function buildModuleCopy(original: Record<string, any>, position: number) {
  const { id: _id, created_at: _c, updated_at: _u, published_at: _p, ...rest } = original;
  return {
    ...rest,
    title: `${original.title} (Copy)`,
    publish_status: 'draft',
    is_active: true,
    published_at: null,
    position,
  };
}

export class ModuleNotFoundError extends Error {}

export async function duplicateModule(db: SupabaseClient, args: { workspaceId: string; moduleId: string }) {
  const { workspaceId, moduleId } = args;

  const { data: original, error: fetchErr } = await db
    .from('course_modules')
    .select('*')
    .eq('id', moduleId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!original) throw new ModuleNotFoundError('Module not found');

  const { data: last, error: posErr } = await db
    .from('course_modules')
    .select('position')
    .eq('course_id', original.course_id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (posErr) throw posErr;

  const { data: newModule, error: moduleInsertErr } = await db
    .from('course_modules')
    .insert(buildModuleCopy(original, (last?.position ?? 0) + 1))
    .select()
    .single();
  if (moduleInsertErr) throw moduleInsertErr;

  let lessonsCopied = 0;
  let blocksCopied = 0;
  try {
    const { data: originalLessons, error: lessonsErr } = await db
      .from('course_lessons')
      .select('*')
      .eq('module_id', moduleId)
      .order('position', { ascending: true });
    if (lessonsErr) throw lessonsErr;

    for (const lesson of originalLessons || []) {
      const { id: origLessonId, created_at: _lc, updated_at: _lu, ...copyableLesson } = lesson;

      const { data: newLesson, error: lessonInsertErr } = await db
        .from('course_lessons')
        .insert({ ...copyableLesson, module_id: newModule.id })
        .select()
        .single();
      if (lessonInsertErr) throw lessonInsertErr;
      lessonsCopied++;

      const { data: originalBlocks, error: blocksErr } = await db
        .from('content_blocks')
        .select('*')
        .eq('lesson_id', origLessonId)
        .order('position', { ascending: true });
      if (blocksErr) throw blocksErr;

      // One at a time so each new id can be mapped back to the original it replaces — needed to
      // rewrite this lesson's canvas tree below.
      const blockIdMap = new Map<string, string>();
      for (const b of originalBlocks || []) {
        const { id: oldBlockId, created_at: _bc, updated_at: _bu, ...rest } = b;
        const { data: newBlock, error: blockInsertErr } = await db
          .from('content_blocks')
          .insert({ ...rest, lesson_id: newLesson.id })
          .select('id')
          .single();
        if (blockInsertErr) throw blockInsertErr;
        blockIdMap.set(oldBlockId, newBlock.id);
        blocksCopied++;
      }

      const { data: originalPage, error: pageErr } = await db
        .from('pages')
        .select('workspace_id, content')
        .eq('course_lesson_id', origLessonId)
        .maybeSingle();
      if (pageErr) throw pageErr;

      if (originalPage) {
        const tree = typeof originalPage.content === 'string' ? JSON.parse(originalPage.content) : structuredClone(originalPage.content);
        for (const nodeId of Object.keys(tree || {})) {
          const node = tree[nodeId];
          // LessonBlockNode and ContentBox both carry a real blockId reference.
          if ((node?.type?.resolvedName === 'LessonBlockNode' || node?.type?.resolvedName === 'ContentBox') && node?.props?.blockId) {
            node.props.blockId = blockIdMap.get(node.props.blockId) || null;
          }
        }
        const { error: pageInsertErr } = await db.from('pages').insert({
          workspace_id: originalPage.workspace_id,
          course_lesson_id: newLesson.id,
          name: `${lesson.title} (Copy)`,
          content: tree,
        });
        if (pageInsertErr) throw pageInsertErr;
      }
    }
  } catch (err) {
    // Roll back: deleting the new module cascades to every lesson/block/page copied so far.
    await db.from('course_modules').delete().eq('id', newModule.id).eq('workspace_id', workspaceId);
    throw err;
  }

  return { module: newModule, lessonsCopied, blocksCopied };
}
