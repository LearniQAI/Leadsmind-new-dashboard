import { createAdminClient } from '@/lib/supabase/server';
import { embedTexts, EMBEDDING_MODEL } from '@/lib/ai/embeddings';
import { chunkText, hashContent } from '@/lib/lms/chunking';
import { getLessonTextForAI } from '@/lib/lms/lessonContentForAI';
import { logger } from '@/shared/logger';

export type RagProcessResult =
  | { status: 'embedded'; chunkCount: number }
  | { status: 'skipped_unchanged' }
  | { status: 'skipped_no_content' }
  | { status: 'failed'; error: string };

/**
 * Re-chunks and re-embeds a single lesson's content. Batch 5 (RAG rebuild): now called from the
 * lms_ai_ingest_queue poller (real DB triggers on content_blocks/pages enqueue a lesson on any
 * real content edit — see migration 20260922110001), not inline from the lesson metadata save
 * route, and reads the real content via getLessonTextForAI() (content_blocks + canvas inline
 * text), not the always-empty legacy course_lessons.content field. Skips the OpenAI call
 * entirely when the extracted text is unchanged since the last embed (content_hash match).
 */
export async function processLessonForRAG(lessonId: string): Promise<RagProcessResult> {
  const adminClient = createAdminClient();

  const { data: lesson, error: lessonError } = await adminClient
    .from('course_lessons')
    .select('id, module_id, course_id, workspace_id, title')
    .eq('id', lessonId)
    .maybeSingle();

  if (lessonError) {
    logger.error({ err: lessonError, lessonId }, 'lms.rag.lesson_fetch_failed');
    return { status: 'failed', error: lessonError.message };
  }
  if (!lesson) return { status: 'failed', error: 'Lesson not found' };

  const text = await getLessonTextForAI(adminClient, lessonId);

  if (!text) {
    // Content was removed/never had text — clear any stale chunks from a
    // previous version so retrieval doesn't surface now-deleted content.
    await adminClient.from('course_content_chunks').delete().eq('lesson_id', lessonId);
    return { status: 'skipped_no_content' };
  }

  const hash = hashContent(text);

  const { data: existingChunk } = await adminClient
    .from('course_content_chunks')
    .select('content_hash')
    .eq('lesson_id', lessonId)
    .limit(1)
    .maybeSingle();

  if (existingChunk?.content_hash === hash) {
    return { status: 'skipped_unchanged' };
  }

  const { data: moduleRow } = await adminClient
    .from('course_modules')
    .select('title')
    .eq('id', lesson.module_id)
    .maybeSingle();

  const chunks = chunkText(text);
  if (chunks.length === 0) {
    await adminClient.from('course_content_chunks').delete().eq('lesson_id', lessonId);
    return { status: 'skipped_no_content' };
  }

  const embeddings = await embedTexts(chunks);
  if (!embeddings) {
    return { status: 'failed', error: 'Embedding generation failed' };
  }

  const sourceReference = {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    moduleId: lesson.module_id,
    moduleTitle: moduleRow?.title || null,
  };

  const rows = chunks.map((chunkContent, i) => ({
    workspace_id: lesson.workspace_id,
    course_id: lesson.course_id,
    lesson_id: lesson.id,
    chunk_index: i,
    content_text: chunkContent,
    source_reference: sourceReference,
    content_hash: hash,
    embedding: embeddings[i],
    model_used: EMBEDDING_MODEL,
  }));

  // Replace-in-full for this lesson: delete-then-insert keeps chunk_index
  // contiguous and avoids orphaned chunks from a shrinking edit.
  const { error: deleteError } = await adminClient.from('course_content_chunks').delete().eq('lesson_id', lessonId);
  if (deleteError) {
    logger.error({ err: deleteError, lessonId }, 'lms.rag.chunk_delete_failed');
    return { status: 'failed', error: deleteError.message };
  }

  const { error: insertError } = await adminClient.from('course_content_chunks').insert(rows);
  if (insertError) {
    logger.error({ err: insertError, lessonId }, 'lms.rag.chunk_insert_failed');
    return { status: 'failed', error: insertError.message };
  }

  return { status: 'embedded', chunkCount: rows.length };
}
