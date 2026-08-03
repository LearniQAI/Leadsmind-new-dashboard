import { BuilderTemplate } from '../templates';

export const webinarThankYouBasic: BuilderTemplate = {
  id: 'webinar-thank-you-basic',
  name: 'Simple Webinar Thank You',
  description: 'A confirmation + join page for registrants, ready to configure. Doubles as the page they return to on the session day.',
  category: 'General',
  type: 'funnel',
  step_type: 'webinar_thank_you',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-slate-50 flex items-center justify-center py-16 px-4' },
      nodes: ['webinar-ty-1']
    },
    'webinar-ty-1': {
      type: { resolvedName: 'WebinarThankYou' },
      props: {
        heading: "You're registered!",
        message: 'Save the date — we can’t wait to see you live.',
        joinButtonText: 'Join session',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 48,
        headingColor: '#111827',
        textColor: '#4b5563',
        accentColor: '#6c47ff'
      },
      parent: 'ROOT'
    }
  })
};
