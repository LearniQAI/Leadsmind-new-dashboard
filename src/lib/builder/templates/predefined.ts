import { BuilderTemplate } from '../templates';


// 11. SaaS High-Converting Landing Page Complete Template
export const saasHighConvertingLanding: BuilderTemplate = {
  id: 'saas-high-converting-landing',
  name: 'Neural SaaS Landing Hub',
  description: 'High-converting SaaS product page featuring alternating feature components, comparative tables, bento grids, and monthly/yearly pricing state toggles.',
  category: 'SaaS',
  type: 'both',
  thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2670&auto=format&fit=crop',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-[#07070d] text-[#eef2ff]' },
      nodes: ['nav-saas-main', 'hero-saas', 'bento-grid-saas', 'alternating-features', 'pricing-section', 'newsletter-section', 'footer-saas']
    },
    'nav-saas-main': {
      type: { resolvedName: 'Navbar' },
      props: {
        brandName: 'SYSTEMS.AI',
        backgroundColor: '#07070d',
        textColor: '#eef2ff',
        sticky: true,
        padding: 16,
        showButton: true,
        buttonText: 'Console Launch',
        buttonBg: '#4f46e5',
        buttonTextColor: '#ffffff',
        layoutType: 'side',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        links: [
          { label: 'Core', href: '#core' },
          { label: 'Bento Grid', href: '#bento' },
          { label: 'Pricing', href: '#pricing' }
        ]
      },
      parent: 'ROOT'
    },
    'hero-saas': {
      type: { resolvedName: 'Hero' },
      props: {
        layout: 'centered',
        heightPreset: 'medium',
        backgroundColor: 'transparent',
        animation: 'slide-up',
        useGlassmorphism: true
      },
      nodes: ['hero-cont-saas'],
      parent: 'ROOT'
    },
    'hero-cont-saas': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'p-8 text-center max-w-4xl mx-auto' },
      nodes: ['hero-badge', 'hero-heading', 'hero-p', 'hero-cta'],
      parent: 'hero-saas'
    },
    'hero-badge': {
      type: { resolvedName: 'Heading' },
      props: { text: 'NEW: COMPUTE V2 DEPLOYED', level: 'h5', className: 'text-[9px] text-[#818cf8] border border-[#818cf8]/30 bg-[#818cf8]/10 px-4 py-1.5 rounded-full inline-block font-black uppercase tracking-widest mb-6' },
      parent: 'hero-cont-saas'
    },
    'hero-heading': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Next-Generation Neural Cloud Computes.', level: 'h1', className: 'text-4xl md:text-7xl font-black tracking-tighter mb-6 bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent' },
      parent: 'hero-cont-saas'
    },
    'hero-p': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Configure and provision dedicated multi-region neural engine instances in seconds. Optimized for heavy transformer loads.', fontSize: 18, className: 'text-white/60 mb-10 max-w-2xl mx-auto' },
      parent: 'hero-cont-saas'
    },
    'hero-cta': {
      type: { resolvedName: 'UserButton' },
      props: { text: 'Initialize Engine Free', size: 'lg', variant: 'primary', className: 'h-14 bg-indigo-600 hover:bg-indigo-700 px-8 rounded-xl font-bold uppercase tracking-widest text-xs' },
      parent: 'hero-cont-saas'
    },
    'bento-grid-saas': {
      type: { resolvedName: 'Section' },
      props: { backgroundColor: '#0c0c16', paddingTop: 100, paddingBottom: 100, id: 'bento' },
      nodes: ['bento-title', 'bento-cols'],
      parent: 'ROOT'
    },
    'bento-title': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Bento-Box Feature Architecture', level: 'h2', className: 'text-center text-3xl font-black uppercase tracking-widest text-white mb-16' },
      parent: 'bento-grid-saas'
    },
    'bento-cols': {
      type: { resolvedName: 'Columns' },
      props: { columns: 3, gap: 24, padding: 16 },
      nodes: ['bento-card-1', 'bento-card-2', 'bento-card-3'],
      parent: 'bento-grid-saas'
    },
    'bento-card-1': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'p-8 bg-white/[0.02] border border-white/5 rounded-3xl min-h-[220px] hover:border-indigo-500/30 transition-all' },
      nodes: ['b1-h', 'b1-p'],
      parent: 'bento-cols'
    },
    'b1-h': {
      type: { resolvedName: 'Heading' },
      props: { text: '01. Instant Spin-Up', level: 'h4', className: 'text-lg font-black uppercase tracking-wider text-white mb-2' },
      parent: 'bento-card-1'
    },
    'b1-p': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Ready-to-compute clusters in under 12 seconds with absolute isolation.', fontSize: 13, className: 'text-white/50 leading-relaxed' },
      parent: 'bento-card-1'
    },
    'bento-card-2': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'p-8 bg-gradient-to-br from-indigo-900/20 to-violet-900/20 border border-indigo-500/20 rounded-3xl min-h-[220px]' },
      nodes: ['b2-h', 'b2-p'],
      parent: 'bento-cols'
    },
    'b2-h': {
      type: { resolvedName: 'Heading' },
      props: { text: '02. Neural Scale', level: 'h4', className: 'text-lg font-black uppercase tracking-wider text-indigo-400 mb-2' },
      parent: 'bento-card-2'
    },
    'b2-p': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Scale up cluster topologies with up to 10k nodes with automatic query replication.', fontSize: 13, className: 'text-white/70 leading-relaxed' },
      parent: 'bento-card-2'
    },
    'bento-card-3': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'p-8 bg-white/[0.02] border border-white/5 rounded-3xl min-h-[220px]' },
      nodes: ['b3-h', 'b3-p'],
      parent: 'bento-cols'
    },
    'b3-h': {
      type: { resolvedName: 'Heading' },
      props: { text: '03. Zero Latency', level: 'h4', className: 'text-lg font-black uppercase tracking-wider text-white mb-2' },
      parent: 'bento-card-3'
    },
    'b3-p': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Globally replicated edge functions ensure minimal transport delay.', fontSize: 13, className: 'text-white/50 leading-relaxed' },
      parent: 'bento-card-3'
    },
    'alternating-features': {
      type: { resolvedName: 'Section' },
      props: { backgroundColor: '#07070d', paddingTop: 100, paddingBottom: 100, id: 'core' },
      nodes: ['alt-h', 'alt-row-1', 'alt-row-2'],
      parent: 'ROOT'
    },
    'alt-h': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Core Capabilities', level: 'h2', className: 'text-center text-3xl font-black uppercase tracking-widest text-white mb-20' },
      parent: 'alternating-features'
    },
    'alt-row-1': {
      type: { resolvedName: 'Columns' },
      props: { columns: 2, gap: 64, padding: 16 },
      nodes: ['alt-left-1', 'alt-right-1'],
      parent: 'alternating-features'
    },
    'alt-left-1': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex flex-col justify-center' },
      nodes: ['al1-h', 'al1-p'],
      parent: 'alt-row-1'
    },
    'al1-h': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Distributed Transformer Infrastructure', level: 'h3', className: 'text-2xl font-black tracking-tight mb-4 text-white' },
      parent: 'alt-left-1'
    },
    'al1-p': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Provision GPU nodes specifically configured for neural pipelines. Our low-level orchestration guarantees stable throughput and high availability under heavy user queries.', className: 'text-white/60 leading-relaxed' },
      parent: 'alt-left-1'
    },
    'alt-right-1': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'rounded-3xl border border-white/5 overflow-hidden aspect-video bg-white/5' },
      nodes: ['al1-img'],
      parent: 'alt-row-1'
    },
    'al1-img': {
      type: { resolvedName: 'Image' },
      props: { src: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2670', alt: 'Analytics Grid', borderRadius: 24, objectFit: 'cover' },
      parent: 'alt-right-1'
    },
    'alt-row-2': {
      type: { resolvedName: 'Columns' },
      props: { columns: 2, gap: 64, padding: 16 },
      nodes: ['alt-left-2', 'alt-right-2'],
      parent: 'alternating-features'
    },
    'alt-left-2': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'rounded-3xl border border-white/5 overflow-hidden aspect-video bg-white/5' },
      nodes: ['al2-img'],
      parent: 'alt-row-2'
    },
    'al2-img': {
      type: { resolvedName: 'Image' },
      props: { src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564', alt: 'Replication Map', borderRadius: 24, objectFit: 'cover' },
      parent: 'alt-left-2'
    },
    'alt-right-2': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex flex-col justify-center' },
      nodes: ['al2-h', 'al2-p'],
      parent: 'alt-row-2'
    },
    'al2-h': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Real-Time Telemetry and Debugging', level: 'h3', className: 'text-2xl font-black tracking-tight mb-4 text-white' },
      parent: 'alt-right-2'
    },
    'al2-p': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Track inference latency, GPU temperature, and active model nodes in real-time. Export standard metrics to Prometheus with natively pre-built edge gateways.', className: 'text-white/60 leading-relaxed' },
      parent: 'alt-right-2'
    },
    'pricing-section': {
      type: { resolvedName: 'Section' },
      props: { backgroundColor: '#0c0c16', paddingTop: 100, paddingBottom: 100, id: 'pricing' },
      nodes: ['pricing-title', 'pricing-table-main'],
      parent: 'ROOT'
    },
    'pricing-title': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Pricing Models', level: 'h2', className: 'text-center text-3xl font-black uppercase tracking-widest text-white mb-12' },
      parent: 'pricing-section'
    },
    'pricing-table-main': {
      type: { resolvedName: 'PricingTable' },
      props: {
        primaryColor: '#4f46e5',
        accentColor: '#f59e0b',
        backgroundColor: 'transparent',
        textColor: '#eef2ff',
        plans: [
          { name: 'Starter Compute', price: '$49', period: '/mo', description: 'Optimal for micro-services and testing', features: ['2 GPU Nodes', 'Shared Inference IP', '10GB Logs Buffer'], buttonText: 'Deploy Starter', highlight: false },
          { name: 'Developer T3', price: '$99', period: '/mo', description: 'Built for high performance teams', features: ['5 GPU Nodes', 'Dedicated Inference IP', '50GB Logs Buffer', '24/7 SLA Support'], buttonText: 'Initialize Pro', highlight: true },
          { name: 'Quantum Core', price: '$249', period: '/mo', description: 'Enterprise-grade compute orchestration', features: ['Unlimited Node Scaling', 'Custom API Gateway', 'Real-Time Exporting', 'Dedicated Architect'], buttonText: 'Contact Systems', highlight: false }
        ]
      },
      parent: 'pricing-section'
    },
    'newsletter-section': {
      type: { resolvedName: 'Section' },
      props: { backgroundColor: '#07070d', paddingTop: 100, paddingBottom: 100 },
      nodes: ['newsletter-container'],
      parent: 'ROOT'
    },
    'newsletter-container': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'p-12 bg-white/[0.02] border border-white/5 rounded-3xl max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8' },
      nodes: ['news-left', 'news-right'],
      parent: 'newsletter-section'
    },
    'news-left': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex-1 space-y-2' },
      nodes: ['news-h', 'news-p'],
      parent: 'newsletter-container'
    },
    'news-h': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Subscribe for Updates', level: 'h3', className: 'text-xl font-black uppercase tracking-wider text-white' },
      parent: 'news-left'
    },
    'news-p': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Receive neural computing insights, releases and changelog logs.', className: 'text-xs text-white/50 font-medium' },
      parent: 'news-left'
    },
    'news-right': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'w-full md:w-auto min-w-[320px]' },
      nodes: ['news-form'],
      parent: 'newsletter-container'
    },
    'news-form': {
      type: { resolvedName: 'Form' },
      props: {
        fields: [
          { type: 'email', name: 'email', label: 'Email Address', placeholder: 'name@company.com', required: true }
        ],
        buttonText: 'Join Registry',
        successMessage: 'Welcome to the future of compute.'
      },
      parent: 'news-right'
    },
    'footer-saas': {
      type: { resolvedName: 'Footer' },
      props: {
        bg: '#07070d',
        text: '#ffffff',
        layout: 'between',
        tagline: 'Empowering future-focused software scaling.'
      },
      parent: 'ROOT'
    }
  })
};

