// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';

// The real RESOLVER transitively imports the browser Supabase client, which refuses to load
// without these. Placeholder values only — nothing in this file talks to Supabase.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
});
// ...and server-action modules that use React's server-only `cache` (absent in the client
// build jsdom loads). Identity shim; no server action is called by these renders.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, default: actual, cache: (fn: any) => fn };
});
// BuilderProvider loads workspace builder settings on mount; no workspace here.
vi.mock('@/app/actions/builder', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getWorkspaceBuilderSettings: async () => ({ success: false }),
}));
import React from 'react';
import { render, act } from '@testing-library/react';
import { Editor, Frame } from '@craftjs/core';
import {
  SELF_SPACED_BLOCKS, clampSpacing, cssLength, hasSpacing, readResponsive, spacingStyle,
} from './spacing';
import { RESOLVER } from './resolver';
import { BuilderProvider } from '@/components/builder/BuilderContext';
import { PublishedNodeRender } from '@/components/builder/NodeSpacingBox';
import { flattenLessonCanvas } from '@/lib/lms/flattenLessonCanvas';
import { LESSON_TEMPLATES } from './lessonTemplates';

describe('spacing resolver', () => {
  const p = { marginTop: 12, marginTop_tablet: 20, paddingTop: '56px', paddingBottom: '', marginBottom_mobile: -8 };

  it('mirrors useResponsiveValue: tablet/mobile override first, else Desktop', () => {
    expect(readResponsive(p, 'marginTop', 'desktop')).toBe(12);
    expect(readResponsive(p, 'marginTop', 'tablet')).toBe(20);
    expect(readResponsive(p, 'marginTop', 'mobile')).toBe(12); // mobile -> base, same as useResponsiveValue
    expect(readResponsive(p, 'paddingBottom', 'desktop')).toBeUndefined(); // '' = unset
  });

  it('normalises lengths and keeps legacy unit strings', () => {
    expect(cssLength(12)).toBe('12px');
    expect(cssLength('12')).toBe('12px');
    expect(cssLength('-8')).toBe('-8px');
    expect(cssLength('2rem')).toBe('2rem');
    expect(cssLength('')).toBeUndefined();
  });

  it('builds only the keys that are set, with per-block defaults for unset keys', () => {
    expect(spacingStyle(p, 'mobile')).toEqual({ paddingTop: '56px', marginTop: '12px', marginBottom: '-8px' });
    expect(spacingStyle({}, 'desktop', { paddingTop: 64 })).toEqual({ paddingTop: '64px' });
    expect(spacingStyle({}, 'desktop')).toEqual({});
  });

  it('allows negative margins but never negative padding', () => {
    expect(clampSpacing('marginTop', -40)).toBe(-40);
    expect(clampSpacing('paddingTop', -40)).toBe(0);
    expect(clampSpacing('paddingBottom', 5000)).toBe(1000);
  });

  it('detects spacing at any breakpoint', () => {
    expect(hasSpacing({ marginTop_mobile: 4 })).toBe(true);
    expect(hasSpacing({ marginTop: '', padding: 16 })).toBe(false);
    expect(hasSpacing({ paddingTop: '0', paddingBottom: 0 })).toBe(false); // legacy zeros: no wrapper
    expect(hasSpacing({ marginTop: 20, marginTop_mobile: 0 })).toBe(true);
  });
});

describe('every registered block type is covered', () => {
  it('SELF_SPACED_BLOCKS names are real resolver entries (no typo can silently drop a block)', () => {
    for (const name of SELF_SPACED_BLOCKS) expect(Object.keys(RESOLVER)).toContain(name);
  });
});

// ---- Real components, real published render path (PublishedPageRenderer's Editor setup) ----

