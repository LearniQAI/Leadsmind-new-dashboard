import { BuilderTemplate } from '../templates';

export const agenticCopilot: BuilderTemplate = {
  id: 'agentic-copilot',
  name: 'Dayos Agentic Copilot',
  description: 'Clean minimalist high-contrast premium layout for enterprise cognitive automation and copilots.',
  category: 'Enterprise',
  type: 'website',
  is_premium: true,
  thumbnail: '/assets/images/modular_block_graphics.png',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-[#fafafa] text-[#0f0f0f] font-sans antialiased' },
      nodes: ['navbar-1', 'hero-1', 'gap-section-1', 'revolution-section-1', 'mockup-section-1', 'services-section-1', 'footer-1']
    },
    'navbar-1': {
      type: { resolvedName: 'Navbar' },
      props: { logoText: 'Dayos', links: [{ text: 'Home', url: '/' }, { text: 'Features', url: '#features' }, { text: 'About', url: '#about' }], ctaText: 'Book an Intro', className: 'bg-[#fafafa]/80 backdrop-blur-md border-b border-[#0f0f0f]/5' },
      parent: 'ROOT'
    },
    'hero-1': {
      type: { resolvedName: 'Hero' },
      props: { layout: 'split', heightPreset: 'large', backgroundColor: '#f3f3f3', useGlassmorphism: false },
      nodes: ['hero-left-1', 'hero-right-1'],
      parent: 'ROOT'
    },
    'hero-left-1': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'p-8 flex flex-col justify-center' },
      nodes: ['hero-h-1', 'hero-p-1', 'hero-btn-1'],
      parent: 'hero-1'
    },
    'hero-h-1': {
      type: { resolvedName: 'Heading' },
      props: { text: 'AGENTIC COPILOT FOR YOUR ENTERPRISE', level: 'h1', className: 'text-5xl md:text-7xl font-black tracking-tighter mb-6 text-[#0f0f0f] uppercase leading-tight' },
      parent: 'hero-left-1'
    },
    'hero-p-1': {
      type: { resolvedName: 'Paragraph' },
      props: { text: "We're building the first cognitive CRM & web automation copilot tailored for your enterprise business systems. Fast, secure, and infinitely intelligent.", className: 'text-lg text-[#0f0f0f]/60 mb-8 max-w-lg' },
      parent: 'hero-left-1'
    },
    'hero-btn-1': {
      type: { resolvedName: 'UserButton' },
      props: { text: 'Book an Intro ↗', size: 'lg', variant: 'primary', className: 'bg-[#0f0f0f] hover:bg-[#2f2f2f] text-white rounded-none py-4 px-8 uppercase font-bold tracking-wider' },
      parent: 'hero-left-1'
    },
    'hero-right-1': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex items-center justify-center p-8' },
      nodes: ['hero-img-1'],
      parent: 'hero-1'
    },
    'hero-img-1': {
      type: { resolvedName: 'Image' },
      props: { src: '/assets/images/modular_block_graphics.png', alt: 'Modular stack graphics', className: 'max-w-full h-auto rounded-3xl object-contain shadow-2xl' },
      parent: 'hero-right-1'
    },
    'gap-section-1': {
      type: { resolvedName: 'Section' },
      props: { backgroundColor: '#0f0f0f', paddingTop: 80, paddingBottom: 80 },
      nodes: ['gap-cols-1'],
      parent: 'ROOT'
    },
    'gap-cols-1': {
      type: { resolvedName: 'Columns' },
      props: { columns: 3, gap: 40 },
      nodes: ['gap-col-a', 'gap-col-b', 'gap-col-c'],
      parent: 'gap-section-1'
    },
    'gap-col-a': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'p-4 text-center' },
      nodes: ['gap-h-a', 'gap-p-a'],
      parent: 'gap-cols-1'
    },
    'gap-h-a': {
      type: { resolvedName: 'Heading' },
      props: { text: 'AI.', level: 'h3', className: 'text-3xl font-black text-white mb-2 uppercase' },
      parent: 'gap-col-a'
    },
    'gap-p-a': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Intelligent cognitive automation tailored to your unique schema.', className: 'text-sm text-white/60' },
      parent: 'gap-col-a'
    },
    'gap-col-b': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'p-4 text-center' },
      nodes: ['gap-h-b', 'gap-p-b'],
      parent: 'gap-cols-1'
    },
    'gap-h-b': {
      type: { resolvedName: 'Heading' },
      props: { text: 'GAP.', level: 'h3', className: 'text-3xl font-black text-white mb-2 uppercase' },
      parent: 'gap-col-b'
    },
    'gap-p-b': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Bridging legacy manual workflows with modern neural intelligence.', className: 'text-sm text-white/60' },
      parent: 'gap-col-b'
    },
    'gap-col-c': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'p-4 text-center' },
      nodes: ['gap-h-c', 'gap-p-c'],
      parent: 'gap-cols-1'
    },
    'gap-h-c': {
      type: { resolvedName: 'Heading' },
      props: { text: 'CLOSED.', level: 'h3', className: 'text-3xl font-black text-white mb-2 uppercase' },
      parent: 'gap-col-c'
    },
    'gap-p-c': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Unlock instantaneous back-office close speeds and precision routing.', className: 'text-sm text-white/60' },
      parent: 'gap-col-c'
    },
    'revolution-section-1': {
      type: { resolvedName: 'Section' },
      props: { backgroundColor: '#0f0f0f', paddingTop: 100, paddingBottom: 100 },
      nodes: ['rev-cols-1'],
      parent: 'ROOT'
    },
    'rev-cols-1': {
      type: { resolvedName: 'Columns' },
      props: { columns: 2, gap: 60 },
      nodes: ['rev-col-left', 'rev-col-right'],
      parent: 'revolution-section-1'
    },
    'rev-col-left': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex flex-col justify-center' },
      nodes: ['rev-h-1'],
      parent: 'rev-cols-1'
    },
    'rev-h-1': {
      type: { resolvedName: 'Heading' },
      props: { text: "WE'RE REVOLUTIONIZING THE WAY GOOD WORK GETS DONE.", level: 'h2', className: 'text-4xl md:text-5xl font-black text-white leading-tight uppercase' },
      parent: 'rev-col-left'
    },
    'rev-col-right': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex flex-col justify-center' },
      nodes: ['rev-p-1'],
      parent: 'rev-cols-1'
    },
    'rev-p-1': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'By utilizing advanced neural transformers and fine-tuned action models, Dayos runs your most tedious ERP routines in the background with zero latency. No manual close. No data entries. Just speed.', className: 'text-lg text-white/60 leading-relaxed' },
      parent: 'rev-col-right'
    },
    'mockup-section-1': {
      type: { resolvedName: 'Section' },
      props: { backgroundColor: '#0f0f0f', paddingTop: 40, paddingBottom: 100 },
      nodes: ['mockup-h-1', 'mockup-img-1'],
      parent: 'ROOT'
    },
    'mockup-h-1': {
      type: { resolvedName: 'Heading' },
      props: { text: 'INTRODUCING HERO', level: 'h2', className: 'text-3xl font-black text-white text-center uppercase tracking-widest mb-10' },
      parent: 'mockup-section-1'
    },
    'mockup-img-1': {
      type: { resolvedName: 'Image' },
      props: { src: '/assets/images/dashboard_laptop_mockup.png', alt: 'Introducing Hero dashboard mockup', className: 'max-w-5xl mx-auto h-auto rounded-2xl border border-white/5 shadow-3xl' },
      parent: 'mockup-section-1'
    },
    'services-section-1': {
      type: { resolvedName: 'Section' },
      props: { backgroundColor: '#fafafa', paddingTop: 100, paddingBottom: 100 },
      nodes: ['serv-h-1', 'serv-cols-1'],
      parent: 'ROOT'
    },
    'serv-h-1': {
      type: { resolvedName: 'Heading' },
      props: { text: 'SUPERCHARGE YOUR ERP AND HCM WITH AGENTIC AI', level: 'h2', className: 'text-3xl md:text-4xl font-black text-[#0f0f0f] text-center uppercase tracking-tight mb-16 max-w-2xl mx-auto' },
      parent: 'services-section-1'
    },
    'serv-cols-1': {
      type: { resolvedName: 'Columns' },
      props: { columns: 3, gap: 40 },
      nodes: ['serv-col-a', 'serv-col-b', 'serv-col-c'],
      parent: 'services-section-1'
    },
    'serv-col-a': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'p-6 bg-[#f3f3f3] rounded-2xl flex flex-col items-center text-center' },
      nodes: ['serv-title-a', 'serv-desc-a'],
      parent: 'serv-cols-1'
    },
    'serv-title-a': {
      type: { resolvedName: 'Heading' },
      props: { text: 'ANSWERS', level: 'h3', className: 'text-xl font-black text-[#0f0f0f] uppercase tracking-wider mb-3' },
      parent: 'serv-col-a'
    },
    'serv-desc-a': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Instantaneous insights queried across cross-platform data silos directly inside Slack or Microsoft Teams.', className: 'text-sm text-[#0f0f0f]/60' },
      parent: 'serv-col-a'
    },
    'serv-col-b': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'p-6 bg-[#f3f3f3] rounded-2xl flex flex-col items-center text-center' },
      nodes: ['serv-title-b', 'serv-desc-b'],
      parent: 'serv-cols-1'
    },
    'serv-title-b': {
      type: { resolvedName: 'Heading' },
      props: { text: 'ACTIONS', level: 'h3', className: 'text-xl font-black text-[#0f0f0f] uppercase tracking-wider mb-3' },
      parent: 'serv-col-b'
    },
    'serv-desc-b': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'End-to-end task executions spanning invoicing, calendar bookings, and lead capture forms triggered autonomously.', className: 'text-sm text-[#0f0f0f]/60' },
      parent: 'serv-col-b'
    },
    'serv-col-c': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'p-6 bg-[#f3f3f3] rounded-2xl flex flex-col items-center text-center' },
      nodes: ['serv-title-c', 'serv-desc-c'],
      parent: 'serv-cols-1'
    },
    'serv-title-c': {
      type: { resolvedName: 'Heading' },
      props: { text: 'EXPERTS', level: 'h3', className: 'text-xl font-black text-[#0f0f0f] uppercase tracking-wider mb-3' },
      parent: 'serv-col-c'
    },
    'serv-desc-c': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Human-in-the-loop validation triggers ensure highest accuracy compliance and safety protocols are maintained.', className: 'text-sm text-[#0f0f0f]/60' },
      parent: 'serv-col-c'
    },
    'footer-1': {
      type: { resolvedName: 'Footer' },
      props: { layout: 'between', className: 'bg-[#0f0f0f] text-white py-12 border-t border-white/5' },
      parent: 'ROOT'
    }
  })
};
