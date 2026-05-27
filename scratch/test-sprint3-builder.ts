import { renderEmailLayout, EmailBlock } from '../src/lib/builder/emailRenderer';

const mockBrandKit = {
  logoUrl: 'https://leadsmind.io/logo.png',
  brandColorPrimary: '#2563eb',
  brandColorSecondary: '#080f28',
  brandFontDefault: 'Outfit'
};

const mockContact = {
  first_name: 'Sibongile',
  company: 'LeadsMind ZAR',
  tags: ['Existing Client']
};

const mockBlocks: EmailBlock[] = [
  {
    id: '1',
    type: 'hero',
    content: {
      imageUrl: 'https://leadsmind.io/banner.png',
      imageAlt: 'Branded Banner',
      headline: 'Special Deal',
      subheadline: 'Hi {{first_name}}, check out our deal for {{company}}!',
      buttonText: 'Claim',
      buttonUrl: 'https://leadsmind.io'
    }
  },
  {
    id: '2',
    type: 'text',
    content: {
      body: 'Your total ZAR amount is {{invoice_amount_zar}}.'
    }
  },
  {
    id: '3',
    type: 'testimonial',
    content: {
      quote: 'Great service!',
      author: 'Marcus Aurelius',
      avatarUrl: '',
      avatarAlt: ''
    },
    conditions: {
      tag: 'Existing Client',
      visibility: 'show'
    }
  },
  {
    id: '4',
    type: 'testimonial',
    content: {
      quote: 'Exclusive client only offer!',
      author: 'Julius Caesar',
      avatarUrl: '',
      avatarAlt: ''
    },
    conditions: {
      tag: 'New Lead',
      visibility: 'show' // This should be hidden since the contact has Existing Client tag
    }
  }
];

console.log('--- STARTING EMAIL RENDERER TEST ---');

// Render the template
const renderedHtml = renderEmailLayout(mockBlocks, mockBrandKit, mockContact, {
  invoice_amount_zar: 'R 7,500.00'
});

console.log('Checking variable substitutions...');
if (renderedHtml.includes('Hi Sibongile') && renderedHtml.includes('LeadsMind ZAR') && renderedHtml.includes('R 7,500.00')) {
  console.log('✅ Regex token substitutions successful.');
} else {
  console.error('❌ Regex token substitutions failed.');
}

console.log('Checking conditional visibility rules...');
if (renderedHtml.includes('Marcus Aurelius') && !renderedHtml.includes('Julius Caesar')) {
  console.log('✅ Conditional visibility evaluation successful.');
} else {
  console.error('❌ Conditional visibility evaluation failed.');
}

console.log('Checking HTML responsive layouts structure...');
if (renderedHtml.includes('<table') && renderedHtml.includes('Outfit') && renderedHtml.includes('https://leadsmind.io/logo.png')) {
  console.log('✅ HTML compilation structure validated.');
} else {
  console.error('❌ HTML compilation structure failed.');
}

console.log('--- EMAIL RENDERER TEST COMPLETE ---');
