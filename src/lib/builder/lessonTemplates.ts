// Lesson Builder Part 3 (v2 — replaces the earlier 4-template pass with exactly 2 deeper,
// premium templates per the revised master prompt). Reuses the exact same pattern already
// established for the Website/Funnel Builder's template system
// (src/lib/builder/templates.ts, BuilderTemplate: {id, name, description, content: <CraftJS
// JSON string>}, applied via actions.deserialize()) rather than a second, unrelated template
// mechanism.
//
// TYPOGRAPHY DECISION (Step 0, made explicitly): every Heading/Paragraph node below sets
// `useThemeFont: true`, so at render time it inherits the ACTIVE COURSE's real Signal/Ember/
// Grove font pairing (font-signalHeading+font-signalBody / font-emberHeading+font-emberBody /
// font-groveHeading+font-groveBody — real, already-registered Tailwind classes, confirmed
// live in tailwind.config.js) via LessonBuilderContext -> Heading.tsx/Paragraph.tsx's new
// optional `useThemeFont` prop (additive only — zero effect on the Website/Funnel Builder's
// existing usage of those same shared components). This is real dynamic inheritance, not a
// font baked into the template at authoring time: the same template renders in Archivo for a
// Signal-themed course and Lora for a Grove-themed course. Tried first per the brief, and it
// genuinely works here — no fallback to Plus Jakarta Sans/Inter was needed.
//
// "Key Topics"/"recap" checkmark lists use real <ul>/<li> markup with a `<span class="...">`
// checkmark glyph (both tags/attrs confirmed allowed by sanitizeRichTextHtml's ALLOWED_TAGS/
// ALLOWED_ATTR — `class` is allowed, inline `style` is not, so styling goes through real
// Tailwind utility classes) inside a Paragraph's `text` prop — there is still no dedicated
// "Bulleted list" primitive in this builder (Part 1's audit finding stands), so this remains
// the real, functional way to build one rather than a fabricated list component.
//
// The colored-header "Content box" callout is the new real ContentBox component
// (src/components/builder/user/ContentBox.tsx) — a genuine reusable Craft.js component, not
// a one-off hack: solid-color header bar + all-caps label, white body with headline/
// supporting text, and a real CTA wired to a real content_blocks row (reading/download/quiz/
// assignment) via the same create-on-first-render + GET/PATCH pattern as LessonBlockNode.

export interface LessonTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
}

const HEADING_COLOR = '#0F172A';
const BODY_COLOR = '#475569';
const EYEBROW_COLOR = '#1359FF';
const CHECK = '<span class="text-sky-500 font-bold">&#10003;</span>';
const WARN = '<span class="text-amber-500 font-bold">&#9888;</span>';

export const BLANK_LESSON_CANVAS =
  '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}';

const heading = (level: string, text: string, extra: Record<string, any> = {}) => ({
  type: { resolvedName: 'Heading' },
  isCanvas: false,
  props: { level, text, fontWeight: 'bold', textAlign: 'left', color: HEADING_COLOR, useThemeFont: true, ...extra },
  nodes: [],
  custom: {},
});

const paragraph = (text: string, extra: Record<string, any> = {}) => ({
  type: { resolvedName: 'Paragraph' },
  isCanvas: false,
  props: { text, fontSize: 16, textAlign: 'left', color: BODY_COLOR, lineHeight: 'relaxed', useThemeFont: true, ...extra },
  nodes: [],
  custom: {},
});

const eyebrow = (text: string) => ({
  type: { resolvedName: 'Paragraph' },
  isCanvas: false,
  props: { text, fontSize: 12, textAlign: 'left', color: EYEBROW_COLOR, lineHeight: 'normal', useThemeFont: true },
  nodes: [],
  custom: {},
});

const checklist = (items: string[]) => ({
  type: { resolvedName: 'Paragraph' },
  isCanvas: false,
  props: {
    // `style` is NOT in sanitizeRichTextHtml's ALLOWED_ATTR (only `class` is) — real Tailwind
    // utility classes used here instead, not inline styles that would just get stripped.
    text: `<ul class="list-none p-0 m-0 space-y-2.5">${items.map((i) => `<li class="flex items-start gap-2">${CHECK} <span>${i}</span></li>`).join('')}</ul>`,
    fontSize: 15,
    textAlign: 'left',
    color: BODY_COLOR,
    lineHeight: 'relaxed',
    useThemeFont: true,
  },
  nodes: [],
  custom: {},
});

