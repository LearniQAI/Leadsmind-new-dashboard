'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { getUser, getCurrentWorkspaceId } from '@/lib/auth';
import { getOrCreateStudentContact } from './studentEnrollments';
import { getBlockIdsForLesson, getLessonReadingGate, hasLessonReadingCompletion } from '@/lib/lms/lessonBlockTree';
import { logger } from '@/shared/logger';

// Per-block completion tracking (Phase C, Step 1) — closes the loophole where the Next
// button advanced with zero interaction. Every content_block a student completes gets a
// real row here; the Next-button gate and markLessonComplete both require every block in a
// lesson to have one before letting the student move on. Writes always go through the admin
// client from a trusted server context — the client never inserts these rows directly.

/**
 * Records that the current student has satisfied a content block's completion_rule.
 * For 'watched_threshold', the caller-supplied percentage is required to actually meet the
 * block's completion_threshold — a client claiming 100% when it didn't provide a
 * qualifying percentage is rejected. This is a real check against what the browser's own
 * media element reported, not a client-asserted boolean; the disclosed limitation is that
 * without server-side media heartbeats there's no way to independently re-derive that
 * percentage from a source the client doesn't control (see live-fire report for detail).
 */
export async function recordBlockCompletion(contentBlockId: string, metric: Record<string, any> = {}) {
  try {
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace context' };

    const contactId = await getOrCreateStudentContact(workspaceId);
    if (!contactId) return { error: 'Failed to resolve student contact' };

    const adminClient = createAdminClient();

    // Resolve the block and confirm it actually belongs to a lesson in this workspace —
    // content_block_id is never trusted blindly.
    const { data: block, error: blockErr } = await adminClient
      .from('content_blocks')
      .select('id, completion_rule, completion_threshold, lesson_id, course_lessons!inner(workspace_id)')
      .eq('id', contentBlockId)
      .eq('course_lessons.workspace_id', workspaceId)
      .maybeSingle();

    if (blockErr) throw blockErr;
    if (!block) return { error: 'Content block not found' };

    if (block.completion_rule === 'watched_threshold') {
      const percentage = typeof metric.percentage === 'number' ? metric.percentage : 0;
      const threshold = block.completion_threshold ?? 90;
      if (percentage < threshold) {
        return { error: `Watched ${percentage}% — needs ${threshold}% to complete` };
      }
    }

    const { error } = await adminClient
      .from('lesson_block_completions')
      .upsert(
        { content_block_id: contentBlockId, contact_id: contactId, metric, completed_at: new Date().toISOString() },
        { onConflict: 'content_block_id,contact_id' }
      );

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    logger.error({ err, contentBlockId }, 'block_completion.record.failed');
    return { error: 'Failed to record block completion.' };
  }
}

/**
 * Returns the content_block ids the current student has already completed for a lesson —
 * used by the student player to seed per-block "already done" state and avoid re-firing
 * completion writes (and the video/audio watch-progress UI) for blocks already satisfied.
 */
export async function getCompletedBlockIdsForLesson(lessonId: string) {
  try {
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace context' };

    const contactId = await getOrCreateStudentContact(workspaceId);
    if (!contactId) return { data: [] };

    const adminClient = createAdminClient();

    const blockIds = await getBlockIdsForLesson(adminClient, lessonId);
    if (blockIds.length === 0) return { data: [] };

    const { data: completions, error } = await adminClient
      .from('lesson_block_completions')
      .select('content_block_id')
      .eq('contact_id', contactId)
      .in('content_block_id', blockIds);

    if (error) throw error;
    return { data: (completions || []).map((c) => c.content_block_id) };
  } catch (err: any) {
    logger.error({ err, lessonId }, 'block_completion.completed_ids.failed');
    return { error: 'Failed to load completed blocks.' };
  }
}

/**
 * Returns, for the given lesson, whether the current student has satisfied every one of its
 * content blocks — the same check the Next button and markLessonComplete both rely on.
 */