// 12. Lead Capture Accelerator Complete Template
export const leadCaptureAccelerator: BuilderTemplate = {
  id: 'lead-capture-accelerator',
  name: 'Lead Capture Accelerator',
  description: 'High-converting landing page optimized for lead magnets and newsletter registrations, featuring a split hero, newsletter form, and clean comparative grid sections.',
  category: 'Lead Capture',
  type: 'both',
  thumbnail: 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?q=80&w=2670',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-[#070e1b] text-slate-100' },
      nodes: ['nav-lead', 'hero-lead', 'features-lead', 'form-lead-section', 'footer-lead']
    },
    'nav-lead': {
      type: { resolvedName: 'Navbar' },
      props: {
        brandName: 'LEADSHUB',
        backgroundColor: '#070e1b',
        textColor: '#e2e8f0',
        sticky: true,
        padding: 16,
        showButton: true,
        buttonText: 'Claim Free Guide',
        buttonBg: '#3b82f6',
        buttonTextColor: '#ffffff',
        layoutType: 'side',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        links: [
          { label: 'Why Us', href: '#why' },
          { label: 'Claim Guide', href: '#claim' }
        ]
      },
      parent: 'ROOT'
    },
    'hero-lead': {
      type: { resolvedName: 'Hero' },
      props: {
        layout: 'split',
        heightPreset: 'medium',
        backgroundColor: 'transparent',
        animation: 'slide-up'
      },
      nodes: ['hero-cont-lead'],
      parent: 'ROOT'
    },
    'hero-cont-lead': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'p-8 text-left max-w-4xl mx-auto' },
      nodes: ['hero-badge-lead', 'hero-heading-lead', 'hero-p-lead', 'hero-cta-lead'],
      parent: 'hero-lead'
    },
    'hero-badge-lead': {
      type: { resolvedName: 'Heading' },
      props: { text: 'COMPLIMENTARY MARKETING REPORT', level: 'h5', className: 'text-[9px] text-[#3b82f6] border border-[#3b82f6]/30 bg-[#3b82f6]/10 px-4 py-1.5 rounded-full inline-block font-black uppercase tracking-widest mb-6' },
      parent: 'hero-cont-lead'
    },
    'hero-heading-lead': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Multiply Your Inbound Flow By 4.5x.', level: 'h1', className: 'text-4xl md:text-6xl font-black tracking-tighter mb-6 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent' },
      parent: 'hero-cont-lead'
    },
    'hero-p-lead': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Get access to our 2026 playbook outlining exactly how SaaS products scaled their lead flows. No fluff, just pure optimization guides.', fontSize: 16, className: 'text-slate-400 mb-8 max-w-xl' },
      parent: 'hero-cont-lead'
    },
    'hero-cta-lead': {
      type: { resolvedName: 'UserButton' },
      props: { text: 'Download Guide Now', size: 'lg', variant: 'primary', className: 'h-14 bg-blue-600 hover:bg-blue-700 px-8 rounded-xl font-bold uppercase tracking-widest text-xs' },
      parent: 'hero-cont-lead'
    },
    'features-lead': {
      type: { resolvedName: 'Section' },
      props: { backgroundColor: '#091326', paddingTop: 80, paddingBottom: 80, id: 'why' },
      nodes: ['features-title-lead', 'features-cols-lead'],
      parent: 'ROOT'
    },
    'features-title-lead': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Inside the playbook', level: 'h2', className: 'text-center text-2xl font-black uppercase tracking-widest text-white mb-12' },
      parent: 'features-lead'
    },
    'features-cols-lead': {
      type: { resolvedName: 'Columns' },
      props: { columns: 2, gap: 40, padding: 16 },
      nodes: ['feat-card-lead-1', 'feat-card-lead-2'],
      parent: 'features-lead'
    },
    'feat-card-lead-1': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'p-8 bg-white/[0.01] border border-white/5 rounded-2xl' },
      nodes: ['fl1-h', 'fl1-p'],
      parent: 'features-cols-lead'
    },
    'fl1-h': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Chapter 1: Funnel Friction', level: 'h4', className: 'text-base font-black uppercase tracking-wider text-white mb-2' },
      parent: 'feat-card-lead-1'
    },
    'fl1-p': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Learn to isolate layouts drop-off points using lightweight browser analytics trackers.', fontSize: 13, className: 'text-slate-400 leading-relaxed' },
      parent: 'feat-card-lead-1'
    },
    'feat-card-lead-2': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'p-8 bg-white/[0.01] border border-white/5 rounded-2xl' },
      nodes: ['fl2-h', 'fl2-p'],
      parent: 'features-cols-lead'
    },
    'fl2-h': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Chapter 2: Form Psychology', level: 'h4', className: 'text-base font-black uppercase tracking-wider text-white mb-2' },
      parent: 'feat-card-lead-2'
    },
    'fl2-p': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Optimizing inputs order to increase form fill rates, and reducing friction fields.', fontSize: 13, className: 'text-slate-400 leading-relaxed' },
      parent: 'feat-card-lead-2'
    },
    'form-lead-section': {
      type: { resolvedName: 'Section' },
      props: { backgroundColor: '#070e1b', paddingTop: 80, paddingBottom: 80, id: 'claim' },
      nodes: ['form-lead-card'],
      parent: 'ROOT'
    },
    'form-lead-card': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'p-10 bg-gradient-to-b from-[#0e172a] to-[#0b1324] border border-white/5 rounded-3xl max-w-2xl mx-auto text-center' },
      nodes: ['form-lead-h', 'form-lead-p', 'form-lead-main'],
      parent: 'form-lead-section'
    },
    'form-lead-h': {
      type: { resolvedName: 'Heading' },
      props: { text: 'Get Instant Access', level: 'h3', className: 'text-xl font-black uppercase tracking-wider text-white mb-2' },
      parent: 'form-lead-card'
    },
    'form-lead-p': {
      type: { resolvedName: 'Paragraph' },
      props: { text: 'Enter your email to receive a digital copy instantly.', className: 'text-xs text-slate-400 mb-6 font-medium' },
      parent: 'form-lead-card'
    },
    'form-lead-main': {
      type: { resolvedName: 'Form' },
      props: {
        fields: [
          { type: 'text', name: 'first_name', label: 'First Name', placeholder: 'Alexander', required: true },
          { type: 'email', name: 'email', label: 'Work Email', placeholder: 'alexander@studio.com', required: true }
        ],
        buttonText: 'Claim Playbook PDF',
        successMessage: 'Playbook sent! Check your inbox shortly.'
      },
      parent: 'form-lead-card'
    },
    'footer-lead': {
      type: { resolvedName: 'Footer' },
      props: {
        bg: '#070e1b',
        text: '#94a3b8',
        layout: 'center',
        tagline: 'Helping builders optimize web growth.'
      },
      parent: 'ROOT'
    }
  })
};
