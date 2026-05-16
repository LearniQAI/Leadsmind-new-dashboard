export interface BuilderTemplate {
 id: string;
 name: string;
 description: string;
 category: 'website' | 'funnel' | 'both';
 thumbnail?: string;
 preview_image?: string; // Support both naming conventions
 content: string; // CraftJS JSON
}

const BLANK_PAGE = '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}';

export const BUILDER_TEMPLATES: BuilderTemplate[] = [
 {
  id: 'ai-saas-premium',
  name: 'Neural AI SaaS',
  description: 'Ultra-dark high-tech landing page for AI and SaaS platforms.',
  category: 'both',
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
 },
 {
  id: 'modern-agency',
  name: 'Creative Node Agency',
  description: 'Bold, minimal design for digital agencies and creative studios.',
  category: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
  content: JSON.stringify({
   ROOT: {
    type: { resolvedName: 'Container' },
    isCanvas: true,
    props: { className: 'min-h-screen bg-white text-black' },
    nodes: ['nav-2', 'hero-2', 'work-2', 'footer-2']
   },
   'nav-2': { type: { resolvedName: 'Navbar' }, props: { size: 'h-20' }, parent: 'ROOT' },
   'hero-2': {
    type: { resolvedName: 'Hero' },
    props: { layout: 'centered', heightPreset: 'full', backgroundColor: '#ffffff', animation: 'fade-in' },
    nodes: ['hero-cont-2'],
    parent: 'ROOT'
   },
   'hero-cont-2': {
    type: { resolvedName: 'Container' },
    isCanvas: true,
    props: { className: 'text-center max-w-4xl px-6' },
    nodes: ['h2-h-1', 'h2-p-1', 'h2-btn-1'],
    parent: 'hero-2'
   },
   'h2-h-1': { type: { resolvedName: 'Heading' }, props: { text: 'We Build Iconic Digital Brands.', level: 'h1', className: 'text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-10' }, parent: 'hero-cont-2' },
   'h2-p-1': { type: { resolvedName: 'Paragraph' }, props: { text: 'Award-winning design and development for forward-thinking companies worldwide.', className: 'text-xl md:text-2xl font-medium opacity-60 mb-12' }, parent: 'hero-cont-2' },
   'h2-btn-1': { type: { resolvedName: 'UserButton' }, props: { text: 'View Case Studies', variant: 'outline', className: 'rounded-none border-2 border-black px-12 h-16 text-lg' }, parent: 'hero-cont-2' },
   'work-2': { type: { resolvedName: 'Section' }, props: { paddingTop: 120, paddingBottom: 120, paddingTop_mobile: 60, paddingBottom_mobile: 60 }, nodes: ['work-h'], parent: 'ROOT' },
   'work-h': { type: { resolvedName: 'Heading' }, props: { text: 'Selected Work', level: 'h2', className: 'text-3xl md:text-4xl font-black mb-16' }, parent: 'work-2' },
   'footer-2': { type: { resolvedName: 'Footer' }, props: { bg: '#000000', text: '#ffffff' }, parent: 'ROOT' }
  })
 },
 {
  id: 'luxury-real-estate',
  name: 'Elite Living Estates',
  description: 'Elegant, image-heavy design for high-end luxury properties.',
  category: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
  content: JSON.stringify({
   ROOT: {
    type: { resolvedName: 'Container' },
    isCanvas: true,
    props: { className: 'min-h-screen bg-[#faf9f6]' },
    nodes: ['hero-3', 'about-3', 'gallery-3', 'footer-3']
   },
   'hero-3': {
    type: { resolvedName: 'Hero' },
    props: { layout: 'background', backgroundImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c', overlayOpacity: 30, heightPreset: 'full' },
    nodes: ['h3-cont'],
    parent: 'ROOT'
   },
   'h3-cont': {
    type: { resolvedName: 'Container' },
    isCanvas: true,
    props: { className: 'px-6' },
    nodes: ['h3-h', 'h3-p', 'h3-btn'],
    parent: 'hero-3'
   },
   'h3-h': { type: { resolvedName: 'Heading' }, props: { text: 'Unrivaled Luxury.', level: 'h1', className: 'text-white text-5xl md:text-7xl font-serif mb-6' }, parent: 'h3-cont' },
   'h3-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Exclusive listings in the world\'s most prestigious locations.', className: 'text-white/80 text-lg md:text-xl font-light mb-10 tracking-widest uppercase' }, parent: 'h3-cont' },
   'h3-btn': { type: { resolvedName: 'UserButton' }, props: { text: 'Explore Collection', variant: 'outline', className: 'border-white text-white rounded-none h-14 px-10' }, parent: 'h3-cont' },
   'about-3': { type: { resolvedName: 'Section' }, props: { paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 50, paddingBottom_mobile: 50 }, parent: 'ROOT' },
   'gallery-3': { type: { resolvedName: 'Section' }, props: { paddingTop: 80, paddingBottom: 80, backgroundColor: '#ffffff', paddingTop_mobile: 40, paddingBottom_mobile: 40 }, parent: 'ROOT' },
   'footer-3': { type: { resolvedName: 'Footer' }, parent: 'ROOT' }
  })
 },
 {
  id: 'lifestyle-ecommerce',
  name: 'Vogue Lifestyle Store',
  description: 'Clean and modern storefront for fashion and lifestyle brands.',
  category: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-white' },
      nodes: ['nav-4', 'hero-4', 'featured-4', 'footer-4']
    },
    'nav-4': { type: { resolvedName: 'Navbar' }, parent: 'ROOT' },
    'hero-4': {
      type: { resolvedName: 'Hero' },
      props: { layout: 'split', backgroundColor: '#f3f4f6', heightPreset: 'large' },
      nodes: ['h4-cont'],
      parent: 'ROOT'
    },
    'h4-cont': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'px-6' }, nodes: ['h4-h', 'h4-p', 'h4-btn'], parent: 'hero-4' },
    'h4-h': { type: { resolvedName: 'Heading' }, props: { text: 'New Season Collection.', level: 'h1', className: 'text-4xl md:text-6xl font-black mb-6 italic' }, parent: 'h4-cont' },
    'h4-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Discover the latest trends in sustainable fashion and accessories.', className: 'text-base md:text-lg opacity-60 mb-8' }, parent: 'h4-cont' },
    'h4-btn': { type: { resolvedName: 'UserButton' }, props: { text: 'Shop Now', className: 'rounded-full h-12 px-8' }, parent: 'h4-cont' },
    'featured-4': { type: { resolvedName: 'Section' }, props: { paddingTop: 80, paddingBottom: 80, paddingTop_mobile: 40, paddingBottom_mobile: 40 }, parent: 'ROOT' },
    'footer-4': { type: { resolvedName: 'Footer' }, parent: 'ROOT' }
  })
 },
 {
  id: 'fitness-power',
  name: 'Power Peak Fitness',
  description: 'High-energy landing page for gyms and personal trainers.',
  category: 'funnel',
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
 },
 {
  id: 'medical-care',
  name: 'Safe Hands Healthcare',
  description: 'Trust-focused landing page for clinics and dental practices.',
  category: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1629909608135-ca29ed975199',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-white' },
      nodes: ['nav-6', 'hero-6', 'services-6', 'booking-6', 'footer-6']
    },
    'nav-6': { type: { resolvedName: 'Navbar' }, parent: 'ROOT' },
    'hero-6': {
      type: { resolvedName: 'Hero' },
      props: { layout: 'split', backgroundColor: '#f0f9ff', heightPreset: 'large' },
      nodes: ['h6-cont'],
      parent: 'ROOT'
    },
    'h6-cont': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'px-6' }, nodes: ['h6-h', 'h6-p', 'h6-btn'], parent: 'hero-6' },
    'h6-h': { type: { resolvedName: 'Heading' }, props: { text: 'Modern Care, Personal Touch.', level: 'h1', className: 'text-4xl md:text-5xl font-bold text-sky-900 mb-6' }, parent: 'h6-cont' },
    'h6-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Comprehensive medical services designed around your family\'s well-being.', className: 'text-base md:text-lg text-slate-600 mb-8' }, parent: 'h6-cont' },
    'h6-btn': { type: { resolvedName: 'UserButton' }, props: { text: 'Book Appointment', className: 'bg-sky-600 rounded-lg h-12' }, parent: 'h6-cont' },
    'services-6': { type: { resolvedName: 'Section' }, props: { paddingTop: 80, paddingBottom: 80, paddingTop_mobile: 40, paddingBottom_mobile: 40 }, parent: 'ROOT' },
    'booking-6': { type: { resolvedName: 'Form' }, props: { title: 'New Patient Registration' }, parent: 'ROOT' },
    'footer-6': { type: { resolvedName: 'Footer' }, parent: 'ROOT' }
  })
 },
 {
  id: 'legal-elite',
  name: 'Elite Legal Group',
  description: 'Sophisticated and professional design for law firms and consultants.',
  category: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-[#0c121e] text-white' },
      nodes: ['hero-7', 'logos-7', 'services-7', 'footer-7']
    },
    'hero-7': {
      type: { resolvedName: 'Hero' },
      props: { layout: 'centered', backgroundColor: '#111827', heightPreset: 'large' },
      nodes: ['h7-cont'],
      parent: 'ROOT'
    },
    'h7-cont': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'px-6' }, nodes: ['h7-h', 'h7-p', 'h7-btn'], parent: 'hero-7' },
    'h7-h': { type: { resolvedName: 'Heading' }, props: { text: 'Defending Your Future.', level: 'h1', className: 'text-5xl md:text-6xl font-serif font-medium mb-6' }, parent: 'h7-cont' },
    'h7-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Strategic legal counsel for complex business and personal matters.', className: 'text-lg md:text-xl opacity-60 mb-10 tracking-widest uppercase text-amber-500' }, parent: 'h7-cont' },
    'h7-btn': { type: { resolvedName: 'UserButton' }, props: { text: 'Request Consultation', variant: 'outline', className: 'border-amber-500 text-amber-500 h-14' }, parent: 'h7-cont' },
    'logos-7': { type: { resolvedName: 'LogoStrip' }, props: { grayscale: true }, parent: 'ROOT' },
    'services-7': { type: { resolvedName: 'Section' }, props: { paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 50, paddingBottom_mobile: 50 }, parent: 'ROOT' },
    'footer-7': { type: { resolvedName: 'Footer' }, parent: 'ROOT' }
  })
 },
 {
  id: 'education-lms',
  name: 'Course Master Pro',
  description: 'High-conversion sales page for online courses and coaches.',
  category: 'funnel',
  thumbnail: 'https://images.unsplash.com/photo-1524178232363-1fb28f74b671',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-[#f8fafc]' },
      nodes: ['hero-8', 'features-8', 'pricing-8', 'faq-8', 'footer-8']
    },
    'hero-8': {
      type: { resolvedName: 'Hero' },
      props: { layout: 'split', backgroundColor: '#ffffff', heightPreset: 'large' },
      nodes: ['h8-cont'],
      parent: 'ROOT'
    },
    'h8-cont': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'px-6' }, nodes: ['h8-h', 'h8-p', 'h8-btn'], parent: 'hero-8' },
    'h8-h': { type: { resolvedName: 'Heading' }, props: { text: 'Master Your Craft.', level: 'h1', className: 'text-4xl md:text-6xl font-black text-indigo-900 mb-6' }, parent: 'h8-cont' },
    'h8-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'The ultimate blueprint to scaling your digital business from zero to $100k.', className: 'text-lg md:text-xl text-indigo-600/60 mb-8' }, parent: 'h8-cont' },
    'h8-btn': { type: { resolvedName: 'UserButton' }, props: { text: 'Enroll Now - 50% Off', className: 'bg-indigo-600 rounded-xl h-14 text-lg' }, parent: 'h8-cont' },
    'features-8': { type: { resolvedName: 'Section' }, props: { paddingTop: 80, paddingBottom: 80, paddingTop_mobile: 40, paddingBottom_mobile: 40 }, parent: 'ROOT' },
    'pricing-8': { type: { resolvedName: 'PricingTable' }, parent: 'ROOT' },
    'faq-8': { type: { resolvedName: 'FAQ' }, parent: 'ROOT' },
    'footer-8': { type: { resolvedName: 'Footer' }, parent: 'ROOT' }
  })
 },
 {
  id: 'event-conference',
  name: 'Nexus Tech Summit',
  description: 'Modern event landing page with countdown and ticket tiers.',
  category: 'website',
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
 },
 {
  id: 'creative-portfolio',
  name: 'Minimalist Portfolio',
  description: 'Clean and artistic portfolio for designers and photographers.',
  category: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-white text-black' },
      nodes: ['hero-10', 'work-10', 'footer-10']
    },
    'hero-10': {
      type: { resolvedName: 'Hero' },
      props: { layout: 'centered', heightPreset: 'large', backgroundColor: '#ffffff' },
      nodes: ['h10-cont'],
      parent: 'ROOT'
    },
    'h10-cont': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'px-6' }, nodes: ['h10-h', 'h10-p'], parent: 'hero-10' },
    'h10-h': { type: { resolvedName: 'Heading' }, props: { text: 'Less is More.', level: 'h1', className: 'text-6xl md:text-9xl font-black tracking-tighter mb-4' }, parent: 'h10-cont' },
    'h10-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Visual Storyteller & Digital Craftsman.', className: 'text-xl md:text-2xl font-medium tracking-[0.2em] uppercase opacity-40' }, parent: 'h10-cont' },
    'work-10': { type: { resolvedName: 'Section' }, props: { paddingTop: 40, paddingBottom: 40, paddingTop_mobile: 20, paddingBottom_mobile: 20 }, parent: 'ROOT' },
    'footer-10': { type: { resolvedName: 'Footer' }, parent: 'ROOT' }
  })
 }
];

export const getTemplateById = (id: string) => BUILDER_TEMPLATES.find(t => t.id === id);
