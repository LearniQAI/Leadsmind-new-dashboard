import { BuilderTemplate } from '../templates';

export const upsellBasic: BuilderTemplate = {
  id: 'upsell-basic',
  name: 'Simple Upsell',
  description: 'A one-time offer page with Accept/Decline actions, ready to configure.',
  category: 'General',
  type: 'funnel',
  step_type: 'upsell',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-slate-50 flex items-center justify-center py-16 px-4' },
      nodes: ['upsell-heading', 'upsell-1']
    },
    'upsell-heading': {
      type: { resolvedName: 'Heading' },
      props: { level: 'h1', text: 'Wait! One more thing...', fontWeight: 'bold', textAlign: 'center', color: '#111827' },
      parent: 'ROOT'
    },
    'upsell-1': {
      type: { resolvedName: 'Upsell' },
      props: {
        productName: 'Upgrade Your Order',
        description: 'Add this to your order right now at a special one-time price — you won’t see this offer again.',
        price: 199,
        currency: 'ZAR',
        acceptButtonText: 'Yes, add this to my order',
        declineButtonText: 'No thanks, continue',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 32,
        labelColor: '#111827',
        descriptionColor: '#4b5563',
        buttonBg: '#10b981',
        buttonTextColor: '#ffffff'
      },
      parent: 'ROOT'
    }
  })
};
