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
      props: {
        title: 'Trusted by the future',
        grayscale: true,
        logos: [
          { src: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=200&auto=format&fit=crop', alt: 'Orbital' },
          { src: 'https://images.unsplash.com/photo-1622675363311-3e1904dc1885?q=80&w=200&auto=format&fit=crop', alt: 'Vertex Labs' },
          { src: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=200&auto=format&fit=crop', alt: 'Halcyon' },
          { src: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=200&auto=format&fit=crop', alt: 'Northwind' },
          { src: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?q=80&w=200&auto=format&fit=crop', alt: 'Fathom' }
        ]
      },
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
      isCanvas: true,
      props: { layout: '3', gap: 40 },
      nodes: ['feat-col-1', 'feat-col-2', 'feat-col-3'],
      parent: 'features-1'
    },
    'feat-col-1': { type: { resolvedName: 'Container' }, isCanvas: true, nodes: ['feat-1-h', 'feat-1-p'], parent: 'feat-grid-1' },
    'feat-1-h': { type: { resolvedName: 'Heading' }, props: { text: 'Neural Inference', level: 'h3', color: '#ffffff', className: 'text-xl font-bold mb-3' }, parent: 'feat-col-1' },
    'feat-1-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Sub-10ms inference latency across a globally distributed edge network.', color: '#a1a1aa' }, parent: 'feat-col-1' },
    'feat-col-2': { type: { resolvedName: 'Container' }, isCanvas: true, nodes: ['feat-2-h', 'feat-2-p'], parent: 'feat-grid-1' },
    'feat-2-h': { type: { resolvedName: 'Heading' }, props: { text: 'Elastic Compute', level: 'h3', color: '#ffffff', className: 'text-xl font-bold mb-3' }, parent: 'feat-col-2' },
    'feat-2-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Autoscale from zero to thousands of GPU nodes with a single API call.', color: '#a1a1aa' }, parent: 'feat-col-2' },
    'feat-col-3': { type: { resolvedName: 'Container' }, isCanvas: true, nodes: ['feat-3-h', 'feat-3-p'], parent: 'feat-grid-1' },
    'feat-3-h': { type: { resolvedName: 'Heading' }, props: { text: 'Observability', level: 'h3', color: '#ffffff', className: 'text-xl font-bold mb-3' }, parent: 'feat-col-3' },
    'feat-3-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Real-time tracing and cost attribution for every model call your team makes.', color: '#a1a1aa' }, parent: 'feat-col-3' },
    'pricing-1': {
      type: { resolvedName: 'PricingTable' },
      props: {
        title: 'Scalable Investment',
        subtitle: 'Choose your compute tier',
        plans: [
          { name: 'Starter', price: '$0', period: '/mo', description: 'For solo builders testing the platform', features: ['1 GPU node', 'Community support', '10K inference calls/mo'], buttonText: 'Start free', highlight: false },
          { name: 'Scale', price: '$249', period: '/mo', description: 'For growing engineering teams', features: ['20 GPU nodes', 'Priority support', 'Unlimited inference calls', 'Custom model hosting'], buttonText: 'Start trial', highlight: true },
          { name: 'Enterprise', price: 'Custom', period: '', description: 'For organizations at scale', features: ['Dedicated infrastructure', '24/7 support', 'SLA guarantees', 'Onboarding engineer'], buttonText: 'Contact sales', highlight: false }
        ]
      },
      parent: 'ROOT'
    },
    'faq-1': {
      type: { resolvedName: 'FAQ' },
      props: {
        title: 'System Queries',
        items: [
          { question: 'How fast can I deploy a model?', answer: 'Most teams go from signup to a live inference endpoint in under five minutes using our CLI or dashboard.' },
          { question: 'Do you support custom model weights?', answer: 'Yes — upload your own fine-tuned weights or bring a model from Hugging Face, and we handle the serving infrastructure.' },
          { question: 'What happens if I exceed my plan limits?', answer: 'We automatically scale compute to meet demand; you\'ll only be billed for what you actually use beyond your plan\'s included quota.' },
          { question: 'Is there a self-hosted option?', answer: 'Enterprise customers can deploy Neural AI SaaS inside their own VPC for full data residency and compliance control.' }
        ]
      },
      parent: 'ROOT'
    },
    'footer-1': {
      type: { resolvedName: 'Footer' },
      props: { layout: 'between' },
      parent: 'ROOT'
    }
  })
};
