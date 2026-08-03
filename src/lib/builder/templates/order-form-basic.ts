import { BuilderTemplate } from '../templates';

export const orderFormBasic: BuilderTemplate = {
  id: 'order-form-basic',
  name: 'Simple Order Form',
  description: 'A minimal order form with the product/price summary and a PayFast checkout button, ready to configure.',
  category: 'General',
  type: 'funnel',
  step_type: 'order_form',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-slate-50 flex items-center justify-center py-16 px-4' },
      nodes: ['order-form-heading', 'order-form-1']
    },
    'order-form-heading': {
      type: { resolvedName: 'Heading' },
      props: { level: 'h1', text: 'Complete your order', fontWeight: 'bold', textAlign: 'center', color: '#111827' },
      parent: 'ROOT'
    },
    'order-form-1': {
      type: { resolvedName: 'OrderForm' },
      props: {
        productName: 'Your Product',
        price: 499,
        currency: 'ZAR',
        buttonText: 'Pay now',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 32,
        gap: 16,
        labelColor: '#374151',
        inputBg: '#f9fafb',
        inputBorderColor: '#e5e7eb',
        inputTextColor: '#111827',
        buttonBg: '#10b981',
        buttonTextColor: '#ffffff'
      },
      parent: 'ROOT'
    }
  })
};
