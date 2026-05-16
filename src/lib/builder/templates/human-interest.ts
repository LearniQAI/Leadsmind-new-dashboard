import { BuilderTemplate } from '../templates';

export const humanInterest: BuilderTemplate = {
  id: 'human-interest',
  name: 'Human Interest',
  description: 'A bold, high-contrast editorial portfolio for journalists and creative storytellers.',
  category: 'Creative',
  type: 'website',
  is_premium: true,
  thumbnail: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-white text-black font-sans' },
      nodes: ['hero-hi', 'intro-hi', 'quote-hi', 'impact-hi', 'services-hi', 'work-hi', 'footer-hi']
    },
    'hero-hi': {
      type: { resolvedName: 'Hero' },
      isCanvas: true,
      props: { 
        layout: 'background', 
        backgroundImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330', 
        overlayOpacity: 30, 
        heightPreset: 'full',
        animation: 'fade-in'
      },
      nodes: ['hero-cont-hi'],
      parent: 'ROOT'
    },
    'hero-cont-hi': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'text-left pl-8 md:pl-20' },
      nodes: ['hero-h-hi'],
      parent: 'hero-hi'
    },
    'hero-h-hi': { 
      type: { resolvedName: 'Heading' }, 
      props: { 
        text: 'HUMAN<br/>INTEREST', 
        level: 'h1', 
        fontSize: 160, 
        fontSize_mobile: 64,
        color: '#ffffff', 
        fontWeight: 'black',
        className: 'leading-[0.8] tracking-tighter'
      }, 
      parent: 'hero-cont-hi' 
    },

    'intro-hi': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { backgroundColor: '#ffffff', paddingTop: 120, paddingBottom: 120, paddingTop_mobile: 60, paddingBottom_mobile: 60 },
      nodes: ['intro-grid-hi'],
      parent: 'ROOT'
    },
    'intro-grid-hi': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '2', gap: 60 },
      nodes: ['intro-col-1', 'intro-col-2'],
      parent: 'intro-hi'
    },
    'intro-col-1': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex flex-col gap-8 px-8' },
      nodes: ['intro-h-hi', 'intro-p-hi'],
      parent: 'intro-grid-hi'
    },
    'intro-h-hi': { 
      type: { resolvedName: 'Heading' }, 
      props: { text: 'ACCOMPLISHED AT CAPTURING YOUR ESSENCE IN INK.', level: 'h2', fontSize: 42, fontSize_mobile: 28, fontWeight: 'black', className: 'leading-none' }, 
      parent: 'intro-col-1' 
    },
    'intro-p-hi': { 
      type: { resolvedName: 'Paragraph' }, 
      props: { text: 'We believe that every person has a story worth telling. Our mission is to uncover the human threads that connect us all through deep-dive journalism and intimate portraiture.', fontSize: 16, color: '#4F4F4F' }, 
      parent: 'intro-col-1' 
    },
    'intro-col-2': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'px-8' },
      nodes: ['intro-img'],
      parent: 'intro-grid-hi'
    },
    'intro-img': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173', borderRadius: 0 }, parent: 'intro-col-2' },

    'quote-hi': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { backgroundColor: '#ffffff', paddingTop: 80, paddingBottom: 80 },
      nodes: ['quote-p'],
      parent: 'ROOT'
    },
    'quote-p': { 
      type: { resolvedName: 'Heading' }, 
      props: { text: '"The easiest, best idea is to talk about relevant and exciting goals with our audiences — with insight, for impact."', level: 'h3', fontSize: 24, fontSize_mobile: 18, textAlign: 'center', fontWeight: 'medium', className: 'italic max-w-3xl mx-auto px-8' }, 
      parent: 'quote-hi' 
    },

    'impact-hi': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { backgroundColor: '#ffffff', paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 60, paddingBottom_mobile: 60 },
      nodes: ['impact-grid'],
      parent: 'ROOT'
    },
    'impact-grid': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '2', gap: 40 },
      nodes: ['impact-col-1', 'impact-col-2'],
      parent: 'impact-hi'
    },
    'impact-col-1': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'px-8' },
      nodes: ['impact-img'],
      parent: 'impact-grid'
    },
    'impact-img': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81', borderRadius: 0, height: 500, height_mobile: 300 }, parent: 'impact-col-1' },
    'impact-col-2': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex flex-col justify-center px-8' },
      nodes: ['impact-h'],
      parent: 'impact-grid'
    },
    'impact-h': { type: { resolvedName: 'Heading' }, props: { text: 'WRITE WITH<br/>INSIGHT FOR<br/>IMPACT', level: 'h2', fontSize: 100, fontSize_mobile: 48, fontWeight: 'black', className: 'leading-[0.8] tracking-tighter' }, parent: 'impact-col-2' },

    'services-hi': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { backgroundColor: '#000000', paddingTop: 0, paddingBottom: 0 },
      nodes: ['services-grid'],
      parent: 'ROOT'
    },
    'services-grid': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '2', gap: 0 },
      nodes: ['serv-col-1', 'serv-col-2'],
      parent: 'services-hi'
    },
    'serv-col-1': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'p-0' },
      nodes: ['serv-img'],
      parent: 'services-grid'
    },
    'serv-img': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1444464666168-49d633b867ad', borderRadius: 0, height: 600, objectFit: 'cover' }, parent: 'serv-col-1' },
    'serv-col-2': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex flex-col justify-center p-12 md:p-20 text-white' },
      nodes: ['serv-h', 'serv-list'],
      parent: 'services-grid'
    },
    'serv-h': { type: { resolvedName: 'Heading' }, props: { text: 'Services', level: 'h4', fontSize: 12, color: '#666', className: 'uppercase tracking-[0.4em] mb-8' }, parent: 'serv-col-2' },
    'serv-list': { type: { resolvedName: 'Heading' }, props: { text: 'FEATURE WRITING<br/>COPYWRITING<br/>STAFF PROFILES<br/>SCRIPT WRITING<br/>COPY EDITING<br/>GHOST WRITING<br/>COMMUNICATIONS<br/>PHOTOGRAPHY', level: 'h3', fontSize: 32, fontSize_mobile: 24, fontWeight: 'bold', color: '#ffffff', className: 'leading-tight' }, parent: 'serv-col-2' },

    'work-hi': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { backgroundColor: '#ffffff', paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 60, paddingBottom_mobile: 60 },
      nodes: ['work-h-hi', 'work-grid-hi'],
      parent: 'ROOT'
    },
    'work-h-hi': { type: { resolvedName: 'Heading' }, props: { text: 'SELECTED<br/>WORK', level: 'h2', fontSize: 80, fontSize_mobile: 42, fontWeight: 'black', className: 'leading-[0.8] tracking-tighter mb-16 px-8' }, parent: 'work-hi' },
    'work-grid-hi': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '2', gap: 20, padding: 20 },
      nodes: ['w-item-1', 'w-item-2', 'w-item-3', 'w-item-4'],
      parent: 'work-hi'
    },
    'w-item-1': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330', height: 400, objectFit: 'cover' }, parent: 'work-grid-hi' },
    'w-item-2': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', height: 400, objectFit: 'cover' }, parent: 'work-grid-hi' },
    'w-item-3': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb', height: 400, objectFit: 'cover' }, parent: 'work-grid-hi' },
    'w-item-4': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d', height: 400, objectFit: 'cover' }, parent: 'work-grid-hi' },

    'footer-hi': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { backgroundColor: '#000000', paddingTop: 100, paddingBottom: 100 },
      nodes: ['footer-h-hi'],
      parent: 'ROOT'
    },
    'footer-h-hi': { type: { resolvedName: 'Heading' }, props: { text: 'HUMAN HUMAN HUM<br/>T INTEREST INT', level: 'h1', fontSize: 120, fontSize_mobile: 48, fontWeight: 'black', color: '#ffffff', className: 'leading-[0.7] tracking-tighter opacity-20 text-center overflow-hidden whitespace-nowrap' }, parent: 'footer-hi' }
  })
};
