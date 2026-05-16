import { BuilderTemplate } from '../templates';

export const luxuryRealEstate: BuilderTemplate = {
  id: 'luxury-real-estate',
  name: 'Elite Living Estates',
  description: 'Elegant, image-heavy design for high-end luxury properties.',
  category: 'Real Estate',
  type: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-[#faf9f6]' },
      nodes: ['hero-3', 'about-3', 'gallery-3', 'footer-3']
    },
    'hero-3': {
      type: { resolvedName: 'Hero' },
      props: { layout: 'background', backgroundImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c', overlayOpacity: 30, heightPreset: 'full' },
      nodes: ['h3-cont'],
      parent: 'ROOT'
    },
    'h3-cont': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'px-6' },
      nodes: ['h3-h', 'h3-p', 'h3-btn'],
      parent: 'hero-3'
    },
    'h3-h': { type: { resolvedName: 'Heading' }, props: { text: 'Unrivaled Luxury.', level: 'h1', className: 'text-white text-5xl md:text-7xl font-serif mb-6' }, parent: 'h3-cont' },
    'h3-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Exclusive listings in the world\'s most prestigious locations.', className: 'text-white/80 text-lg md:text-xl font-light mb-10 tracking-widest uppercase' }, parent: 'h3-cont' },
    'h3-btn': { type: { resolvedName: 'UserButton' }, props: { text: 'Explore Collection', variant: 'outline', className: 'border-white text-white rounded-none h-14 px-10' }, parent: 'h3-cont' },
    'about-3': { type: { resolvedName: 'Section' }, props: { paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 50, paddingBottom_mobile: 50 }, parent: 'ROOT' },
    'gallery-3': { type: { resolvedName: 'Section' }, props: { paddingTop: 80, paddingBottom: 80, backgroundColor: '#ffffff', paddingTop_mobile: 40, paddingBottom_mobile: 40 }, parent: 'ROOT' },
    'footer-3': { type: { resolvedName: 'Footer' }, parent: 'ROOT' }
  })
};
