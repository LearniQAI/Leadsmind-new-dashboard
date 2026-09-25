// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from 'vitest';

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
import { render, act } from '@testing-library/react';
import { Editor, Frame } from '@craftjs/core';
import { RESOLVER } from './resolver';
import { themeFontCss, inlineRichText } from './blockTypography';
import { BuilderProvider } from '@/components/builder/BuilderContext';
import { PublishedNodeRender } from '@/components/builder/NodeSpacingBox';
import { flattenLessonCanvas } from '@/lib/lms/flattenLessonCanvas';
import { canvasHeadingTypeProps } from '@/components/lms/canvasHeadingType';

import { parseRules, makeCascade } from '@/test/cssCascade';

// ---- The competing rules (sources cited) ----
// public/assets/scss/components/_theme.scss (loaded app-wide via src/style/index.scss)
const TEMPLATE_CSS = `
h1,h2,h3,h4,h5,h6 { font-family: TemplateBody; font-weight: 700; line-height: 1; }
p { font-size: 14px; line-height: 22px; font-weight: 400; margin-bottom: 15px; color: #878a99; }
`;
// Tailwind utilities used on the elements under test (emitted at `@tailwind utilities`, i.e.
// before globals.css's own rules below it).
const UTILITIES_CSS = `
.tracking-tight { letter-spacing: -0.025em; }
.tracking-tighter { letter-spacing: -0.05em; }
.tracking-widest { letter-spacing: 0.1em; }
.text-xl { font-size: 20px; }
.text-2xl { font-size: 24px; }
.text-sm { font-size: 14px; }
.font-black { font-weight: 900; }
.font-display { font-family: Display; }
`;
const THEME_VARS = `:root { --font-heading: ThemeHeading; --font-body: ThemeBody; }`;
// globals.css — only its rules that take part (the real file, parsed).
const GLOBALS = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');
const globalsPart = (pred: (sel: string) => boolean) => {
  const out = postcss.root();
  postcss.parse(GLOBALS).walkRules((r) => {
    if (!r.selectors.some(pred)) return;
    const clone = r.clone();
    if (r.parent?.type === 'atrule') out.append((r.parent as any).clone({ nodes: [] }).append(clone));
    else out.append(clone);
  });
  return out.toString();
};
const NEW_GLOBALS = globalsPart((s) => /builder-rich-text|^\.lm-(ls|ff)-/.test(s));
const OLD_GLOBALS = globalsPart((s) => s === '.tiptap p');
const NEW_GLOBALS_WITH_TIPTAP = OLD_GLOBALS + NEW_GLOBALS;
// The theme-font rules exactly as they were before this change (both scopes).
const OLD_THEME = (scope: string) => {
  const s = (x: string) => (scope ? `${scope} ${x}` : x);
  return `${['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map(s).join(', ')} { font-family: var(--font-heading) !important; }
          ${['p', 'span', 'a', 'button', 'input', 'textarea'].map(s).join(', ')} { font-family: var(--font-body) !important; }`;
};

const cascadeFor = (globals: string, theme: string, width?: number) => {
  let o = 0;
  const rules = [THEME_VARS, TEMPLATE_CSS, UTILITIES_CSS, globals, theme].flatMap((css) => {
    const r = parseRules(css, o); o += r.length; return r;
  });
  return makeCascade(rules, width);
};
const OLD_PUBLISHED = cascadeFor(OLD_GLOBALS, OLD_THEME(''));
const NEW_PUBLISHED = cascadeFor(NEW_GLOBALS_WITH_TIPTAP, themeFontCss(''));

const dom = (html: string) => { const d = document.createElement('div'); d.innerHTML = html; document.body.appendChild(d); return d; };

// ---- Real components, published render path ----
beforeAll(() => {
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as any;
});
function renderPublished(nodes: Record<string, any>) {
  const page = { ROOT: { type: { resolvedName: 'Container' }, isCanvas: true, props: {}, nodes: Object.keys(nodes) }, ...Object.fromEntries(Object.entries(nodes).map(([id, n]) => [id, { parent: 'ROOT', nodes: [], ...n }])) };
  let r!: ReturnType<typeof render>;
  act(() => {
    r = render(
      <BuilderProvider pages={[]} websiteData={null} onUpdateWebsite={() => {}} autoDetectViewport>
        <Editor resolver={RESOLVER as any} enabled={false} onRender={PublishedNodeRender}>
          <Frame data={JSON.stringify(page)} />
        </Editor>
      </BuilderProvider>,
    );
  });
  return r.container;
}

