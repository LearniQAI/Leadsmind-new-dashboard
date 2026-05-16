import { BuilderTemplate } from '../templates';

export const aiSaasPremium: BuilderTemplate = {
  id: 'ai-saas-premium',
  name: 'Neural AI SaaS',
  description: 'Ultra-dark high-tech landing page for AI and SaaS platforms.',
  category: 'SaaS',
  type: 'both',
  is_premium: true,
  thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-[#050508] text-white' },
      nodes: ['hero-1', 'logos-1', 'features-1', 'pricing-1', 'faq-1', 'footer-1']
    },
    'hero-1': {
      type: { resolvedName: 'Hero' },
      props: { layout: 'split', heightPreset: 'large', backgroundColor: 'transparent', animation: 'slide-up', useGlassmorphism: true },
      nodes: ['hero-content-1'],
      parent: 'ROOT'
    },
    'hero-content-1': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'p-4' },
      nodes: ['hero-h-1', 'hero-p-1', 'hero-btn-1'],
      parent: 'hero-1'
    },
    'hero-h-1': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Intelligence Redefined.', level: 'h1', className: 'text-4xl md:text-7xl font-black tracking-tighter mb-6 bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent' },
      parent: 'hero-content-1'
    },
    'hero-p-1': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Deploy neural-scale infrastructure in seconds. The most powerful AI workspace for modern engineering teams.', className: 'text-lg md:text-xl text-white/60 mb-10 max-w-xl' },
      parent: 'hero-content-1'
    },
    'hero-btn-1': {
      type: { resolvedName: 'UserButton' },
      props: { text: 'Initialize System', size: 'lg', variant: 'primary', className: 'h-14 px-10' },
      parent: 'hero-content-1'
    },
    'logos-1': {
      type: { resolvedName: 'LogoStrip' },
      props: { title: 'Trusted by the future', grayscale: true },
      parent: 'ROOT'
    },
    'features-1': {
      type: { resolvedName: 'Section' },
      props: { backgroundColor: '#0a0a12', paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 50, paddingBottom_mobile: 50 },
      nodes: ['feat-h-1', 'feat-grid-1'],
      parent: 'ROOT'
    },
    'feat-h-1': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Core Capabilities', level: 'h2', className: 'text-center text-3xl md:text-4xl font-black mb-12 md:mb-20 uppercase tracking-widest' },
      parent: 'features-1'
    },
    'feat-grid-1': {
      type: { resolvedName: 'Columns' },
      props: { columns: 3, gap: 40 },
      parent: 'features-1'
    },
    'pricing-1': {
      type: { resolvedName: 'PricingTable' },
      props: { title: 'Scalable Investment', subtitle: 'Choose your compute tier' },
      parent: 'ROOT'
    },
    'faq-1': {
      type: { resolvedName: 'FAQ' },
      props: { title: 'System Queries' },
      parent: 'ROOT'
    },
    'footer-1': {
      type: { resolvedName: 'Footer' },
      props: { layout: 'between' },
      parent: 'ROOT'
    }
  })
};
