import { BuilderTemplate } from '../templates';

export const infoContactBasic: BuilderTemplate = {
  id: 'info-contact-basic',
  name: 'Simple Contact Page',
  description: 'An info/contact page with a name, email, phone and message form, ready to configure.',
  category: 'General',
  type: 'funnel',
  step_type: 'info_page',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-slate-50 flex items-center justify-center py-16 px-4' },
      nodes: ['contact-heading', 'contact-subheading', 'contact-form-1']
    },
    'contact-heading': {
      type: { resolvedName: 'Heading' },
      props: { level: 'h1', text: 'Get in touch', fontWeight: 'bold', textAlign: 'center', color: '#111827' },
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
        padding: 32,
        gap: 16,
        labelColor: '#374151',
        inputBg: '#f9fafb',
        inputBorderColor: '#e5e7eb',
        inputTextColor: '#111827',
        buttonBg: '#6c47ff',
        buttonTextColor: '#ffffff',
        onSuccess: 'message',
        successMessage: 'Thanks for reaching out! We’ll be in touch soon.',
        redirectLink: { type: 'url', value: '' }
      },
      parent: 'ROOT'
    }
  })
};
