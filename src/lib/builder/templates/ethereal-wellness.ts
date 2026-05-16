import { BuilderTemplate } from '../templates';

export const etherealWellness: BuilderTemplate = {
  id: 'ethereal-wellness',
  name: 'Ethereal Breathwork',
  description: 'A serene, high-fidelity wellness template for meditation and holistic practices.',
  category: 'Wellness',
  type: 'website',
  is_premium: true,
  thumbnail: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-[#F2EDE4] text-[#2C2C2C]' },
      nodes: ['hero-w', 'intro-w', 'app-w', 'team-w', 'journal-w', 'footer-w']
    },
    'hero-w': {
      type: { resolvedName: 'Hero' },
      isCanvas: true,
      props: { 
        layout: 'background', 
        backgroundImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e', 
        overlayOpacity: 40, 
        heightPreset: 'full',
        animation: 'fade-in'
      },
      nodes: ['hero-cont-w'],
      parent: 'ROOT'
    },
    'hero-cont-w': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'text-center' },
      nodes: ['hero-h-w', 'hero-btns-w'],
      parent: 'hero-w'
    },
    'hero-h-w': { 
      type: { resolvedName: 'Heading' }, 
      props: { 
        text: 'HEALING BEGINS<br/>WITH THE BREATH', 
        level: 'h1', 
        fontSize: 72, 
        fontSize_mobile: 32,
        color: '#ffffff', 
        fontWeight: 'black',
        textAlign: 'center'
      }, 
      parent: 'hero-cont-w' 
    },
    'hero-btns-w': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex flex-col md:flex-row gap-4 justify-center mt-10' },
      nodes: ['btn-w-1', 'btn-w-2'],
      parent: 'hero-cont-w'
    },
    'btn-w-1': { type: { resolvedName: 'Button' }, props: { text: 'Get Started', color: '#ffffff', textColor: '#2C2C2C', borderRadius: 0, width: 'full', width_mobile: 'full' }, parent: 'hero-btns-w' },
    'btn-w-2': { type: { resolvedName: 'Button' }, props: { text: 'Learn More', variant: 'outline', color: '#ffffff', textColor: '#ffffff', borderRadius: 0, width: 'full', width_mobile: 'full' }, parent: 'hero-btns-w' },
    
    'intro-w': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { backgroundColor: '#EBE5D8', paddingTop: 120, paddingBottom: 120, paddingTop_mobile: 60, paddingBottom_mobile: 60 },
      nodes: ['intro-cont-w'],
      parent: 'ROOT'
    },
    'intro-cont-w': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'max-w-4xl mx-auto text-center px-6' },
      nodes: ['intro-h-w', 'intro-p-w'],
      parent: 'intro-w'
    },
    'intro-h-w': { 
      type: { resolvedName: 'Heading' }, 
      props: { text: 'The art & science of breathwork', level: 'h2', fontSize: 48, fontSize_mobile: 28, fontWeight: 'medium', color: '#3A4D39' }, 
      parent: 'intro-cont-w' 
    },
    'intro-p-w': { 
      type: { resolvedName: 'Paragraph' }, 
      props: { text: 'Explore the profound physiological and psychological benefits of conscious breathing. Our approach combines ancient wisdom with modern science to help you unlock your full potential.', fontSize: 18, fontSize_mobile: 15, color: '#4F4F4F', textAlign: 'center' }, 
      parent: 'intro-cont-w' 
    },

    'app-w': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { backgroundColor: '#DED6C7', paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 60, paddingBottom_mobile: 60 },
      nodes: ['app-h-w', 'app-grid-w'],
      parent: 'ROOT'
    },
    'app-h-w': { 
      type: { resolvedName: 'Heading' }, 
      props: { text: 'Your breathwork practice everywhere', level: 'h2', textAlign: 'center', fontSize: 42, fontSize_mobile: 24, color: '#3A4D39' }, 
      parent: 'app-w' 
    },
    'app-grid-w': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '3', gap: 40, gap_mobile: 20 },
      nodes: ['app-col-1', 'app-col-2', 'app-col-3'],
      parent: 'app-w'
    },
    'app-col-1': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex flex-col gap-8 md:gap-12 justify-center px-6' },
      nodes: ['app-f-1', 'app-f-2'],
      parent: 'app-grid-w'
    },
    'app-f-1': { type: { resolvedName: 'Heading' }, props: { text: 'Guided Sessions', level: 'h4', fontSize: 18, textAlign_mobile: 'center' }, parent: 'app-col-1' },
    'app-f-2': { type: { resolvedName: 'Heading' }, props: { text: 'Progress Tracking', level: 'h4', fontSize: 18, textAlign_mobile: 'center' }, parent: 'app-col-1' },
    
    'app-col-2': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex justify-center py-8' },
      nodes: ['app-img'],
      parent: 'app-grid-w'
    },
    'app-img': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c', width: 300, borderRadius: 40 }, parent: 'app-col-2' },
    
    'app-col-3': {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'flex flex-col gap-8 md:gap-12 justify-center px-6 md:text-right text-center' },
      nodes: ['app-f-3', 'app-f-4'],
      parent: 'app-grid-w'
    },
    'app-f-3': { type: { resolvedName: 'Heading' }, props: { text: 'Daily Reminders', level: 'h4', fontSize: 18, textAlign_mobile: 'center' }, parent: 'app-col-3' },
    'app-f-4': { type: { resolvedName: 'Heading' }, props: { text: 'Global Community', level: 'h4', fontSize: 18, textAlign_mobile: 'center' }, parent: 'app-col-3' },

    'team-w': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { backgroundColor: '#F2EDE4', paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 60, paddingBottom_mobile: 60 },
      nodes: ['team-h-w', 'team-grid-w'],
      parent: 'ROOT'
    },
    'team-h-w': { type: { resolvedName: 'Heading' }, props: { text: 'Breathwork for every unique journey', level: 'h2', textAlign: 'center', fontSize: 42, fontSize_mobile: 24, color: '#3A4D39' }, parent: 'team-w' },
    'team-grid-w': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '4', gap: 20, gap_mobile: 10, padding: 20 },
      nodes: ['mem-1', 'mem-2', 'mem-3', 'mem-4'],
      parent: 'team-w'
    },
    'mem-1': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2', height: 400, height_mobile: 300, objectFit: 'cover' }, parent: 'team-grid-w' },
    'mem-2': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d', height: 400, height_mobile: 300, objectFit: 'cover' }, parent: 'team-grid-w' },
    'mem-3': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04', height: 400, height_mobile: 300, objectFit: 'cover' }, parent: 'team-grid-w' },
    'mem-4': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1554151228-14d9def656e4', height: 400, height_mobile: 300, objectFit: 'cover' }, parent: 'team-grid-w' },

    'journal-w': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { backgroundColor: '#ffffff', paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 60, paddingBottom_mobile: 60 },
      nodes: ['journal-h-w', 'journal-grid-w'],
      parent: 'ROOT'
    },
    'journal-h-w': { type: { resolvedName: 'Heading' }, props: { text: 'Rise', level: 'h2', fontSize: 56, fontSize_mobile: 42, fontWeight: 'black', color: '#3A4D39', textAlign_mobile: 'center' }, parent: 'journal-w' },
    'journal-grid-w': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '3', gap: 30, gap_mobile: 20, padding: 20 },
      nodes: ['post-1', 'post-2', 'post-3'],
      parent: 'journal-w'
    },
    'post-1': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc', height: 300, objectFit: 'cover' }, parent: 'journal-grid-w' },
    'post-2': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d', height: 300, objectFit: 'cover' }, parent: 'journal-grid-w' },
    'post-3': { type: { resolvedName: 'UserImage' }, props: { src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05', height: 300, objectFit: 'cover' }, parent: 'journal-grid-w' },

    'footer-w': {
      type: { resolvedName: 'Footer' },
      props: { 
        backgroundColor: '#1B1B1B', 
        textColor: '#ffffff', 
        accentColor: '#DED6C7',
        brandName: 'ETHER',
        description: 'Holistic breathwork and wellness practices for the modern soul.'
      },
      parent: 'ROOT'
    }
  })
};