describe('Part 1 - inline-edited text keeps the block typography on live pages', () => {
  it('reproduces the bug: old markup + old rules render the inline <p> at 14px / 400', () => {
    // Heading.tsx / Paragraph.tsx published branches before this change.
    const d = dom(`<div style="font-size:40px"><h2 class="tracking-tight" style="color:inherit;font-size:inherit;font-weight:inherit"><p id="h">Title</p></h2></div>
                   <div style="font-size:20px"><p style="font-size:inherit;font-weight:inherit;line-height:inherit"><p id="pp">Body</p></p></div>`);
    expect(OLD_PUBLISHED(d.querySelector('#h'), 'font-size')).toBe('14px');
    expect(OLD_PUBLISHED(d.querySelector('#h'), 'font-weight')).toBe('400');
    expect(OLD_PUBLISHED(d.querySelector('#h'), 'font-family')).toBe('ThemeBody'); // heading text in the BODY font
    d.remove();
  });

  it('Heading, Paragraph and Text: the inline <p> now resolves to the block settings', () => {
    const c = renderPublished({
      h: { type: { resolvedName: 'Heading' }, props: { text: '<p>Title</p>', level: 'h2', fontSize: 40, fontWeight: 'bold', textAlign: 'left', color: '#111', lineHeight: 'tight' } },
      p: { type: { resolvedName: 'Paragraph' }, props: { text: '<p>Body</p>', fontSize: 20, fontWeight: 'normal', textAlign: 'left', color: '#222', lineHeight: 'relaxed' } },
      t: { type: { resolvedName: 'Text' }, props: { text: '<p>Small</p>', fontSize: 18, textAlign: 'left', color: '#333' } },
    });
    const [hp, pp, tp] = ['h2 p', 'div > p > p', 'span > p'].map((s) => c.querySelector(s));
    expect(NEW_PUBLISHED(hp, 'font-size')).toBe('40px');
    expect(NEW_PUBLISHED(hp, 'font-family')).toBe('ThemeHeading');
    expect(NEW_PUBLISHED(hp, 'margin-bottom')).toBe('0');
    expect(NEW_PUBLISHED(pp, 'font-size')).toBe('20px');
    expect(NEW_PUBLISHED(pp, 'color')).toBe('rgb(34, 34, 34)');
    expect(NEW_PUBLISHED(tp, 'font-size')).toBe('18px');
  });

  it('text without a <p> wrapper (every live block today) resolves exactly as before', () => {
    const c = renderPublished({ h: { type: { resolvedName: 'Heading' }, props: { text: 'Plain', level: 'h2', fontSize: 40, fontWeight: 'bold', textAlign: 'left', color: '#111', lineHeight: 'tight' } } });
    const h2 = c.querySelector('h2');
    for (const prop of ['font-size', 'font-family', 'letter-spacing', 'font-weight']) {
      expect(NEW_PUBLISHED(h2, prop)).toBe(OLD_PUBLISHED(h2, prop));
    }
  });
});

