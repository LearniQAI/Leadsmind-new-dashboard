import { createHash } from 'crypto';

// ~150 words (~800-900 chars) per chunk with a 20-word overlap. Sized for the
// real content shape found in course_lessons.content — short-to-medium lesson
// text/transcripts (there's no ASR pipeline, so nothing multi-hour exists to
// chunk yet), not fixed-size for arbitrary long-form text. A short lesson
// (the common case) collapses to a single chunk. Word-boundary-safe: never
// cuts a chunk mid-word.
const CHUNK_WORD_SIZE = 150;
const CHUNK_WORD_OVERLAP = 20;

/**
 * Extracts the real, embeddable text for a course_lessons row. Returns null
 * when there's genuinely nothing text-based to embed (e.g. a video lesson
 * with no transcript) — this is an expected, common outcome, not an error.
 */
export function extractLessonText(lesson: { lesson_type: string; content: any; title: string }): string | null {
  // course_lessons has no description column (that's an artifact of how the
  // student player's enriched view object is assembled client-side elsewhere
  // — the raw table this pipeline reads from only has `content` jsonb).
  const contentText = typeof lesson.content?.text === 'string' ? lesson.content.text.trim() : '';
  if (contentText) return contentText;

  return null;
}

export function hashContent(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** Splits text into overlapping, word-boundary-safe chunks. */
export function chunkText(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  if (words.length <= CHUNK_WORD_SIZE) return [words.join(' ')];

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + CHUNK_WORD_SIZE, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end >= words.length) break;
    start = end - CHUNK_WORD_OVERLAP;
  }
  return chunks;
}

export { CHUNK_WORD_SIZE, CHUNK_WORD_OVERLAP };
