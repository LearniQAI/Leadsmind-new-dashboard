import { BuilderTemplate } from '../templates';

export const eventConference: BuilderTemplate = {
  id: 'event-conference',
  name: 'Nexus Tech Summit',
  description: 'Modern event landing page with countdown, featured speakers, sponsor logos, and ticket tiers.',
  category: 'Events',
  type: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-[#050505] text-white' },
      nodes: ['nav-9', 'hero-9', 'countdown-9', 'speakers-9', 'logos-9', 'pricing-9', 'testimonial-9', 'footer-9']
    },
    'nav-9': {
      type: { resolvedName: 'Navbar' },
      props: {
        brandName: 'NEXUS SUMMIT',
        backgroundColor: '#050505',
        textColor: '#ffffff',
        sticky: true,
        padding: 18,
        showButton: true,
        buttonText: 'Get Your Pass',
        buttonBg: '#6366f1',
        buttonTextColor: '#ffffff',
        links: [
          { label: 'Speakers', href: '#speakers' },
          { label: 'Tickets', href: '#tickets' },
          { label: 'Sponsors', href: '#sponsors' }
        ]
      },
      parent: 'ROOT'
    },
    'hero-9': {
      type: { resolvedName: 'Hero' },
      isCanvas: true,
      props: { layout: 'background', backgroundImage: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678', overlayOpacity: 60, heightPreset: 'full' },
      nodes: ['h9-cont'],
      parent: 'ROOT'
    },
    'h9-cont': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'px-6' }, nodes: ['h9-h', 'h9-p', 'h9-btn'], parent: 'hero-9' },
    'h9-h': { type: { resolvedName: 'Heading' }, props: { text: 'The Nexus Summit 2026', level: 'h1', className: 'text-5xl md:text-8xl font-black tracking-tighter text-center' }, parent: 'h9-cont' },
    'h9-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Silicon Valley | Oct 12-14 | The Future of Neural Engineering', className: 'text-lg md:text-xl font-bold tracking-[0.4em] text-primary text-center mb-12' }, parent: 'h9-cont' },
    'h9-btn': { type: { resolvedName: 'UserButton' }, props: { text: 'Get Your Pass', size: 'lg', className: 'rounded-full mx-auto' }, parent: 'h9-cont' },

    'countdown-9': { type: { resolvedName: 'Countdown' }, props: { title: 'Doors open in', endDate: '2026-10-12T09:00:00.000Z' }, parent: 'ROOT' },

    'speakers-9': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 50, paddingBottom_mobile: 50, backgroundColor: '#0a0a0a' },
      nodes: ['sp-h-9', 'sp-grid-9'],
      parent: 'ROOT'
    },
    'sp-h-9': { type: { resolvedName: 'Heading' }, props: { text: 'Featured Speakers', level: 'h2', color: '#ffffff', className: 'text-center text-3xl md:text-4xl font-black mb-16' }, parent: 'speakers-9' },
    'sp-grid-9': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '3', gap: 32 },
      nodes: ['sp-col-1', 'sp-col-2', 'sp-col-3'],
      parent: 'speakers-9'
    },
    'sp-col-1': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'text-center' }, nodes: ['sp1-img', 'sp1-h', 'sp1-p'], parent: 'sp-grid-9' },
    'sp1-img': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1560250097-0b93528c311a', height: 260, objectFit: 'cover', borderRadius: 16 }, parent: 'sp-col-1' },
    'sp1-h': { type: { resolvedName: 'Heading' }, props: { text: 'Dr. Elena Voss', level: 'h4', color: '#ffffff', className: 'text-lg font-bold mt-4' }, parent: 'sp-col-1' },
    'sp1-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Chief AI Scientist, Orbital Labs', color: '#a1a1aa', className: 'text-sm' }, parent: 'sp-col-1' },
    'sp-col-2': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'text-center' }, nodes: ['sp2-img', 'sp2-h', 'sp2-p'], parent: 'sp-grid-9' },
    'sp2-img': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e', height: 260, objectFit: 'cover', borderRadius: 16 }, parent: 'sp-col-2' },
    'sp2-h': { type: { resolvedName: 'Heading' }, props: { text: 'Marcus Chen', level: 'h4', color: '#ffffff', className: 'text-lg font-bold mt-4' }, parent: 'sp-col-2' },
    'sp2-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'VP Engineering, Halcyon', color: '#a1a1aa', className: 'text-sm' }, parent: 'sp-col-2' },
    'sp-col-3': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'text-center' }, nodes: ['sp3-img', 'sp3-h', 'sp3-p'], parent: 'sp-grid-9' },
    'sp3-img': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e', height: 260, objectFit: 'cover', borderRadius: 16 }, parent: 'sp-col-3' },
    'sp3-h': { type: { resolvedName: 'Heading' }, props: { text: 'Dr. Amara Osei', level: 'h4', color: '#ffffff', className: 'text-lg font-bold mt-4' }, parent: 'sp-col-3' },
    'sp3-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Founder, Northwind AI', color: '#a1a1aa', className: 'text-sm' }, parent: 'sp-col-3' },

    'logos-9': {
      type: { resolvedName: 'LogoStrip' },
      props: {
        title: 'Backed by',
        grayscale: true,
        backgroundColor: '#050505',
        logos: [
          { src: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=200&auto=format&fit=crop', alt: 'Orbital Labs' },
          { src: 'https://images.unsplash.com/photo-1622675363311-3e1904dc1885?q=80&w=200&auto=format&fit=crop', alt: 'Vertex' },
          { src: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=200&auto=format&fit=crop', alt: 'Halcyon' },
          { src: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=200&auto=format&fit=crop', alt: 'Northwind' }
        ]
      },
      parent: 'ROOT'
    },

    'pricing-9': {
      type: { resolvedName: 'PricingTable' },
      props: {
        title: 'Ticket Tiers',
        primaryColor: '#6366f1',
        accentColor: '#f59e0b',
        backgroundColor: 'transparent',
        textColor: '#ffffff',
        plans: [
          { name: 'General', price: '$399', period: '', description: 'Full 3-day access to all sessions', features: ['All keynotes', 'Expo floor access', 'Networking events'], buttonText: 'Get Ticket', highlight: false },
          { name: 'VIP', price: '$999', period: '', description: 'Front-row access plus exclusive perks', features: ['Everything in General', 'Speaker meet & greet', 'VIP lounge access', 'Recorded session library'], buttonText: 'Get VIP Ticket', highlight: true }
        ]
      },
      parent: 'ROOT'
    },

    'testimonial-9': {
      type: { resolvedName: 'Testimonial' },
      props: {
        quote: 'Nexus Summit is where the real conversations happen. I left with three partnerships that shaped the next year of our roadmap.',
        author: 'Jordan Blake',
        title: 'CTO, Fathom Systems',
        image: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e',
        backgroundColor: '#111111',
        textColor: '#ffffff',
        accentColor: '#6366f1',
        borderRadius: 24,
        padding: 48,
        textAlign: 'center',
        borderOpacity: 15
      },
      parent: 'ROOT'
    },

    'footer-9': {
      type: { resolvedName: 'Footer' },
      props: {
        brandName: 'NEXUS SUMMIT',
        description: 'Silicon Valley | Oct 12-14, 2026',
        backgroundColor: '#000000',
        textColor: '#ffffff',
        accentColor: '#6366f1',
        columns: [
          { title: 'Event', links: [{ label: 'Speakers', href: '#speakers' }, { label: 'Tickets', href: '#tickets' }] },
          { title: 'Info', links: [{ label: 'Sponsors', href: '#sponsors' }, { label: 'Contact', href: 'mailto:hello@nexussummit.dev' }] }
        ]
      },
      parent: 'ROOT'
    }
  })
};
