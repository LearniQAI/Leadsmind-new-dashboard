import { BuilderTemplate } from '../templates';

export const legalElite: BuilderTemplate = {
  id: 'legal-elite',
  name: 'Elite Legal Group',
  description: 'Sophisticated and professional design for law firms and consultants.',
  category: 'Professional',
  type: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-[#0c121e] text-white' },
      nodes: ['hero-7', 'logos-7', 'services-7', 'footer-7']
    },
    'hero-7': {
      type: { resolvedName: 'Hero' },
      props: { layout: 'centered', backgroundColor: '#111827', heightPreset: 'large' },
      nodes: ['h7-cont'],
      parent: 'ROOT'
    },
    'h7-cont': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'px-6' }, nodes: ['h7-h', 'h7-p', 'h7-btn'], parent: 'hero-7' },
    'h7-h': { type: { resolvedName: 'Heading' }, props: { text: 'Defending Your Future.', level: 'h1', className: 'text-5xl md:text-6xl font-serif font-medium mb-6' }, parent: 'h7-cont' },
    'h7-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Strategic legal counsel for complex business and personal matters.', className: 'text-lg md:text-xl opacity-60 mb-10 tracking-widest uppercase text-amber-500' }, parent: 'h7-cont' },
    'h7-btn': { type: { resolvedName: 'UserButton' }, props: { text: 'Request Consultation', variant: 'outline', className: 'border-amber-500 text-amber-500 h-14' }, parent: 'h7-cont' },
    'logos-7': { type: { resolvedName: 'LogoStrip' }, props: { grayscale: true }, parent: 'ROOT' },
    'services-7': { type: { resolvedName: 'Section' }, props: { paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 50, paddingBottom_mobile: 50 }, parent: 'ROOT' },
    'footer-7': { type: { resolvedName: 'Footer' }, parent: 'ROOT' }
  })
};
