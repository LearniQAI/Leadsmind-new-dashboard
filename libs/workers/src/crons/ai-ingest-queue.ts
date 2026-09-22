import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 20;

/**
 * Processes lms_ai_ingest_queue (migration 20260922110001): re-chunks/re-embeds for RAG Q&A and
 * regenerates the AI lesson summary for every lesson a DB trigger enqueued since the last run —
 * any real content_blocks write, a canvas save (pages.content), or a legacy course_lessons.content
 * edit. Async by design: none of those writes wait on this (or on an OpenAI call); this poller
 * catches up afterward.
 */
export async function processAiIngestQueue() {
  console.log('[AI Ingest Queue] Running background scan...');

  const { data: rows, error } = await supabaseAdmin
    .from('lms_ai_ingest_queue')
    .select('lesson_id, workspace_id, attempts')
    .lt('attempts', MAX_ATTEMPTS)
    .order('requested_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error('[AI Ingest Queue] Failed to fetch queue:', error);
    return { processed: 0, error: error.message };
  }
  if (!rows || rows.length === 0) {
    console.log('[AI Ingest Queue] Nothing pending.');
    return { processed: 0 };
  }

  // Imported lazily — this file is imported by both the cron route and (indirectly, via the
  // pipelines) a lot of other LMS machinery; keeping the import inside the function avoids
  // pulling the OpenAI/embeddings dependency chain into every consumer of this module's types.
  const { processLessonForRAG } = await import('@/lib/lms/ragPipeline');
  const { processLessonSummary } = await import('@/lib/lms/summaryPipeline');

  let succeeded = 0;
  let failed = 0;
  let gaveUp = 0;

  for (const row of rows) {
    try {
      const ragResult = await processLessonForRAG(row.lesson_id);
      if (ragResult.status === 'failed') throw new Error('rag: ' + ragResult.error);

      const summaryResult = await processLessonSummary(row.lesson_id);
      if (summaryResult.status === 'failed') throw new Error('summary: ' + summaryResult.error);

      await supabaseAdmin
        .from('course_lessons')
        .update({ ai_content_status: 'current', ai_content_error: null, ai_content_updated_at: new Date().toISOString() })
        .eq('id', row.lesson_id);

      await supabaseAdmin.from('lms_ai_ingest_queue').delete().eq('lesson_id', row.lesson_id);
      succeeded++;
    } catch (err: any) {
      const message = err?.message || String(err);
      const nextAttempts = (row.attempts || 0) + 1;
      console.error(`[AI Ingest Queue] Lesson ${row.lesson_id} failed (attempt ${nextAttempts}/${MAX_ATTEMPTS}):`, message);

      await supabaseAdmin
        .from('course_lessons')
        .update({ ai_content_status: 'failed', ai_content_error: message, ai_content_updated_at: new Date().toISOString() })
        .eq('id', row.lesson_id);

      if (nextAttempts >= MAX_ATTEMPTS) {
        // Give up — leaving it in the queue forever would burn AI credits retrying a lesson
        // whose content genuinely can't be processed (e.g. a persistent OpenAI-side error).
        // ai_content_status stays 'failed' so it's visible; a real content edit re-enqueues it.
        await supabaseAdmin.from('lms_ai_ingest_queue').delete().eq('lesson_id', row.lesson_id);
        gaveUp++;
      } else {
        await supabaseAdmin.from('lms_ai_ingest_queue').update({ attempts: nextAttempts }).eq('lesson_id', row.lesson_id);
      }
      failed++;
    }
  }

  return { processed: rows.length, succeeded, failed, gaveUp };
}
