import { BuilderTemplate } from '../templates';

export const lifestyleEcommerce: BuilderTemplate = {
  id: 'lifestyle-ecommerce',
  name: 'Vogue Lifestyle Store',
  description: 'Clean and modern storefront for fashion and lifestyle brands.',
  category: 'E-commerce',
  type: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-white' },
      nodes: ['nav-4', 'hero-4', 'featured-4', 'footer-4']
    },
    'nav-4': { type: { resolvedName: 'Navbar' }, parent: 'ROOT' },
    'hero-4': {
      type: { resolvedName: 'Hero' },
      props: { layout: 'split', backgroundColor: '#f3f4f6', heightPreset: 'large' },
      nodes: ['h4-cont'],
      parent: 'ROOT'
    },
    'h4-cont': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'px-6' }, nodes: ['h4-h', 'h4-p', 'h4-btn'], parent: 'hero-4' },
    'h4-h': { type: { resolvedName: 'Heading' }, props: { text: 'New Season Collection.', level: 'h1', className: 'text-4xl md:text-6xl font-black mb-6 italic' }, parent: 'h4-cont' },
    'h4-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Discover the latest trends in sustainable fashion and accessories.', className: 'text-base md:text-lg opacity-60 mb-8' }, parent: 'h4-cont' },
    'h4-btn': { type: { resolvedName: 'UserButton' }, props: { text: 'Shop Now', className: 'rounded-full h-12 px-8' }, parent: 'h4-cont' },
    'featured-4': { type: { resolvedName: 'Section' }, props: { paddingTop: 80, paddingBottom: 80, paddingTop_mobile: 40, paddingBottom_mobile: 40 }, parent: 'ROOT' },
    'footer-4': { type: { resolvedName: 'Footer' }, parent: 'ROOT' }
  })
};
