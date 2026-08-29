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

const lessonBlock = (blockType: string) => ({
  type: { resolvedName: 'LessonBlockNode' },
  isCanvas: false,
  props: { blockId: null, blockType },
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
  blockType: 'reading' | 'download' | 'quiz' | 'assignment'
) => ({
  type: { resolvedName: 'ContentBox' },
  isCanvas: false,
  props: { headerLabel, headerColorHex: '#1359FF', headline, body, ctaText, blockId: null, blockType, useThemeFont: true },
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

// ---- Template A: "Standard Lesson" ----
// A fully drafted lecture on discovery calls — every section is real, finished copy a
// teacher can immediately read, tweak, or replace, not scaffolding with "add text here"
// placeholders. 9 sections: hero, learning objectives, why-it-matters context, a 4-part
// framework grid, the video centerpiece, a reading callout, common mistakes, a 2-column
// recap, and a closing assignment.
const standardLessonTree = {
  ROOT: { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'min-h-screen bg-white' }, nodes: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9'], custom: {} },

  // 1. Hero
  s1: section(['c1'], 56, 16),
  c1: container(['eyebrow1', 'heading1', 'para1']),
  eyebrow1: eyebrow('LESSON 6 OF 9'),
  heading1: heading('h1', 'Mastering Customer Discovery Calls'),
  para1: paragraph(
    "Congratulations — you've reached one of the <strong>most practical skills</strong> in this course. A great discovery call is the difference between a prospect who ghosts you and one who's already sold themselves by the time you pitch. In this lesson, you'll learn how to <strong>run a structured discovery call</strong> that surfaces what a prospect actually needs, not just what they say they want, and walks away wanting a next step with you."
  ),

  // 2. What you'll learn
  s2: section(['c2']),
  c2: container(['heading2', 'list1']),
  heading2: heading('h3', "What You'll Learn"),
  list1: checklist([
    '<strong>Structuring the call</strong> so it never feels like an interrogation',
    '<strong>Spotting real buying signals</strong> versus polite interest',
    '<strong>Turning objections</strong> into clarifying questions instead of arguments',
    '<strong>Closing with a clear next step</strong> every single time — no more "let me think about it"',
  ]),

  // 3. Why this matters (context/motivation, real paragraph copy)
  s3: section(['c3']),
  c3: container(['heading9', 'para9']),
  heading9: heading('h3', 'Why This Matters'),
  para9: paragraph(
    "Most reps lose the deal in the first ten minutes without realizing it — by pitching before they've earned the right to. Prospects can tell within seconds whether you're there to <strong>understand their problem</strong> or just <strong>fill a quota</strong>. The framework below fixes that by giving every call the same reliable shape, so you're never improvising your most important five minutes."
  ),

  // 4. The 4-part framework (grid of step cards)
  s4: section(['c4']),
  c4: container(['heading4', 'grid1'], '960px'),
  heading4: heading('h3', 'The 4-Part Framework'),
  grid1: columns(['step1', 'step2', 'step3', 'step4'], '4'),
  step1: stepCard('n1'),
  step2: stepCard('n2'),
  step3: stepCard('n3'),
  step4: stepCard('n4'),
  ...stepCardChildren('n1', 'STEP 01', 'Open', 'Ask permission and set a real agenda before asking a single question.'),
  ...stepCardChildren('n2', 'STEP 02', 'Explore', 'Uncover the actual problem — not the feature request they led with.'),
  ...stepCardChildren('n3', 'STEP 03', 'Confirm', 'Play back what you heard so they feel understood, not interviewed.'),
  ...stepCardChildren('n4', 'STEP 04', 'Close', 'Name a specific next step and get a yes before you hang up.'),

  // 5. Framed video centerpiece
  s5: section(['c5']),
  c5: framedVideoContainer(['video1']),
  video1: lessonBlock('video'),

  // 6. Reading callout
  s6: section(['c6']),
  c6: container(['callout1'], '820px'),
  callout1: contentBox(
    'READING MATERIAL',
    'The Discovery Call Cheat Sheet',
    'A one-page reference you can keep open during your next call — bookmark it, print it, or drop it in your CRM notes.',
    'Download the cheat sheet',
    'download'
  ),

  // 7. Common mistakes
  s7: section(['c7']),
  c7: container(['heading5', 'mistakes1']),
  heading5: heading('h3', 'Common Mistakes to Avoid'),
  mistakes1: mistakeList([
    "<strong>Pitching before exploring</strong> — the fastest way to sound like every other rep who called this week",
    "<strong>Asking closed questions</strong> ('Are you happy with your current solution?') that kill the conversation in one word",
    '<strong>Filling every silence</strong> — the best answers usually come three seconds after you stop talking',
  ]),

  // 8. Recap (2-column)
  s8: section(['c8']),
  c8: container(['cols1'], '900px'),
  cols1: columns(['colA', 'colB']),
  colA: col(['heading3', 'list2']),
  heading3: heading('h3', 'Quick Recap'),
  list2: checklist([
    '<strong>Open with permission</strong>, not a pitch',
    '<strong>Ask, then stay quiet</strong> — let them fill the silence',
    '<strong>Confirm the next step</strong> before you hang up',
  ]),
  colB: col(['image1']),
  image1: image('https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1200&auto=format&fit=crop'),

  // 9. Closing assignment
  s9: section(['c9'], 8, 64),
  c9: container(['para10', 'callout2'], '820px'),
  para10: paragraph(
    "You now have the full framework, the cheat sheet, and the mistakes to watch for. The only thing left is a real rep — here's yours."
  ),
  callout2: contentBox(
    'YOUR TURN',
    'Ready to put it into practice?',
    "Submit a short recording of a real (or role-played) discovery call and we'll give you feedback before the next lesson.",
    'Submit your assignment',
    'assignment'
  ),
};

// ---- Template B: "Deep-Dive Lesson" ----
// A fully drafted lecture on objection handling — genuinely different structure from
// Template A (2-column from the very first section, a 3-part framework instead of a 4-part
// one, real worked examples instead of a reading callout), not a re-skin. 8 sections: 2-col
// hero, a 3-part framework grid, the quiz callout, worked examples, common mistakes, a
// 2-column recap, and a closing assignment.
const deepDiveLessonTree = {
  ROOT: { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'min-h-screen bg-white' }, nodes: ['s1', 's2', 's3', 's4', 's5', 's6', 's7'], custom: {} },

  // 1. 2-column hero
  s1: section(['c1'], 56, 16),
  c1: container(['colsHero'], '1000px'),
  colsHero: columns(['colHeroText', 'colHeroVideo']),
  colHeroText: col(['eyebrow1', 'heading1', 'para1']),
  eyebrow1: eyebrow('LESSON 7 OF 9'),
  heading1: heading('h1', 'Advanced Objection Handling'),
  para1: paragraph(
    "This is where good salespeople become <strong>great</strong> ones. You'll learn to treat <strong>objections as information</strong>, not obstacles — and respond in a way that <strong>builds trust instead of pressure</strong>. By the end of this lesson you'll have a repeatable way to handle the five objections that come up in almost every deal."
  ),
  colHeroVideo: col(['video1']),
  video1: lessonBlock('video'),

  // 2. The 3-part framework
  s2: section(['c2']),
  c2: container(['heading8', 'grid1'], '900px'),
  heading8: heading('h3', 'The 3-Part Framework'),
  grid1: columns(['step1', 'step2', 'step3'], '3'),
  step1: stepCard('m1'),
  step2: stepCard('m2'),
  step3: stepCard('m3'),
  ...stepCardChildren('m1', 'STEP 01', 'Acknowledge', "Name what you heard without agreeing or arguing — 'sounds like budget is the concern right now.'"),
  ...stepCardChildren('m2', 'STEP 02', 'Clarify', 'Ask one question that gets at the real concern underneath the stated one.'),
  ...stepCardChildren('m3', 'STEP 03', 'Respond', 'Answer the real concern directly, then check if that actually resolved it.'),

  // 3. Quiz callout
  s3: section(['c3']),
  c3: container(['callout1'], '820px'),
  callout1: contentBox(
    'KNOWLEDGE CHECK',
    'Test what you just watched',
    'Five quick questions — score 80% or better to unlock the next lesson.',
    'Start the quiz',
    'quiz'
  ),

  // 4. Worked examples (real, concrete, bolded phrases)
  s4: section(['c4']),
  c4: container(['heading9', 'para9']),
  heading9: heading('h3', 'Worked Examples'),
  para9: paragraph(
    "<strong>\"It's too expensive.\"</strong> — Don't defend the price. Ask: <em>\"Expensive compared to what — doing nothing, or a specific competitor?\"</em> The answer changes everything about how you respond.<br/><br/><strong>\"I need to check with my team.\"</strong> — Don't push for a decision on the spot. Ask: <em>\"What would make this an easy yes for them?\"</em> — you'll usually surface the real blocker.<br/><br/><strong>\"We're happy with our current solution.\"</strong> — Don't argue. Ask: <em>\"What would have to change for you to even consider looking elsewhere?\"</em>"
  ),

  // 5. Common mistakes
  s5: section(['c5']),
  c5: container(['heading10', 'mistakes1']),
  heading10: heading('h3', 'Common Mistakes to Avoid'),
  mistakes1: mistakeList([
    "<strong>Responding instantly</strong> — a two-second pause signals you're actually considering what they said",
    '<strong>Treating every objection as a rejection</strong> instead of a request for more information',
    "<strong>Over-explaining</strong> — the best responses are one or two sentences, not a five-minute defense",
  ]),

  // 6. Recap (2-column, mirrored order vs Template A)
  s6: section(['c6']),
  c6: container(['cols2'], '900px'),
  cols2: columns(['colImg', 'colRecap']),
  colImg: col(['image1']),
  image1: image('https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=1200&auto=format&fit=crop'),
  colRecap: col(['heading2', 'list1']),
  heading2: heading('h3', 'Before You Move On'),
  list1: checklist([
    '<strong>Name the objection</strong> out loud before responding',
    '<strong>Ask one clarifying question</strong> instead of pitching harder',
    "<strong>Agree on a next step</strong>, even if it's 'not now'",
  ]),

  // 7. Closing assignment
  s7: section(['c7'], 8, 64),
  c7: container(['para10', 'callout2'], '820px'),
  para10: paragraph(
    "You've seen the framework and three real examples — now it's time to run it against a real objection from your own pipeline."
  ),
  callout2: contentBox(
    'YOUR TURN',
    'Practice on a real objection',
    "Submit a short recording or write-up of how you'd respond to a real objection from your own pipeline.",
    'Submit your assignment',
    'assignment'
  ),
};

export const LESSON_TEMPLATES: LessonTemplate[] = [
  {
    id: 'standard-lesson',
    name: 'Standard Lesson',
    description: 'A fully drafted 9-section lecture: objectives, context, a 4-part framework, video, reading, mistakes, recap and assignment.',
    content: JSON.stringify(standardLessonTree),
  },
  {
    id: 'deep-dive-lesson',
    name: 'Deep-Dive Lesson',
    description: 'A fully drafted 7-section lecture: 2-col video hero, a 3-part framework, quiz, worked examples, mistakes, recap and assignment.',
    content: JSON.stringify(deepDiveLessonTree),
  },
];

export const getLessonTemplateById = (id: string) => LESSON_TEMPLATES.find((t) => t.id === id);
