import { BuilderTemplate } from '../templates';

export const fitnessPower: BuilderTemplate = {
  id: 'fitness-power',
  name: 'Power Peak Fitness',
  description: 'High-energy landing page for gyms and personal trainers, with real transformation stats, a client result, and coaching tiers.',
  category: 'Fitness',
  type: 'funnel',
  step_type: 'sales_page',
  thumbnail: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-[#111111] text-white' },
      nodes: ['hero-5', 'stats-5', 'gallery-5', 'testimonial-5', 'pricing-5', 'footer-5']
    },
    'hero-5': {
      type: { resolvedName: 'Hero' },
      isCanvas: true,
      props: { layout: 'centered', backgroundColor: '#ff4d00', heightPreset: 'full' },
      nodes: ['h5-cont'],
      parent: 'ROOT'
    },
    'h5-cont': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'px-6' }, nodes: ['h5-h', 'h5-p', 'h5-btn'], parent: 'hero-5' },
    'h5-h': { type: { resolvedName: 'Heading' }, props: { text: 'LIMITS ARE AN ILLUSION.', level: 'h1', className: 'text-5xl md:text-8xl font-black tracking-tighter italic mb-4' }, parent: 'h5-cont' },
    'h5-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Join the elite. Professional coaching for those who refuse to settle.', className: 'text-lg md:text-xl font-bold uppercase mb-10' }, parent: 'h5-cont' },
    'h5-btn': { type: { resolvedName: 'UserButton' }, props: { text: 'Start 7-Day Trial', variant: 'secondary', className: 'bg-white text-black h-16 px-12 rounded-none font-black text-lg mx-auto' }, parent: 'h5-cont' },

    'stats-5': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { paddingTop: 80, paddingBottom: 80, backgroundColor: '#000000', paddingTop_mobile: 40, paddingBottom_mobile: 40 },
      nodes: ['stats-grid-5'],
      parent: 'ROOT'
    },
    'stats-grid-5': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '4', gap: 24 },
      nodes: ['st-1', 'st-2', 'st-3', 'st-4'],
      parent: 'stats-5'
    },
    'st-1': { type: { resolvedName: 'Heading' }, props: { text: '4,200+<br/><span style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: .6;">Members Trained</span>', level: 'h2', color: '#ffffff', fontSize: 44, fontSize_mobile: 30, className: 'text-center leading-tight' }, parent: 'stats-grid-5' },
    'st-2': { type: { resolvedName: 'Heading' }, props: { text: '92%<br/><span style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: .6;">Goal Completion</span>', level: 'h2', color: '#ff4d00', fontSize: 44, fontSize_mobile: 30, className: 'text-center leading-tight' }, parent: 'stats-grid-5' },
    'st-3': { type: { resolvedName: 'Heading' }, props: { text: '15<br/><span style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: .6;">Certified Coaches</span>', level: 'h2', color: '#ffffff', fontSize: 44, fontSize_mobile: 30, className: 'text-center leading-tight' }, parent: 'stats-grid-5' },
    'st-4': { type: { resolvedName: 'Heading' }, props: { text: '24/7<br/><span style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: .6;">Facility Access</span>', level: 'h2', color: '#ff4d00', fontSize: 44, fontSize_mobile: 30, className: 'text-center leading-tight' }, parent: 'stats-grid-5' },

    'gallery-5': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { paddingTop: 0, paddingBottom: 0 },
      nodes: ['g5-1', 'g5-2', 'g5-3'],
      parent: 'ROOT'
    },
    'g5-1': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5', height: 420, objectFit: 'cover', borderRadius: 0 }, parent: 'gallery-5' },
    'g5-2': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438', height: 420, objectFit: 'cover', borderRadius: 0 }, parent: 'gallery-5' },
    'g5-3': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b', height: 420, objectFit: 'cover', borderRadius: 0 }, parent: 'gallery-5' },

    'testimonial-5': {
      type: { resolvedName: 'Testimonial' },
      props: {
        quote: 'Down 30 pounds and stronger than I\'ve ever been. The coaches here push you past the excuses — that\'s exactly what I needed.',
        author: 'Derek Ramos',
        title: 'Member since 2024',
        image: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5',
        backgroundColor: '#1a1a1a',
        textColor: '#ffffff',
        accentColor: '#ff4d00',
        borderRadius: 0,
        padding: 48,
        textAlign: 'center',
        borderOpacity: 15
      },
      parent: 'ROOT'
    },

    'pricing-5': {
      type: { resolvedName: 'PricingTable' },
      props: {
        primaryColor: '#ff4d00',
        accentColor: '#ffffff',
        backgroundColor: 'transparent',
        textColor: '#ffffff',
        plans: [
          { name: 'Standard', price: '$79', period: '/mo', description: 'Full gym access, self-guided', features: ['24/7 facility access', 'App-based programming', 'Community classes'], buttonText: 'Join Now', highlight: false },
          { name: 'Elite Coaching', price: '$249', period: '/mo', description: 'One-on-one coaching that gets results', features: ['Everything in Standard', 'Weekly 1:1 sessions', 'Custom nutrition plan', 'Direct coach messaging'], buttonText: 'Start 7-Day Trial', highlight: true }
        ]
      },
      parent: 'ROOT'
    },

    'footer-5': {
      type: { resolvedName: 'Footer' },
      props: {
        brandName: 'POWER PEAK',
        description: 'Elite coaching for those who refuse to settle.',
        backgroundColor: '#000000',
        textColor: '#ffffff',
        accentColor: '#ff4d00',
        columns: [
          { title: 'Gym', links: [{ label: 'Membership', href: '#pricing' }, { label: 'Coaches', href: '#' }] },
          { title: 'Connect', links: [{ label: 'Instagram', href: '#' }, { label: 'Contact', href: 'mailto:info@powerpeak.fit' }] }
        ]
      },
      parent: 'ROOT'
    }
  })
};
