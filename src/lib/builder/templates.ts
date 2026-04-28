export interface BuilderTemplate {
  id: string;
  name: string;
  description: string;
  category: 'website' | 'funnel' | 'both';
  thumbnail?: string;
  preview_image?: string; // Support both naming conventions
  content: string; // CraftJS JSON
}

const BLANK_PAGE = '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}';

export const BUILDER_TEMPLATES: BuilderTemplate[] = [
  {
    id: 'ai-saas',
    name: 'AI SaaS Premium',
    description: 'Dark-themed high-conversion landing page for AI startups.',
    category: 'both',
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995',
    content: JSON.stringify({
      ROOT: {
        type: { resolvedName: 'Container' },
        isCanvas: true,
        props: { className: 'min-h-screen bg-[#050505] text-white' },
        nodes: ['hero-node', 'feature-node']
      },
      'hero-node': {
        type: { resolvedName: 'Hero' },
        props: { 
            title: 'Build the Future with AI', 
            subtitle: 'Deploy intelligent agents in seconds with our ultra-premium infrastructure.',
            ctaText: 'Start Building',
            variant: 'center'
        },
        parent: 'ROOT'
      },
      'feature-node': {
          type: { resolvedName: 'Section' },
          props: { className: 'py-24 px-4 bg-white/5' },
          nodes: ['feature-heading'],
          parent: 'ROOT'
      },
      'feature-heading': {
          type: { resolvedName: 'Heading' },
          props: { text: 'Enterprise Grade Intelligence', level: 'h2', className: 'text-center text-4xl font-bold mb-12' },
          parent: 'feature-node'
      }
    })
  },
  {
    id: 'luxury-real-estate',
    name: 'Luxury Real Estate',
    description: 'Elegant, image-heavy design for high-end properties.',
    category: 'website',
    thumbnail: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
    content: JSON.stringify({
      ROOT: {
        type: { resolvedName: 'Container' },
        isCanvas: true,
        props: { className: 'min-h-screen bg-white text-slate-900' },
        nodes: ['hero-node']
      },
      'hero-node': {
        type: { resolvedName: 'Hero' },
        props: { 
            title: 'The Art of Living', 
            subtitle: 'Exclusive properties for the most discerning clients.',
            ctaText: 'View Collection',
            className: 'bg-slate-50'
        },
        parent: 'ROOT'
      }
    })
  },
  {
    id: 'digital-agency',
    name: 'Modern Agency',
    description: 'Clean, bold design for creative and digital agencies.',
    category: 'website',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
    content: JSON.stringify({
      ROOT: {
        type: { resolvedName: 'Container' },
        isCanvas: true,
        props: { className: 'min-h-screen bg-white' },
        nodes: ['hero-node']
      },
      'hero-node': {
        type: { resolvedName: 'Hero' },
        props: { 
            title: 'We Design. We Build.', 
            subtitle: 'Helping brands grow through digital excellence and creative strategy.',
            ctaText: 'Our Work'
        },
        parent: 'ROOT'
      }
    })
  },
  {
    id: 'ecommerce-brand',
    name: 'E-commerce Storefront',
    description: 'Perfect for lifestyle brands and boutique stores.',
    category: 'website',
    thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8',
    content: JSON.stringify({
      ROOT: {
        type: { resolvedName: 'Container' },
        isCanvas: true,
        props: { className: 'min-h-screen bg-white' },
        nodes: ['hero-node']
      },
      'hero-node': {
        type: { resolvedName: 'Hero' },
        props: { 
            title: 'Summer Collection 2026', 
            subtitle: 'Sustainable fashion designed for comfort and style.',
            ctaText: 'Shop Now'
        },
        parent: 'ROOT'
      }
    })
  },
  {
    id: 'professional-portfolio',
    name: 'Modern Portfolio',
    description: 'Sleek dark-mode portfolio for developers and designers.',
    category: 'both',
    thumbnail: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5',
    content: JSON.stringify({
      ROOT: {
        type: { resolvedName: 'Container' },
        isCanvas: true,
        props: { className: 'min-h-screen bg-slate-950 text-white' },
        nodes: ['hero-node']
      },
      'hero-node': {
        type: { resolvedName: 'Hero' },
        props: { 
            title: "I'm a Full-Stack Creator", 
            subtitle: 'Building immersive digital experiences with cutting-edge tech.',
            ctaText: 'Let\'s Talk'
        },
        parent: 'ROOT'
      }
    })
  }
];

export const getTemplateById = (id: string) => BUILDER_TEMPLATES.find(t => t.id === id);