export async function getLessonBlockCompletionStatus(lessonId: string) {
  try {
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace context' };

    const contactId = await getOrCreateStudentContact(workspaceId);
    if (!contactId) return { error: 'Failed to resolve student contact' };

    const adminClient = createAdminClient();

    const blockIds = await getBlockIdsForLesson(adminClient, lessonId);
    if (blockIds.length === 0) {
      // No trackable blocks — but an inline-only canvas lesson still gates on the reading
      // signal (scrolled + dwell), recorded in lesson_reading_completions.
      const readingGate = await getLessonReadingGate(adminClient, lessonId);
      if (readingGate.required) {
        const done = await hasLessonReadingCompletion(adminClient, lessonId, contactId);
        return {
          data: {
            allComplete: done,
            totalBlocks: 1,
            completedBlocks: done ? 1 : 0,
            readingGate: true,
            requiredDwell: readingGate.requiredDwell,
          },
        };
      }
      return { data: { allComplete: true, totalBlocks: 0, completedBlocks: 0 } };
    }

    const { data: completions, error: completionsErr } = await adminClient
      .from('lesson_block_completions')
      .select('content_block_id')
      .eq('contact_id', contactId)
      .in('content_block_id', blockIds);

    if (completionsErr) throw completionsErr;

    const completedCount = new Set((completions || []).map((c) => c.content_block_id)).size;
    return {
      data: {
        allComplete: completedCount >= blockIds.length,
        totalBlocks: blockIds.length,
        completedBlocks: completedCount
      }
    };
  } catch (err: any) {
    logger.error({ err, lessonId }, 'block_completion.status.failed');
    return { error: 'Failed to load block completion status.' };
  }
}

/**
 * Reading-gate status for the student player. `required` is true only for a canvas lesson
 * made entirely of inline content (heading/rich-text/image) with zero trackable blocks;
 * `requiredDwell` is the server-computed minimum seconds; `done` reflects a real
 * lesson_reading_completions row.
 */
export async function getLessonReadingGateStatus(lessonId: string) {
  try {
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace context' };

    const contactId = await getOrCreateStudentContact(workspaceId);
    if (!contactId) return { data: { required: false, requiredDwell: 0, done: false } };

    const adminClient = createAdminClient();
    const gate = await getLessonReadingGate(adminClient, lessonId);
    if (!gate.required) return { data: { required: false, requiredDwell: 0, done: false } };

    const done = await hasLessonReadingCompletion(adminClient, lessonId, contactId);
    return { data: { required: true, requiredDwell: gate.requiredDwell, done } };
  } catch (err: any) {
    logger.error({ err, lessonId }, 'lesson_reading.gate_status.failed');
    return { error: 'Failed to load reading gate status.' };
  }
}

/**
 * Records that the current student scrolled through and dwelled on an inline-only canvas
 * lesson's article content. The dwell floor is recomputed here from the lesson's own word
 * count — a client can under-report `dwellSeconds` but cannot push the accepted value below
 * the server-derived minimum. (Scroll is client-asserted, same disclosed limitation as the
 * video watched_threshold — see recordBlockCompletion.)
 */
export async function recordLessonReadingCompletion(
  lessonId: string,
  metric: { dwellSeconds?: number; scrolled?: boolean } = {}
) {
  try {
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace context' };

    const contactId = await getOrCreateStudentContact(workspaceId);
    if (!contactId) return { error: 'Failed to resolve student contact' };

    const adminClient = createAdminClient();

    const { data: lesson } = await adminClient
      .from('course_lessons')
      .select('id')
      .eq('id', lessonId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (!lesson) return { error: 'Lesson not found' };

    const gate = await getLessonReadingGate(adminClient, lessonId);
    if (!gate.required) return { success: true, noop: true };

    const dwell = typeof metric.dwellSeconds === 'number' ? Math.floor(metric.dwellSeconds) : 0;
    if (metric.scrolled !== true) {
      return { error: 'Scroll through the full lesson to complete it.' };
    }
    if (dwell < gate.requiredDwell) {
      return { error: `Spend a little longer on this lesson (${dwell}s / ${gate.requiredDwell}s).` };
    }

    const { error } = await adminClient.from('lesson_reading_completions').upsert(
      {
        lesson_id: lessonId,
        contact_id: contactId,
        dwell_seconds: dwell,
        scrolled: true,
        metric,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'lesson_id,contact_id' }
    );
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    logger.error({ err, lessonId }, 'lesson_reading.record.failed');
    return { error: 'Failed to record reading completion.' };
  }
}
