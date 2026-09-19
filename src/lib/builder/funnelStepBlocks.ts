// Reusable content blocks for the funnel-step templates (trust badges, benefit bullets,
// next-steps list, footer). Each builder returns the top-level node ids to splice into the
// template's child list plus the nodes themselves; ids are namespaced by `prefix` so several
// blocks can coexist in one page. Top-level nodes carry parent 'ROOT' - funnelStepLayout()
// re-parents those onto its column.
import { FUNNEL_STEP_ACCENT, FUNNEL_STEP_CARD_PADDING } from './funnelStepTheme';

export interface Block {
  ids: string[];
  nodes: Record<string, any>;
}

// Content-sized child of a row. Published pages render children as direct flex items (the editor wraps
// each node in a shrink-to-fit div), so a 'fluid' (w-full) child would stretch and defeat the row's
// justify-center; 'fixed' drops w-full but adds mx-auto, which would push it to the middle of any
// leftover space, so zero the side margins too.
const SHRINK = { layoutType: 'fixed', marginLeft: '0px', marginRight: '0px' } as const;

const MUTED = '#6b7280';
const TITLE = '#111827';

const container = (props: Record<string, any>, nodes: string[], parent: string) => ({
  type: { resolvedName: 'Container' },
  isCanvas: true,
  // padding 0 + fluid: Container.craft defaults to 16px padding and a centred 1200px max width.
  props: { layoutType: 'fluid', padding: 0, display: 'flex', ...props },
  nodes,
  parent,
});

const icon = (name: string, size: number, color: string, parent: string) => ({
  type: { resolvedName: 'Icon' },
  props: { name, size, color, strokeWidth: 2, alignment: 'center' },
  parent,
});

const paragraph = (text: string, props: Record<string, any>, parent: string) => ({
  type: { resolvedName: 'Paragraph' },
  props: { text, fontSize: 14, textAlign: 'left', color: MUTED, ...props },
  parent,
});

// Product image slot: a neutral local placeholder the user swaps for the real product shot.
export function productImage(id: string): Block {
  return {
    ids: [id],
    nodes: {
      [id]: {
        type: { resolvedName: 'UserImage' },
        props: {
          src: '/web-templates/funnel-steps/product-placeholder.svg',
          alt: 'Product image',
          objectFit: 'cover',
          width: '100%',
          height: '220px',
          borderRadius: 24,
        },
        parent: 'ROOT',
      },
    },
  };
}

// Generic image slot (presenter photo, lead-magnet cover, ...). Same neutral local-SVG pattern as productImage.
export function imageBlock(
  id: string,
  opts: { src: string; alt: string; width: string; height: string; borderRadius: number | string; centered?: boolean },
): Block {
  const img = {
    type: { resolvedName: 'UserImage' },
    props: { src: opts.src, alt: opts.alt, objectFit: 'cover', width: opts.width, height: opts.height, borderRadius: opts.borderRadius },
    parent: opts.centered ? `${id}-row` : 'ROOT',
  };
  if (!opts.centered) return { ids: [id], nodes: { [id]: img } };
  // A row with justify-center shrink-wraps the fixed-width image and centres it in the column.
  return {
    ids: [`${id}-row`],
    nodes: {
      [`${id}-row`]: container({ flexDirection: 'row', justifyContent: 'center' }, [id], 'ROOT'),
      [id]: img,
    },
  };
}

// Small accent pill (icon + short label), centred. Used for date/time and "free resource" tags.
export function pillBadge(id: string, iconName: string, text: string): Block {
  return {
    ids: [`${id}-row`],
    nodes: {
      [`${id}-row`]: container({ flexDirection: 'row', justifyContent: 'center' }, [id], 'ROOT'),
      [id]: container(
        {
          ...SHRINK, flexDirection: 'row', alignItems: 'center', gap: '8px', backgroundColor: '#eef2ff', borderRadius: '9999px',
          paddingTop: '6px', paddingBottom: '6px', paddingLeft: '14px', paddingRight: '16px',
        },
        [`${id}-icon`, `${id}-text`],
        `${id}-row`,
      ),
      [`${id}-icon`]: icon(iconName, 15, FUNNEL_STEP_ACCENT, id),
      [`${id}-text`]: paragraph(text, { fontSize: 13, fontWeight: 'semibold', color: FUNNEL_STEP_ACCENT, textAlign: 'center' }, id),
    },
  };
}

