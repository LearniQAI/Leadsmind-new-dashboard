import { BuilderTemplate } from '../templates';

export const inlineFormBasic: BuilderTemplate = {
  id: 'inline-form-basic',
  name: 'Simple Inline Form',
  description: 'A form embedded directly in the page, ready to configure — switch to Popup mode in the inspector if you want it triggered instead.',
  category: 'General',
  type: 'funnel',
  step_type: 'inline_popup_form',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-slate-50 flex items-center justify-center py-16 px-4' },
      nodes: ['inline-form-heading', 'inline-form-wrapper']
    },
    'inline-form-heading': {
      type: { resolvedName: 'Heading' },
      props: { level: 'h1', text: 'Stay in the loop', fontWeight: 'bold', textAlign: 'center', color: '#111827' },
      parent: 'ROOT'
    },
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
          { id: '1', type: 'text', label: 'Name', placeholder: 'Enter your name', required: true, mapping: 'first_name' },
          { id: '2', type: 'email', label: 'Email', placeholder: 'Enter your email', required: true, mapping: 'email' }
        ],
        buttonText: 'Submit',
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
        successMessage: 'Thanks! You’re all set.',
        redirectLink: { type: 'url', value: '' }
      },
      parent: 'inline-form-wrapper'
    }
  })
};
