import { BuilderTemplate } from '../templates';

export const legalElite: BuilderTemplate = {
  id: 'legal-elite',
  name: 'Elite Legal Group',
  description: 'Sophisticated and professional design for law firms and consultants, with a real practice-areas grid and client testimonial.',
  category: 'Professional',
  type: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-[#0c121e] text-white' },
      nodes: ['nav-7', 'hero-7', 'logos-7', 'services-7', 'testimonial-7', 'footer-7']
    },
    'nav-7': {
      type: { resolvedName: 'Navbar' },
      props: {
        brandName: 'ELITE LEGAL',
        backgroundColor: '#0c121e',
        textColor: '#ffffff',
        sticky: true,
        padding: 20,
        showButton: true,
        buttonText: 'Free Consultation',
        buttonBg: '#d97706',
        buttonTextColor: '#111827',
        links: [
          { label: 'Practice Areas', href: '#services' },
          { label: 'About', href: '#about' },
          { label: 'Contact', href: '#contact' }
        ]
      },
      parent: 'ROOT'
    },
    'hero-7': {
      type: { resolvedName: 'Hero' },
      isCanvas: true,
      props: { layout: 'centered', backgroundColor: '#111827', heightPreset: 'large' },
      nodes: ['h7-cont'],
      parent: 'ROOT'
    },
    'h7-cont': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'px-6' }, nodes: ['h7-h', 'h7-p', 'h7-btn'], parent: 'hero-7' },
    'h7-h': { type: { resolvedName: 'Heading' }, props: { text: 'Defending Your Future.', level: 'h1', className: 'text-5xl md:text-6xl font-serif font-medium mb-6 text-center' }, parent: 'h7-cont' },
    'h7-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Strategic legal counsel for complex business and personal matters.', className: 'text-lg md:text-xl opacity-60 mb-10 tracking-widest uppercase text-amber-500 text-center' }, parent: 'h7-cont' },
    'h7-btn': { type: { resolvedName: 'UserButton' }, props: { text: 'Request Consultation', variant: 'outline', className: 'border-amber-500 text-amber-500 h-14 mx-auto' }, parent: 'h7-cont' },

    'logos-7': {
      type: { resolvedName: 'LogoStrip' },
      props: {
        title: 'Trusted by leading organizations',
        grayscale: true,
        backgroundColor: '#0c121e',
        logos: [
          { src: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=200&auto=format&fit=crop', alt: 'Halcyon Group' },
          { src: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=200&auto=format&fit=crop', alt: 'Orbital Holdings' },
          { src: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=200&auto=format&fit=crop', alt: 'Northwind Capital' },
          { src: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?q=80&w=200&auto=format&fit=crop', alt: 'Fathom Partners' }
        ]
      },
      parent: 'ROOT'
    },

    'services-7': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 50, paddingBottom_mobile: 50 },
      nodes: ['serv-h-7', 'serv-grid-7'],
      parent: 'ROOT'
    },
    'serv-h-7': { type: { resolvedName: 'Heading' }, props: { text: 'Practice Areas', level: 'h2', color: '#ffffff', className: 'text-center text-3xl md:text-4xl font-serif mb-16' }, parent: 'services-7' },
    'serv-grid-7': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '3', gap: 32 },
      nodes: ['sv-col-1', 'sv-col-2', 'sv-col-3'],
      parent: 'services-7'
    },
    'sv-col-1': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'p-8 border border-white/10 rounded-lg' }, nodes: ['sv1-h', 'sv1-p'], parent: 'serv-grid-7' },
    'sv1-h': { type: { resolvedName: 'Heading' }, props: { text: 'Corporate Law', level: 'h4', color: '#d97706', className: 'text-lg font-serif mb-3' }, parent: 'sv-col-1' },
    'sv1-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Mergers, acquisitions, and governance counsel for growing enterprises.', color: '#cbd5e1' }, parent: 'sv-col-1' },
    'sv-col-2': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'p-8 border border-white/10 rounded-lg' }, nodes: ['sv2-h', 'sv2-p'], parent: 'serv-grid-7' },
    'sv2-h': { type: { resolvedName: 'Heading' }, props: { text: 'Litigation', level: 'h4', color: '#d97706', className: 'text-lg font-serif mb-3' }, parent: 'sv-col-2' },
    'sv2-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Aggressive representation in high-stakes commercial disputes.', color: '#cbd5e1' }, parent: 'sv-col-2' },
    'sv-col-3': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'p-8 border border-white/10 rounded-lg' }, nodes: ['sv3-h', 'sv3-p'], parent: 'serv-grid-7' },
    'sv3-h': { type: { resolvedName: 'Heading' }, props: { text: 'Estate Planning', level: 'h4', color: '#d97706', className: 'text-lg font-serif mb-3' }, parent: 'sv-col-3' },
    'sv3-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Protecting your legacy with meticulous, personalized planning.', color: '#cbd5e1' }, parent: 'sv-col-3' },

    'testimonial-7': {
      type: { resolvedName: 'Testimonial' },
      props: {
        quote: 'Elite Legal Group guided us through a complex acquisition with precision and total transparency at every step. Worth every retainer dollar.',
        author: 'Richard Holt',
        title: 'CEO, Holt Manufacturing',
        image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a',
        backgroundColor: '#111827',
        textColor: '#ffffff',
        accentColor: '#d97706',
        borderRadius: 8,
        padding: 48,
        textAlign: 'center',
        borderOpacity: 15
      },
      parent: 'ROOT'
    },

    'footer-7': {
      type: { resolvedName: 'Footer' },
      props: {
        brandName: 'ELITE LEGAL',
        description: 'Strategic legal counsel for complex business and personal matters.',
        backgroundColor: '#08090f',
        textColor: '#ffffff',
        accentColor: '#d97706',
        columns: [
          { title: 'Practice', links: [{ label: 'Corporate Law', href: '#services' }, { label: 'Litigation', href: '#services' }] },
          { title: 'Firm', links: [{ label: 'About', href: '#about' }, { label: 'Contact', href: 'mailto:consult@elitelegalgroup.com' }] }
        ]
      },
      parent: 'ROOT'
    }
  })
};
