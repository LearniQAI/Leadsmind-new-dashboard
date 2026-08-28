// Lesson Builder Part 3: premium starter templates. Reuses the exact same pattern already
// established for the Website/Funnel Builder's template system (src/lib/builder/templates.ts,
// BuilderTemplate: {id, name, description, content: <CraftJS JSON string>}, applied via
// actions.deserialize()) rather than a second, unrelated template mechanism — the only real
// difference is these trees use LessonBlockNode (Part 2) for their centerpiece blocks instead
// of website-facing components like Hero/Form.
//
// Each template's node tree was hand-authored against the real registered component props
// confirmed live in this codebase (Section.craft, Container.craft, Heading.craft,
// Paragraph.craft, Columns.craft, LessonBlockNode.craft) — not guessed. "Key takeaways" lists
// use real <ul>/<li> markup inside a Paragraph's `text` prop (confirmed allowed by
// sanitizeRichTextHtml's ALLOWED_TAGS) rather than a fabricated list component, since no
// dedicated "Bulleted list" primitive exists in this builder (see Part 1's audit finding).

export interface LessonTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
}

const EYEBROW_COLOR = '#1359FF';
const HEADING_COLOR = '#0F172A';
const BODY_COLOR = '#475569';

export const BLANK_LESSON_CANVAS =
  '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}';

