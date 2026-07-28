import { BuilderTemplate } from '../templates';

export const modernAgency: BuilderTemplate = {
  id: 'modern-agency',
  name: 'Creative Node Agency',
  description: 'Bold, minimal design for digital agencies and creative studios, with a real case-study grid, client logos, and CTA.',
  category: 'Creative',
  type: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-white text-black' },
      nodes: ['nav-2', 'hero-2', 'work-2', 'logos-2', 'cta-2', 'footer-2']
    },
    'nav-2': {
      type: { resolvedName: 'Navbar' },
      props: {
        brandName: 'CREATIVE NODE',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        sticky: true,
        padding: 20,
        showButton: true,
        buttonText: 'Start a Project',
        buttonBg: '#000000',
        buttonTextColor: '#ffffff',
        links: [
          { label: 'Work', href: '#work' },
          { label: 'Clients', href: '#clients' },
          { label: 'Contact', href: '#contact' }
        ]
      },
      parent: 'ROOT'
    },
    'hero-2': {
      type: { resolvedName: 'Hero' },
      isCanvas: true,
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
    'h2-btn-1': { type: { resolvedName: 'UserButton' }, props: { text: 'View Case Studies', variant: 'outline', className: 'rounded-none border-2 border-black px-12 h-16 text-lg mx-auto' }, parent: 'hero-cont-2' },

    'work-2': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { paddingTop: 120, paddingBottom: 120, paddingTop_mobile: 60, paddingBottom_mobile: 60 },
      nodes: ['work-h', 'work-grid-2'],
      parent: 'ROOT'
    },
    'work-h': { type: { resolvedName: 'Heading' }, props: { text: 'Selected Work', level: 'h2', className: 'text-3xl md:text-4xl font-black mb-16' }, parent: 'work-2' },
    'work-grid-2': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '2', gap: 24 },
      nodes: ['wk-col-1', 'wk-col-2', 'wk-col-3', 'wk-col-4'],
      parent: 'work-2'
    },
    'wk-col-1': { type: { resolvedName: 'Container' }, isCanvas: true, nodes: ['wk1-img', 'wk1-h'], parent: 'work-grid-2' },
    'wk1-img': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1522542550221-31fd19575a2d', height: 320, objectFit: 'cover', borderRadius: 0 }, parent: 'wk-col-1' },
    'wk1-h': { type: { resolvedName: 'Heading' }, props: { text: 'Orbital — Brand Identity', level: 'h4', className: 'text-lg font-bold mt-4' }, parent: 'wk-col-1' },
    'wk-col-2': { type: { resolvedName: 'Container' }, isCanvas: true, nodes: ['wk2-img', 'wk2-h'], parent: 'work-grid-2' },
    'wk2-img': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f', height: 320, objectFit: 'cover', borderRadius: 0 }, parent: 'wk-col-2' },
    'wk2-h': { type: { resolvedName: 'Heading' }, props: { text: 'Halcyon — Web Platform', level: 'h4', className: 'text-lg font-bold mt-4' }, parent: 'wk-col-2' },
    'wk-col-3': { type: { resolvedName: 'Container' }, isCanvas: true, nodes: ['wk3-img', 'wk3-h'], parent: 'work-grid-2' },
    'wk3-img': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d', height: 320, objectFit: 'cover', borderRadius: 0 }, parent: 'wk-col-3' },
    'wk3-h': { type: { resolvedName: 'Heading' }, props: { text: 'Fathom — App Design', level: 'h4', className: 'text-lg font-bold mt-4' }, parent: 'wk-col-3' },
    'wk-col-4': { type: { resolvedName: 'Container' }, isCanvas: true, nodes: ['wk4-img', 'wk4-h'], parent: 'work-grid-2' },
    'wk4-img': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1497215842964-222b430dc094', height: 320, objectFit: 'cover', borderRadius: 0 }, parent: 'wk-col-4' },
    'wk4-h': { type: { resolvedName: 'Heading' }, props: { text: 'Northwind — Campaign', level: 'h4', className: 'text-lg font-bold mt-4' }, parent: 'wk-col-4' },

    'logos-2': {
      type: { resolvedName: 'LogoStrip' },
      props: {
        title: 'Trusted by',
        grayscale: true,
        backgroundColor: '#f5f5f5',
        logos: [
          { src: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=200&auto=format&fit=crop', alt: 'Orbital' },
          { src: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=200&auto=format&fit=crop', alt: 'Halcyon' },
          { src: 'https://images.unsplash.com/photo-1622675363311-3e1904dc1885?q=80&w=200&auto=format&fit=crop', alt: 'Fathom' },
          { src: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=200&auto=format&fit=crop', alt: 'Northwind' }
        ]
      },
      parent: 'ROOT'
    },

    'cta-2': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { paddingTop: 120, paddingBottom: 120, paddingTop_mobile: 60, paddingBottom_mobile: 60, backgroundColor: '#000000' },
      nodes: ['cta-h-2', 'cta-btn-2'],
      parent: 'ROOT'
    },
    'cta-h-2': { type: { resolvedName: 'Heading' }, props: { text: 'Got a project in mind?', level: 'h2', color: '#ffffff', className: 'text-center text-4xl md:text-6xl font-black tracking-tight mb-8' }, parent: 'cta-2' },
    'cta-btn-2': { type: { resolvedName: 'UserButton' }, props: { text: "Let's Talk", variant: 'secondary', size: 'lg', className: 'bg-white text-black rounded-none h-16 px-12 mx-auto' }, parent: 'cta-2' },

    'footer-2': {
      type: { resolvedName: 'Footer' },
      props: {
        brandName: 'CREATIVE NODE',
        description: 'Award-winning design and development for forward-thinking companies.',
        backgroundColor: '#000000',
        textColor: '#ffffff',
        accentColor: '#ffffff',
        columns: [
          { title: 'Agency', links: [{ label: 'Work', href: '#work' }, { label: 'Clients', href: '#clients' }] },
          { title: 'Connect', links: [{ label: 'Instagram', href: '#' }, { label: 'Email', href: 'mailto:hello@creativenode.co' }] }
        ]
      },
      parent: 'ROOT'
    }
  })
};