const section = (nodes: string[], padTop = 8, padBottom = 16) => ({
  type: { resolvedName: 'Section' },
  isCanvas: true,
  props: { paddingTop: padTop, paddingBottom: padBottom, paddingLeft: 24, paddingRight: 24, backgroundColor: 'transparent' },
  nodes,
  custom: {},
});

const container = (nodes: string[], maxWidth = '760px', extra: Record<string, any> = {}) => ({
  type: { resolvedName: 'Container' },
  isCanvas: true,
  props: { layoutType: 'fixed', maxWidth, padding: 0, backgroundColor: 'transparent', ...extra },
  nodes,
  custom: {},
});

const framedVideoContainer = (nodes: string[]) => ({
  type: { resolvedName: 'Container' },
  isCanvas: true,
  props: {
    layoutType: 'fixed',
    maxWidth: '820px',
    padding: 8,
    backgroundColor: '#FFFFFF',
    className: 'rounded-2xl shadow-xl border border-slate-200',
  },
  nodes,
  custom: {},
});

const lessonBlock = (blockType: string, extra: Record<string, any> = {}) => ({
  type: { resolvedName: 'LessonBlockNode' },
  isCanvas: false,
  props: { blockId: null, blockType, ...extra },
  nodes: [],
  custom: {},
});

const image = (src: string) => ({
  type: { resolvedName: 'Image' },
  isCanvas: false,
  props: { src, alt: '', borderRadius: 16, objectFit: 'cover' },
  nodes: [],
  custom: {},
});

const contentBox = (
  headerLabel: string,
  headline: string,
  body: string,
  ctaText: string,
  blockType: 'reading' | 'download' | 'quiz' | 'assignment',
  extra: Record<string, any> = {}
) => ({
  type: { resolvedName: 'ContentBox' },
  isCanvas: false,
  props: { headerLabel, headerColorHex: '#1359FF', headline, body, ctaText, blockId: null, blockType, useThemeFont: true, ...extra },
  nodes: [],
  custom: {},
});

const columns = (childIds: string[], layout = '2') => ({
  type: { resolvedName: 'Columns' },
  isCanvas: true,
  props: { layout, gap: 32, padding: 0 },
  nodes: childIds,
  custom: {},
});

const col = (nodes: string[]) => ({
  type: { resolvedName: 'Container' },
  isCanvas: true,
  props: { layoutType: 'fixed', padding: 0, backgroundColor: 'transparent' },
  nodes,
  custom: {},
});

// "Common mistakes to avoid" — same real <ul>/<li> mechanism as checklist(), amber warning
// glyph instead of a checkmark so it reads as a distinct, intentional pattern rather than a
// copy-pasted list.
const mistakeList = (items: string[]) => ({
  type: { resolvedName: 'Paragraph' },
  isCanvas: false,
  props: {
    text: `<ul class="list-none p-0 m-0 space-y-2.5">${items.map((i) => `<li class="flex items-start gap-2">${WARN} <span>${i}</span></li>`).join('')}</ul>`,
    fontSize: 15,
    textAlign: 'left',
    color: BODY_COLOR,
    lineHeight: 'relaxed',
    useThemeFont: true,
  },
  nodes: [],
  custom: {},
});

// A framework/step card: small numbered eyebrow + short heading + short paragraph, meant to
// sit inside a 3/4-column grid — the "4-part framework" / "3-part framework" breakdown.
const stepCard = (num: string) => ({
  type: { resolvedName: 'Container' },
  isCanvas: true,
  props: { layoutType: 'fixed', padding: 16, backgroundColor: '#F8FAFC', className: 'rounded-2xl border border-slate-200' },
  nodes: [`${num}__num`, `${num}__title`, `${num}__body`],
  custom: {},
});
const stepCardChildren = (num: string, numberLabel: string, title: string, body: string) => ({
  [`${num}__num`]: {
    type: { resolvedName: 'Paragraph' },
    isCanvas: false,
    props: { text: numberLabel, fontSize: 12, textAlign: 'left', color: EYEBROW_COLOR, lineHeight: 'normal', useThemeFont: true },
    nodes: [],
    custom: {},
  },
  [`${num}__title`]: heading('h4', title),
  [`${num}__body`]: paragraph(body, { fontSize: 14 }),
});

