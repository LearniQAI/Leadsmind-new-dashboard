// Shared page shell for the funnel-step utility templates (order form, upsell, downsell,
// thank-you, contact, inline form, webinar registration/thank-you).
//
// Why this exists: these templates used to be a single flex ROOT with the heading and the card as
// direct children and no `flexDirection`, so Container.craft's default of 'row' laid the heading
// and the card out side by side. ROOT also can't carry a background (Container.tsx strips `bg-*`
// from ROOT and always paints `var(--theme-bg)`), so the slate page backdrop needs its own node.
//
//   ROOT (flex column)
//   └─ funnel-shell   full-width slate backdrop, centers its child
//      └─ funnel-col  single centered column capped at FUNNEL_STEP_MAX_WIDTH; children stack here
export const FUNNEL_STEP_MAX_WIDTH = '520px';

const SHELL_ID = 'funnel-shell';
const COL_ID = 'funnel-col';

export function funnelStepLayout(childIds: string[], nodes: Record<string, any>): Record<string, any> {
  const children: Record<string, any> = {};
  for (const [id, node] of Object.entries(nodes)) {
    children[id] = node.parent === 'ROOT' ? { ...node, parent: COL_ID } : node;
  }
  return {
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen', display: 'flex', flexDirection: 'column' },
      nodes: [SHELL_ID],
    },
    [SHELL_ID]: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: {
        className: 'min-h-screen',
        layoutType: 'fluid',
        backgroundColor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        // 'stretch', not 'center': the editor/renderer wraps every node in a shrink-to-fit block
        // wrapper, so centering here would collapse funnel-col to its content width. funnel-col
        // centers itself (layoutType 'fixed' => mx-auto) inside the full-width wrapper instead.
        alignItems: 'stretch',
        justifyContent: 'center',
        paddingTop: '64px',
        paddingBottom: '64px',
        paddingLeft: '16px',
        paddingRight: '16px',
      },
      nodes: [COL_ID],
      parent: 'ROOT',
    },
    [COL_ID]: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: {
        className: 'w-full',
        layoutType: 'fixed',
        maxWidth: FUNNEL_STEP_MAX_WIDTH,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '24px',
      },
      nodes: childIds,
      parent: SHELL_ID,
    },
    ...children,
  };
}
