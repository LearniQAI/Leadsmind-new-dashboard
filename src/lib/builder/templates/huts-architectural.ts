import { BuilderTemplate } from '../templates';

export const hutsArchitectural: BuilderTemplate = {
  id: 'huts-architectural',
  name: 'HUTS Architectural',
  description: 'A serene, nature-focused template for architectural studios and property developers.',
  category: 'Real Estate',
  type: 'website',
  is_premium: true,
  thumbnail: 'https://images.unsplash.com/photo-1500382017468-9049fee74a62',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-[#fdfcf2] font-serif text-[#0c2d22]' },
      nodes: ['hero-huts', 'intro-huts', 'story-1-huts', 'gallery-huts', 'showcase-huts', 'stats-huts', 'footer-huts']
    },
    'hero-huts': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { backgroundImage: 'https://images.unsplash.com/photo-1510627489930-0c1b0ba8fa61', heightPreset: 'large', overlayColor: 'rgba(0,0,0,0.2)', padding: 0 },
      nodes: ['hero-content-huts'],
      parent: 'ROOT'
    },
    'hero-content-huts': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex items-center justify-center h-full text-center p-6' },
      nodes: ['hero-h-huts'],
      parent: 'hero-huts'
    },
    'hero-h-huts': { type: { resolvedName: 'Heading' }, props: { text: 'The easy way to find, land and develop a property in the country.', level: 'h1', fontSize: 64, fontSize_mobile: 32, color: '#ffffff', className: 'max-w-4xl leading-tight tracking-tight' }, parent: 'hero-content-huts' },

    'intro-huts': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { padding: 80, padding_mobile: 40, backgroundColor: 'transparent' },
      nodes: ['intro-h-huts', 'intro-grid-huts'],
      parent: 'ROOT'
    },
    'intro-h-huts': { type: { resolvedName: 'Heading' }, props: { text: 'Whatever type of place you have in mind.', level: 'h2', fontSize: 32, fontSize_mobile: 24, className: 'text-center mb-20 opacity-80' }, parent: 'intro-huts' },
    'intro-grid-huts': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '3', gap: 40 },
      nodes: ['intro-col-1', 'intro-col-2', 'intro-col-3'],
      parent: 'intro-huts'
    },
    'intro-col-1': { type: { resolvedName: 'Container' }, isCanvas: true, nodes: ['i-img-1', 'i-t-1'], parent: 'intro-grid-huts' },
    'i-img-1': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1544911845-1f34a3eb46b1', height: 200, objectFit: 'contain', backgroundColor: 'transparent' }, parent: 'intro-col-1' },
    'i-t-1': { type: { resolvedName: 'Heading' }, props: { text: 'The Chalet', level: 'h4', fontSize: 16, className: 'text-center mt-6 uppercase tracking-widest' }, parent: 'intro-col-1' },
    'intro-col-2': { type: { resolvedName: 'Container' }, isCanvas: true, nodes: ['i-img-2', 'i-t-2'], parent: 'intro-grid-huts' },
    'i-img-2': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233', height: 200, objectFit: 'contain', backgroundColor: 'transparent' }, parent: 'intro-col-2' },
    'i-t-2': { type: { resolvedName: 'Heading' }, props: { text: 'The Cabin', level: 'h4', fontSize: 16, className: 'text-center mt-6 uppercase tracking-widest' }, parent: 'intro-col-2' },
    'intro-col-3': { type: { resolvedName: 'Container' }, isCanvas: true, nodes: ['i-img-3', 'i-t-3'], parent: 'intro-grid-huts' },
    'i-img-3': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1449156001437-3a16d1dfbe23', height: 200, objectFit: 'contain', backgroundColor: 'transparent' }, parent: 'intro-col-3' },
    'i-t-3': { type: { resolvedName: 'Heading' }, props: { text: 'The Cottage', level: 'h4', fontSize: 16, className: 'text-center mt-6 uppercase tracking-widest' }, parent: 'intro-col-3' },

    'story-1-huts': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { padding: 100, padding_mobile: 40 },
      nodes: ['story-grid-1'],
      parent: 'ROOT'
    },
    'story-grid-1': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '2', gap: 60 },
      nodes: ['s-col-1-img', 's-col-1-txt'],
      parent: 'story-1-huts'
    },
    's-col-1-img': { type: { resolvedName: 'Container' }, isCanvas: true, nodes: ['story-img-1'], parent: 'story-grid-1' },
    'story-img-1': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1472233310560-14e88f26343c', height: 500, borderRadius: 20, objectFit: 'cover' }, parent: 's-col-1-img' },
    's-col-1-txt': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex flex-col justify-center' },
      nodes: ['story-h-1', 'story-p-1'],
      parent: 'story-grid-1'
    },
    'story-h-1': { type: { resolvedName: 'Heading' }, props: { text: 'Property discovery and due diligence.', level: 'h3', fontSize: 28, className: 'mb-6 leading-snug' }, parent: 's-col-1-txt' },
    'story-p-1': { type: { resolvedName: 'Paragraph' }, props: { text: 'We help you find the right land, evaluate its potential, and manage the complex process of rural property development from day one.', className: 'text-lg opacity-70 leading-relaxed' }, parent: 's-col-1-txt' },

    'gallery-huts': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { padding: 80, padding_mobile: 40 },
      nodes: ['gal-h-huts', 'gal-grid-huts'],
      parent: 'ROOT'
    },
    'gal-h-huts': { type: { resolvedName: 'Heading' }, props: { text: 'Recent Huts on the Boards...', level: 'h2', fontSize: 32, className: 'text-center mb-16 italic' }, parent: 'gallery-huts' },
    'gal-grid-huts': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '3', gap: 20 },
      nodes: ['g-col-1', 'g-col-2', 'g-col-3'],
      parent: 'gallery-huts'
    },
    'g-col-1': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739', height: 450, objectFit: 'cover', borderRadius: 12 }, parent: 'gal-grid-huts' },
    'g-col-2': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1493666438817-866a91353ca9', height: 450, objectFit: 'cover', borderRadius: 12 }, parent: 'gal-grid-huts' },
    'g-col-3': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e', height: 450, objectFit: 'cover', borderRadius: 12 }, parent: 'gal-grid-huts' },

    'showcase-huts': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { padding: 0 },
      nodes: ['show-1', 'show-2', 'show-3'],
      parent: 'ROOT'
    },
    'show-1': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1505330622279-bf7d7fc918f4', height: 600, objectFit: 'cover' }, parent: 'showcase-huts' },
    'show-2': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b', height: 600, objectFit: 'cover' }, parent: 'showcase-huts' },
    'show-3': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1472393365320-dc7724214495', height: 600, objectFit: 'cover' }, parent: 'showcase-huts' },

    'stats-huts': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { padding: 100, padding_mobile: 60, backgroundColor: 'transparent' },
      nodes: ['stats-grid-huts'],
      parent: 'ROOT'
    },
    'stats-grid-huts': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '2', gap: 60 },
      nodes: ['stat-left', 'stat-right'],
      parent: 'stats-huts'
    },
    'stat-left': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex flex-col gap-12' },
      nodes: ['s-item-1', 's-item-2'],
      parent: 'stats-grid-huts'
    },
    's-item-1': { type: { resolvedName: 'Heading' }, props: { text: '200K +<br/><span style="font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Monthly Active Visitors</span>', level: 'h2', fontSize: 60, fontSize_mobile: 42, className: 'leading-tight' }, parent: 'stat-left' },
    's-item-2': { type: { resolvedName: 'Heading' }, props: { text: '5.0%<br/><span style="font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Conversion Rate</span>', level: 'h2', fontSize: 60, fontSize_mobile: 42, className: 'leading-tight' }, parent: 'stat-left' },
    'stat-right': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex flex-col gap-12' },
      nodes: ['s-item-3', 's-item-4'],
      parent: 'stats-grid-huts'
    },
    's-item-3': { type: { resolvedName: 'Heading' }, props: { text: '18<br/><span style="font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Design Standards</span>', level: 'h2', fontSize: 60, fontSize_mobile: 42, className: 'leading-tight' }, parent: 'stat-right' },
    's-item-4': { type: { resolvedName: 'Heading' }, props: { text: '5,000+<br/><span style="font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Registered Users</span>', level: 'h2', fontSize: 60, fontSize_mobile: 42, className: 'leading-tight' }, parent: 'stat-right' },

    'footer-huts': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { backgroundColor: '#0c2d22', padding: 100, padding_mobile: 60 },
      nodes: ['footer-h-huts'],
      parent: 'ROOT'
    },
    'footer-h-huts': { type: { resolvedName: 'Heading' }, props: { text: 'HUTS', level: 'h1', fontSize: 120, fontSize_mobile: 60, color: '#ffffff', className: 'text-center font-black tracking-tighter opacity-10' }, parent: 'footer-huts' }
  })
};