let width = 1280;
beforeAll(() => {
  window.matchMedia = ((query: string) => {
    const max = /max-width:\s*(\d+)px/.exec(query);
    const min = /min-width:\s*(\d+)px/.exec(query);
    const matches = (!max || width <= Number(max[1])) && (!min || width >= Number(min[1]));
    return { matches, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false };
  }) as any;
});
afterEach(() => { width = 1280; });

const page = {
  ROOT: { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'bg-white' }, nodes: ['sec'] },
  sec: { type: { resolvedName: 'Section' }, isCanvas: true, parent: 'ROOT', nodes: ['box', 'plainbox'],
    props: { paddingTop: 48, paddingBottom: 40, paddingLeft: 24, paddingRight: 24, paddingTop_mobile: 8, marginTop: 10, backgroundColor: 'transparent', customClasses: 'sec-el' } },
  box: { type: { resolvedName: 'Container' }, isCanvas: true, parent: 'sec', nodes: ['img', 'img2', 'div'],
    props: { layoutType: 'fixed', maxWidth: '820px', padding: 0, paddingTop: '56px', customClasses: 'box-el' } },
  plainbox: { type: { resolvedName: 'Container' }, isCanvas: true, parent: 'sec', nodes: [],
    props: { layoutType: 'fixed', maxWidth: '820px', padding: 16, customClasses: 'plain-el' } },
  img: { type: { resolvedName: 'Image' }, parent: 'box', nodes: [],
    props: { src: 'https://x/a.png', alt: 'a', marginTop: 30, marginTop_tablet: 44, paddingBottom: 5 } },
  img2: { type: { resolvedName: 'Image' }, parent: 'box', nodes: [], props: { src: 'https://x/b.png', alt: 'b' } },
  div: { type: { resolvedName: 'Divider' }, parent: 'box', nodes: [], props: { weight: 1, color: '#eee', width: '100%', alignment: 'center', paddingTop: 16, paddingBottom: 16 } },
};

function renderPublished(atWidth: number) {
  width = atWidth;
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
  const c = r.container;
  const imgs = c.querySelectorAll('img');
  return {
    section: c.querySelector('section') as HTMLElement,
    box: c.querySelector('.box-el') as HTMLElement,
    plain: c.querySelector('.plain-el') as HTMLElement,
    img: imgs[0] as HTMLElement,
    img2: imgs[1] as HTMLElement,
  };
}

// The node wrapper for a non-self-spaced block is the direct child of its parent box that
// contains the block.
const wrapperOf = (el: HTMLElement, box: HTMLElement) => {
  let n: HTMLElement | null = el;
  while (n && n.parentElement !== box) n = n.parentElement;
  return n!;
};

describe('published render (real components)', () => {
  it('Desktop: self-spaced blocks paint on their own box, others on a wrapper', () => {
    const { section, box, plain, img, img2 } = renderPublished(1280);
    expect(section.style.paddingTop).toBe('48px');
    expect(section.style.paddingBottom).toBe('40px');
    expect(section.style.marginTop).toBe('10px');
    // Container: per-side top from the universal key, other sides the uniform padding (0)
    expect(box.style.paddingTop).toBe('56px');
    expect(box.style.paddingLeft).toBe('0px');
    // Container with only uniform padding: unchanged, 16px on every side
    expect([plain.style.paddingTop, plain.style.paddingRight, plain.style.paddingBottom, plain.style.paddingLeft]).toEqual(['16px', '16px', '16px', '16px']);
    const w = wrapperOf(img, box);
    expect(w.style.marginTop).toBe('30px');
    expect(w.style.paddingBottom).toBe('5px');
    // no spacing set -> no wrapper styles at all (renders exactly as before)
    expect(wrapperOf(img2, box).getAttribute('style') ?? '').not.toMatch(/margin|padding-top|padding-bottom/);
    // keys never leak onto the DOM as attributes
    expect(box.innerHTML).not.toMatch(/margintop=|paddingbottom=/i);
  });

  it('Tablet and Mobile resolve their own values independently', () => {
    let v = renderPublished(900); // tablet
    expect(wrapperOf(v.img, v.box).style.marginTop).toBe('44px');
    expect(v.section.style.paddingTop).toBe('48px');
    act(() => {}); document.body.innerHTML = '';
    v = renderPublished(500); // mobile: Image has no mobile value -> Desktop's 30px; Section's own 8px
    expect(wrapperOf(v.img, v.box).style.marginTop).toBe('30px');
    expect(v.section.style.paddingTop).toBe('8px');
  });
});

