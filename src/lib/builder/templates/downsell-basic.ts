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
  productImage('downsell-image'),
  benefitList('downsell', [
    { icon: 'Check', text: 'The essentials, included' },
    { icon: 'Zap', text: 'Instant access after checkout' },
    { icon: 'Tag', text: 'A lower one-time price' },
  ]),
);

export const downsellBasic: BuilderTemplate = {
  id: 'downsell-basic',
  name: 'Simple Downsell',
  description: 'A lower-priced alternative offer page with Accept/Decline actions, ready to configure.',
  category: FUNNEL_STEP_CATEGORY,
  type: 'funnel',
  step_type: 'downsell',
  content: JSON.stringify(funnelStepLayout([FUNNEL_STEP_BRAND_STRIP_ID, 'downsell-heading', ...offerBlocks.ids, 'downsell-1'], {
    ...funnelStepBrandStrip(),
    ...offerBlocks.nodes,

    'downsell-heading': {
      type: { resolvedName: 'Heading' },
      props: { ...FUNNEL_STEP_HEADING_PROPS, text: 'Prefer a lighter option? Try this instead' },
      parent: 'ROOT'
    },
    'downsell-1': {
      type: { resolvedName: 'Downsell' },
      props: {
        productName: 'Your Starter Version',
        description: 'Describe the smaller, more affordable version of your offer and what is still included. This price is only available on this page.',
        price: 99,
        currency: 'ZAR',
        acceptButtonText: 'Yes, add this instead',
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