// Presenter byline: round avatar + name/title, centred.
export function presenterRow(prefix: string, avatarSrc: string, name: string, title: string): Block {
  const rowId = `${prefix}-presenter`;
  return {
    ids: [rowId],
    nodes: {
      [rowId]: container({ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: '14px' }, [`${rowId}-img`, `${rowId}-who`], 'ROOT'),
      [`${rowId}-img`]: {
        type: { resolvedName: 'UserImage' },
        props: { src: avatarSrc, alt: 'Presenter photo', objectFit: 'cover', width: '64px', height: '64px', borderRadius: 32 },
        parent: rowId,
      },
      [`${rowId}-who`]: container({ ...SHRINK, flexDirection: 'column', gap: '2px' }, [`${rowId}-name`, `${rowId}-title`], rowId),
      [`${rowId}-name`]: paragraph(name, { fontSize: 15, fontWeight: 'semibold', color: TITLE }, `${rowId}-who`),
      [`${rowId}-title`]: paragraph(title, { fontSize: 13 }, `${rowId}-who`),
    },
  };
}

// Small centred row of generic reassurance badges. No links, nothing clickable.
export function trustBadges(prefix: string, items: { icon: string; label: string }[]): Block {
  const rowId = `${prefix}-trust`;
  const nodes: Record<string, any> = {};
  const itemIds: string[] = [];
  items.forEach((it, i) => {
    const id = `${prefix}-trust-${i + 1}`;
    itemIds.push(id);
    nodes[id] = container(
      { ...SHRINK, flexDirection: 'row', alignItems: 'center', gap: '6px' },
      [`${id}-icon`, `${id}-text`],
      rowId,
    );
    nodes[`${id}-icon`] = icon(it.icon, 14, MUTED, id);
    nodes[`${id}-text`] = paragraph(it.label, { fontSize: 12, fontWeight: 'medium' }, id);
  });
  nodes[rowId] = container(
    { className: 'flex-wrap', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: '8px 20px' },
    itemIds,
    'ROOT',
  );
  return { ids: [rowId], nodes };
}

// Icon + one-line bullets ("what you get").
export function benefitList(prefix: string, items: { icon: string; text: string }[]): Block {
  const listId = `${prefix}-benefits`;
  const nodes: Record<string, any> = {};
  const rowIds: string[] = [];
  items.forEach((it, i) => {
    const id = `${prefix}-benefit-${i + 1}`;
    rowIds.push(id);
    nodes[id] = container({ flexDirection: 'row', alignItems: 'center', gap: '12px' }, [`${id}-icon`, `${id}-text`], listId);
    nodes[`${id}-icon`] = icon(it.icon, 20, FUNNEL_STEP_ACCENT, id);
    nodes[`${id}-text`] = paragraph(it.text, { fontSize: 15, fontWeight: 'medium', color: TITLE }, id);
  });
  nodes[listId] = container(
    { flexDirection: 'column', gap: '12px', paddingLeft: '8px', paddingRight: '8px' },
    rowIds,
    'ROOT',
  );
  return { ids: [listId], nodes };
}

// "What happens next" card: icon + title + description per step.
export function nextSteps(prefix: string, heading: string, steps: { icon: string; title: string; text: string }[]): Block {
  const cardId = `${prefix}-next`;
  const nodes: Record<string, any> = {};
  const childIds = [`${cardId}-heading`];
  nodes[`${cardId}-heading`] = {
    type: { resolvedName: 'Heading' },
    props: { level: 'h3', fontSize: 18, fontWeight: 'black', textAlign: 'left', color: TITLE, text: heading },
    parent: cardId,
  };
  steps.forEach((s, i) => {
    const id = `${cardId}-step-${i + 1}`;
    childIds.push(id);
    nodes[id] = container({ flexDirection: 'row', alignItems: 'flex-start', gap: '14px' }, [`${id}-icon`, `${id}-body`], cardId);
    nodes[`${id}-icon`] = icon(s.icon, 22, FUNNEL_STEP_ACCENT, id);
    nodes[`${id}-body`] = container({ flexDirection: 'column', gap: '2px' }, [`${id}-title`, `${id}-text`], id);
    nodes[`${id}-title`] = paragraph(s.title, { fontSize: 15, fontWeight: 'semibold', color: TITLE }, `${id}-body`);
    nodes[`${id}-text`] = paragraph(s.text, {}, `${id}-body`);
  });
  nodes[cardId] = container(
    { flexDirection: 'column', gap: '20px', backgroundColor: '#ffffff', borderRadius: '24px', padding: FUNNEL_STEP_CARD_PADDING },
    childIds,
    'ROOT',
  );
  return { ids: [cardId], nodes };
}

// Light footer line - appropriate on the post-purchase page only (no links).
export function lightFooter(id: string, text: string): Block {
  return {
    ids: [id],
    nodes: { [id]: { ...paragraph(text, { fontSize: 12, textAlign: 'center' }, 'ROOT') } },
  };
}

export function mergeBlocks(...blocks: Block[]): { ids: string[]; nodes: Record<string, any> } {
  return {
    ids: blocks.flatMap((b) => b.ids),
    nodes: Object.assign({}, ...blocks.map((b) => b.nodes)),
  };
}
