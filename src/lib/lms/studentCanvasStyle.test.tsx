// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
});
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, default: actual, cache: (fn: any) => fn };
});
vi.mock('@/app/actions/builder', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getWorkspaceBuilderSettings: async () => ({ success: false }),
}));

import React from 'react';
import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import { render, act, fireEvent } from '@testing-library/react';
import { Editor, Frame } from '@craftjs/core';
import { RESOLVER } from '@/lib/builder/resolver';
import { BuilderProvider } from '@/components/builder/BuilderContext';
import { PublishedNodeRender } from '@/components/builder/NodeSpacingBox';
import { textBlockCss, TEXT_BLOCK_DEFAULTS } from '@/lib/builder/textBlockStyle';
import { flattenLessonCanvas, type LessonCanvasItem } from './flattenLessonCanvas';
import { canvasBlockTypeProps } from '@/components/lms/canvasHeadingType';
import { CanvasLessonImage } from '@/components/lms/CanvasLessonImage';
import { CanvasDivider } from '@/components/lms/CanvasDivider';
import { CanvasContentBox, contentBoxCta, CTA_UNAVAILABLE } from '@/components/lms/CanvasContentBox';
import { parseRules, makeCascade } from '@/test/cssCascade';

const tree = (nodes: Record<string, { type: string; props: Record<string, any> }>) => ({
  ROOT: { type: { resolvedName: 'Container' }, isCanvas: true, props: {}, nodes: Object.keys(nodes) },
  ...Object.fromEntries(Object.entries(nodes).map(([id, n]) => [id, { type: { resolvedName: n.type }, parent: 'ROOT', nodes: [], props: n.props }])),
});

