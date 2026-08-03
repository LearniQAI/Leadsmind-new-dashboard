import { BuilderTemplate } from '../templates';

export const downsellBasic: BuilderTemplate = {
  id: 'downsell-basic',
  name: 'Simple Downsell',
  description: 'A lower-priced alternative offer page with Accept/Decline actions, ready to configure.',
  category: 'General',
  type: 'funnel',
  step_type: 'downsell',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-slate-50 flex items-center justify-center py-16 px-4' },
      nodes: ['downsell-heading', 'downsell-1']
    },
    'downsell-heading': {
      type: { resolvedName: 'Heading' },
      props: { level: 'h1', text: 'Before you go...', fontWeight: 'bold', textAlign: 'center', color: '#111827' },
      parent: 'ROOT'
    },
    'downsell-1': {
      type: { resolvedName: 'Downsell' },
      props: {
        productName: 'Wait — Here’s a Better Deal',
        description: 'Since that wasn’t quite right for you, here’s a smaller version at a lower price, just this once.',
        price: 99,
        currency: 'ZAR',
        acceptButtonText: 'Yes, add this instead',
        declineButtonText: 'No thanks, continue',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 32,
        labelColor: '#111827',
        descriptionColor: '#4b5563',
        buttonBg: '#f59e0b',
        buttonTextColor: '#ffffff'
      },
      parent: 'ROOT'
    }
  })
};
