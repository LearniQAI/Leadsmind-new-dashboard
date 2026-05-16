import { BuilderTemplate } from '../templates';

export const modernAgency: BuilderTemplate = {
  id: 'modern-agency',
  name: 'Creative Node Agency',
  description: 'Bold, minimal design for digital agencies and creative studios.',
  category: 'Creative',
  type: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-white text-black' },
      nodes: ['nav-2', 'hero-2', 'work-2', 'footer-2']
    },
    'nav-2': { type: { resolvedName: 'Navbar' }, props: { size: 'h-20' }, parent: 'ROOT' },
    'hero-2': {
      type: { resolvedName: 'Hero' },
      props: { layout: 'centered', heightPreset: 'full', backgroundColor: '#ffffff', animation: 'fade-in' },
      nodes: ['hero-cont-2'],
      parent: 'ROOT'
    },
    'hero-cont-2': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'text-center max-w-4xl px-6' },
      nodes: ['h2-h-1', 'h2-p-1', 'h2-btn-1'],
      parent: 'hero-2'
    },
    'h2-h-1': { type: { resolvedName: 'Heading' }, props: { text: 'We Build Iconic Digital Brands.', level: 'h1', className: 'text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-10' }, parent: 'hero-cont-2' },
    'h2-p-1': { type: { resolvedName: 'Paragraph' }, props: { text: 'Award-winning design and development for forward-thinking companies worldwide.', className: 'text-xl md:text-2xl font-medium opacity-60 mb-12' }, parent: 'hero-cont-2' },
    'h2-btn-1': { type: { resolvedName: 'UserButton' }, props: { text: 'View Case Studies', variant: 'outline', className: 'rounded-none border-2 border-black px-12 h-16 text-lg' }, parent: 'hero-cont-2' },
    'work-2': { type: { resolvedName: 'Section' }, props: { paddingTop: 120, paddingBottom: 120, paddingTop_mobile: 60, paddingBottom_mobile: 60 }, nodes: ['work-h'], parent: 'ROOT' },
    'work-h': { type: { resolvedName: 'Heading' }, props: { text: 'Selected Work', level: 'h2', className: 'text-3xl md:text-4xl font-black mb-16' }, parent: 'work-2' },
    'footer-2': { type: { resolvedName: 'Footer' }, props: { bg: '#000000', text: '#ffffff' }, parent: 'ROOT' }
  })
};
