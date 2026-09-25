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
import path from 'path';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import loadConfig from 'tailwindcss/loadConfig';
import { render, act } from '@testing-library/react';
import { Editor, Frame } from '@craftjs/core';
import { RESOLVER } from './resolver';
import { themeFontCss, containerFont } from './blockTypography';
import { getResponsiveStyles } from '@/components/builder/user/Container';
import { checkCustomClasses, CUSTOM_CLASS_GROUPS } from './customClasses';
import { BuilderProvider } from '@/components/builder/BuilderContext';
import { PublishedNodeRender } from '@/components/builder/NodeSpacingBox';
import { parseRules, makeCascade } from '@/test/cssCascade';

let width = 1280;
beforeAll(() => {
  window.matchMedia = ((q: string) => {
    const max = /max-width:\s*(\d+)px/.exec(q); const min = /min-width:\s*(\d+)px/.exec(q);
    return { matches: (!max || width <= +max[1]) && (!min || width >= +min[1]), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false };
  }) as any;
});

type N = Record<string, { type: string; props: Record<string, any>; parent?: string; nodes?: string[] }>;
function renderPublished(nodes: N, rootChildren: string[], atWidth = 1280) {
  width = atWidth;
  const page: any = { ROOT: { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'root' }, nodes: rootChildren } };
  for (const [id, n] of Object.entries(nodes)) page[id] = { type: { resolvedName: n.type }, parent: n.parent ?? 'ROOT', nodes: n.nodes ?? [], isCanvas: n.type === 'Container', props: n.props };
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

// Published-page rule stack: theme vars, the template's bare h/p rules, then (in the body) the
// theme-font <style> and each Container's own <style>, in document order.
const THEME_VARS = ':root { --font-heading: ThemeHeading; --font-body: ThemeBody; }';
const TEMPLATE = 'h1,h2,h3,h4,h5,h6 { font-family: TemplateBody; } p { font-size: 14px; }';
function cascadeFor(container: HTMLElement, theme = themeFontCss(''), w = 1280) {
  const containerCss = Array.from(container.querySelectorAll('style')).map((s) => s.textContent || '').join('\n');
  let o = 0;
  const rules = [THEME_VARS, TEMPLATE, theme, containerCss].flatMap((css) => { const r = parseRules(css, o); o += r.length; return r; });
  return makeCascade(rules, w);
}
const OLD_THEME = `h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading) !important; }
  p, span, a, button, input, textarea { font-family: var(--font-body) !important; }`;

