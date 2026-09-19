import { BuilderTemplate } from '../templates';
import { funnelStepLayout } from '../funnelStepLayout';
import { lightFooter, mergeBlocks, nextSteps } from '../funnelStepBlocks';
import {
  FUNNEL_STEP_ACCENT,
  FUNNEL_STEP_BRAND_STRIP_ID,
  FUNNEL_STEP_CARD_PADDING,
  FUNNEL_STEP_CATEGORY,
  FUNNEL_STEP_HEADING_PROPS,
  funnelStepBrandStrip,
} from '../funnelStepTheme';

const afterPurchase = mergeBlocks(
  nextSteps('thankyou', 'What happens next', [
    { icon: 'Mail', title: 'Check your email', text: 'Your receipt and order details are on their way to your inbox.' },
    { icon: 'UserCheck', title: 'Access your purchase', text: 'Follow the link in your email to get started right away.' },
    { icon: 'LifeBuoy', title: 'Need a hand?', text: 'Reply to your receipt email and we will help you out.' },
  ]),
  lightFooter('thankyou-footer', '© Your Brand. All rights reserved.'),
);

export const thankYouBasic: BuilderTemplate = {
  id: 'thank-you-basic',
  name: 'Simple Thank You',
  description: 'A confirmation page with an order summary, ready to configure.',
  category: FUNNEL_STEP_CATEGORY,
  type: 'funnel',
  step_type: 'thank_you',
  content: JSON.stringify(funnelStepLayout([FUNNEL_STEP_BRAND_STRIP_ID, 'thankyou-1', ...afterPurchase.ids], {
    ...funnelStepBrandStrip(),
    ...afterPurchase.nodes,
    'thankyou-1': {
      type: { resolvedName: 'ThankYou' },
      props: {
        heading: 'Thank You!',
        message: 'Your order is confirmed. A receipt has been sent to your email.',
        showOrderSummary: true,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: FUNNEL_STEP_CARD_PADDING,
        headingColor: '#111827',
        textColor: '#4b5563',
        accentColor: FUNNEL_STEP_ACCENT
      },
      parent: 'ROOT'
    }
  }))
};
