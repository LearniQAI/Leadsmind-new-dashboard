import { describe, it, expect } from 'vitest';
import { assembleLessonContext, getLessonTextForAI, textFromBlock, textFromCanvasItem } from './lessonContentForAI';

// Minimal fake Supabase client: each table returns whatever rows this test configured for it,
// filtered by the `.in(col, ids)` the real code calls with.
function fakeDb(tables: Record<string, any[]>) {
  return {
    from(table: string) {
      const rows = tables[table] || [];
      const q: any = {
        _col: null as string | null,
        select() { return q; },
        in(col: string, ids: string[]) {
          q._col = col;
          q._ids = ids;
          return q;
        },
        then(resolve: any) {
          const filtered = q._col ? rows.filter((r) => q._ids.includes(r[q._col])) : rows;
          return Promise.resolve(resolve({ data: filtered, error: null }));
        },
      };
      return q;
    },
  } as any;
}

const richTextBlock = (lessonId: string, text: string, position = 0) => ({
  lesson_id: lessonId, type: 'rich_text', content: { text }, position,
});

describe('assembleLessonContext (Batch 5 RAG rebuild)', () => {
  it('content_blocks-only lesson: unchanged behaviour from before the rebuild', async () => {
    const db = fakeDb({
      course_lessons: [{ id: 'L1', title: 'Intro', content: null }],
      content_blocks: [richTextBlock('L1', 'Hello from a block.')],
      pages: [],
    });
    const { perLesson, bodyCharCount } = await assembleLessonContext(db, ['L1']);
    expect(perLesson[0].text).toContain('Hello from a block.');
    expect(bodyCharCount).toBeGreaterThan(0);
  });

  it('canvas-ONLY lesson (zero content_blocks) now contributes real text — this was the gap', async () => {
    const db = fakeDb({
      course_lessons: [{ id: 'L2', title: 'Fundamentals', content: null }],
      content_blocks: [],
      pages: [{
        course_lesson_id: 'L2',
        content: {
          ROOT: { type: { resolvedName: 'Container' }, nodes: ['h1', 'p1'] },
          h1: { type: { resolvedName: 'Heading' }, props: { text: '<p>Core Concepts</p>', level: 'h1' } },
          p1: { type: { resolvedName: 'Paragraph' }, props: { text: '<p>This is the real inline lesson body.</p>' } },
        },
      }],
    });
    const { perLesson } = await assembleLessonContext(db, ['L2']);
    expect(perLesson[0].text).toContain('Core Concepts');
    expect(perLesson[0].text).toContain('This is the real inline lesson body.');
  });

  it('a canvas block/contentbox item referencing a content_blocks row is never double-counted', async () => {
    const db = fakeDb({
      course_lessons: [{ id: 'L3', title: 'Mixed', content: null }],
      content_blocks: [{ lesson_id: 'L3', type: 'reading', content: { text: 'UNIQUE_BLOCK_TEXT' }, position: 0 }],
      pages: [{
        course_lesson_id: 'L3',
        content: {
          ROOT: { type: { resolvedName: 'Container' }, nodes: ['h1', 'blk1'] },
          h1: { type: { resolvedName: 'Heading' }, props: { text: 'Intro heading', level: 'h2' } },
          blk1: { type: { resolvedName: 'LessonBlockNode' }, props: { blockId: 'cb-1', blockType: 'reading' } },
        },
      }],
    });
    const { perLesson } = await assembleLessonContext(db, ['L3']);
    const occurrences = perLesson[0].text.split('UNIQUE_BLOCK_TEXT').length - 1;
    expect(occurrences).toBe(1); // not 2
    expect(perLesson[0].text).toContain('Intro heading');
  });

  it('a wired ContentBox (has blockId) is excluded from canvas text (its content lives in content_blocks)', () => {
    const wired = { kind: 'contentbox' as const, blockId: 'cb-2', blockType: 'reading', headerLabel: '', headerColorHex: '#000', headline: 'Should not appear', body: 'nor this', ctaText: 'Open' };
    expect(textFromCanvasItem(wired)).toBe('');
  });

  it('an UNWIRED ContentBox placeholder (no blockId) contributes its own headline/body text', () => {
    const placeholder = { kind: 'contentbox' as const, blockId: null, blockType: 'reading', headerLabel: '', headerColorHex: '#000', headline: 'Placeholder headline', body: '<p>placeholder body</p>', ctaText: 'Go' };
    const text = textFromCanvasItem(placeholder);
    expect(text).toContain('Placeholder headline');
    expect(text).toContain('placeholder body');
  });

  it('image alt text is included, an image with no alt contributes nothing', () => {
    expect(textFromCanvasItem({ kind: 'image', src: 'x.png', alt: 'A diagram of the pipeline', radius: 0 })).toBe('A diagram of the pipeline');
    expect(textFromCanvasItem({ kind: 'image', src: 'x.png', alt: '', radius: 0 })).toBe('');
  });

  it('a lesson with genuinely nothing (no blocks, no page, no legacy content) yields empty text', async () => {
    const db = fakeDb({ course_lessons: [{ id: 'L4', title: 'Empty', content: null }], content_blocks: [], pages: [] });
    const { perLesson } = await assembleLessonContext(db, ['L4']);
    expect(perLesson[0].text).toBe('');
  });
});

describe('getLessonTextForAI', () => {
  it('returns null (not empty string) when there is nothing to embed/summarize', async () => {
    const db = fakeDb({ course_lessons: [{ id: 'L5', title: 'Empty', content: null }], content_blocks: [], pages: [] });
    expect(await getLessonTextForAI(db, 'L5')).toBeNull();
  });

  it('returns the real text for a canvas-only lesson', async () => {
    const db = fakeDb({
      course_lessons: [{ id: 'L6', title: 'X', content: null }],
      content_blocks: [],
      pages: [{ course_lesson_id: 'L6', content: { ROOT: { type: { resolvedName: 'Container' }, nodes: ['p1'] }, p1: { type: { resolvedName: 'Text' }, props: { text: 'Real canvas prose here.' } } } }],
    });
    expect(await getLessonTextForAI(db, 'L6')).toContain('Real canvas prose here.');
  });
});

describe('textFromBlock (unchanged, sanity)', () => {
  it('still strips HTML from rich_text', () => {
    expect(textFromBlock({ type: 'rich_text', content: { text: '<p>Hi <b>there</b></p>' } })).toBe('Hi there');
  });
});