// ---- Template A: "Standard Lesson" — pixel-accurate clone of a real reference lesson page ----
// Typography decision (Step 0): compared the reference headline's rounded-but-restrained
// geometric letterforms against Poppins/Fredoka/Baloo 2/Quicksand. Fredoka and Baloo 2 both
// have exaggerated, bubbly rounded terminals (near-childlike) that read distinctly rounder
// than the reference — ruled out. Between Poppins and Quicksand, the reference's bold weight
// has more geometric regularity (consistent stroke contrast, less organic taper) matching
// Poppins Bold/SemiBold's letterforms more closely than Quicksand's softer strokes. Chosen:
// Poppins for headings, paired with Inter for body (the specified safe default) rather than
// Poppins Regular as body — Poppins Regular's rounded 'a'/'g' read slightly informal at body
// size next to the reference's fairly neutral paragraph text, and Inter is the more legible,
// distinct-enough pairing partner. Both loaded via this project's REAL font mechanism
// (confirmed live: a single Google Fonts css2 URL in layout.tsx + globals.css, NOT next/font
// — the master prompt's next/font assumption was corrected here the same way Phase F's audit
// corrected an identical assumption for the course-theme fonts).
//
// Colors sampled from the reference: headline #111111, body #374151 (chosen over #1F2937 —
// closer to the reference's visible paragraph weight), checkmark blue #2563EB (Tailwind's
// real blue-600, matches the reference's checkmark hue), white background, no other accents.
//
// Step 2 confirmation: Paragraph already renders its `text` prop as real sanitized HTML
// (dangerouslySetInnerHTML) rather than plain text — inline <strong>/<em> spans within an
// otherwise-regular line already work with zero changes needed to the shared component. No
// dedicated "Bulleted list" element exists (Part 1's audit finding stands) — same real
// <ul>/<li>-inside-a-Paragraph mechanism used throughout Part 3, with a blue-600 checkmark
// glyph specific to this template rather than the shared sky-500 one other templates use.
//
// Step 4: intentionally text/image only — no Video/Quiz/ContentBox block was fabricated to
// "complete" what the copy references, since none appears in the 3 reference screenshots
// provided. A teacher can add real blocks below after inserting this template.
const CLONE_HEADING_COLOR = '#111111';
const CLONE_BODY_COLOR = '#374151';
const CLONE_CHECK = '<span class="text-blue-600 font-bold">&#10003;</span>';
const CLONE_HEADING_FONT = 'font-poppins';
const CLONE_BODY_FONT = 'font-inter';

const cloneHeading = (level: string, text: string) => ({
  type: { resolvedName: 'Heading' },
  isCanvas: false,
  props: { level, text, fontWeight: 'bold', textAlign: 'left', color: CLONE_HEADING_COLOR, className: CLONE_HEADING_FONT },
  nodes: [],
  custom: {},
});

const cloneParagraph = (text: string, extra: Record<string, any> = {}) => ({
  type: { resolvedName: 'Paragraph' },
  isCanvas: false,
  props: { text, fontSize: 16, textAlign: 'left', color: CLONE_BODY_COLOR, lineHeight: 'relaxed', className: CLONE_BODY_FONT, ...extra },
  nodes: [],
  custom: {},
});

const cloneChecklist = (items: string[]) => cloneParagraph(
  `<ul class="list-none p-0 m-0 space-y-3">${items.map((i) => `<li class="flex items-start gap-2">${CLONE_CHECK} <span>${i}</span></li>`).join('')}</ul>`,
  { fontSize: 15 }
);

