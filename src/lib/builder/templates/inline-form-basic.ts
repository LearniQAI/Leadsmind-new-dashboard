import { BuilderTemplate } from '../templates';
import { funnelStepLayout } from '../funnelStepLayout';
import { benefitList, imageBlock, mergeBlocks, pillBadge } from '../funnelStepBlocks';
import {
  FUNNEL_STEP_ACCENT,
  FUNNEL_STEP_BRAND_STRIP_ID,
  FUNNEL_STEP_CARD_PADDING,
  FUNNEL_STEP_CATEGORY,
  FUNNEL_STEP_HEADING_PROPS,
  funnelStepBrandStrip,
} from '../funnelStepTheme';

// A complete free-resource ("lead magnet") page. All copy, the cover image and the bullets are
// placeholders for the user's real offer; the Form below stays the single action.
const pitch = mergeBlocks(
  pillBadge('inline-form-tag', 'Gift', 'Free download'),
  {
    ids: ['inline-form-heading', 'inline-form-subhead'],
    nodes: {
      'inline-form-heading': {
        type: { resolvedName: 'Heading' },
        props: { ...FUNNEL_STEP_HEADING_PROPS, text: 'Get your free step-by-step guide' },
        parent: 'ROOT',
      },
      'inline-form-subhead': {
        type: { resolvedName: 'Paragraph' },
        props: {
          text: 'A short, practical resource you can put to use today. Enter your details and we’ll send it straight to your inbox.',
          fontSize: 16,
          textAlign: 'center',
          color: '#4b5563',
        },
        parent: 'ROOT',
      },
    },
  },
  imageBlock('inline-form-cover', {
    src: '/web-templates/funnel-steps/lead-magnet-cover.svg',
    alt: 'Free resource cover',
    width: '210px',
    height: '280px',
    borderRadius: 16,
    centered: true,
  }),
  benefitList('inline-form', [
    { icon: 'Check', text: 'The essential steps, explained in plain language' },
    { icon: 'ListChecks', text: 'A ready-to-use checklist you can follow' },
    { icon: 'TriangleAlert', text: 'Common mistakes and how to avoid them' },
    { icon: 'Mail', text: 'Delivered instantly to your inbox' },
  ]),
);

const privacyNote = {
  ids: ['inline-form-privacy'],
  nodes: {
    'inline-form-privacy': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'We respect your privacy. No spam, and you can unsubscribe at any time.', fontSize: 12, textAlign: 'center', color: '#6b7280' },
      parent: 'ROOT',
    },
  },
};

export const inlineFormBasic: BuilderTemplate = {
  id: 'inline-form-basic',
  name: 'Free Resource Opt-in',
  description: 'A complete lead-magnet page: benefit-led headline, cover image, benefit bullets and an inline sign-up form — swap in your own free guide, checklist or template.',
  category: FUNNEL_STEP_CATEGORY,
  type: 'funnel',
  step_type: 'inline_popup_form',
  content: JSON.stringify(funnelStepLayout([FUNNEL_STEP_BRAND_STRIP_ID, ...pitch.ids, 'inline-form-wrapper', ...privacyNote.ids], {
    ...funnelStepBrandStrip(),
    ...pitch.nodes,
    ...privacyNote.nodes,
    'inline-form-wrapper': {
      type: { resolvedName: 'PopupForm' },
      isCanvas: true,
      props: {
        displayMode: 'inline',
        triggerType: 'time-delay',
        triggerValue: 5,
        overlayColor: 'rgba(15, 23, 42, 0.6)',
        showCloseButton: true
      },
      nodes: ['inline-form-1'],
      parent: 'ROOT'
    },
    'inline-form-1': {
      type: { resolvedName: 'Form' },
      props: {
        fields: [
          { id: '1', type: 'text', label: 'First name', placeholder: 'Enter your first name', required: true, mapping: 'first_name' },
          { id: '2', type: 'email', label: 'Email', placeholder: 'Where should we send it?', required: true, mapping: 'email' }
        ],
        buttonText: 'Send me the free guide',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: FUNNEL_STEP_CARD_PADDING,
        gap: 16,
        labelColor: '#374151',
        inputBg: '#f9fafb',
        inputBorderColor: '#e5e7eb',
        inputTextColor: '#111827',
        buttonBg: FUNNEL_STEP_ACCENT,
        buttonTextColor: '#ffffff',
        onSuccess: 'message',
        successMessage: 'Success! Check your inbox for your free guide.',
        redirectLink: { type: 'url', value: '' }
      },
      parent: 'inline-form-wrapper'
    }
  }))
};
