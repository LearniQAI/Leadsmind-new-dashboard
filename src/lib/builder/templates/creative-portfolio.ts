import { BuilderTemplate } from '../templates';

export const creativePortfolio: BuilderTemplate = {
  id: 'creative-portfolio',
  name: 'Minimalist Portfolio',
  description: 'Clean and artistic portfolio for designers and photographers, with a real work grid, about section, and client testimonial.',
  category: 'Creative',
  type: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-white text-black' },
      nodes: ['nav-10', 'hero-10', 'work-10', 'about-10', 'testimonial-10', 'cta-10', 'footer-10']
    },
    'nav-10': {
      type: { resolvedName: 'Navbar' },
      props: {
        brandName: 'STUDIO NOIR',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        sticky: true,
        padding: 20,
        showButton: true,
        buttonText: "Let's Talk",
        buttonBg: '#000000',
        buttonTextColor: '#ffffff',
        links: [
          { label: 'Work', href: '#work' },
          { label: 'About', href: '#about' },
          { label: 'Contact', href: '#contact' }
        ]
      },
      parent: 'ROOT'
    },
    'hero-10': {
      type: { resolvedName: 'Hero' },
      isCanvas: true,
      props: { layout: 'centered', heightPreset: 'large', backgroundColor: '#ffffff' },
      nodes: ['h10-cont'],
      parent: 'ROOT'
    },
    'h10-cont': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'px-6' }, nodes: ['h10-h', 'h10-p'], parent: 'hero-10' },
    'h10-h': { type: { resolvedName: 'Heading' }, props: { text: 'Less is More.', level: 'h1', className: 'text-6xl md:text-9xl font-black tracking-tighter mb-4' }, parent: 'h10-cont' },
    'h10-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Visual Storyteller & Digital Craftsman.', className: 'text-xl md:text-2xl font-medium tracking-[0.2em] uppercase opacity-40' }, parent: 'h10-cont' },

    'work-10': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 50, paddingBottom_mobile: 50, backgroundColor: '#ffffff' },
      nodes: ['work-h-10', 'work-grid-10'],
      parent: 'ROOT'
    },
    'work-h-10': { type: { resolvedName: 'Heading' }, props: { text: 'Selected Work', level: 'h2', className: 'text-center text-3xl md:text-4xl font-black uppercase tracking-tight mb-16' }, parent: 'work-10' },
    'work-grid-10': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '3', gap: 24 },
      nodes: ['work-col-1', 'work-col-2', 'work-col-3', 'work-col-4', 'work-col-5', 'work-col-6'],
      parent: 'work-10'
    },
    'work-col-1': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1512418490979-92798cec1380', height: 340, objectFit: 'cover', borderRadius: 0 }, parent: 'work-grid-10' },
    'work-col-2': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04', height: 340, objectFit: 'cover', borderRadius: 0 }, parent: 'work-grid-10' },
    'work-col-3': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1550439062-609e1531270e', height: 340, objectFit: 'cover', borderRadius: 0 }, parent: 'work-grid-10' },
    'work-col-4': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e', height: 340, objectFit: 'cover', borderRadius: 0 }, parent: 'work-grid-10' },
    'work-col-5': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205', height: 340, objectFit: 'cover', borderRadius: 0 }, parent: 'work-grid-10' },
    'work-col-6': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288', height: 340, objectFit: 'cover', borderRadius: 0 }, parent: 'work-grid-10' },

    'about-10': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 50, paddingBottom_mobile: 50, backgroundColor: '#f8f8f8' },
      nodes: ['about-grid-10'],
      parent: 'ROOT'
    },
    'about-grid-10': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '2', gap: 60 },
      nodes: ['about-img-10', 'about-txt-10'],
      parent: 'about-10'
    },
    'about-img-10': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1560250097-0b93528c311a', height: 480, objectFit: 'cover', borderRadius: 0 }, parent: 'about-grid-10' },
    'about-txt-10': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'flex flex-col justify-center px-6' }, nodes: ['about-h-10', 'about-p-10'], parent: 'about-grid-10' },
    'about-h-10': { type: { resolvedName: 'Heading' }, props: { text: 'Ten years behind the lens.', level: 'h3', className: 'text-3xl md:text-4xl font-black tracking-tight mb-6' }, parent: 'about-txt-10' },
    'about-p-10': { type: { resolvedName: 'Paragraph' }, props: { text: 'I work with brands and individuals who want their story told with restraint — clean compositions, honest light, and nothing extra. Based in Los Angeles, available worldwide.', className: 'text-lg opacity-60 leading-relaxed' }, parent: 'about-txt-10' },

    'testimonial-10': {
      type: { resolvedName: 'Testimonial' },
      props: {
        quote: 'Working with Studio Noir felt effortless. The final gallery captured exactly the mood we were chasing — understated, honest, and completely on brand.',
        author: 'Maren Whitfield',
        title: 'Creative Director, Ainsley & Co.',
        image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
        backgroundColor: '#ffffff',
        textColor: '#111827',
        accentColor: '#000000',
        borderRadius: 0,
        padding: 48,
        textAlign: 'center',
        borderOpacity: 10
      },
      parent: 'ROOT'
    },

    'cta-10': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 50, paddingBottom_mobile: 50, backgroundColor: '#000000' },
      nodes: ['cta-h-10', 'cta-btn-10'],
      parent: 'ROOT'
    },
    'cta-h-10': { type: { resolvedName: 'Heading' }, props: { text: "Let's make something.", level: 'h2', color: '#ffffff', className: 'text-center text-4xl md:text-6xl font-black tracking-tight mb-8' }, parent: 'cta-10' },
    'cta-btn-10': { type: { resolvedName: 'UserButton' }, props: { text: 'Start a project', variant: 'secondary', size: 'lg', className: 'bg-white text-black rounded-none h-14 px-10 mx-auto' }, parent: 'cta-10' },

    'footer-10': {
      type: { resolvedName: 'Footer' },
      props: {
        brandName: 'STUDIO NOIR',
        description: 'Visual storytelling for brands and individuals who value restraint.',
        backgroundColor: '#000000',
        textColor: '#ffffff',
        accentColor: '#ffffff',
        columns: [
          { title: 'Studio', links: [{ label: 'Work', href: '#work' }, { label: 'About', href: '#about' }] },
          { title: 'Connect', links: [{ label: 'Instagram', href: '#' }, { label: 'Email', href: 'mailto:hello@studionoir.com' }] }
        ]
      },
      parent: 'ROOT'
    }
  })
};
