import { BuilderTemplate } from '../templates';

export const fitnessPower: BuilderTemplate = {
  id: 'fitness-power',
  name: 'Power Peak Fitness',
  description: 'High-energy landing page for gyms and personal trainers.',
  category: 'Fitness',
  type: 'funnel',
  thumbnail: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-[#111111] text-white' },
      nodes: ['hero-5', 'stats-5', 'pricing-5', 'footer-5']
    },
    'hero-5': {
      type: { resolvedName: 'Hero' },
      props: { layout: 'centered', backgroundColor: '#ff4d00', heightPreset: 'full' },
      nodes: ['h5-cont'],
      parent: 'ROOT'
    },
    'h5-cont': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'px-6' }, nodes: ['h5-h', 'h5-p', 'h5-btn'], parent: 'hero-5' },
    'h5-h': { type: { resolvedName: 'Heading' }, props: { text: 'LIMITS ARE AN ILLUSION.', level: 'h1', className: 'text-5xl md:text-8xl font-black tracking-tighter italic mb-4' }, parent: 'h5-cont' },
    'h5-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Join the elite. Professional coaching for those who refuse to settle.', className: 'text-lg md:text-xl font-bold uppercase mb-10' }, parent: 'h5-cont' },
    'h5-btn': { type: { resolvedName: 'UserButton' }, props: { text: 'Start 7-Day Trial', variant: 'secondary', className: 'bg-white text-black h-16 px-12 rounded-none font-black text-lg' }, parent: 'h5-cont' },
    'stats-5': { type: { resolvedName: 'Section' }, props: { paddingTop: 60, paddingBottom: 60, backgroundColor: '#000000', paddingTop_mobile: 30, paddingBottom_mobile: 30 }, parent: 'ROOT' },
    'pricing-5': { type: { resolvedName: 'PricingTable' }, parent: 'ROOT' },
    'footer-5': { type: { resolvedName: 'Footer' }, parent: 'ROOT' }
  })
};
