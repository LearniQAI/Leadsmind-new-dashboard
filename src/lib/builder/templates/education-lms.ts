import { BuilderTemplate } from '../templates';

export const educationLms: BuilderTemplate = {
  id: 'education-lms',
  name: 'Course Master Pro',
  description: 'High-conversion sales page for online courses and coaches.',
  category: 'Education',
  type: 'funnel',
  thumbnail: 'https://images.unsplash.com/photo-1524178232363-1fb28f74b671',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-[#f8fafc]' },
      nodes: ['hero-8', 'features-8', 'pricing-8', 'faq-8', 'footer-8']
    },
    'hero-8': {
      type: { resolvedName: 'Hero' },
      props: { layout: 'split', backgroundColor: '#ffffff', heightPreset: 'large' },
      nodes: ['h8-cont'],
      parent: 'ROOT'
    },
    'h8-cont': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'px-6' }, nodes: ['h8-h', 'h8-p', 'h8-btn'], parent: 'hero-8' },
    'h8-h': { type: { resolvedName: 'Heading' }, props: { text: 'Master Your Craft.', level: 'h1', className: 'text-4xl md:text-6xl font-black text-indigo-900 mb-6' }, parent: 'h8-cont' },
    'h8-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'The ultimate blueprint to scaling your digital business from zero to $100k.', className: 'text-lg md:text-xl text-indigo-600/60 mb-8' }, parent: 'h8-cont' },
    'h8-btn': { type: { resolvedName: 'UserButton' }, props: { text: 'Enroll Now - 50% Off', className: 'bg-indigo-600 rounded-xl h-14 text-lg' }, parent: 'h8-cont' },
    'features-8': { type: { resolvedName: 'Section' }, props: { paddingTop: 80, paddingBottom: 80, paddingTop_mobile: 40, paddingBottom_mobile: 40 }, parent: 'ROOT' },
    'pricing-8': { type: { resolvedName: 'PricingTable' }, parent: 'ROOT' },
    'faq-8': { type: { resolvedName: 'FAQ' }, parent: 'ROOT' },
    'footer-8': { type: { resolvedName: 'Footer' }, parent: 'ROOT' }
  })
};
