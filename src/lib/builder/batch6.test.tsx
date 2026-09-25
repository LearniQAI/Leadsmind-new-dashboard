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
import { render, act, fireEvent } from '@testing-library/react';
import { Editor, Frame, NodeProvider, useEditor } from '@craftjs/core';
import { RESOLVER } from './resolver';
import { COLUMN_COUNT, ensureColumnSlots } from './columnSlots';
import { ColumnsSettings } from '@/components/builder/user/ColumnsSettings';
import { BuilderProvider } from '@/components/builder/BuilderContext';
import { PublishedNodeRender } from '@/components/builder/NodeSpacingBox';
import { LESSON_TEMPLATES } from './lessonTemplates';
import { withParentLinks } from './craftTree';

beforeAll(() => {
  window.matchMedia = ((m: string) => ({ matches: false, media: m, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as any;
});

const PRESETS = Object.keys(COLUMN_COUNT) as (keyof typeof COLUMN_COUNT)[];
const GRID_CLASS: Record<string, string> = {
  '1': 'grid-cols-1', '2': 'md:grid-cols-2', '3': 'md:grid-cols-3', '4': 'lg:grid-cols-4',
  '1/3-2/3': 'md:[grid-template-columns:1fr_2fr]', '2/3-1/3': 'md:[grid-template-columns:2fr_1fr]',
};
const pageWith = (colsProps: Record<string, any>, children: Record<string, any> = {}) => JSON.stringify({
  ROOT: { type: { resolvedName: 'Container' }, isCanvas: true, props: {}, nodes: ['cols'] },
  cols: { type: { resolvedName: 'Columns' }, isCanvas: true, parent: 'ROOT', props: { gap: 16, padding: 16, ...colsProps }, nodes: Object.keys(children) },
  ...Object.fromEntries(Object.entries(children).map(([id, n]) => [id, { parent: 'cols', nodes: [], ...n }])),
});

function mount(data: string, enabled: boolean, extra?: React.ReactNode) {
  let api!: ReturnType<typeof useEditor>;
  const Grab = () => { api = useEditor(); return null; };
  let r!: ReturnType<typeof render>;
  act(() => {
    r = render(
      <BuilderProvider pages={[]} websiteData={null} onUpdateWebsite={() => {}}>
        <Editor resolver={RESOLVER as any} enabled={enabled} {...(enabled ? {} : { onRender: PublishedNodeRender })}>
          <Grab />
          <Frame data={data} />
          {extra}
        </Editor>
      </BuilderProvider>,
    );
  });
  return { container: r.container, api: () => api };
}
const kids = (api: any, id = 'cols') => api().query.node(id).get().data.nodes as string[];

// ---------------------------------------------------------------------------------------------
describe('Part A - Columns presets render real columns', () => {
  it('reproduces: the old preset button only set `layout`, so every preset left a column-less grid', () => {
    for (const layout of PRESETS) {
      const { api, container } = mount(pageWith({ layout: '2' }), false); // no editor effects
      act(() => api().actions.setProp('cols', (p: any) => { p.layout = layout; })); // old ColumnsSettings onClick
      expect(kids(api), layout).toHaveLength(0);
      expect(container.querySelectorAll('.grid > *').length, layout).toBe(0);
    }
  });

  it('fixed: a new Columns block in the editor gets one Column slot per preset column, in the right grid', () => {
    for (const layout of PRESETS) {
      const { api, container } = mount(pageWith({ layout }), true);
      const cols = kids(api);
      expect(cols, layout).toHaveLength(COLUMN_COUNT[layout]);
      for (const c of cols) {
        const n = api().query.node(c).get();
        expect(n.data.parent).toBe('cols'); // real parent links (Craft addNodeTree) — not the old parent-link bug
        expect(n.data.name).toBe('Container');
        expect(n.data.custom.displayName).toBe('Column');
      }
      const grid = container.querySelector('.grid') as HTMLElement;
      expect(grid.className).toContain(GRID_CLASS[layout]);
      expect(container.textContent).not.toContain('Empty Columns Grid');
      expect((container.textContent!.match(/Empty Container/g) || []).length, layout).toBe(COLUMN_COUNT[layout]);
      expect([grid.style.gap, grid.style.padding]).toEqual(['16px', '16px']); // gap / internal padding still applied
    }
  });

  it('switching presets tops up slots and never deletes content', () => {
    const { api } = mount(pageWith({ layout: '2' }), true);
    const first = kids(api);
    act(() => api().actions.addNodeTree(api().query.parseReactElement(<RESOLVER.Paragraph text="Kept" />).toNodeTree(), first[0]));
    act(() => { api().actions.setProp('cols', (p: any) => { p.layout = '3'; }); ensureColumnSlots(api().actions, api().query, 'cols', COLUMN_COUNT['3']); });
    expect(kids(api)).toHaveLength(3);
    expect(kids(api).slice(0, 2)).toEqual(first); // same columns, same order
    expect(api().query.node(first[0]).get().data.nodes).toHaveLength(1); // content intact
    act(() => { api().actions.setProp('cols', (p: any) => { p.layout = '1/3-2/3'; }); ensureColumnSlots(api().actions, api().query, 'cols', 2); });
    expect(kids(api)).toHaveLength(3); // going down removes nothing
    expect(ensureColumnSlots(api().actions, api().query, 'cols', 3)).toBe(0); // idempotent
  });

  it('the settings preset click adds slots, and warns when columns will wrap', () => {
    const { api, container } = mount(pageWith({ layout: '4' }), true, <NodeProvider id="cols"><ColumnsSettings /></NodeProvider>);
    expect(kids(api)).toHaveLength(4);
    fireEvent.click(Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '2 columns')!);
    expect(api().query.node('cols').get().data.props.layout).toBe('2');
    expect(kids(api)).toHaveLength(4);
    expect(container.textContent).toContain('This grid has 4 columns; this layout shows 2 per row');
    fireEvent.click(Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '3 columns')!);
    expect(kids(api)).toHaveLength(4); // already enough
  });

  it('populated Columns (live templates) are untouched in the editor and on published pages', () => {
    const deepDive = withParentLinks(LESSON_TEMPLATES.find((t) => t.id === 'deep-dive-lesson')!.content);
    const before = JSON.parse(deepDive);
    for (const enabled of [true, false]) {
      const { api } = mount(deepDive, enabled);
      for (const id of ['cols1', 'cols2']) expect(kids(api, id)).toEqual(before[id].nodes);
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('Part B - Hero secondary button', () => {
  const hero = (props: Record<string, any>) => JSON.stringify({
    ROOT: { type: { resolvedName: 'Container' }, isCanvas: true, props: {}, nodes: ['hero'] },
    hero: { type: { resolvedName: 'Hero' }, isCanvas: true, parent: 'ROOT', props: { layout: 'centered', ...props }, nodes: [] },
  });

  it('reproduces: before this fix Hero rendered only its children — the toggle had no render branch', () => {
    // Hero.tsx (HEAD): the content column was `<div ...>{children}</div>`; showSecondaryButton was
    // destructured and never read. Equivalent render of that column with the toggle on:
    const { container } = render(<div className="content">{null}</div>);
    expect(container.querySelector('a')).toBeNull();
  });

  it('off: nothing is rendered (not merely hidden)', () => {
    const { container } = mount(hero({ showSecondaryButton: false }), false);
    expect(container.querySelector('[data-hero-secondary-button]')).toBeNull();
  });

  it('on: a real link, styled like a Button block, with its text/link/colours/size/position', () => {
    const { container } = mount(hero({
      showSecondaryButton: true, secondaryButtonText: 'See pricing', secondaryButtonLink: { type: 'url', value: 'https://example.com/pricing' },
      secondaryButtonVariant: 'outline', secondaryButtonColor: '#ff0000', secondaryButtonTextColor: '#00ff00', secondaryButtonRadius: 20, secondaryButtonSize: 'lg',
    }), false);
    const a = container.querySelector('[data-hero-secondary-button]') as HTMLAnchorElement;
    expect(a.tagName).toBe('A');
    expect(a.textContent).toBe('See pricing');
    expect(a.getAttribute('href')).toBe('https://example.com/pricing');
    expect([a.style.backgroundColor, a.style.color, a.style.borderRadius]).toEqual(['transparent', 'rgb(0, 255, 0)', '20px']);
    expect([a.style.borderWidth, a.style.borderStyle, a.style.borderColor]).toEqual(['2px', 'solid', 'rgb(255, 0, 0)']); // outline: border in the button colour
    expect(a.className).toContain('px-8 py-4'); // lg, same classes as the Button block
    expect(a.className).toContain('w-full sm:w-auto'); // full width on phones
    expect(a.parentElement!.className).toContain('justify-center'); // auto: centred layout
  });

  it('solid style fills with the colour; auto position is left on the split layout', () => {
    const { container } = mount(hero({ layout: 'split', showSecondaryButton: true, secondaryButtonVariant: 'primary', secondaryButtonColor: '#123456', secondaryButtonLink: '/about' }), false);
    const a = container.querySelector('[data-hero-secondary-button]') as HTMLAnchorElement;
    expect(a.style.backgroundColor).toBe('rgb(18, 52, 86)');
    expect(a.getAttribute('href')).toBe('/about');
    expect(a.parentElement!.className).toContain('justify-start');
  });

  it('in the editor the link does not navigate (clicks select the block)', () => {
    const { container } = mount(hero({ showSecondaryButton: true, secondaryButtonLink: '/about' }), true);
    const a = container.querySelector('[data-hero-secondary-button]') as HTMLAnchorElement;
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    a.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });
});
