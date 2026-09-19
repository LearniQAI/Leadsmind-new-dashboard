import { BuilderTemplate } from '../templates';
import { funnelStepLayout } from '../funnelStepLayout';
import { benefitList, mergeBlocks, pillBadge, presenterRow } from '../funnelStepBlocks';
import {
  FUNNEL_STEP_ACCENT,
  FUNNEL_STEP_BRAND_STRIP_ID,
  FUNNEL_STEP_CARD_PADDING,
  FUNNEL_STEP_CATEGORY,
  FUNNEL_STEP_HEADING_PROPS,
  funnelStepBrandStrip,
} from '../funnelStepTheme';

// Placeholder framing only - the badge text, presenter and bullets are all meant to be replaced.
const dateBadge = pillBadge('webinar-reg-date', 'CalendarDays', 'Your session date & time goes here');
const presenter = presenterRow(
  'webinar-reg',
  '/web-templates/funnel-steps/presenter-placeholder.svg',
  'Presenter Name',
  'Presenter title or credential',
);
const learn = mergeBlocks(
  {
    ids: ['webinar-reg-learn-heading'],
    nodes: {
      'webinar-reg-learn-heading': {
        type: { resolvedName: 'Heading' },
        props: { level: 'h3', fontSize: 18, fontWeight: 'black', textAlign: 'left', color: '#111827', text: 'What you’ll learn' },
        parent: 'ROOT',
      },
    },
  },
  benefitList('webinar-reg-learn', [
    { icon: 'Check', text: 'The key idea behind your topic, explained simply' },
    { icon: 'Check', text: 'A practical framework you can apply right away' },
    { icon: 'Check', text: 'Live Q&A so you can get your questions answered' },
  ]),
);

export const webinarRegistrationBasic: BuilderTemplate = {
  id: 'webinar-registration-basic',
  name: 'Simple Webinar Registration',
  description: 'A registration page for a live session, with a real join link shared by every registrant — ready to configure.',
  category: FUNNEL_STEP_CATEGORY,
  type: 'funnel',
  step_type: 'webinar_registration',
  content: JSON.stringify(funnelStepLayout([FUNNEL_STEP_BRAND_STRIP_ID, ...dateBadge.ids, 'webinar-reg-heading', ...presenter.ids, 'webinar-reg-1', ...learn.ids], {
    ...funnelStepBrandStrip(),
    ...dateBadge.nodes,
    ...presenter.nodes,
    ...learn.nodes,
    'webinar-reg-heading': {
      type: { resolvedName: 'Heading' },
      props: { ...FUNNEL_STEP_HEADING_PROPS, text: 'Reserve your spot' },
      parent: 'ROOT'
    },
    'webinar-reg-1': {
      type: { resolvedName: 'WebinarRegistration' },
      props: {
        sessionTitle: 'Live Webinar',
        sessionDateTime: '',
        durationMinutes: 60,
        description: 'Join us live to learn how to grow your business.',
        buttonText: 'Save my seat',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: FUNNEL_STEP_CARD_PADDING,
        gap: 16,
        labelColor: '#111827',
        descriptionColor: '#4b5563',
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