const standardLessonTree = {
  ROOT: { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'min-h-screen bg-white' }, nodes: ['s1', 's2', 's3'], custom: {} },

  // Section 1 — full width
  s1: section(['c1'], 48, 40),
  c1: container(['heading1', 'para1'], '820px'),
  heading1: cloneHeading('h1', 'Course Introduction: Warm-up Activity'),
  para1: cloneParagraph(
    "Before diving deep into any learning or working session, it's crucial to <em>prepare your mind and body</em> — just like an athlete would stretch before a game. That's exactly what warm-up activities are for. They help you focus, be creative, and prepare to make the most of your day or learning experience."
  ),

  // Section 2 — 2-column (closest real preset to the reference's ~55/45 split is the
  // standard even 2-column layout; no 55/45 preset exists on the real Columns component,
  // confirmed via its own source — flagged rather than fabricated).
  s2: section(['c2'], 8, 40),
  c2: container(['cols1'], '1000px'),
  cols1: columns(['colLeft', 'colRight']),
  colLeft: col(['heading2', 'lead1', 'list1']),
  heading2: cloneHeading('h2', "What You'll Learn in This Course"),
  lead1: cloneParagraph("In this quick module, we'll explore:"),
  list1: cloneChecklist([
    'What warm-up activities are and <strong>why they matter</strong>',
    '<strong>Different types of warm-up exercises</strong> — from energizers to mindfulness moments',
    'How warm-ups can improve <strong>concentration, motivation, and engagement</strong>',
    "Real-life examples you can start using immediately, whether you're in class, running a business, or working alone",
  ]),
  // Vertical offset (Container paddingTop) so the image's top roughly aligns with the "In
  // this quick module..." line rather than the headline, matching the reference.
  colRight: {
    type: { resolvedName: 'Container' },
    isCanvas: true,
    props: { layoutType: 'fixed', padding: 0, paddingTop: 56, backgroundColor: 'transparent' },
    nodes: ['image1'],
    custom: {},
  },
  // Placeholder — flagged, not claimed as the real source asset (Step 1 requirement).
  image1: image('https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop'),

  // Section 3 — full width, no side image
  s3: section(['c3'], 8, 64),
  c3: container(['heading3', 'lead2', 'list2', 'para2'], '820px'),
  heading3: cloneHeading('h2', 'How to Get the Most Out of This Course'),
  lead2: cloneParagraph('To really benefit from this module, I encourage you to do three things:'),
  list2: cloneChecklist([
    "<strong>Watch the course video carefully</strong> — I'll be walking you through the concepts with real-life examples.",
    "<strong>Read the course material</strong> — it goes deeper into the 'why' and gives you extra insight you might not catch in the video.",
    "<strong>Don't skip the quiz</strong> — it's not just a test; it's a learning tool. The questions are designed to help you reflect and remember.",
  ]),
  para2: cloneParagraph(
    'Reading and watching together will give you the full picture — and help you succeed not only in this course but in whatever you apply this knowledge to.'
  ),
};

// ---- Template B: "Deep-Dive Lesson" — pixel-accurate clone of a real reference lesson ----
// Typography/color decision (Step 0): reuses Template A's exact choices (Poppins headings,
// Inter body, #111111/#374151 text) so the two templates read as one product, not two
// unrelated designs — the master prompt's own explicit requirement. Content-box header uses
// #EA580C (vivid orange-red, sampled from the reference — a genuinely distinct color from
// Template A's/this template's own CTA blue #2563EB, confirmed intentional per Step 6: two
// different templates are not required to share every color, only the text/checkmark system).
//
// Real technical requirement verified (Step 5): the "Up Next" paragraph below has FIVE
// separate <strong> spans in one sentence (adverbs/how/when/where/verbs) — Paragraph's
// dangerouslySetInnerHTML rendering has no limit on the number of inline spans in one string,
// confirmed by construction (it's real HTML, not a single-span-only mechanism) and re-checked
// against the live database in Step 6's verification below.
//
// Real functional Video block, pre-configured (Step 2): provider=youtube,
// file_url=https://youtu.be/fnh2wA4gtks — LessonBlockNode's create-on-first-render now
// accepts presetVideoProvider/presetFileUrl (added for this template) and fetches a REAL
// thumbnail via the existing /api/lms/video-thumbnail route at creation time, not just
// saving the id as an inert string.
const cloneEmojiHeading = (level: string, text: string) => cloneHeading(level, text);

