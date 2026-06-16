import { BuilderTemplate } from '../templates';

// 1. SaaS Centered Glow Header
export const saasCenteredGlowHeader: BuilderTemplate = {
  id: 'saas-centered-glow-header',
  name: 'SaaS Centered Glow Header',
  description: 'A modern, centered navigation header with a dark background and subtle violet glow.',
  category: 'SaaS',
  type: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-[120px] bg-[#07070d] flex items-center justify-between px-8 py-4 border-b border-violet-500/10' },
      nodes: ['nav-centered-glow']
    },
    'nav-centered-glow': {
      type: { resolvedName: 'Navbar' },
      props: {
        brandName: 'NEXUS.AI',
        backgroundColor: '#07070d',
        textColor: '#eef2ff',
        sticky: true,
        padding: 18,
        showButton: true,
        buttonText: 'Get Started',
        buttonBg: '#6d28d9',
        buttonTextColor: '#ffffff',
        layoutType: 'split',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(109, 40, 217, 0.1)',
        linkHoverColor: '#a78bfa',
        links: [
          { label: 'Platform', href: '#platform' },
          { label: 'Compute', href: '#compute' },
          { label: 'Pricing', href: '#pricing' },
          { label: 'Docs', href: '#docs' }
        ]
      },
      parent: 'ROOT'
    }
  })
};

// 2. Agency Minimal Split Header
export const agencyMinimalSplitHeader: BuilderTemplate = {
  id: 'agency-minimal-split-header',
  name: 'Agency Minimal Split Header',
  description: 'Clean split navbar design optimized for modern creative studios.',
  category: 'Agency',
  type: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2420&auto=format&fit=crop',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-[120px] bg-[#050505] flex items-center justify-between px-8 py-4' },
      nodes: ['nav-agency-split']
    },
    'nav-agency-split': {
      type: { resolvedName: 'Navbar' },
      props: {
        brandName: 'STUDIO.ZERO',
        backgroundColor: '#050505',
        textColor: '#ffffff',
        sticky: false,
        padding: 24,
        showButton: true,
        buttonText: 'Start Brief',
        buttonBg: '#ffffff',
        buttonTextColor: '#000000',
        layoutType: 'side',
        borderBottomWidth: 0,
        linkHoverColor: '#888888',
        links: [
          { label: 'Work', href: '#work' },
          { label: 'Services', href: '#services' },
          { label: 'Studio', href: '#studio' }
        ]
      },
      parent: 'ROOT'
    }
  })
};

// 3. E-commerce Clean Header
export const ecommerceCleanHeader: BuilderTemplate = {
  id: 'ecommerce-clean-header',
  name: 'E-commerce Clean Header',
  description: 'Light navigation header with full-width bottom separator and primary action button.',
  category: 'General',
  type: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1472851294608-062f824d296e?q=80&w=2670&auto=format&fit=crop',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-[120px] bg-white flex items-center justify-between px-8 py-4' },
      nodes: ['nav-ecommerce']
    },
    'nav-ecommerce': {
      type: { resolvedName: 'Navbar' },
      props: {
        brandName: 'LUMINA',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        sticky: true,
        padding: 16,
        showButton: true,
        buttonText: 'Shop New',
        buttonBg: '#111827',
        buttonTextColor: '#ffffff',
        layoutType: 'side',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        linkHoverColor: '#4f46e5',
        links: [
          { label: 'Arrivals', href: '#arrivals' },
          { label: 'Collections', href: '#collections' },
          { label: 'Journal', href: '#journal' }
        ]
      },
      parent: 'ROOT'
    }
  })
};

// 4. Glassmorphic Sticky Header
export const glassmorphicStickyHeader: BuilderTemplate = {
  id: 'glassmorphic-sticky-header',
  name: 'Glassmorphic Sticky Header',
  description: 'Translucent sticky nav menu with high backdrop blur and thin border.',
  category: 'General',
  type: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2670&auto=format&fit=crop',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-[120px] bg-transparent flex items-center justify-between px-8 py-4' },
      nodes: ['nav-glass']
    },
    'nav-glass': {
      type: { resolvedName: 'Navbar' },
      props: {
        brandName: 'GLASSFLOW',
        backgroundColor: 'rgba(11, 11, 20, 0.75)',
        textColor: '#f8fafc',
        sticky: true,
        padding: 20,
        showButton: true,
        buttonText: 'Upgrade',
        buttonBg: 'rgba(255,255,255,0.08)',
        buttonTextColor: '#ffffff',
        layoutType: 'side',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        linkHoverColor: '#38bdf8',
        links: [
          { label: 'Pricing', href: '#pricing' },
          { label: 'Features', href: '#features' },
          { label: 'API', href: '#api' }
        ]
      },
      parent: 'ROOT'
    }
  })
};

// 5. Left-Aligned Corporate Header
export const leftAlignedCorporateHeader: BuilderTemplate = {
  id: 'left-aligned-corporate-header',
  name: 'Left-Aligned Corporate Header',
  description: 'Left-aligned brand branding with stacked secondary navigation structure.',
  category: 'General',
  type: 'website',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-[120px] bg-[#0f172a] flex items-center px-8 py-4' },
      nodes: ['nav-corporate']
    },
    'nav-corporate': {
      type: { resolvedName: 'Navbar' },
      props: {
        brandName: 'LEADSMIND GROUP',
        backgroundColor: '#0f172a',
        textColor: '#ffffff',
        sticky: true,
        padding: 20,
        showButton: false,
        layoutType: 'side',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        linkHoverColor: '#60a5fa',
        links: [
          { label: 'Enterprise', href: '#enterprise' },
          { label: 'Solutions', href: '#solutions' },
          { label: 'Resources', href: '#resources' }
        ]
      },
      parent: 'ROOT'
    }
  })
};

