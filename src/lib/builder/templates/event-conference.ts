import { BuilderTemplate } from '../templates';

export const eventConference: BuilderTemplate = {
  id: 'event-conference',
  name: 'Nexus Tech Summit',
  description: 'Modern event landing page with countdown and ticket tiers.',
  category: 'Events',
  type: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1540575861501-7ad0582373f2',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-[#050505] text-white' },
      nodes: ['hero-9', 'countdown-9', 'pricing-9', 'footer-9']
    },
    'hero-9': {
      type: { resolvedName: 'Hero' },
      props: { layout: 'background', backgroundImage: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678', overlayOpacity: 60, heightPreset: 'full' },
      nodes: ['h9-cont'],
      parent: 'ROOT'
    },
    'h9-cont': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'px-6' }, nodes: ['h9-h', 'h9-p', 'h9-btn'], parent: 'hero-9' },
    'h9-h': { type: { resolvedName: 'Heading' }, props: { text: 'The Nexus Summit 2026', level: 'h1', className: 'text-5xl md:text-8xl font-black tracking-tighter text-center' }, parent: 'h9-cont' },
    'h9-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Silicon Valley | Oct 12-14 | The Future of Neural Engineering', className: 'text-lg md:text-xl font-bold tracking-[0.4em] text-primary text-center mb-12' }, parent: 'h9-cont' },
    'h9-btn': { type: { resolvedName: 'UserButton' }, props: { text: 'Get Your Pass', size: 'lg', className: 'rounded-full' }, parent: 'h9-cont' },
    'countdown-9': { type: { resolvedName: 'Countdown' }, props: { endDate: '2026-10-12' }, parent: 'ROOT' },
    'pricing-9': { type: { resolvedName: 'PricingTable' }, props: { title: 'Ticket Tiers' }, parent: 'ROOT' },
    'footer-9': { type: { resolvedName: 'Footer' }, parent: 'ROOT' }
  })
};