// ---------------------------------------------------------------------------------------------
describe('Part 1 - explicit fonts beat the page theme (published)', () => {
  it('reproduces: a Paragraph font on its wrapper lost to the theme !important (old markup)', () => {
    const d = document.createElement('div');
    d.innerHTML = `<div style="font-family:'Lora', sans-serif"><p id="p" style="font-family:inherit">x</p></div>`;
    document.body.appendChild(d);
    expect(cascadeFor(d, OLD_THEME)(d.querySelector('#p'), 'font-family')).toBe('ThemeBody');
    d.remove();
  });

  it('Paragraph and Text: their own font now reaches the text', () => {
    const c = renderPublished({
      p: { type: 'Paragraph', props: { text: 'Para', fontSize: 16, fontFamily: 'Lora' } },
      t: { type: 'Text', props: { text: 'Txt', fontSize: 16, fontFamily: 'Merriweather' } },
    }, ['p', 't']);
    const cas = cascadeFor(c);
    expect(cas(c.querySelector('p p, div > p'), 'font-family')).toBe("'Lora', sans-serif");
    expect(cas(c.querySelector('span'), 'font-family')).toBe("'Merriweather', sans-serif");
  });

  it('Container: an explicit font reaches its text; a block\'s own font still wins; legacy Inter unchanged', () => {
    const c = renderPublished({
      box: { type: 'Container', props: { fontFamily: 'Lora', fontFamilyExplicit: true, customClasses: 'box' }, nodes: ['inner', 'own'] },
      inner: { type: 'Paragraph', parent: 'box', props: { text: 'Inherits', fontSize: 16 } },
      own: { type: 'Heading', parent: 'box', props: { text: 'Own', level: 'h2', fontFamily: 'Oswald' } },
      legacy: { type: 'Container', props: { fontFamily: 'Inter', customClasses: 'legacy' }, nodes: ['lp'] },
      lp: { type: 'Paragraph', parent: 'legacy', props: { text: 'Theme', fontSize: 16 } },
    }, ['box', 'legacy']);
    const cas = cascadeFor(c);
    expect(cas(c.querySelector('.box p'), 'font-family')).toBe('Lora, sans-serif');
    expect(cas(c.querySelector('.box h2'), 'font-family')).toBe("'Oswald', sans-serif");
    expect(cas(c.querySelector('.legacy p'), 'font-family')).toBe('ThemeBody'); // exactly as before
    expect(cas(c.querySelector('.legacy'), 'font-family')).toBe('Inter, sans-serif'); // the container itself, as before
  });

  it('containerFont: unmarked legacy Inter is not explicit; marked, other, or breakpoint fonts are', () => {
    expect(containerFont({ fontFamily: 'Inter' }, 'desktop').explicit).toBe(false);
    expect(containerFont({ fontFamily: 'Inter', fontFamilyExplicit: true }, 'desktop').explicit).toBe(true);
    expect(containerFont({ fontFamily: 'Lora' }, 'desktop').explicit).toBe(true);
    expect(containerFont({ fontFamily: 'Inter', fontFamily_mobile: 'Lora' }, 'mobile')).toEqual({ family: 'Lora', explicit: true });
    expect(containerFont({ fontFamily: 'Inter', fontFamily_mobile: 'Lora' }, 'desktop').explicit).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Part 2 - Text Tablet/Mobile typography', () => {
  const props = { text: 'T', fontSize: 20, fontSize_mobile: 14, color: '#111111', color_tablet: '#ff0000', lineHeight: 30, lineHeight_mobile: 20 };
  it('reproduces: the old Text read only the Desktop values (Text.tsx before this fix)', () => {
    const oldStyle = ({ fontSize, color, lineHeight }: any) => ({ fontSize: `${fontSize}px`, color, lineHeight: lineHeight ? `${lineHeight}px` : undefined });
    expect(oldStyle(props)).toEqual({ fontSize: '20px', color: '#111111', lineHeight: '30px' }); // at every breakpoint
  });
  it('fixed: each breakpoint renders its own values, and none leak onto the DOM', () => {
    const at = (w: number) => (renderPublished({ t: { type: 'Text', props } }, ['t'], w).querySelector('span')!.parentElement as HTMLElement);
    const desk = at(1280); expect([desk.style.fontSize, desk.style.color, desk.style.lineHeight]).toEqual(['20px', 'rgb(17, 17, 17)', '30px']);
    const tab = at(900); expect([tab.style.fontSize, tab.style.color]).toEqual(['20px', 'rgb(255, 0, 0)']);
    const mob = at(500); expect([mob.style.fontSize, mob.style.lineHeight]).toEqual(['14px', '20px']);
    expect(mob.outerHTML).not.toMatch(/fontsize_mobile|color_tablet/i);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Part 3 - Container Tablet/Mobile on the builder canvas', () => {
  const props = { display: 'flex', flexDirection: 'row', flexDirection_mobile: 'column', backgroundColor: '#ffffff', backgroundColor_tablet: '#eeeeee' };
  const resolve = (css: string, w: number, prop: string) => {
    const el = document.createElement('div'); el.className = 'node-x'; document.body.appendChild(el);
    const v = makeCascade(parseRules(css, 0), w)(el, prop); el.remove(); return v;
  };
  it('reproduces: on a desktop-width window the Mobile toggle still showed Desktop styles (media queries)', () => {
    const published = getResponsiveStyles('x', props); // what the canvas used to emit
    expect(resolve(published, 1280, 'flex-direction')).toBe('row');
  });
  it('fixed: the canvas renders the toggled breakpoint whatever the window width', () => {
    expect(resolve(getResponsiveStyles('x', props, 'mobile'), 1280, 'flex-direction')).toBe('column');
    expect(resolve(getResponsiveStyles('x', props, 'tablet'), 1280, 'background-color')).toBe('#eeeeee');
    expect(resolve(getResponsiveStyles('x', props, 'desktop'), 1280, 'flex-direction')).toBe('row');
  });
  it('published output still uses real media queries', () => {
    const css = getResponsiveStyles('x', props);
    expect(resolve(css, 500, 'flex-direction')).toBe('column');
    expect(css).toContain('@media (max-width: 768px)');
  });
});

// ---------------------------------------------------------------------------------------------
describe('Part 4 - custom class vocabulary survives the production build', () => {
  const build = async (config: any) => (await postcss([tailwind({ ...config, content: [{ raw: '<div></div>', extension: 'html' }], corePlugins: { ...(config.corePlugins || {}), preflight: false } })])
    .process('@tailwind utilities;', { from: undefined })).css;
  // Loaded the way the real build loads it (Tailwind's own jiti-based loader).
  const projectConfig = loadConfig(path.join(process.cwd(), 'tailwind.config.js')) as any;

  it('reproduces: without the safelist, a class used nowhere in the source is purged', async () => {
    const { safelist: _s, ...noSafelist } = projectConfig;
    const css = await build(noSafelist);
    expect(css).not.toContain('.shadow-2xl');
  }, 60000);

  it('fixed: every vocabulary class (+ hover:/focus:) is in the build even when no page uses it', async () => {
    const css = await build(projectConfig);
    // EVERY vocabulary class, and its hover:/focus: forms, must really be generated — a
    // safelisted class the theme can't produce would fail just as silently as a purged one.
    const esc = (c: string) => c.replace(/[:/.]/g, (m) => '\\' + m); // CSS selector escaping
    for (const cls of CUSTOM_CLASS_GROUPS.flatMap((g) => g.classes)) {
      expect(css, cls).toContain(`.${esc(cls)}`);
      expect(css, `hover:${cls}`).toContain(`.hover\\:${esc(cls)}:hover`);
      expect(css, `focus:${cls}`).toContain(`.focus\\:${esc(cls)}:focus`);
    }
    expect(projectConfig.safelist.length).toBe(CUSTOM_CLASS_GROUPS.reduce((n, g) => n + g.classes.length, 0) * 3);
  }, 60000);

  it('the panel flags anything outside the vocabulary instead of letting it silently do nothing', () => {
    expect(checkCustomClasses('shadow-lg skew-y-12 md:p-8')).toEqual({ supported: ['shadow-lg'], unsupported: ['skew-y-12', 'md:p-8'] });
    expect(checkCustomClasses('hover:scale-105 scale-110', 'hover')).toEqual({ supported: ['hover:scale-105', 'scale-110'], unsupported: [] });
  });
});
