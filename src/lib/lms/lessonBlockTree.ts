import type { createAdminClient } from '@/lib/supabase/server';
import { flattenLessonCanvas, isInlineOnlyCanvas, requiredReadingDwellSeconds } from '@/lib/lms/flattenLessonCanvas';

// Lesson Builder Part 2, Step 2: the real completion gate (markLessonCompleteForContact,
// getLessonBlockCompletionStatus, getCompletedBlockIdsForLesson) all originally counted
// "every block in this lesson" via a flat `content_blocks WHERE lesson_id=X` query. That's
// still correct for a lesson with no Lesson Builder canvas (the old modal-editor model).
//
// For a lesson WITH a canvas (a linked `pages` row), that flat query is no longer safe on its
// own: deleting a Section/Row that CONTAINS a LessonBlockNode removes the node from the tree
// via Craft.js's own cascade, but has no way to also delete the underlying content_blocks
// row — left unfixed, that row would still count toward the gate even though the student can
// never see or interact with it again (a real "can't finish lesson, block I can't see needs
// completing" bug). So for tree-based lessons, "which blocks count" is derived from the real
// canvas tree (which blockIds are actually still placed on it), not from every row that
// happens to still exist in content_blocks for this lesson_id.
export async function getBlockIdsForLesson(
  adminClient: ReturnType<typeof createAdminClient>,
  lessonId: string
): Promise<string[]> {
  const { data: page } = await adminClient
    .from('pages')
    .select('content')
    .eq('course_lesson_id', lessonId)
    .maybeSingle();

  if (!page) {
    // Old flat model — unchanged behavior.
    const { data: blocks } = await adminClient
      .from('content_blocks')
      .select('id')
      .eq('lesson_id', lessonId);
    return (blocks || []).map((b) => b.id);
  }

  // Part 3: ContentBox (the colored-header callout) also holds a real content_blocks
  // reference via its own `blockId` prop — it must count toward the gate the same as a plain
  // LessonBlockNode, or a lesson could be completed without the student ever engaging with a
  // quiz/reading that's only reachable through a callout's CTA.
  const BLOCK_REFERENCING_TYPES = new Set(['LessonBlockNode', 'ContentBox']);

  const blockIds = new Set<string>();
  try {
    const tree = typeof page.content === 'string' ? JSON.parse(page.content) : page.content;
    for (const nodeId of Object.keys(tree || {})) {
      const node = tree[nodeId];
      if (BLOCK_REFERENCING_TYPES.has(node?.type?.resolvedName) && node?.props?.blockId) {
        blockIds.add(node.props.blockId);
      }
    }
  } catch {
    // Malformed tree — fall through with whatever was collected (possibly none), rather than
    // throwing and blocking every completion check for this lesson.
  }
  return Array.from(blockIds);
}

/**
 * Reading gate for a canvas lesson made ENTIRELY of inline content (heading / rich-text /
 * image) with zero trackable block/contentbox nodes. For such a lesson getBlockIdsForLesson()
 * returns [], so nothing else gates its completion — this fills that gap by requiring the
 * student to have scrolled through the article and dwelled on it for `requiredDwell` seconds.
 *
 * Returns { required:false } for: a lesson with no linked `pages` row (legacy content_blocks
 * lesson), a canvas that has real blocks, or an empty/unparseable canvas.
 */
export async function getLessonReadingGate(
  adminClient: ReturnType<typeof createAdminClient>,
  lessonId: string
): Promise<{ required: boolean; requiredDwell: number }> {
  const { data: page } = await adminClient
    .from('pages')
    .select('content')
    .eq('course_lesson_id', lessonId)
    .maybeSingle();

  if (!page) return { required: false, requiredDwell: 0 };

  const items = flattenLessonCanvas(page.content);
  if (!isInlineOnlyCanvas(items)) return { required: false, requiredDwell: 0 };

  return { required: true, requiredDwell: requiredReadingDwellSeconds(items) };
}

/** True once this student has a real lesson_reading_completions row for the lesson. */
export async function hasLessonReadingCompletion(
  adminClient: ReturnType<typeof createAdminClient>,
  lessonId: string,
  contactId: string
): Promise<boolean> {
  const { data } = await adminClient
    .from('lesson_reading_completions')
    .select('id')
    .eq('lesson_id', lessonId)
    .eq('contact_id', contactId)
    .maybeSingle();
  return !!data;
}