describe('Navbar (sticky) is self-spaced', () => {
  const navPage = (navProps: Record<string, any>) => ({
    ROOT: { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'root-el' }, nodes: ['nav'] },
    nav: { type: { resolvedName: 'Navbar' }, parent: 'ROOT', nodes: [],
      props: { brandName: 'Acme', links: [], sticky: true, padding: 16, borderBottomWidth: 0, borderBottomColor: 'transparent', ...navProps } },
  });
  const renderNav = (navProps: Record<string, any>) => {
    let r!: ReturnType<typeof render>;
    act(() => {
      r = render(
        <BuilderProvider pages={[]} websiteData={null} onUpdateWebsite={() => {}} autoDetectViewport>
          <Editor resolver={RESOLVER as any} enabled={false} onRender={PublishedNodeRender}>
            <Frame data={JSON.stringify(navPage(navProps))} />
          </Editor>
        </BuilderProvider>,
      );
    });
    return { nav: r.container.querySelector('nav') as HTMLElement, root: r.container.querySelector('.root-el') as HTMLElement };
  };

  it('with spacing set, the sticky <nav> stays a direct child of its parent (no wrapper) and carries the spacing once', () => {
    const { nav, root } = renderNav({ paddingTop: 30, marginTop: 12, marginBottom: 8 });
    expect(nav.className).toMatch(/\bsticky\b/);
    expect(nav.parentElement).toBe(root); // no intervening wrapper div
    expect(nav.style.paddingTop).toBe('30px');
    expect(nav.style.paddingBottom).toBe('16px'); // unset -> the Navbar's own padding
    expect(nav.style.marginTop).toBe('12px');
    expect(nav.style.marginBottom).toBe('8px');
    expect(root.querySelectorAll('[style*="margin-top: 12px"]').length).toBe(1); // applied exactly once
    expect(nav.outerHTML).not.toMatch(/margintop=|paddingtop=/i); // keys don't leak onto the DOM
  });

  it('with no spacing, renders exactly as before (16px 24px)', () => {
    const { nav, root } = renderNav({});
    expect(nav.parentElement).toBe(root);
    expect([nav.style.paddingTop, nav.style.paddingRight, nav.style.paddingBottom, nav.style.paddingLeft]).toEqual(['16px', '24px', '16px', '24px']);
    expect(nav.style.marginTop).toBe('');
  });
});

describe('student reading view', () => {
  it('existing lesson templates carry no spacing (render exactly as before)', () => {
    for (const t of LESSON_TEMPLATES) {
      expect(flattenLessonCanvas(t.content).filter((i) => i.spacing)).toEqual([]);
    }
  });

  it('applies leaf spacing per breakpoint and carries container margins, not container padding', () => {
    const [img, img2, divider] = flattenLessonCanvas(page);
    // Image's own 30px + its Section's 10px margin (first item inside it); the Section's 48px
    // and the Container's 56px PADDING are not applied — those boxes don't exist in this view.
    expect(img.spacing).toEqual({
      desktop: { paddingBottom: '5px', marginTop: '40px' },
      tablet: { paddingBottom: '5px', marginTop: '54px' },
      mobile: { paddingBottom: '5px', marginTop: '40px' },
    });
    expect(img2.spacing).toBeUndefined();
    expect(divider.spacing?.desktop).toEqual({ paddingTop: '16px', paddingBottom: '16px' });
  });
});
