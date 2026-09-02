// Batch 3 (G5) — real content source for AI question generation.
//
// Before this, api/ai/generate-questions read ONLY course_lessons.content for both scopes.
// Confirmed live (2026-09-02): that column is `{}` on every lesson — the real lesson body has
// lived in `content_blocks` since the canvas/content-block system landed. So lesson-scoped
// generation ran on an empty string, and module-scoped generation only "worked better"
// because its `Lesson "<title>": {}` join accidentally fed the model every lesson TITLE in the
// module (real topical signal) while the lesson path fed it nothing but one title + "{}".
//
// This module assembles the real readable text for one or more lessons from content_blocks
// (plus course_lessons.content as a legacy fallback, for any pre-canvas lesson elsewhere that
// still has a non-empty string body).
//
// What each block type actually contributes (verified against real live rows):
//   rich_text            content.text / content.html      -> HTML-stripped prose (primary signal)
//   reading / slides     content.text / .caption / .body  -> stored prose if present.
//                        PDF binaries are NOT text-extracted anywhere in this codebase — a
//                        reading block that is only a file_url contributes just its title/caption.
//   assignment           content.instructions / .prompt   -> the task text
//   flashcards           content.flashcards[].front/back   -> Q/A pairs
//   video                content.title (+ .description)    -> the video's real title. NO transcript
//                        field exists on video blocks, so that's all the text a video gives.
//   audio                content.title / .description      -> same; NO transcript field exists.
//   html_code            content.html                     -> HTML-stripped VISIBLE text only
//                        (headings/paragraphs), capped — it's illustrative markup, minor signal.
//   embed / download /   content.title / .caption /       -> a label if the author set one,
//   live_session         .description                        otherwise nothing.

import type { SupabaseClient } from '@supabase/supabase-js';

const PER_BLOCK_CHAR_CAP = 2000;

/** Strip HTML tags + decode the handful of entities that actually show up, collapse space. */
export function htmlToText(input: unknown): string {
  let s = String(input ?? '');
  s = s.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return s.replace(/\s+/g, ' ').trim();
}

const clip = (s: string) => (s.length > PER_BLOCK_CHAR_CAP ? s.slice(0, PER_BLOCK_CHAR_CAP) + '…' : s);

/** Real text a single content_blocks row contributes (empty string if none). */
export function textFromBlock(block: { type: string; content: any; file_url?: string | null }): string {
  const c = block?.content || {};
  switch (block.type) {
    case 'rich_text':
      return clip(htmlToText(c.text ?? c.html ?? ''));
    case 'reading':
    case 'slides': {
      const prose = c.text ?? c.body ?? c.description ?? c.caption ?? '';
      const parts = [c.title, htmlToText(prose)].filter(Boolean);
      return clip(parts.join(' — '));
    }
    case 'assignment':
      return clip(htmlToText(c.instructions ?? c.prompt ?? c.text ?? ''));
    case 'flashcards': {
      const cards = Array.isArray(c.flashcards) ? c.flashcards : [];
      return clip(
        cards
          .map((card: any) => {
            const f = String(card?.front ?? '').trim();
            const b = String(card?.back ?? '').trim();
            return f || b ? `Q: ${f} A: ${b}` : '';
          })
          .filter(Boolean)
          .join('\n'),
      );
    }
    case 'video':
    case 'audio': {
      const parts = [c.title, c.description].map((x) => String(x ?? '').trim()).filter(Boolean);
      return parts.join(' — ');
    }
    case 'html_code':
      return clip(htmlToText(c.html ?? ''));
    case 'embed':
    case 'download':
    case 'live_session': {
      const parts = [c.title, c.caption, c.description].map((x) => String(x ?? '').trim()).filter(Boolean);
      return parts.join(' — ');
    }
    default:
      return '';
  }
}

/** Legacy fallback: some pre-canvas lessons elsewhere may still store a real string body. */
function legacyLessonText(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return htmlToText(content);
  if (typeof content === 'object') {
    const candidate = content.text ?? content.body ?? content.html ?? content.markdown ?? '';
    return typeof candidate === 'string' ? htmlToText(candidate) : '';
  }
  return '';
}

export interface AssembledLessonContext {
  /** Ready to drop into a prompt — per-lesson blocks, each headed by the lesson title. */
  combinedText: string;
  perLesson: { lessonId: string; title: string; text: string }[];
  /** length of real body text found BEYOND the bare lesson titles — lets the caller warn when thin */
  bodyCharCount: number;
}

/**
 * Assemble the real readable text for the given lessons (order preserved as passed).
 * `db` must be a service-role client (this reads across the workspace).
 */
export async function assembleLessonContext(
  db: SupabaseClient,
  lessonIds: string[],
): Promise<AssembledLessonContext> {
  if (lessonIds.length === 0) {
    return { combinedText: '', perLesson: [], bodyCharCount: 0 };
  }

  const [{ data: lessons }, { data: blocks }] = await Promise.all([
    db.from('course_lessons').select('id, title, content').in('id', lessonIds),
    db.from('content_blocks').select('lesson_id, type, content, file_url, position').in('lesson_id', lessonIds),
  ]);

  const lessonById = new Map((lessons || []).map((l: any) => [l.id, l]));
  const blocksByLesson = new Map<string, any[]>();
  for (const b of blocks || []) {
    const arr = blocksByLesson.get(b.lesson_id) || [];
    arr.push(b);
    blocksByLesson.set(b.lesson_id, arr);
  }

  let bodyCharCount = 0;
  const perLesson = lessonIds.map((id) => {
    const lesson = lessonById.get(id);
    const title = lesson?.title || 'Untitled lesson';

    const bodyParts: string[] = [];
    const legacy = legacyLessonText(lesson?.content);
    if (legacy) bodyParts.push(legacy);

    const orderedBlocks = (blocksByLesson.get(id) || []).sort(
      (a: any, b: any) => (a.position ?? 0) - (b.position ?? 0),
    );
    for (const blk of orderedBlocks) {
      const t = textFromBlock(blk);
      if (t) bodyParts.push(t);
    }

    const text = bodyParts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    bodyCharCount += text.length;
    return { lessonId: id, title, text };
  });

  const combinedText = perLesson
    .map((l) => (l.text ? `Lesson "${l.title}":\n${l.text}` : `Lesson "${l.title}": (no written content)`))
    .join('\n\n');

  return { combinedText, perLesson, bodyCharCount };
}
