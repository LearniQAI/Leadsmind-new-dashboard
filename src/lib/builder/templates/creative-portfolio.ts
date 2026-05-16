import { BuilderTemplate } from '../templates';

export const creativePortfolio: BuilderTemplate = {
  id: 'creative-portfolio',
  name: 'Minimalist Portfolio',
  description: 'Clean and artistic portfolio for designers and photographers.',
  category: 'Creative',
  type: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-white text-black' },
      nodes: ['hero-10', 'work-10', 'footer-10']
    },
    'hero-10': {
      type: { resolvedName: 'Hero' },
      props: { layout: 'centered', heightPreset: 'large', backgroundColor: '#ffffff' },
      nodes: ['h10-cont'],
      parent: 'ROOT'
    },
    'h10-cont': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'px-6' }, nodes: ['h10-h', 'h10-p'], parent: 'hero-10' },
    'h10-h': { type: { resolvedName: 'Heading' }, props: { text: 'Less is More.', level: 'h1', className: 'text-6xl md:text-9xl font-black tracking-tighter mb-4' }, parent: 'h10-cont' },
    'h10-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Visual Storyteller & Digital Craftsman.', className: 'text-xl md:text-2xl font-medium tracking-[0.2em] uppercase opacity-40' }, parent: 'h10-cont' },
    'work-10': { type: { resolvedName: 'Section' }, props: { paddingTop: 40, paddingBottom: 40, paddingTop_mobile: 20, paddingBottom_mobile: 20 }, parent: 'ROOT' },
    'footer-10': { type: { resolvedName: 'Footer' }, parent: 'ROOT' }
  })
};
