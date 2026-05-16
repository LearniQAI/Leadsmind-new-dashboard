import { BuilderTemplate } from '../templates';

export const medicalCare: BuilderTemplate = {
  id: 'medical-care',
  name: 'Safe Hands Healthcare',
  description: 'Trust-focused landing page for clinics and dental practices.',
  category: 'Healthcare',
  type: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1629909608135-ca29ed975199',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-white' },
      nodes: ['nav-6', 'hero-6', 'services-6', 'booking-6', 'footer-6']
    },
    'nav-6': { type: { resolvedName: 'Navbar' }, parent: 'ROOT' },
    'hero-6': {
      type: { resolvedName: 'Hero' },
      props: { layout: 'split', backgroundColor: '#f0f9ff', heightPreset: 'large' },
      nodes: ['h6-cont'],
      parent: 'ROOT'
    },
    'h6-cont': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'px-6' }, nodes: ['h6-h', 'h6-p', 'h6-btn'], parent: 'hero-6' },
    'h6-h': { type: { resolvedName: 'Heading' }, props: { text: 'Modern Care, Personal Touch.', level: 'h1', className: 'text-4xl md:text-5xl font-bold text-sky-900 mb-6' }, parent: 'h6-cont' },
    'h6-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Comprehensive medical services designed around your family\'s well-being.', className: 'text-base md:text-lg text-slate-600 mb-8' }, parent: 'h6-cont' },
    'h6-btn': { type: { resolvedName: 'UserButton' }, props: { text: 'Book Appointment', className: 'bg-sky-600 rounded-lg h-12' }, parent: 'h6-cont' },
    'services-6': { type: { resolvedName: 'Section' }, props: { paddingTop: 80, paddingBottom: 80, paddingTop_mobile: 40, paddingBottom_mobile: 40 }, parent: 'ROOT' },
    'booking-6': { type: { resolvedName: 'Form' }, props: { title: 'New Patient Registration' }, parent: 'ROOT' },
    'footer-6': { type: { resolvedName: 'Footer' }, parent: 'ROOT' }
  })
};
