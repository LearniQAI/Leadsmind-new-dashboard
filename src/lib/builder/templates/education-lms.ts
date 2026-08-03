import { BuilderTemplate } from '../templates';

export const educationLms: BuilderTemplate = {
  id: 'education-lms',
  name: 'Course Master Pro',
  description: 'High-conversion sales page for online courses and coaches, with a real curriculum breakdown, student results, pricing, and FAQ.',
  category: 'Education',
  type: 'funnel',
  step_type: 'sales_page',
  thumbnail: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-[#f8fafc]' },
      nodes: ['hero-8', 'logos-8', 'features-8', 'testimonial-8', 'pricing-8', 'faq-8', 'footer-8']
    },
    'hero-8': {
      type: { resolvedName: 'Hero' },
      isCanvas: true,
      props: { layout: 'split', backgroundColor: '#ffffff', heightPreset: 'large' },
      nodes: ['h8-cont'],
      parent: 'ROOT'
    },
    'h8-cont': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'px-6' }, nodes: ['h8-h', 'h8-p', 'h8-btn'], parent: 'hero-8' },
    'h8-h': { type: { resolvedName: 'Heading' }, props: { text: 'Master Your Craft.', level: 'h1', className: 'text-4xl md:text-6xl font-black text-indigo-900 mb-6' }, parent: 'h8-cont' },
    'h8-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'The ultimate blueprint to scaling your digital business from zero to $100k.', className: 'text-lg md:text-xl text-indigo-600/60 mb-8' }, parent: 'h8-cont' },
    'h8-btn': { type: { resolvedName: 'UserButton' }, props: { text: 'Enroll Now - 50% Off', className: 'bg-indigo-600 rounded-xl h-14 text-lg' }, parent: 'h8-cont' },

    'logos-8': {
      type: { resolvedName: 'LogoStrip' },
      props: {
        title: 'Featured in',
        grayscale: true,
        backgroundColor: '#ffffff',
        logos: [
          { src: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?q=80&w=200&auto=format&fit=crop', alt: 'Forbes' },
          { src: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=200&auto=format&fit=crop', alt: 'Entrepreneur' },
          { src: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=200&auto=format&fit=crop', alt: 'Business Insider' },
          { src: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=200&auto=format&fit=crop', alt: 'Fast Company' }
        ]
      },
      parent: 'ROOT'
    },

    'features-8': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { paddingTop: 100, paddingBottom: 100, paddingTop_mobile: 50, paddingBottom_mobile: 50, backgroundColor: '#ffffff' },
      nodes: ['feat-h-8', 'feat-grid-8'],
      parent: 'ROOT'
    },
    'feat-h-8': { type: { resolvedName: 'Heading' }, props: { text: "What You'll Learn", level: 'h2', className: 'text-center text-3xl md:text-4xl font-black text-indigo-900 mb-16' }, parent: 'features-8' },
    'feat-grid-8': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '3', gap: 40 },
      nodes: ['feat-col-1', 'feat-col-2', 'feat-col-3'],
      parent: 'features-8'
    },
    'feat-col-1': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'p-6 bg-indigo-50 rounded-2xl' }, nodes: ['f1-h', 'f1-p'], parent: 'feat-grid-8' },
    'f1-h': { type: { resolvedName: 'Heading' }, props: { text: 'Module 1: Foundations', level: 'h4', color: '#312e81', className: 'text-lg font-bold mb-3' }, parent: 'feat-col-1' },
    'f1-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Set up the systems and mindset that separate six-figure businesses from side projects.', color: '#4338ca' }, parent: 'feat-col-1' },
    'feat-col-2': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'p-6 bg-indigo-50 rounded-2xl' }, nodes: ['f2-h', 'f2-p'], parent: 'feat-grid-8' },
    'f2-h': { type: { resolvedName: 'Heading' }, props: { text: 'Module 2: Growth Engine', level: 'h4', color: '#312e81', className: 'text-lg font-bold mb-3' }, parent: 'feat-col-2' },
    'f2-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Build repeatable acquisition channels so revenue growth stops depending on you personally.', color: '#4338ca' }, parent: 'feat-col-2' },
    'feat-col-3': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'p-6 bg-indigo-50 rounded-2xl' }, nodes: ['f3-h', 'f3-p'], parent: 'feat-grid-8' },
    'f3-h': { type: { resolvedName: 'Heading' }, props: { text: 'Module 3: Scale & Systemize', level: 'h4', color: '#312e81', className: 'text-lg font-bold mb-3' }, parent: 'feat-col-3' },
    'f3-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Delegate, automate, and step out of the day-to-day without losing momentum.', color: '#4338ca' }, parent: 'feat-col-3' },

    'testimonial-8': {
      type: { resolvedName: 'Testimonial' },
      props: {
        quote: 'I went from $4k to $38k months in under a year using exactly the framework taught here. This is the course I wish existed when I started.',
        author: 'Priya Anand',
        title: 'Founder, Anand Studio',
        image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
        backgroundColor: '#eef2ff',
        textColor: '#312e81',
        accentColor: '#4f46e5',
        borderRadius: 24,
        padding: 48,
        textAlign: 'center',
        borderOpacity: 10
      },
      parent: 'ROOT'
    },

    'pricing-8': {
      type: { resolvedName: 'PricingTable' },
      props: {
        primaryColor: '#4f46e5',
        accentColor: '#f59e0b',
        backgroundColor: '#ffffff',
        textColor: '#1e1b4b',
        plans: [
          { name: 'Self-Paced', price: '$497', period: 'one-time', description: 'Full course access, learn on your schedule', features: ['12 video modules', 'Downloadable templates', 'Private community access'], buttonText: 'Enroll Now', highlight: false },
          { name: 'Coached', price: '$1,997', period: 'one-time', description: 'Everything in Self-Paced, plus live support', features: ['Everything in Self-Paced', '4 live coaching calls', 'Direct feedback on your work', 'Lifetime updates'], buttonText: 'Enroll Now - 50% Off', highlight: true }
        ]
      },
      parent: 'ROOT'
    },
    'faq-8': {
      type: { resolvedName: 'FAQ' },
      props: {
        items: [
          { question: 'How long do I have access to the course?', answer: 'Lifetime access, including all future updates to the curriculum at no extra cost.' },
          { question: 'What if this isn’t right for me?', answer: 'We offer a 14-day money-back guarantee, no questions asked.' },
          { question: 'Do I need prior experience?', answer: 'No — the course starts from foundations and builds up, so it works for complete beginners and experienced operators alike.' },
          { question: 'Is there ongoing support after I finish?', answer: 'Yes, all students get access to our private community for as long as the course exists.' }
        ]
      },
      parent: 'ROOT'
    },
    'footer-8': {
      type: { resolvedName: 'Footer' },
      props: {
        brandName: 'Course Master Pro',
        description: 'The blueprint for scaling your digital business.',
        backgroundColor: '#1e1b4b',
        textColor: '#ffffff',
        accentColor: '#a5b4fc',
        columns: [
          { title: 'Course', links: [{ label: 'Curriculum', href: '#features' }, { label: 'Pricing', href: '#pricing' }] },
          { title: 'Support', links: [{ label: 'FAQ', href: '#faq' }, { label: 'Contact', href: 'mailto:support@coursemasterpro.com' }] }
        ]
      },
      parent: 'ROOT'
    }
  })
};
