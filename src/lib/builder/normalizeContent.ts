// The ONE place that understands what `pages.content` can look like.
//
// `pages.content` is a jsonb column holding a Craft.js node tree, and it has been written in two
// shapes: a JSON *string* (a jsonb string scalar — createWebsite, templates, the server-action save)
// and a real JSON *object* (the editor's autosave/publish since 8fa58e0c, LMS lessons). Readers that
// assumed one shape broke on the other (the public renderer called `.trim()` on an object and showed
// a blank black page). Every reader goes through normalizeContent(); every writer goes through
// toStoredContent(), which always produces the canonical shape: an object.
//
// Never throws. Unparseable input is reported as { status: 'invalid' } and logged without its body.

export type CraftTree = Record<string, any>;

export type NormalizedContent =
  | { status: 'ok'; tree: CraftTree; source: 'object' | 'string' | 'double-encoded' }
  | { status: 'empty'; tree: null }
  | { status: 'invalid'; tree: null; reason: InvalidReason };

export type InvalidReason =
  | 'not-json'
  | 'not-an-object'
  | 'missing-root'
  | 'too-large'
  | 'unsupported-type';

export interface ContentContext {
  /** pages.id, so a log line can be traced to a row. Never the content itself. */
  pageId?: string | null;
  /** Which consumer hit it (e.g. 'PublishedPageRenderer'). */
  where?: string;
  /** Set false to skip the log line (tests, speculative parses). */
  log?: boolean;
}

// A page tree is normally well under 1MB; anything beyond this is not a page and is not parsed.
export const MAX_CONTENT_CHARS = 20 * 1024 * 1024;

// A string that parses to another string is double-encoded; allow a few layers, then give up.
const MAX_STRING_LAYERS = 3;

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function classify(tree: Record<string, any>, source: 'object' | 'string' | 'double-encoded'): NormalizedContent {
  if (Object.keys(tree).length === 0) return { status: 'empty', tree: null };
  if (!isPlainObject(tree.ROOT)) return { status: 'invalid', tree: null, reason: 'missing-root' };
  return { status: 'ok', tree, source };
}

function report(result: NormalizedContent, input: unknown, ctx?: ContentContext) {
  if (result.status !== 'invalid' || ctx?.log === false) return;
  // Safe fields only: where, which page, why, and the size/type of the input. Never its content.
  // eslint-disable-next-line no-console
  console.error('[builder.content.invalid]', {
    where: ctx?.where ?? 'unknown',
    pageId: ctx?.pageId ?? null,
    reason: result.reason,
    inputType: input === null ? 'null' : Array.isArray(input) ? 'array' : typeof input,
    inputLength: typeof input === 'string' ? input.length : undefined,
  });
}

export function normalizeContent(input: unknown, ctx?: ContentContext): NormalizedContent {
  const result = parse(input);
  report(result, input, ctx);
  return result;
}

function parse(input: unknown): NormalizedContent {
  if (input === null || input === undefined) return { status: 'empty', tree: null };

  if (typeof input === 'object') {
    if (Array.isArray(input)) return { status: 'invalid', tree: null, reason: 'not-an-object' };
    return classify(input as Record<string, any>, 'object');
  }

  if (typeof input !== 'string') return { status: 'invalid', tree: null, reason: 'unsupported-type' };

  let current: string = input;
  for (let layer = 0; layer < MAX_STRING_LAYERS; layer++) {
    if (current.trim() === '') return { status: 'empty', tree: null };
    if (current.length > MAX_CONTENT_CHARS) return { status: 'invalid', tree: null, reason: 'too-large' };

    let parsed: unknown;
    try {
      parsed = JSON.parse(current);
    } catch {
      return { status: 'invalid', tree: null, reason: 'not-json' };
    }

    if (typeof parsed === 'string') {
      current = parsed; // double-encoded: unwrap and go round again
      continue;
    }
    if (parsed === null) return { status: 'empty', tree: null };
    if (!isPlainObject(parsed)) return { status: 'invalid', tree: null, reason: 'not-an-object' };
    return classify(parsed, layer === 0 ? 'string' : 'double-encoded');
  }
  return { status: 'invalid', tree: null, reason: 'not-json' };
}

/**
 * The canonical shape to WRITE to pages.content: a real object. Anything that does not normalise to
 * a tree is returned unchanged, so a writer never destroys data it could not understand.
 */
export function toStoredContent<T>(input: T): T | CraftTree {
  const result = normalizeContent(input, { log: false });
  return result.status === 'ok' ? result.tree : input;
}

/** Craft's Frame/deserialize take a JSON string. Null when there is no usable tree. */
export function contentToJsonString(input: unknown, ctx?: ContentContext): string | null {
  const result = normalizeContent(input, ctx);
  return result.status === 'ok' ? JSON.stringify(result.tree) : null;
}
