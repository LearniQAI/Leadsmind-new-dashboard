import { BuilderTemplate } from '../templates';

export const thankYouBasic: BuilderTemplate = {
  id: 'thank-you-basic',
  name: 'Simple Thank You',
  description: 'A confirmation page with an order summary, ready to configure.',
  category: 'General',
  type: 'funnel',
  step_type: 'thank_you',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-slate-50 flex items-center justify-center py-16 px-4' },
      nodes: ['thankyou-1']
    },
    'thankyou-1': {
      type: { resolvedName: 'ThankYou' },
      props: {
        heading: 'Thank You!',
        message: 'Your order is confirmed. A receipt has been sent to your email.',
        showOrderSummary: true,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 48,
        headingColor: '#111827',
        textColor: '#4b5563',
        accentColor: '#10b981'
      },
      parent: 'ROOT'
    }
  })
};
