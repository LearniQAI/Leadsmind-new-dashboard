import OpenAI from 'openai';
import { createAdminClient } from '@/lib/supabase/server';
import { extractLessonText, hashContent } from '@/lib/lms/chunking';
import { logger } from '@/shared/logger';

export type SummaryProcessResult =
  | { status: 'generated'; bulletCount: number }
  | { status: 'skipped_unchanged' }
  | { status: 'skipped_no_content' }
  | { status: 'failed'; error: string };

const SUMMARY_MODEL = 'gpt-4o-mini';

const BANNED_PHRASES = [
  'in this lesson, you will learn', 'this lesson covers', 'by the end of this lesson',
  'dive into', 'unlock', 'embark on', 'in today\'s lesson',
];

function buildSummaryPrompt(lessonTitle: string, text: string) {
  const systemInstructions = [
    'You write short study-aid summaries for LMS lesson content, for a student who already completed the lesson and wants a quick refresher.',
    'Summarize ONLY what is actually stated in the provided lesson text below — never add outside knowledge, never invent facts or numbers not present in the text.',
    'Produce 3-5 concise bullet points capturing the specific, concrete content of this lesson (real facts/steps/rules from the text), not a generic restatement of "what this lesson is about."',
    `Never use generic framing phrases like: ${BANNED_PHRASES.map(p => `"${p}"`).join(', ')}. Get straight to the real content.`,
    'Each bullet should be a single, plain-language sentence a student could reread in 5 seconds to jog their memory.',
    '',
    'Respond with STRICT JSON ONLY, no markdown, matching exactly: {"bullets":["...","...","..."]}',
  ].join('\n');

  const userContext = `Lesson title: ${lessonTitle}\n\nLesson content:\n${text}`;

  return { systemInstructions, userContext };
}

/**
 * Generates (or refreshes) a lesson's AI summary. Mirrors processLessonForRAG's
 * shape/rationale closely: same lesson fetch, same extractLessonText() call,
 * same content_hash change-detection to skip a wasted API call on an
 * unchanged save — but this is ONE chat-completion call, no embeddings, no
 * chunking (a summary reads the whole lesson text at once).
 *
 * `force` bypasses the unchanged-content skip, for the instructor-triggered
 * manual regenerate action.
 */
export async function processLessonSummary(lessonId: string, force = false): Promise<SummaryProcessResult> {
  const adminClient = createAdminClient();

  const { data: lesson, error: lessonError } = await adminClient
    .from('course_lessons')
    .select('id, module_id, course_id, workspace_id, title, lesson_type, content')
    .eq('id', lessonId)
    .maybeSingle();

  if (lessonError) {
    logger.error({ err: lessonError, lessonId }, 'lms.summary.lesson_fetch_failed');
    return { status: 'failed', error: lessonError.message };
  }
  if (!lesson) return { status: 'failed', error: 'Lesson not found' };

  const text = extractLessonText(lesson);

  if (!text) {
    // No text content (e.g. a video lesson with no transcript) — clear any
    // stale summary from a previous version of this lesson's content.
    await adminClient.from('lesson_summaries').delete().eq('lesson_id', lessonId);
    return { status: 'skipped_no_content' };
  }

  const hash = hashContent(text);

  if (!force) {
    const { data: existing } = await adminClient
      .from('lesson_summaries')
      .select('content_hash')
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (existing?.content_hash === hash) {
      return { status: 'skipped_unchanged' };
    }
  }

  const { systemInstructions, userContext } = buildSummaryPrompt(lesson.title, text);

  let completion;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    completion = await openai.chat.completions.create({
      model: SUMMARY_MODEL,
      messages: [
        { role: 'system', content: systemInstructions },
        { role: 'user', content: userContext },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });
  } catch (err) {
    logger.error({ err, lessonId }, 'lms.summary.completion_failed');
    return { status: 'failed', error: 'Summary generation failed' };
  }

  const rawContent = completion.choices[0]?.message?.content || '{}';
  let parsed: { bullets?: string[] };
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    logger.error({ rawContent, lessonId }, 'lms.summary.parse_failed');
    return { status: 'failed', error: 'Summary response was not valid JSON' };
  }

  const bullets = Array.isArray(parsed.bullets) ? parsed.bullets.filter(b => typeof b === 'string' && b.trim()) : [];
  if (bullets.length === 0) {
    logger.error({ rawContent, lessonId }, 'lms.summary.empty_bullets');
    return { status: 'failed', error: 'Summary response had no usable content' };
  }

  const { error: upsertError } = await adminClient
    .from('lesson_summaries')
    .upsert(
      {
        lesson_id: lesson.id,
        course_id: lesson.course_id,
        workspace_id: lesson.workspace_id,
        summary_bullets: bullets,
        content_hash: hash,
        model_used: SUMMARY_MODEL,
      },
      { onConflict: 'lesson_id' }
    );

  if (upsertError) {
    logger.error({ err: upsertError, lessonId }, 'lms.summary.upsert_failed');
    return { status: 'failed', error: upsertError.message };
  }

  return { status: 'generated', bulletCount: bullets.length };
}
