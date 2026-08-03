import { BuilderTemplate } from '../templates';

export const webinarRegistrationBasic: BuilderTemplate = {
  id: 'webinar-registration-basic',
  name: 'Simple Webinar Registration',
  description: 'A registration page for a live session, with a real join link shared by every registrant — ready to configure.',
  category: 'General',
  type: 'funnel',
  step_type: 'webinar_registration',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-slate-50 flex items-center justify-center py-16 px-4' },
      nodes: ['webinar-reg-heading', 'webinar-reg-1']
    },
    'webinar-reg-heading': {
      type: { resolvedName: 'Heading' },
      props: { level: 'h1', text: 'Reserve your spot', fontWeight: 'bold', textAlign: 'center', color: '#111827' },
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
        padding: 32,
        gap: 16,
        labelColor: '#111827',
        descriptionColor: '#4b5563',
        inputBg: '#f9fafb',
        inputBorderColor: '#e5e7eb',
        inputTextColor: '#111827',
        buttonBg: '#6c47ff',
        buttonTextColor: '#ffffff'
      },
      parent: 'ROOT'
    }
  })
};
