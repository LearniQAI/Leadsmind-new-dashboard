import { BuilderTemplate } from '../templates';

export const lifestyleEcommerce: BuilderTemplate = {
  id: 'lifestyle-ecommerce',
  name: 'Vogue Lifestyle Store',
  description: 'Clean and modern storefront for fashion and lifestyle brands, with a real product grid, customer review, and newsletter capture.',
  category: 'E-commerce',
  type: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-white' },
      nodes: ['nav-4', 'hero-4', 'featured-4', 'testimonial-4', 'newsletter-4', 'footer-4']
    },
    'nav-4': {
      type: { resolvedName: 'Navbar' },
      props: {
        brandName: 'VOGUE',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        sticky: true,
        padding: 20,
        showButton: true,
        buttonText: 'Shop Now',
        buttonBg: '#000000',
        buttonTextColor: '#ffffff',
        links: [
          { label: 'New In', href: '#featured' },
          { label: 'Collections', href: '#featured' },
          { label: 'Contact', href: '#contact' }
        ]
      },
      parent: 'ROOT'
    },
    'hero-4': {
      type: { resolvedName: 'Hero' },
      isCanvas: true,
      props: { layout: 'split', backgroundColor: '#f3f4f6', heightPreset: 'large' },
      nodes: ['h4-cont'],
      parent: 'ROOT'
    },
    'h4-cont': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'px-6' }, nodes: ['h4-h', 'h4-p', 'h4-btn'], parent: 'hero-4' },
    'h4-h': { type: { resolvedName: 'Heading' }, props: { text: 'New Season Collection.', level: 'h1', className: 'text-4xl md:text-6xl font-black mb-6 italic' }, parent: 'h4-cont' },
    'h4-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Discover the latest trends in sustainable fashion and accessories.', className: 'text-base md:text-lg opacity-60 mb-8' }, parent: 'h4-cont' },
    'h4-btn': { type: { resolvedName: 'UserButton' }, props: { text: 'Shop Now', className: 'rounded-full h-12 px-8' }, parent: 'h4-cont' },

    'featured-4': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { paddingTop: 80, paddingBottom: 80, paddingTop_mobile: 40, paddingBottom_mobile: 40, backgroundColor: '#ffffff' },
      nodes: ['feat-h-4', 'prod-grid-4'],
      parent: 'ROOT'
    },
    'feat-h-4': { type: { resolvedName: 'Heading' }, props: { text: 'Best Sellers', level: 'h2', className: 'text-center text-3xl md:text-4xl font-black mb-16' }, parent: 'featured-4' },
    'prod-grid-4': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '3', gap: 24 },
      nodes: ['prod-1', 'prod-2', 'prod-3'],
      parent: 'featured-4'
    },
    'prod-1': { type: { resolvedName: 'Container' }, isCanvas: true, nodes: ['p1-img', 'p1-h', 'p1-p'], parent: 'prod-grid-4' },
    'p1-img': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d', height: 320, objectFit: 'cover', borderRadius: 12 }, parent: 'prod-1' },
    'p1-h': { type: { resolvedName: 'Heading' }, props: { text: 'Wool Overcoat', level: 'h4', className: 'text-base font-bold mt-4' }, parent: 'prod-1' },
    'p1-p': { type: { resolvedName: 'Paragraph' }, props: { text: '$248', className: 'opacity-60 font-medium' }, parent: 'prod-1' },
    'prod-2': { type: { resolvedName: 'Container' }, isCanvas: true, nodes: ['p2-img', 'p2-h', 'p2-p'], parent: 'prod-grid-4' },
    'p2-img': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1483985988355-763728e1935b', height: 320, objectFit: 'cover', borderRadius: 12 }, parent: 'prod-2' },
    'p2-h': { type: { resolvedName: 'Heading' }, props: { text: 'Leather Tote', level: 'h4', className: 'text-base font-bold mt-4' }, parent: 'prod-2' },
    'p2-p': { type: { resolvedName: 'Paragraph' }, props: { text: '$186', className: 'opacity-60 font-medium' }, parent: 'prod-2' },
    'prod-3': { type: { resolvedName: 'Container' }, isCanvas: true, nodes: ['p3-img', 'p3-h', 'p3-p'], parent: 'prod-grid-4' },
    'p3-img': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2', height: 320, objectFit: 'cover', borderRadius: 12 }, parent: 'prod-3' },
    'p3-h': { type: { resolvedName: 'Heading' }, props: { text: 'Suede Ankle Boots', level: 'h4', className: 'text-base font-bold mt-4' }, parent: 'prod-3' },
    'p3-p': { type: { resolvedName: 'Paragraph' }, props: { text: '$212', className: 'opacity-60 font-medium' }, parent: 'prod-3' },

    'testimonial-4': {
      type: { resolvedName: 'Testimonial' },
      props: {
        quote: 'The quality is unmatched and shipping was incredibly fast. My overcoat gets compliments every single time I wear it.',
        author: 'Isabelle Fontaine',
        title: 'Verified Buyer',
        image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
        backgroundColor: '#f3f4f6',
        textColor: '#111827',
        accentColor: '#000000',
        borderRadius: 24,
        padding: 48,
        textAlign: 'center',
        borderOpacity: 10
      },
      parent: 'ROOT'
    },

    'newsletter-4': {
      type: { resolvedName: 'Form' },
      props: {
        title: 'Get 10% off your first order',
        buttonText: 'Subscribe',
        backgroundColor: '#000000',
        borderRadius: 0,
        padding: 48,
        gap: 12,
        labelColor: '#ffffff',
        inputBg: '#1a1a1a',
        inputBorderColor: '#333333',
        inputTextColor: '#ffffff',
        buttonBg: '#ffffff',
        buttonTextColor: '#000000',
        fields: [
          { id: 'email', type: 'email', label: 'Email address', placeholder: 'you@email.com', required: true, mapping: 'email' }
        ]
      },
      parent: 'ROOT'
    },

    'footer-4': {
      type: { resolvedName: 'Footer' },
      props: {
        brandName: 'VOGUE',
        description: 'Sustainable fashion and accessories, made to last.',
        backgroundColor: '#111111',
        textColor: '#ffffff',
        accentColor: '#ffffff',
        columns: [
          { title: 'Shop', links: [{ label: 'Best Sellers', href: '#featured' }, { label: 'New In', href: '#featured' }] },
          { title: 'Support', links: [{ label: 'Contact', href: 'mailto:support@voguestore.com' }, { label: 'Shipping', href: '#' }] }
        ]
      },
      parent: 'ROOT'
    }
  })
};