const deepDiveLessonTree = {
  ROOT: { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'min-h-screen bg-white' }, nodes: ['s1', 's2', 's3', 's4', 's5'], custom: {} },

  // Header
  s1: section(['c1'], 48, 8),
  c1: container(['heading1', 'para1'], '820px'),
  heading1: cloneEmojiHeading('h1', '📘 TEFL Lesson: <strong>Adjectives</strong>'),
  para1: cloneParagraph("Welcome to today's lesson — we're diving into <strong>Adjectives</strong>!"),

  // Step 1 — full width, real Video block
  s2: section(['c2', 'c2video'], 32, 40),
  c2: container(['heading2', 'para2'], '820px'),
  heading2: cloneEmojiHeading('h3', '🎥 Step 1: Watch the Lesson Video'),
  para2: cloneParagraph(
    'Start by watching the lesson video. It breaks down what adjectives are, why we use them, and how they help make our sentences more interesting and descriptive. Make sure to take notes—especially on the examples we go over.'
  ),
  c2video: framedVideoContainer(['video1']),
  video1: lessonBlock('video', { presetVideoProvider: 'youtube', presetFileUrl: 'https://youtu.be/fnh2wA4gtks' }),

  // Step 2 — 2-column
  s3: section(['c3'], 8, 8),
  c3: container(['cols1'], '1000px'),
  cols1: columns(['colLeft', 'colRight']),
  colLeft: col(['heading3', 'para3', 'heading4', 'para4']),
  heading3: cloneEmojiHeading('h3', '📖 Step 2: Read the Supporting Material'),
  para3: cloneParagraph(
    'After the video, head over to the reading material. It reinforces what you learned in the video and gives extra examples that will help everything sink in. Don\'t skip this part — it\'s where a lot of "aha!" moments happen!'
  ),
  heading4: cloneEmojiHeading('h4', '📝 Quick Overview: What Are Adjectives?'),
  para4: cloneParagraph(
    'Adjectives are <strong>describing words</strong>. They tell us more about a noun—like its size, colour, shape, or even opinion.'
  ),
  // Placeholder — flagged, not the real source asset (a hand filling in a quiz bubble sheet).
  colRight: col(['image1']),
  image1: image('https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?q=80&w=1200&auto=format&fit=crop'),

  // Content Box — orange-red header, blue CTA, wired to a real download block
  s4: section(['c4'], 24, 40),
  c4: container(['callout1'], '820px'),
  callout1: contentBox(
    'READING MATERIAL',
    '📚 Why Reading the Material Matters —<br/><em>Understanding Adjectives</em>',
    "<p>As you work through your lesson on <strong>Adjectives</strong>, don't forget this important step:</p><p class=\"font-bold text-[#111827] mt-2\">Always read the supporting material before moving on to the quiz.</p>",
    'Download PDF Here',
    'download',
    { headerColorHex: '#EA580C', ctaColorHex: '#2563EB', useThemeFont: false, }
  ),

  // Up Next — 2-column, 5 separate bold spans in one paragraph
  s5: section(['c5'], 8, 64),
  c5: container(['cols2'], '1000px'),
  cols2: columns(['colLeft2', 'colRight2']),
  colLeft2: col(['heading5', 'para5']),
  heading5: cloneHeading('h3', 'Up Next: <strong>Adverbs</strong>'),
  para5: cloneParagraph(
    "In the next lesson, we'll explore <strong>adverbs</strong>—words that describe <strong>how</strong>, <strong>when</strong>, or <strong>where</strong> something happens. If adjectives describe nouns, then adverbs describe <strong>verbs</strong>, adjectives, or even other adverbs. Can't wait to show you how they work!"
  ),
  // Placeholder — flagged, not the real source asset (a classroom whiteboard "Adverbs" scene).
  colRight2: col(['image2']),
  image2: image('https://images.unsplash.com/photo-1580582932707-520aed937b7b?q=80&w=1200&auto=format&fit=crop'),
};

export const LESSON_TEMPLATES: LessonTemplate[] = [
  {
    id: 'standard-lesson',
    name: 'Standard Lesson',
    description: 'A warm, editorial course intro: framing text, a 2-column "what you\'ll learn" checklist, and a closing how-to-succeed section.',
    content: JSON.stringify(standardLessonTree),
  },
  {
    id: 'deep-dive-lesson',
    name: 'Deep-Dive Lesson',
    description: 'A structured step-by-step lesson: real video, a reading callout with a wired download CTA, and an "up next" preview.',
    content: JSON.stringify(deepDiveLessonTree),
  },
];

export const getLessonTemplateById = (id: string) => LESSON_TEMPLATES.find((t) => t.id === id);
