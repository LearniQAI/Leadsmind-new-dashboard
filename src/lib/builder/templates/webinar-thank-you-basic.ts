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

const afterRegistering = mergeBlocks(
  nextSteps('webinar-ty', 'What happens next', [
    { icon: 'CalendarPlus', title: 'Add it to your calendar', text: 'Save the date now so you don’t miss the session.' },
    { icon: 'Mail', title: 'Watch for your reminder', text: 'We’ll email you the join link and a reminder before we start.' },
    { icon: 'Share2', title: 'Invite a colleague', text: 'Know someone who’d get value from this? Share the registration page.' },
  ]),
  lightFooter('webinar-ty-footer', '© Your Brand. All rights reserved.'),
);

export const webinarThankYouBasic: BuilderTemplate = {
  id: 'webinar-thank-you-basic',
  name: 'Simple Webinar Thank You',
  description: 'A confirmation + join page for registrants, ready to configure. Doubles as the page they return to on the session day.',
  category: FUNNEL_STEP_CATEGORY,
  type: 'funnel',
  step_type: 'webinar_thank_you',
  content: JSON.stringify(funnelStepLayout([FUNNEL_STEP_BRAND_STRIP_ID, 'webinar-ty-1', ...afterRegistering.ids], {
    ...funnelStepBrandStrip(),
    ...afterRegistering.nodes,
    'webinar-ty-1': {
      type: { resolvedName: 'WebinarThankYou' },
      props: {
        heading: "You're registered!",
        message: 'Save the date — we can’t wait to see you live.',
        joinButtonText: 'Join session',
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
