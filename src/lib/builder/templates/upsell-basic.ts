import { BuilderTemplate } from '../templates';
import { funnelStepLayout } from '../funnelStepLayout';
import { benefitList, productImage, mergeBlocks } from '../funnelStepBlocks';

import {
  FUNNEL_STEP_ACCENT,
  FUNNEL_STEP_BRAND_STRIP_ID,
  FUNNEL_STEP_CARD_PADDING,
  FUNNEL_STEP_CATEGORY,
  FUNNEL_STEP_HEADING_PROPS,
  funnelStepBrandStrip,
} from '../funnelStepTheme';

const offerBlocks = mergeBlocks(
  productImage('upsell-image'),
  benefitList('upsell', [
    { icon: 'Check', text: 'Everything in your original order, plus more' },
    { icon: 'Zap', text: 'Delivered instantly after checkout' },
    { icon: 'ShieldCheck', text: 'Backed by our satisfaction guarantee' },
  ]),
);

export const upsellBasic: BuilderTemplate = {
  id: 'upsell-basic',
  name: 'Simple Upsell',
  description: 'A one-time offer page with Accept/Decline actions, ready to configure.',
  category: FUNNEL_STEP_CATEGORY,
  type: 'funnel',
  step_type: 'upsell',
  content: JSON.stringify(funnelStepLayout([FUNNEL_STEP_BRAND_STRIP_ID, 'upsell-heading', ...offerBlocks.ids, 'upsell-1'], {
    ...funnelStepBrandStrip(),
    ...offerBlocks.nodes,

    'upsell-heading': {
      type: { resolvedName: 'Heading' },
      props: { ...FUNNEL_STEP_HEADING_PROPS, text: 'Add this to your order at a one-time price' },
      parent: 'ROOT'
    },
    'upsell-1': {
      type: { resolvedName: 'Upsell' },
      props: {
        productName: 'Your Premium Upgrade',
        description: 'Describe what this offer adds and why it complements what they just bought. This price is only available on this page.',
        price: 199,
        currency: 'ZAR',
        acceptButtonText: 'Yes, add this to my order',
        declineButtonText: 'No thanks, continue',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: FUNNEL_STEP_CARD_PADDING,
        labelColor: '#111827',
        descriptionColor: '#4b5563',
        buttonBg: FUNNEL_STEP_ACCENT,
        buttonTextColor: '#ffffff'
      },
      parent: 'ROOT'
    }
  }))
};
