import { BuilderTemplate } from '../templates';
import { funnelStepLayout } from '../funnelStepLayout';
import { trustBadges } from '../funnelStepBlocks';

import {
  FUNNEL_STEP_ACCENT,
  FUNNEL_STEP_BRAND_STRIP_ID,
  FUNNEL_STEP_CARD_PADDING,
  FUNNEL_STEP_CATEGORY,
  FUNNEL_STEP_HEADING_PROPS,
  funnelStepBrandStrip,
} from '../funnelStepTheme';

// Generic reassurance only (no certifications claimed); edit the wording to match what you actually offer.
const trust = trustBadges('order', [
  { icon: 'Lock', label: 'Secure checkout' },
  { icon: 'ShieldCheck', label: 'Money-back guarantee' },
  { icon: 'BadgeCheck', label: 'Instant confirmation' },
]);

export const orderFormBasic: BuilderTemplate = {
  id: 'order-form-basic',
  name: 'Simple Order Form',
  description: 'A minimal order form with the product/price summary and a PayFast checkout button, ready to configure.',
  category: FUNNEL_STEP_CATEGORY,
  type: 'funnel',
  step_type: 'order_form',
  content: JSON.stringify(funnelStepLayout([FUNNEL_STEP_BRAND_STRIP_ID, 'order-form-heading', 'order-form-1', ...trust.ids], {
    ...funnelStepBrandStrip(),
    ...trust.nodes,

    'order-form-heading': {
      type: { resolvedName: 'Heading' },
      props: { ...FUNNEL_STEP_HEADING_PROPS, text: 'Complete your order' },
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
        padding: FUNNEL_STEP_CARD_PADDING,
        gap: 16,
        labelColor: '#374151',
        inputBg: '#f9fafb',
        inputBorderColor: '#e5e7eb',
        inputTextColor: '#111827',
        buttonBg: FUNNEL_STEP_ACCENT,
        buttonTextColor: '#ffffff'
      },
      parent: 'ROOT'
    }
  }))
};
