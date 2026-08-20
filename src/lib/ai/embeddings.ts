import OpenAI from 'openai';
import { logger } from '@/shared/logger';

// text-embedding-3-small: 1536 dimensions, $0.02/1M tokens, fully active with
// no announced deprecation (verified live, Aug 2026) — same model already
// used by help.ts/forum.ts for semantic search, kept consistent here so this
// feature can reuse the exact vector(1536)/HNSW/match_* RPC pattern already
// proven in this codebase (see help_articles). Those two call sites hand-roll
// a raw fetch() each; this is the first shared, SDK-based helper for
// embeddings in the repo — batches multiple inputs into a single API call.
const EMBEDDING_MODEL = 'text-embedding-3-small';

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

/** Embeds a single string. Returns null on failure rather than throwing —
 * callers decide whether that's fatal for their flow. */
export async function embedText(text: string): Promise<number[] | null> {
  const results = await embedTexts([text]);
  return results?.[0] ?? null;
}

/** Batches multiple strings into one embeddings API call — used by the
 * course-content chunking pipeline so a multi-chunk lesson costs one request,
 * not N. Returns null (not partial results) on failure, since a partial
 * batch would silently under-embed a lesson. */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  if (texts.length === 0) return [];
  try {
    const openai = getClient();
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts.map(t => t.replace(/\n/g, ' ')),
    });
    return response.data.map(d => d.embedding);
  } catch (err) {
    logger.error({ err }, 'embeddings.generate.failed');
    return null;
  }
}

export { EMBEDDING_MODEL };