// ---------------------------------------------------------------------------------------------
// 1) textBlockCss really is what the builder renders (real components, published path)
// ---------------------------------------------------------------------------------------------
beforeAll(() => {
  window.matchMedia = ((m: string) => ({ matches: false, media: m, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as any;
});
function renderPublished(nodes: Parameters<typeof tree>[0]) {
  let r!: ReturnType<typeof render>;
  act(() => {
    r = render(
      <BuilderProvider pages={[]} websiteData={null} onUpdateWebsite={() => {}}>
        <Editor resolver={RESOLVER as any} enabled={false} onRender={PublishedNodeRender}>
          <Frame data={JSON.stringify(tree(nodes))} />
        </Editor>
      </BuilderProvider>,
    );
  });
  return r.container;
}
const WEIGHT_CLASS: Record<string, string> = { 'font-normal': '400', 'font-medium': '500', 'font-semibold': '600', 'font-bold': '700', 'font-black': '900' };
const LEADING_CLASS: Record<string, string> = { 'leading-tight': '1.25', 'leading-normal': '1.5', 'leading-relaxed': '1.625', 'leading-loose': '2' };
const fromClasses = (el: Element, map: Record<string, string>) => Object.entries(map).find(([c]) => el.classList.contains(c))?.[1];

describe('textBlockCss mirrors the real builder components', () => {
  it('TEXT_BLOCK_DEFAULTS are exactly the craft.props defaults of the components', () => {
    for (const name of ['Heading', 'Paragraph', 'Text']) {
      const { text: _t, ...defaults } = (RESOLVER as any)[name].craft.props;
      expect(TEXT_BLOCK_DEFAULTS[name], name).toEqual(defaults);
    }
  });
  it('Heading (live-lesson shapes: default size, set size, black weight)', () => {
    for (const props of [
      { text: 'A', level: 'h3', fontWeight: 'bold', textAlign: 'left', color: '#111111', lineHeight: 'tight' },
      { text: 'B', level: 'h1', fontSize: 45, fontWeight: 'black', textAlign: 'center', color: '#0a0909' },
    ]) {
      const c = renderPublished({ h: { type: 'Heading', props } });
      const wrapper = c.querySelector('h1, h2, h3')!.parentElement!;
      const tag = c.querySelector('h1, h2, h3')!;
      const css = textBlockCss('Heading', props, 'desktop');
      expect(css.fontSize ?? '').toBe(wrapper.style.fontSize);
      expect(css.color).toBe(props.color);
      expect(css.fontWeight).toBe(fromClasses(wrapper, WEIGHT_CLASS));
      expect(css.lineHeight).toBe(fromClasses(tag, LEADING_CLASS));
      expect(css.textAlign).toBe(props.textAlign);
    }
  });
  it('Paragraph (incl. unset weight) and Text', () => {
    const para = { text: 'P', fontSize: 16, color: '#374151', lineHeight: 'relaxed', textAlign: 'left' };
    const cp = renderPublished({ p: { type: 'Paragraph', props: para } });
    const pw = cp.querySelector('p')!.parentElement!;
    const pcss = textBlockCss('Paragraph', para, 'desktop');
    expect(pcss.fontSize).toBe(pw.style.fontSize);
    expect(pcss.fontWeight).toBe(fromClasses(pw, WEIGHT_CLASS)); // both undefined
    expect(pcss.lineHeight).toBe(fromClasses(pw, LEADING_CLASS));
    const text = { text: 'T', fontSize: 18, color: '#000000', fontWeight: '700italic', lineHeight: 30, letterSpacing: 1, textAlign: 'right' };
    const tw = renderPublished({ t: { type: 'Text', props: text } }).querySelector('span')!.parentElement!;
    const tcss = textBlockCss('Text', text, 'desktop');
    for (const k of ['fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textAlign'] as const) {
      expect(tcss[k], k).toBe(tw.style[k]);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// 2) Student view typography: reproduce (fixed styles) then fixed (builder values)
// ---------------------------------------------------------------------------------------------
// The reading view's own utilities (Tailwind, emitted before globals.css's own rules).
const UTILS = `.text-\\[15px\\] { font-size: 15px; } .leading-relaxed { line-height: 1.625; } .font-bold { font-weight: 700; }
  .tracking-tight { letter-spacing: -0.025em; } .\\!text-dash-text { color: #0F172A !important; }`;
const GLOBALS = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');
const LM_RULES = (() => {
  const out = postcss.root();
  postcss.parse(GLOBALS).walkRules((r) => {
    if (!r.selectors.some((s) => /^\.lm-(fs|fw|fst|lh|c|ta|bg|pl|pr|ml|mr|ls|ff)-/.test(s))) return;
    if (r.parent?.type === 'atrule') out.append((r.parent as any).clone({ nodes: [] }).append(r.clone()));
    else out.append(r.clone());
  });
  return out.toString();
})();
const cascade = (width = 1280) => { const a = parseRules(UTILS, 0); return makeCascade([...a, ...parseRules(LM_RULES, a.length)], width); };
const place = (className: string, style: Record<string, string> = {}) => {
  const el = document.createElement('div');
  el.className = className;
  Object.entries(style).forEach(([k, v]) => el.style.setProperty(k, v));
  document.body.appendChild(el);
  return el;
};

describe('student view typography', () => {
  const [para] = flattenLessonCanvas(tree({ p: { type: 'Paragraph', props: { text: 'Body', fontSize: 16, fontSize_mobile: 14, color: '#374151', lineHeight: 'relaxed', fontWeight: 'semibold' } } }));

  it('reproduces: the old reading view styled every paragraph 15px / #0F172A / 400', () => {
    const old = place('text-[15px] leading-relaxed !text-dash-text'); // StudentPlayerClient before this batch
    expect(cascade()(old, 'font-size')).toBe('15px');
    expect(cascade()(old, 'color')).toBe('#0F172A');
    old.remove();
  });

  it('fixed: the paragraph resolves to the builder values, per breakpoint', () => {
    const t = canvasBlockTypeProps(para as LessonCanvasItem);
    expect(t.setsColor).toBe(true); // so the renderer drops !text-dash-text
    const el = place(`text-[15px] leading-relaxed ${t.className}`, t.style as Record<string, string>);
    expect(cascade()(el, 'font-size')).toBe('16px');
    expect(cascade(500)(el, 'font-size')).toBe('14px');
    expect(cascade()(el, 'color')).toBe('#374151');
    expect(cascade()(el, 'font-weight')).toBe('600');
    expect(cascade()(el, 'line-height')).toBe('1.625');
    el.remove();
  });

  it('heading: builder weight/colour/size override the reading-view defaults', () => {
    const [h] = flattenLessonCanvas(tree({ h: { type: 'Heading', props: { text: 'H', level: 'h1', fontSize: 45, fontWeight: 'black', color: '#0a0909', lineHeight: 'tight' } } }));
    const t = canvasBlockTypeProps(h as LessonCanvasItem);
    const el = place(`font-bold tracking-tight ${t.className}`, t.style as Record<string, string>);
    expect(cascade()(el, 'font-size')).toBe('45px');
    expect(cascade()(el, 'font-weight')).toBe('900');
    expect(cascade()(el, 'color')).toBe('#0a0909');
    el.remove();
  });
});

// ---------------------------------------------------------------------------------------------
// 3) Image effects, 4) Divider
// ---------------------------------------------------------------------------------------------
describe('student view image effects', () => {
  it('reproduces: without the frame, shadow/border/corners never reached the <img>', () => {
    const img = render(<CanvasLessonImage item={{ kind: 'image', src: 'https://x/a.png', alt: '', radius: 12 }} />).container.querySelector('img')!;
    expect(img.style.boxShadow).toBe('');
    expect(img.style.borderStyle).toBe('');
  });
  it('fixed: the builder frame (shadow, border, per-corner radius) is applied', () => {
    const [item] = flattenLessonCanvas(tree({ i: { type: 'Image', props: { src: 'https://x/a.png', alt: 'a', boxShadow: 'lg', borderStyle: 'dashed', borderWidth: 3, borderColor: '#ff0000', borderRadiusIndividual: true, borderTopLeftRadius: 20 } } }));
    const img = render(<CanvasLessonImage item={item as any} />).container.querySelector('img')!;
    expect(img.style.boxShadow).toContain('rgb(0 0 0 / 0.1)');
    expect([img.style.borderStyle, img.style.borderWidth, img.style.borderColor]).toEqual(['dashed', '3px', 'rgb(255, 0, 0)']);
    expect([img.style.borderTopLeftRadius, img.style.borderTopRightRadius]).toEqual(['20px', '0px']);
  });
  it('live images (radius 16, nothing else) render exactly as before', () => {
    const [item] = flattenLessonCanvas(tree({ i: { type: 'Image', props: { src: 'https://x/a.png', alt: 'a', borderRadius: 16 } } }));
    const img = render(<CanvasLessonImage item={item as any} />).container.querySelector('img')!;
    expect(img.style.borderRadius).toBe('16px');
    expect(img.style.boxShadow).toBe('');
  });
});

describe('student view divider', () => {
  it('reproduces: a plain <hr> regardless of settings (old markup)', () => {
    expect(render(<hr className="border-dash-border" />).container.querySelector('hr')!.getAttribute('style')).toBeNull();
  });
  it('fixed: thickness, colour, length and alignment', () => {
    const [item] = flattenLessonCanvas(tree({ d: { type: 'Divider', props: { weight: 3, color: '#ff0000', width: '50%', alignment: 'left', paddingTop: 16, paddingBottom: 16 } } }));
    const bar = render(<CanvasDivider item={item as any} />).container.querySelector('[role=separator] > div') as HTMLElement;
    expect([bar.style.height, bar.style.backgroundColor, bar.style.width, bar.style.marginLeft, bar.style.marginRight]).toEqual(['3px', 'rgb(255, 0, 0)', '50%', '0px', 'auto']);
    expect(item.spacing?.desktop).toEqual({ paddingTop: '16px', paddingBottom: '16px' }); // its 16px gap, via the spacing wrapper
  });
});

// ---------------------------------------------------------------------------------------------
// 5) ContentBox CTA (student + public preview) and header colour
// ---------------------------------------------------------------------------------------------
describe('ContentBox', () => {
  const [box] = flattenLessonCanvas(tree({ c: { type: 'ContentBox', props: { headerLabel: 'READING MATERIAL', headerColorHex: '#EA580C', ctaColorHex: '#2563EB', headline: 'Why', body: '<p>First</p><p class="font-bold">Second</p>', ctaText: 'Download PDF Here', blockId: 'b1', blockType: 'download' } } }));

  it('reproduces: the old preview printed the body HTML as text, with no header colour or CTA', () => {
    const c = render(<div><p>{'<p>First</p>'}</p></div>).container; // PreviewLessonClient before this batch
    expect(c.textContent).toContain('<p>First</p>');
  });

  it('renders the header colour, real body HTML and the configured CTA', () => {
    const c = render(<CanvasContentBox item={box as any} cta={{ kind: 'link', href: 'https://f/x.pdf', newTab: true }} />).container;
    expect((c.firstElementChild!.firstElementChild as HTMLElement).style.backgroundColor).toBe('rgb(234, 88, 12)');
    expect(c.textContent).not.toContain('<p>');
    const a = c.querySelector('a')!;
    expect(a.textContent).toContain('Download PDF Here');
    expect(a.getAttribute('href')).toBe('https://f/x.pdf');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.style.backgroundColor).toBe('rgb(37, 99, 235)');
  });

  it('CTA falls back to the header colour when no CTA colour is set (as the builder does)', () => {
    const [b] = flattenLessonCanvas(tree({ c: { type: 'ContentBox', props: { headerColorHex: '#EA580C', ctaText: 'Go', blockType: 'reading' } } }));
    expect((b as any).ctaColorHex).toBe('#EA580C');
  });

  it('student CTA performs the linked block action; preview keeps its own rules', () => {
    const opened: string[] = []; const toggled: string[] = [];
    const actions = { openReading: (id: string) => opened.push(id), togglePanel: (id: string) => toggled.push(id), quizHref: '/student/courses/c/quiz/l' };
    const reading = contentBoxCta({ id: 'r', type: 'reading', file_url: 'https://f/r.pdf' }, 'student', actions);
    expect(reading.kind).toBe('button');
    const b = render(<CanvasContentBox item={box as any} cta={reading} />).container.querySelector('button')!;
    fireEvent.click(b);
    expect(opened).toEqual(['r']); // opens the reader + records completion (StudentPlayerClient's openReading)
    expect(contentBoxCta({ id: 'd', type: 'download', file_url: 'https://f/d.pdf' }, 'student', actions)).toEqual({ kind: 'link', href: 'https://f/d.pdf', newTab: true });
    expect(contentBoxCta({ id: 'q', type: 'quiz' }, 'student', actions)).toEqual({ kind: 'link', href: '/student/courses/c/quiz/l' });
    const asg = contentBoxCta({ id: 'a', type: 'assignment' }, 'student', actions);
    if (asg.kind === 'button') asg.onClick();
    expect(toggled).toEqual(['a']);
    // live-data cases: no block / download without a file
    expect(contentBoxCta(null, 'student', actions)).toEqual({ kind: 'disabled', reason: CTA_UNAVAILABLE });
    expect(contentBoxCta({ id: 'd', type: 'download', file_url: null }, 'student', actions)).toEqual({ kind: 'disabled', reason: CTA_UNAVAILABLE });
    // public preview
    expect(contentBoxCta({ id: 'r', type: 'reading', file_url: 'https://f/r.pdf' }, 'preview')).toEqual({ kind: 'link', href: 'https://f/r.pdf', newTab: true });
    expect(contentBoxCta({ id: 'q', type: 'quiz' }, 'preview').kind).toBe('disabled');
  });

  it('a disabled CTA is visibly unavailable and says why', () => {
    const c = render(<CanvasContentBox item={box as any} cta={{ kind: 'disabled', reason: CTA_UNAVAILABLE }} />).container;
    expect(c.querySelector('button')!.disabled).toBe(true);
    expect(c.textContent).toContain(CTA_UNAVAILABLE);
  });
});
