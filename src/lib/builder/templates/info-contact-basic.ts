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

// Info page (not a conversion step), so a light header nav and footer are appropriate here.
// Links are placeholders - point them at the real site pages.
const headerNav = {
  'contact-nav': {
    type: { resolvedName: 'Navbar' },
    props: {
      logo: '',
      brandName: 'YOUR BRAND',
      links: [
        { label: 'Home', href: '#' },
        { label: 'About', href: '#' },
      ],
      backgroundColor: 'transparent',
      textColor: '#111827',
      sticky: false,
      padding: 4,
      showButton: false,
      fullWidth: false,
      borderBottomWidth: 0,
      linkHoverColor: FUNNEL_STEP_ACCENT,
      fontSize: 13,
      fontWeight: '700',
      layoutType: 'side',
      navigationSource: 'none',
      mobileOverlayColor: '#ffffff',
      hamburgerColor: '#111827',
    },
    parent: 'ROOT',
  },
};
const contactExtras = mergeBlocks(
  nextSteps('contact', 'Other ways to reach us', [
    { icon: 'Mail', title: 'Email', text: 'hello@yourbrand.com' },
    { icon: 'Phone', title: 'Phone', text: '+00 000 000 0000' },
    { icon: 'MapPin', title: 'Address', text: '123 Your Street, Your City' },
    { icon: 'Clock', title: 'Hours', text: 'Mon–Fri, 9:00 – 17:00' },
  ]),
  lightFooter('contact-footer', '© Your Brand. All rights reserved.'),
);

export const infoContactBasic: BuilderTemplate = {
  id: 'info-contact-basic',
  name: 'Simple Contact Page',
  description: 'An info/contact page with a name, email, phone and message form, ready to configure.',
  category: FUNNEL_STEP_CATEGORY,
  type: 'funnel',
  step_type: 'info_page',
  content: JSON.stringify(funnelStepLayout(['contact-nav', 'contact-heading', 'contact-subheading', 'contact-form-1', ...contactExtras.ids], {
    ...contactExtras.nodes,
    ...headerNav,
    'contact-heading': {
      type: { resolvedName: 'Heading' },
      props: { ...FUNNEL_STEP_HEADING_PROPS, text: 'Get in touch' },
      parent: 'ROOT'
    },
    'contact-subheading': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Have a question? Fill out the form below and we’ll get back to you.', fontSize: 16, textAlign: 'center', color: '#4b5563' },
      parent: 'ROOT'
    },
    'contact-form-1': {
      type: { resolvedName: 'Form' },
      props: {
        fields: [
          { id: '1', type: 'text', label: 'Name', placeholder: 'Enter your name', required: true, mapping: 'first_name' },
          { id: '2', type: 'email', label: 'Email', placeholder: 'Enter your email', required: true, mapping: 'email' },
          { id: '3', type: 'tel', label: 'Phone', placeholder: 'Enter your phone number', required: false, mapping: 'phone' },
          { id: '4', type: 'textarea', label: 'Message', placeholder: 'How can we help?', required: false, mapping: 'custom' }
        ],
        buttonText: 'Send message',
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
        successMessage: 'Thanks for reaching out! We’ll be in touch soon.',
        redirectLink: { type: 'url', value: '' }
      },
      parent: 'ROOT'
    }
  }))
};