export const LESSON_TEMPLATES: LessonTemplate[] = [
  {
    id: 'video-lesson',
    name: 'Video Lesson',
    description: 'Framing text, an embedded video centerpiece, and a key-takeaways list below.',
    content: JSON.stringify({
      ROOT: { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'min-h-screen bg-white' }, nodes: ['s1', 's2', 's3'], custom: {} },
      s1: { type: { resolvedName: 'Section' }, isCanvas: true, props: { paddingTop: 56, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, backgroundColor: 'transparent' }, parent: 'ROOT', nodes: ['c1'], custom: {} },
      c1: { type: { resolvedName: 'Container' }, isCanvas: true, props: { layoutType: 'fixed', maxWidth: '760px', padding: 0, backgroundColor: 'transparent' }, parent: 's1', nodes: ['eyebrow1', 'heading1', 'para1'], custom: {} },
      eyebrow1: { type: { resolvedName: 'Paragraph' }, isCanvas: false, props: { text: 'LESSON', fontSize: 12, textAlign: 'left', color: EYEBROW_COLOR, lineHeight: 'normal' }, parent: 'c1', nodes: [], custom: {} },
      heading1: { type: { resolvedName: 'Heading' }, isCanvas: false, props: { level: 'h1', text: 'New Video Lesson', fontWeight: 'bold', textAlign: 'left', color: HEADING_COLOR }, parent: 'c1', nodes: [], custom: {} },
      para1: { type: { resolvedName: 'Paragraph' }, isCanvas: false, props: { text: 'A short framing paragraph goes here — set the stage for what this video covers and why it matters before the student presses play.', fontSize: 16, textAlign: 'left', color: BODY_COLOR, lineHeight: 'relaxed' }, parent: 'c1', nodes: [], custom: {} },
      s2: { type: { resolvedName: 'Section' }, isCanvas: true, props: { paddingTop: 8, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, backgroundColor: 'transparent' }, parent: 'ROOT', nodes: ['c2'], custom: {} },
      c2: { type: { resolvedName: 'Container' }, isCanvas: true, props: { layoutType: 'fixed', maxWidth: '760px', padding: 0, backgroundColor: 'transparent' }, parent: 's2', nodes: ['video1'], custom: {} },
      video1: { type: { resolvedName: 'LessonBlockNode' }, isCanvas: false, props: { blockId: null, blockType: 'video' }, parent: 'c2', nodes: [], custom: {} },
      s3: { type: { resolvedName: 'Section' }, isCanvas: true, props: { paddingTop: 8, paddingBottom: 64, paddingLeft: 24, paddingRight: 24, backgroundColor: 'transparent' }, parent: 'ROOT', nodes: ['c3'], custom: {} },
      c3: { type: { resolvedName: 'Container' }, isCanvas: true, props: { layoutType: 'fixed', maxWidth: '760px', padding: 0, backgroundColor: 'transparent' }, parent: 's3', nodes: ['heading2', 'list1'], custom: {} },
      heading2: { type: { resolvedName: 'Heading' }, isCanvas: false, props: { level: 'h3', text: 'Key takeaways', fontWeight: 'bold', textAlign: 'left', color: HEADING_COLOR }, parent: 'c3', nodes: [], custom: {} },
      list1: { type: { resolvedName: 'Paragraph' }, isCanvas: false, props: { text: '<ul><li>First key point students should walk away with</li><li>Second key point</li><li>Third key point</li></ul>', fontSize: 15, textAlign: 'left', color: BODY_COLOR, lineHeight: 'relaxed' }, parent: 'c3', nodes: [], custom: {} },
    }),
  },
  {
    id: 'reading-lesson',
    name: 'Reading Lesson',
    description: 'Header context, a prominent PDF reading block, and supporting notes after.',
    content: JSON.stringify({
      ROOT: { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'min-h-screen bg-white' }, nodes: ['s1', 's2', 's3'], custom: {} },
      s1: { type: { resolvedName: 'Section' }, isCanvas: true, props: { paddingTop: 56, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, backgroundColor: 'transparent' }, parent: 'ROOT', nodes: ['c1'], custom: {} },
      c1: { type: { resolvedName: 'Container' }, isCanvas: true, props: { layoutType: 'fixed', maxWidth: '760px', padding: 0, backgroundColor: 'transparent' }, parent: 's1', nodes: ['eyebrow1', 'heading1', 'para1'], custom: {} },
      eyebrow1: { type: { resolvedName: 'Paragraph' }, isCanvas: false, props: { text: 'LESSON', fontSize: 12, textAlign: 'left', color: EYEBROW_COLOR, lineHeight: 'normal' }, parent: 'c1', nodes: [], custom: {} },
      heading1: { type: { resolvedName: 'Heading' }, isCanvas: false, props: { level: 'h1', text: 'New Reading Lesson', fontWeight: 'bold', textAlign: 'left', color: HEADING_COLOR }, parent: 'c1', nodes: [], custom: {} },
      para1: { type: { resolvedName: 'Paragraph' }, isCanvas: false, props: { text: 'Introduce the reading below — what question should students be holding in mind as they go through it?', fontSize: 16, textAlign: 'left', color: BODY_COLOR, lineHeight: 'relaxed' }, parent: 'c1', nodes: [], custom: {} },
      s2: { type: { resolvedName: 'Section' }, isCanvas: true, props: { paddingTop: 8, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, backgroundColor: 'transparent' }, parent: 'ROOT', nodes: ['c2'], custom: {} },
      c2: { type: { resolvedName: 'Container' }, isCanvas: true, props: { layoutType: 'fixed', maxWidth: '820px', padding: 0, backgroundColor: 'transparent' }, parent: 's2', nodes: ['reading1'], custom: {} },
      reading1: { type: { resolvedName: 'LessonBlockNode' }, isCanvas: false, props: { blockId: null, blockType: 'reading' }, parent: 'c2', nodes: [], custom: {} },
      s3: { type: { resolvedName: 'Section' }, isCanvas: true, props: { paddingTop: 8, paddingBottom: 64, paddingLeft: 24, paddingRight: 24, backgroundColor: 'transparent' }, parent: 'ROOT', nodes: ['c3'], custom: {} },
      c3: { type: { resolvedName: 'Container' }, isCanvas: true, props: { layoutType: 'fixed', maxWidth: '760px', padding: 0, backgroundColor: 'transparent' }, parent: 's3', nodes: ['para2'], custom: {} },
      para2: { type: { resolvedName: 'Paragraph' }, isCanvas: false, props: { text: 'As you read, consider how this connects to what came before — add reflection notes or discussion prompts here.', fontSize: 15, textAlign: 'left', color: BODY_COLOR, lineHeight: 'relaxed' }, parent: 'c3', nodes: [], custom: {} },
    }),
  },
  {
    id: 'mixed-media-lesson',
    name: 'Mixed Media Lesson',
    description: 'Full-width intro, then a video and a downloadable resource side-by-side.',
    content: JSON.stringify({
      ROOT: { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'min-h-screen bg-white' }, nodes: ['s1', 's2'], custom: {} },
      s1: { type: { resolvedName: 'Section' }, isCanvas: true, props: { paddingTop: 56, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, backgroundColor: 'transparent' }, parent: 'ROOT', nodes: ['c1'], custom: {} },
      c1: { type: { resolvedName: 'Container' }, isCanvas: true, props: { layoutType: 'fixed', maxWidth: '900px', padding: 0, backgroundColor: 'transparent' }, parent: 's1', nodes: ['eyebrow1', 'heading1', 'para1'], custom: {} },
      eyebrow1: { type: { resolvedName: 'Paragraph' }, isCanvas: false, props: { text: 'LESSON', fontSize: 12, textAlign: 'left', color: EYEBROW_COLOR, lineHeight: 'normal' }, parent: 'c1', nodes: [], custom: {} },
      heading1: { type: { resolvedName: 'Heading' }, isCanvas: false, props: { level: 'h1', text: 'New Mixed Media Lesson', fontWeight: 'bold', textAlign: 'left', color: HEADING_COLOR }, parent: 'c1', nodes: [], custom: {} },
      para1: { type: { resolvedName: 'Paragraph' }, isCanvas: false, props: { text: 'Combine a video walkthrough with a downloadable resource students can keep — introduce both below.', fontSize: 16, textAlign: 'left', color: BODY_COLOR, lineHeight: 'relaxed' }, parent: 'c1', nodes: [], custom: {} },
      s2: { type: { resolvedName: 'Section' }, isCanvas: true, props: { paddingTop: 8, paddingBottom: 64, paddingLeft: 24, paddingRight: 24, backgroundColor: 'transparent' }, parent: 'ROOT', nodes: ['c2'], custom: {} },
      c2: { type: { resolvedName: 'Container' }, isCanvas: true, props: { layoutType: 'fixed', maxWidth: '900px', padding: 0, backgroundColor: 'transparent' }, parent: 's2', nodes: ['cols1'], custom: {} },
      cols1: { type: { resolvedName: 'Columns' }, isCanvas: true, props: { layout: '2', gap: 24, padding: 0 }, parent: 'c2', nodes: ['colA', 'colB'], custom: {} },
      colA: { type: { resolvedName: 'Container' }, isCanvas: true, props: { layoutType: 'fixed', padding: 0, backgroundColor: 'transparent' }, parent: 'cols1', nodes: ['video1'], custom: {} },
      colB: { type: { resolvedName: 'Container' }, isCanvas: true, props: { layoutType: 'fixed', padding: 0, backgroundColor: 'transparent' }, parent: 'cols1', nodes: ['download1'], custom: {} },
      video1: { type: { resolvedName: 'LessonBlockNode' }, isCanvas: false, props: { blockId: null, blockType: 'video' }, parent: 'colA', nodes: [], custom: {} },
      download1: { type: { resolvedName: 'LessonBlockNode' }, isCanvas: false, props: { blockId: null, blockType: 'download' }, parent: 'colB', nodes: [], custom: {} },
    }),
  },
  {
    id: 'assessment-lesson',
    name: 'Assessment Lesson',
    description: 'Minimal framing text with a quiz as the clear, uncluttered centerpiece.',
    content: JSON.stringify({
      ROOT: { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'min-h-screen bg-white' }, nodes: ['s1', 's2'], custom: {} },
      s1: { type: { resolvedName: 'Section' }, isCanvas: true, props: { paddingTop: 64, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, backgroundColor: 'transparent' }, parent: 'ROOT', nodes: ['c1'], custom: {} },
      c1: { type: { resolvedName: 'Container' }, isCanvas: true, props: { layoutType: 'fixed', maxWidth: '680px', padding: 0, backgroundColor: 'transparent' }, parent: 's1', nodes: ['eyebrow1', 'heading1', 'para1'], custom: {} },
      eyebrow1: { type: { resolvedName: 'Paragraph' }, isCanvas: false, props: { text: 'ASSESSMENT', fontSize: 12, textAlign: 'left', color: EYEBROW_COLOR, lineHeight: 'normal' }, parent: 'c1', nodes: [], custom: {} },
      heading1: { type: { resolvedName: 'Heading' }, isCanvas: false, props: { level: 'h1', text: 'New Assessment', fontWeight: 'bold', textAlign: 'left', color: HEADING_COLOR }, parent: 'c1', nodes: [], custom: {} },
      para1: { type: { resolvedName: 'Paragraph' }, isCanvas: false, props: { text: "Test what you've learned so far.", fontSize: 16, textAlign: 'left', color: BODY_COLOR, lineHeight: 'relaxed' }, parent: 'c1', nodes: [], custom: {} },
      s2: { type: { resolvedName: 'Section' }, isCanvas: true, props: { paddingTop: 8, paddingBottom: 64, paddingLeft: 24, paddingRight: 24, backgroundColor: 'transparent' }, parent: 'ROOT', nodes: ['c2'], custom: {} },
      c2: { type: { resolvedName: 'Container' }, isCanvas: true, props: { layoutType: 'fixed', maxWidth: '680px', padding: 0, backgroundColor: 'transparent' }, parent: 's2', nodes: ['quiz1'], custom: {} },
      quiz1: { type: { resolvedName: 'LessonBlockNode' }, isCanvas: false, props: { blockId: null, blockType: 'quiz' }, parent: 'c2', nodes: [], custom: {} },
    }),
  },
];

export const getLessonTemplateById = (id: string) => LESSON_TEMPLATES.find((t) => t.id === id);