describe('Part 2 - Heading letter spacing and font family', () => {
  it('reproduces the bug: on the wrapper, tracking-tight and the theme font win', () => {
    const d = dom(`<div style="letter-spacing:2.4px;font-family:'Inter', sans-serif"><h2 id="h" class="tracking-tight">T</h2></div>`);
    expect(OLD_PUBLISHED(d.querySelector('#h'), 'letter-spacing')).toBe('-0.025em');
    expect(OLD_PUBLISHED(d.querySelector('#h'), 'font-family')).toBe('ThemeHeading');
    d.remove();
  });

  it('published + canvas: both now apply on the heading element and its inline <p>', () => {
    const c = renderPublished({ h: { type: { resolvedName: 'Heading' }, props: { text: '<p>Title</p>', level: 'h2', fontWeight: 'bold', textAlign: 'left', color: '#111', lineHeight: 'tight', letterSpacing: 2.4, fontFamily: 'Inter' } } });
    const h2 = c.querySelector('h2')!;
    const inner = h2.querySelector('p');
    expect(NEW_PUBLISHED(h2, 'letter-spacing')).toBe('2.4px');
    expect(NEW_PUBLISHED(inner, 'letter-spacing')).toBe('2.4px');
    expect(NEW_PUBLISHED(inner, 'font-family')).toBe("'Inter', sans-serif");
    // The canvas: same markup under the builder's own scoped theme rules (+ TipTap's <p>).
    const canvas = dom(`<div class="node-canvas-area">${h2.outerHTML.replace('<p>Title</p>', '<div class="tiptap"><p id="tp">Title</p></div>')}</div>`);
    const NEW_CANVAS = cascadeFor(NEW_GLOBALS_WITH_TIPTAP, themeFontCss('.node-canvas-area'));
    const OLD_CANVAS = cascadeFor(OLD_GLOBALS, OLD_THEME('.node-canvas-area'));
    expect(NEW_CANVAS(canvas.querySelector('#tp'), 'font-family')).toBe("'Inter', sans-serif");
    expect(NEW_CANVAS(canvas.querySelector('#tp'), 'letter-spacing')).toBe('2.4px');
    expect(OLD_CANVAS(canvas.querySelector('#tp'), 'font-family')).toBe('ThemeBody'); // bug: canvas heading text in body font
    canvas.remove();
  });

  it('student view: carried through flatten and applied over the renderer defaults', () => {
    const [item] = flattenLessonCanvas({
      ROOT: { type: { resolvedName: 'Container' }, nodes: ['h'] },
      h: { type: { resolvedName: 'Heading' }, props: { text: 'Hi', level: 'h2', letterSpacing: 2.4, letterSpacing_mobile: 1, fontFamily: 'Inter' } },
    });
    expect(item).toMatchObject({ letterSpacing: { desktop: '2.4px', tablet: '2.4px', mobile: '1px' }, fontFamily: { desktop: 'Inter', tablet: 'Inter', mobile: 'Inter' } });
    const t = canvasHeadingTypeProps(item);
    const d = dom('');
    const h = document.createElement('h2');
    h.className = `font-display tracking-tight ${t.className}`;
    Object.entries(t.style).forEach(([k, v]) => h.style.setProperty(k, String(v)));
    d.appendChild(h);
    expect(cascadeFor(NEW_GLOBALS, '')(h, 'letter-spacing')).toBe('2.4px');
    expect(cascadeFor(NEW_GLOBALS, '', 500)(h, 'letter-spacing')).toBe('1px');
    expect(cascadeFor(NEW_GLOBALS, '')(h, 'font-family')).toBe("'Inter', sans-serif");
    // before: no fields -> no classes -> the renderer's tracking-tight / font-display
    h.className = 'font-display tracking-tight';
    expect(cascadeFor(NEW_GLOBALS, '')(h, 'letter-spacing')).toBe('-0.025em');
    d.remove();
  });
});

describe('Part 3 - Navbar / Footer inline-edited labels and brand', () => {
  it('inlineRichText unwraps the editor <p> and keeps plain labels intact', () => {
    expect(inlineRichText('<p>Home</p>')).toBe('Home');
    expect(inlineRichText('<p>One</p><p>Two</p>')).toBe('One<br>Two');
    expect(inlineRichText('About us')).toBe('About us');
    expect(inlineRichText('<p>x<img src=x onerror=alert(1)></p>')).not.toMatch(/onerror/);
  });

  it('reproduces the bug: a label rendered as React text shows the tags', () => {
    let r!: ReturnType<typeof render>;
    act(() => { r = render(<a href="#">{'<p>Home</p>'}</a>); });
    expect(r.container.textContent).toBe('<p>Home</p>');
  });

  it('published Navbar + Footer: labels are real text, brand/description keep their own type', () => {
    const c = renderPublished({
      nav: { type: { resolvedName: 'Navbar' }, props: { brandName: '<p>Acme</p>', links: [{ label: '<p>Home</p>', href: '/' }], sticky: false, padding: 16, borderBottomWidth: 0, borderBottomColor: 'transparent', fontSize: 14, fontWeight: '700', textColor: '#fff' } },
      foot: { type: { resolvedName: 'Footer' }, props: { brandName: '<p>Acme</p>', description: '<p>We build</p>', columns: [{ title: 'Company', links: [{ label: '<p>About</p>', href: '/about' }] }], padding: 40, textColor: '#fff', accentColor: '#6c47ff', linkFontSize: 14, titleFontSize: 14 } },
    });
    const links = Array.from(c.querySelectorAll('a')).map((a) => a.textContent);
    expect(links).toContain('Home');
    expect(links).toContain('About');
    expect(c.textContent).not.toMatch(/<p>/);
    // Navbar brand span: no inner <p> left to take the global rule -> its own text-xl/font-black
    const brand = c.querySelector('nav span.text-xl') as HTMLElement;
    expect(brand.querySelector('p')).toBeNull();
    expect(NEW_PUBLISHED(brand, 'font-size')).toBe('20px');
    // Footer description keeps a block <p>, reset to the description's own text-sm/colour
    const descP = c.querySelector('footer p.builder-rich-text p, p.builder-rich-text p') as HTMLElement;
    expect(NEW_PUBLISHED(descP, 'margin-bottom')).toBe('0');
    expect(NEW_PUBLISHED(descP, 'font-size')).toBe('14px'); // text-sm, via inheritance (not the p rule)
    expect(NEW_PUBLISHED(descP, 'color')).toBe('rgb(255, 255, 255)'); // the Footer text colour, not #878a99
  });
});
