import { BuilderTemplate } from '../templates';

export const medicalCare: BuilderTemplate = {
  id: 'medical-care',
  name: 'Safe Hands Healthcare',
  description: 'Trust-focused landing page for clinics and dental practices, with a real services grid, patient testimonial, and booking form.',
  category: 'Healthcare',
  type: 'website',
  thumbnail: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d',
  content: JSON.stringify({
    ROOT: {
      type: { resolvedName: 'Container' },
      isCanvas: true,
      props: { className: 'min-h-screen bg-white' },
      nodes: ['nav-6', 'hero-6', 'services-6', 'testimonial-6', 'booking-6', 'footer-6']
    },
    'nav-6': {
      type: { resolvedName: 'Navbar' },
      props: {
        brandName: 'SAFE HANDS',
        backgroundColor: '#ffffff',
        textColor: '#0c4a6e',
        sticky: true,
        padding: 20,
        showButton: true,
        buttonText: 'Book Appointment',
        buttonBg: '#0284c7',
        buttonTextColor: '#ffffff',
        links: [
          { label: 'Services', href: '#services' },
          { label: 'Book', href: '#booking' },
          { label: 'Contact', href: '#contact' }
        ]
      },
      parent: 'ROOT'
    },
    'hero-6': {
      type: { resolvedName: 'Hero' },
      isCanvas: true,
      props: { layout: 'split', backgroundColor: '#f0f9ff', heightPreset: 'large' },
      nodes: ['h6-cont'],
      parent: 'ROOT'
    },
    'h6-cont': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'px-6' }, nodes: ['h6-h', 'h6-p', 'h6-btn'], parent: 'hero-6' },
    'h6-h': { type: { resolvedName: 'Heading' }, props: { text: 'Modern Care, Personal Touch.', level: 'h1', className: 'text-4xl md:text-5xl font-bold text-sky-900 mb-6' }, parent: 'h6-cont' },
    'h6-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Comprehensive medical services designed around your family\'s well-being.', className: 'text-base md:text-lg text-slate-600 mb-8' }, parent: 'h6-cont' },
    'h6-btn': { type: { resolvedName: 'UserButton' }, props: { text: 'Book Appointment', className: 'bg-sky-600 rounded-lg h-12' }, parent: 'h6-cont' },

    'services-6': {
      type: { resolvedName: 'Section' },
      isCanvas: true,
      props: { paddingTop: 80, paddingBottom: 80, paddingTop_mobile: 40, paddingBottom_mobile: 40, backgroundColor: '#ffffff' },
      nodes: ['serv-h-6', 'serv-grid-6'],
      parent: 'ROOT'
    },
    'serv-h-6': { type: { resolvedName: 'Heading' }, props: { text: 'Our Services', level: 'h2', color: '#0c4a6e', className: 'text-center text-3xl md:text-4xl font-bold mb-16' }, parent: 'services-6' },
    'serv-grid-6': {
      type: { resolvedName: 'Columns' },
      isCanvas: true,
      props: { layout: '3', gap: 32 },
      nodes: ['sv6-col-1', 'sv6-col-2', 'sv6-col-3'],
      parent: 'services-6'
    },
    'sv6-col-1': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'p-6 bg-sky-50 rounded-2xl' }, nodes: ['sv6-1-h', 'sv6-1-p'], parent: 'serv-grid-6' },
    'sv6-1-h': { type: { resolvedName: 'Heading' }, props: { text: 'Family Medicine', level: 'h4', color: '#0c4a6e', className: 'text-lg font-bold mb-3' }, parent: 'sv6-col-1' },
    'sv6-1-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Comprehensive primary care for every stage of life, from checkups to chronic care.', color: '#334155' }, parent: 'sv6-col-1' },
    'sv6-col-2': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'p-6 bg-sky-50 rounded-2xl' }, nodes: ['sv6-2-h', 'sv6-2-p'], parent: 'serv-grid-6' },
    'sv6-2-h': { type: { resolvedName: 'Heading' }, props: { text: 'Dental Care', level: 'h4', color: '#0c4a6e', className: 'text-lg font-bold mb-3' }, parent: 'sv6-col-2' },
    'sv6-2-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Preventive and restorative dentistry from a team that puts you at ease.', color: '#334155' }, parent: 'sv6-col-2' },
    'sv6-col-3': { type: { resolvedName: 'Container' }, isCanvas: true, props: { className: 'p-6 bg-sky-50 rounded-2xl' }, nodes: ['sv6-3-h', 'sv6-3-p'], parent: 'serv-grid-6' },
    'sv6-3-h': { type: { resolvedName: 'Heading' }, props: { text: 'Pediatric Care', level: 'h4', color: '#0c4a6e', className: 'text-lg font-bold mb-3' }, parent: 'sv6-col-3' },
    'sv6-3-p': { type: { resolvedName: 'Paragraph' }, props: { text: 'Gentle, attentive care for infants through teens, with same-day sick visits.', color: '#334155' }, parent: 'sv6-col-3' },

    'testimonial-6': {
      type: { resolvedName: 'Testimonial' },
      props: {
        quote: 'From the front desk to the exam room, everyone here is patient and genuinely caring. Our whole family sees Safe Hands now.',
        author: 'Monica Reyes',
        title: 'Patient since 2021',
        image: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e',
        backgroundColor: '#f0f9ff',
        textColor: '#0c4a6e',
        accentColor: '#0284c7',
        borderRadius: 24,
        padding: 48,
        textAlign: 'center',
        borderOpacity: 10
      },
      parent: 'ROOT'
    },

    'booking-6': {
      type: { resolvedName: 'Form' },
      props: {
        title: 'New Patient Registration',
        buttonText: 'Request Appointment',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 40,
        gap: 16,
        labelColor: '#0c4a6e',
        inputBg: '#f8fafc',
        inputBorderColor: '#e2e8f0',
        inputTextColor: '#0f172a',
        buttonBg: '#0284c7',
        buttonTextColor: '#ffffff',
        fields: [
          { id: 'name', type: 'text', label: 'Full Name', placeholder: 'Jane Doe', required: true, mapping: 'first_name' },
          { id: 'email', type: 'email', label: 'Email Address', placeholder: 'jane@email.com', required: true, mapping: 'email' },
          { id: 'phone', type: 'tel', label: 'Phone Number', placeholder: '(555) 123-4567', required: true, mapping: 'phone' },
          { id: 'reason', type: 'textarea', label: 'Reason for Visit', placeholder: 'Briefly describe your reason for visiting...', required: false, mapping: 'custom' }
        ]
      },
      parent: 'ROOT'
    },

    'footer-6': {
      type: { resolvedName: 'Footer' },
      props: {
        brandName: 'SAFE HANDS',
        description: 'Comprehensive medical services for your family\'s well-being.',
        backgroundColor: '#0c4a6e',
        textColor: '#ffffff',
        accentColor: '#7dd3fc',
        columns: [
          { title: 'Care', links: [{ label: 'Services', href: '#services' }, { label: 'Book a visit', href: '#booking' }] },
          { title: 'Clinic', links: [{ label: 'Contact', href: 'mailto:hello@safehandsclinic.com' }, { label: 'Insurance', href: '#' }] }
        ]
      },
      parent: 'ROOT'
    }
  })
};