// 6. Underlined Glow Link Header
export const underlinedGlowLinkHeader: BuilderTemplate = {
  id: 'underlined-glow-link-header',
  name: 'Underlined Glow Link Header',
  description: 'Sleek dark navigation links highlighting with an accent color line.',
  category: 'SaaS',
  type: 'website',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-[120px] bg-[#0d0d1e] flex items-center px-8 py-4' },
      nodes: ['nav-underlined-glow']
    },
    'nav-underlined-glow': {
      type: { resolvedName: 'Navbar' },
      props: {
        brandName: 'GLOWENGINE',
        backgroundColor: '#0d0d1e',
        textColor: '#eef2ff',
        sticky: true,
        padding: 18,
        showButton: true,
        buttonText: 'Console',
        buttonBg: '#f59e0b',
        buttonTextColor: '#0d0d1e',
        layoutType: 'split',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(245, 158, 11, 0.15)',
        linkHoverColor: '#fbbf24',
        links: [
          { label: 'Dashboard', href: '#dashboard' },
          { label: 'Security', href: '#security' },
          { label: 'Tiers', href: '#pricing' }
        ]
      },
      parent: 'ROOT'
    }
  })
};

// 7. Light Clean Grid Header
export const lightCleanGridHeader: BuilderTemplate = {
  id: 'light-clean-grid-header',
  name: 'Light Clean Grid Header',
  description: 'Elegant light-mode header with structural spacing lines.',
  category: 'General',
  type: 'website',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-[120px] bg-slate-50 flex items-center px-8 py-4' },
      nodes: ['nav-light-grid']
    },
    'nav-light-grid': {
      type: { resolvedName: 'Navbar' },
      props: {
        brandName: 'STRUCTURE',
        backgroundColor: '#f8fafc',
        textColor: '#0f172a',
        sticky: false,
        padding: 16,
        showButton: true,
        buttonText: 'Contact Us',
        buttonBg: '#0f172a',
        buttonTextColor: '#ffffff',
        layoutType: 'side',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        linkHoverColor: '#64748b',
        links: [
          { label: 'About', href: '#about' },
          { label: 'Offices', href: '#offices' },
          { label: 'Inquiries', href: '#inquiries' }
        ]
      },
      parent: 'ROOT'
    }
  })
};

// 8. Creative Full Width Stacked Header
export const creativeFullWidthStackedHeader: BuilderTemplate = {
  id: 'creative-full-width-stacked-header',
  name: 'Creative Stacked Header',
  description: 'A stacked logo-top centered links header suitable for portfolios.',
  category: 'Creative',
  type: 'website',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-[140px] bg-[#111] flex flex-col justify-center items-center px-8 py-6' },
      nodes: ['nav-stacked']
    },
    'nav-stacked': {
      type: { resolvedName: 'Navbar' },
      props: {
        brandName: 'PORTFOLIO.M',
        backgroundColor: '#111111',
        textColor: '#ffffff',
        sticky: false,
        padding: 14,
        showButton: false,
        layoutType: 'stacked',
        borderBottomWidth: 0,
        linkHoverColor: '#6c47ff',
        links: [
          { label: 'Exhibits', href: '#exhibits' },
          { label: 'Biography', href: '#bio' },
          { label: 'Collabs', href: '#collabs' }
        ]
      },
      parent: 'ROOT'
    }
  })
};

// 9. Real Estate Overlay Header
export const realEstateOverlayHeader: BuilderTemplate = {
  id: 'real-estate-overlay-header',
  name: 'Real Estate Overlay Header',
  description: 'Overlay transparent navigation designed to float over background media.',
  category: 'Real Estate',
  type: 'website',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-[120px] bg-transparent flex items-center px-8 py-4' },
      nodes: ['nav-real-estate']
    },
    'nav-real-estate': {
      type: { resolvedName: 'Navbar' },
      props: {
        brandName: 'ESTATE.LUXE',
        backgroundColor: 'rgba(17, 24, 39, 0.4)',
        textColor: '#ffffff',
        sticky: true,
        padding: 20,
        showButton: true,
        buttonText: 'View Properties',
        buttonBg: '#b45309',
        buttonTextColor: '#ffffff',
        layoutType: 'side',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        linkHoverColor: '#fbbf24',
        links: [
          { label: 'Listings', href: '#listings' },
          { label: 'Locations', href: '#locations' },
          { label: 'Services', href: '#services' }
        ]
      },
      parent: 'ROOT'
    }
  })
};

// 10. E-commerce Product Hub Header
export const ecommerceProductHubHeader: BuilderTemplate = {
  id: 'ecommerce-product-hub-header',
  name: 'Product Hub Header',
  description: 'E-commerce navigation with strong CTA and centered link groupings.',
  category: 'General',
  type: 'website',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-[120px] bg-[#ffffff] flex items-center px-8 py-4' },
      nodes: ['nav-product-hub']
    },
    'nav-product-hub': {
      type: { resolvedName: 'Navbar' },
      props: {
        brandName: 'SHOPHUB',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        sticky: true,
        padding: 16,
        showButton: true,
        buttonText: 'Cart (0)',
        buttonBg: '#ef4444',
        buttonTextColor: '#ffffff',
        layoutType: 'split',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        linkHoverColor: '#ef4444',
        links: [
          { label: 'Catalog', href: '#catalog' },
          { label: 'Deals', href: '#deals' },
          { label: 'Support', href: '#support' }
        ]
      },
      parent: 'ROOT'
    }
  })
};

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
