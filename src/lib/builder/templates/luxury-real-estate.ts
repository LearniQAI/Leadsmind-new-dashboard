import { BuilderTemplate } from '../templates';

export const luxuryRealEstate: BuilderTemplate = {
  id: 'luxury-real-estate',
  name: 'Elite Living Estates',
  description: 'Elegant, image-heavy design for high-end luxury properties, with a real about section, gallery, and agent testimonial.',
  category: 'Real Estate',
  type: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-[#faf9f6]' },
      nodes: ['nav-3', 'hero-3', 'about-3', 'gallery-3', 'stats-3', 'testimonial-3', 'footer-3']
    },
    'nav-3': {
      type: { resolvedName: 'Navbar' },
      props: {
        brandName: 'ELITE LIVING',
        backgroundColor: '#faf9f6',
        textColor: '#0c0c0c',
        sticky: true,
        padding: 20,
        showButton: true,
        buttonText: 'Schedule a Viewing',
        buttonBg: '#0c0c0c',
        buttonTextColor: '#ffffff',
        links: [
          { label: 'Listings', href: '#gallery' },
          { label: 'About', href: '#about' },
          { label: 'Contact', href: '#contact' }
        ]
      },
      parent: 'ROOT'
    },
    'hero-3': {
      type: { resolvedName: 'Hero' },
      isCanvas: true,
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
    'h3-h': { type: { resolvedName: 'Heading' }, props: { text: 'Unrivaled Luxury.', level: 'h1', className: 'text-white text-5xl md:text-7xl font-serif mb-6 text-center' }, parent: 'h3-cont' },
    'h3-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Exclusive listings in the world\'s most prestigious locations.', className: 'text-white/80 text-lg md:text-xl font-light mb-10 tracking-widest uppercase text-center' }, parent: 'h3-cont' },
    'h3-btn': { type: { resolvedName: 'UserButton' }, props: { text: 'Explore Collection', variant: 'outline', className: 'border-white text-white rounded-none h-14 px-10 mx-auto' }, parent: 'h3-cont' },

    'about-3': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 50, paddingBottom_mobile: 50, backgroundColor: '#faf9f6' },
      nodes: ['about-grid-3'],
      parent: 'ROOT'
    },
    'about-grid-3': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '2', gap: 60 },
      nodes: ['about-txt-3', 'about-img-3'],
      parent: 'about-3'
    },
    'about-txt-3': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'flex flex-col justify-center px-6' }, nodes: ['about-h-3', 'about-p-3'], parent: 'about-grid-3' },
    'about-h-3': { type: { resolvedName: 'Heading' }, props: { text: 'Three decades of discretion.', level: 'h3', className: 'text-3xl md:text-4xl font-serif mb-6' }, parent: 'about-txt-3' },
    'about-p-3': { type: { resolvedName: 'Paragraph' }, props: { text: 'We represent a curated portfolio of the finest estates, working privately with buyers and sellers who value discretion as much as design.', className: 'text-lg opacity-70 leading-relaxed font-light' }, parent: 'about-txt-3' },
    'about-img-3': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1613977257363-707ba9348227', height: 460, objectFit: 'cover', borderRadius: 0 }, parent: 'about-grid-3' },

    'gallery-3': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { paddingTop: 0, paddingBottom: 0, backgroundColor: '#ffffff' },
      nodes: ['gal-grid-3'],
      parent: 'ROOT'
    },
    'gal-grid-3': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '3', gap: 0 },
      nodes: ['gal-1', 'gal-2', 'gal-3'],
      parent: 'gallery-3'
    },
    'gal-1': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994', height: 380, objectFit: 'cover', borderRadius: 0 }, parent: 'gal-grid-3' },
    'gal-2': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914', height: 380, objectFit: 'cover', borderRadius: 0 }, parent: 'gal-grid-3' },
    'gal-3': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c', height: 380, objectFit: 'cover', borderRadius: 0 }, parent: 'gal-grid-3' },

    'stats-3': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { paddingTop: 80, paddingBottom: 80, backgroundColor: '#0c0c0c' },
      nodes: ['stats-grid-3'],
      parent: 'ROOT'
    },
    'stats-grid-3': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '3', gap: 32 },
      nodes: ['rs-1', 'rs-2', 'rs-3'],
      parent: 'stats-3'
    },
    'rs-1': { type: { resolvedName: 'Heading' }, props: { text: '$2.4B+<br/><span style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: .6;">Properties Sold</span>', level: 'h2', color: '#ffffff', fontSize: 42, fontSize_mobile: 28, className: 'text-center leading-tight' }, parent: 'stats-grid-3' },
    'rs-2': { type: { resolvedName: 'Heading' }, props: { text: '30 Years<br/><span style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: .6;">Of Experience</span>', level: 'h2', color: '#ffffff', fontSize: 42, fontSize_mobile: 28, className: 'text-center leading-tight' }, parent: 'stats-grid-3' },
    'rs-3': { type: { resolvedName: 'Heading' }, props: { text: '150+<br/><span style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: .6;">Private Clients</span>', level: 'h2', color: '#ffffff', fontSize: 42, fontSize_mobile: 28, className: 'text-center leading-tight' }, parent: 'stats-grid-3' },

    'testimonial-3': {
      type: { resolvedName: 'Testimonial' },
      props: {
        quote: 'Elite Living found us a property that wasn\'t even publicly listed and handled the entire negotiation with total discretion. Exceptional service.',
        author: 'Alexandra Moreau',
        title: 'Private Client',
        image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
        backgroundColor: '#faf9f6',
        textColor: '#0c0c0c',
        accentColor: '#0c0c0c',
        borderRadius: 0,
        padding: 48,
        textAlign: 'center',
        borderOpacity: 10
      },
      parent: 'ROOT'
    },

    'footer-3': {
      type: { resolvedName: 'Footer' },
      props: {
        brandName: 'ELITE LIVING',
        description: 'Exclusive listings in the world\'s most prestigious locations.',
        backgroundColor: '#0c0c0c',
        textColor: '#ffffff',
        accentColor: '#ffffff',
        columns: [
          { title: 'Listings', links: [{ label: 'Gallery', href: '#gallery' }, { label: 'About', href: '#about' }] },
          { title: 'Contact', links: [{ label: 'Schedule a viewing', href: '#contact' }, { label: 'Email', href: 'mailto:private@eliteliving.com' }] }
        ]
      },
      parent: 'ROOT'
    }
  })
};
