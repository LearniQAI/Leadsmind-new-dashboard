// Student-side reader for a lesson authored in the canvas Lesson Builder.
//
// The admin Lesson Builder (BuilderEditor + Craft.js) stores the whole authored lesson as a
// node tree in `pages.content` (jsonb), linked to the lesson via `pages.course_lesson_id`
// (migration 20260903000012). Before this, the student player only ever read the flat
// `content_blocks` table — so every text/heading/checklist/image a teacher placed on the
// canvas was invisible to students, who saw only orphan/legacy content_blocks rows instead.
//
// Rather than run the Craft.js editor runtime inside the student bundle, this walks the tree
// once on the server and emits a flat, ordered list of render items. Layout containers
// (Section / Container / Columns) are traversed in document order — a multi-column section
// therefore renders as stacked blocks for the student, which is an acceptable reading-view
// simplification; all of the actual *content* (text, checklist markup, images, and the
// interactive block references) is preserved exactly.
//
// Interactive blocks (LessonBlockNode / ContentBox) are emitted as `{ kind: 'block' | 'contentbox' }`
// carrying only the real `content_blocks` id — the student player then renders them through
// the exact same per-type switch (VideoPlayer / SandboxedHtml / quiz link / reading modal /
// markBlockComplete) it already uses for legacy lessons. Those same blockIds are what
// getBlockIdsForLesson() derives the completion gate from, so gating is unaffected.

export type LessonCanvasItem =
  | { kind: 'heading'; level: string; html: string; align: string }
  | { kind: 'richtext'; html: string; align: string }
  | { kind: 'image'; src: string; alt: string; radius: number }
  | { kind: 'divider' }
  | { kind: 'block'; blockId: string; blockType: string }
  | {
      kind: 'contentbox';
      blockId: string | null;
      blockType: string;
      headerLabel: string;
      headerColorHex: string;
      headline: string;
      body: string;
      ctaText: string;
    };

type CraftNode = {
  type?: { resolvedName?: string };
  props?: Record<string, any>;
  nodes?: string[];
  isCanvas?: boolean;
};

const CONTAINER_TYPES = new Set(['Container', 'Section', 'Columns', 'ROOT']);

function nodeToItems(
  node: CraftNode | undefined,
  tree: Record<string, CraftNode>,
  out: LessonCanvasItem[],
  seen: Set<string>,
): void {
  if (!node) return;
  const name = node.type?.resolvedName;
  const p = node.props || {};

  if (name && CONTAINER_TYPES.has(name)) {
    for (const childId of node.nodes || []) {
      if (seen.has(childId)) continue;
      seen.add(childId);
      nodeToItems(tree[childId], tree, out, seen);
    }
    return;
  }

  switch (name) {
    case 'Heading': {
      const html = typeof p.text === 'string' ? p.text : '';
      if (html.trim()) {
        out.push({
          kind: 'heading',
          level: /^h[1-6]$/.test(p.level) ? p.level : 'h2',
          html,
          align: p.textAlign || 'left',
        });
      }
      return;
    }
    case 'Paragraph':
    case 'Text': {
      const html = typeof p.text === 'string' ? p.text : '';
      if (html.trim()) {
        out.push({ kind: 'richtext', html, align: p.textAlign || 'left' });
      }
      return;
    }
    case 'Image':
    case 'UserImage': {
      if (typeof p.src === 'string' && p.src.trim()) {
        out.push({
          kind: 'image',
          src: p.src,
          alt: typeof p.alt === 'string' ? p.alt : '',
          radius: typeof p.borderRadius === 'number' ? p.borderRadius : 12,
        });
      }
      return;
    }
    case 'Divider': {
      out.push({ kind: 'divider' });
      return;
    }
    case 'LessonBlockNode': {
      // A freshly-dragged, not-yet-saved node has blockId === null — skip it (the completion
      // gate skips it too), it has no real content_blocks row to render.
      if (typeof p.blockId === 'string' && p.blockId) {
        out.push({ kind: 'block', blockId: p.blockId, blockType: p.blockType || 'rich_text' });
      }
      return;
    }
    case 'ContentBox': {
      out.push({
        kind: 'contentbox',
        blockId: typeof p.blockId === 'string' && p.blockId ? p.blockId : null,
        blockType: p.blockType || 'reading',
        headerLabel: typeof p.headerLabel === 'string' ? p.headerLabel : '',
        headerColorHex: typeof p.headerColorHex === 'string' ? p.headerColorHex : '#1359FF',
        headline: typeof p.headline === 'string' ? p.headline : '',
        body: typeof p.body === 'string' ? p.body : '',
        ctaText: typeof p.ctaText === 'string' ? p.ctaText : 'Open',
      });
      return;
    }
    default: {
      // Unknown / layout-only leaf (Spacer, etc.) — nothing to render for a student.
      return;
    }
  }
}

/**
 * Walks a Craft.js `pages.content` tree and returns an ordered, flat list of renderable
 * items for the student lesson view. Returns `[]` for a missing/empty/unparseable tree or one
 * whose ROOT has no children — the caller treats `[]` as "no canvas, use the legacy
 * content_blocks render".
 */
export function flattenLessonCanvas(content: unknown): LessonCanvasItem[] {
  let tree: Record<string, CraftNode> | null = null;
  try {
    tree = typeof content === 'string' ? JSON.parse(content) : (content as Record<string, CraftNode>);
  } catch {
    return [];
  }
  if (!tree || typeof tree !== 'object') return [];

  const root = tree.ROOT;
  if (!root || !Array.isArray(root.nodes) || root.nodes.length === 0) return [];

  const out: LessonCanvasItem[] = [];
  nodeToItems(root, tree, out, new Set<string>());
  return out;
}

/**
 * A block/contentbox item only counts as a real completion signal once it's wired to a
 * content_blocks row. `block` items are only emitted with a non-null blockId; a `contentbox`
 * can exist as an unwired author placeholder (blockId null) that references no completable
 * content — getBlockIdsForLesson() ignores those too, so this must match.
 */
export function isTrackableCanvasItem(i: LessonCanvasItem): boolean {
  return i.kind === 'block' || (i.kind === 'contentbox' && !!i.blockId);
}

/** True when a flattened canvas has inline reading content but NO wired block/contentbox. */
export function isInlineOnlyCanvas(items: LessonCanvasItem[]): boolean {
  if (items.length === 0) return false;
  const hasTrackable = items.some(isTrackableCanvasItem);
  const hasInline = items.some((i) => i.kind === 'heading' || i.kind === 'richtext' || i.kind === 'image');
  return hasInline && !hasTrackable;
}

/** Word count across the heading + rich-text items of a flattened canvas (HTML stripped). */
export function countCanvasWords(items: LessonCanvasItem[]): number {
  let words = 0;
  for (const item of items) {
    if (item.kind !== 'heading' && item.kind !== 'richtext') continue;
    const text = item.html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) words += text.split(' ').length;
  }
  return words;
}

/**
 * Minimum seconds a student must dwell on an inline-only lesson before it can be completed.
 * ~250 wpm reading speed, clamped to [8, 90] so a one-line lesson still needs a beat and a
 * very long one isn't punishing. Recomputed server-side from the lesson's own content — the
 * client cannot lower this floor.
 */
export function requiredReadingDwellSeconds(items: LessonCanvasItem[]): number {
  const words = countCanvasWords(items);
  return Math.min(90, Math.max(8, Math.round((words / 250) * 60)));
}
