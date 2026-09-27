import { describe, it, expect } from 'vitest';
import { checkEmailContent, visibleWordCount } from './emailContentCheck';
import { compileCampaignHtml, type EmailBlock } from './emailRenderer';

// Every case goes through the real renderer, so the check is tested on the HTML recipients get.
const brand = { logoUrl: 'https://cdn.example.com/logo.png', brandColorPrimary: '#2563eb' };
const compile = (blocks: EmailBlock[]) => compileCampaignHtml(blocks, brand, 'A short preheader that should not count');
const codes = (blocks: EmailBlock[]) => checkEmailContent(compile(blocks)).warnings.map((w) => w.code);

const HERO_IMAGE = 'https://cdn.example.com/hero.png';

// The exact shape of the real campaign that landed in Gmail spam on 2026-09-27.
const thinHero: EmailBlock = {
  id: 'h',
  type: 'hero',
  content: {
    imageUrl: HERO_IMAGE,
    imageAlt: 'logo',
    headline: 'Special Announcement',
    subheadline: 'Hi {{first_name}}, discover the latest additions to the {{company}} dashboard.',
    buttonText: 'Get Started',
    buttonUrl: 'https://example.com',
  },
};

const PARAGRAPH =
  'Enrolment for our spring courses closes this Friday. This term we are adding two new evening ' +
  'classes for working teachers, a weekend intensive for beginners, and one-to-one coaching for ' +
  'anyone preparing for an interview abroad. Every course includes feedback on your lesson plans ' +
  'and a certificate you can share with schools. Reply to this email if you have questions about ' +
  'which course fits you best.';

describe('checkEmailContent', () => {
  it('flags the real spam-placed shape: one full-width image and a line of text', () => {
    const r = checkEmailContent(compile([thinHero]));
    expect(r.largeImages).toBe(1);
    expect(r.words).toBeLessThan(50);
    expect(r.warnings.map((w) => w.code)).toEqual(['low_text', 'image_heavy']);
  });

  it('does not flag a normal campaign: the same hero plus a real paragraph', () => {
    const r = checkEmailContent(compile([thinHero, { id: 't', type: 'text', content: { body: PARAGRAPH } }]));
    expect(r.words).toBeGreaterThanOrEqual(60);
    expect(r.warnings).toEqual([]);
  });

  it('does not flag a text-only campaign of ordinary length', () => {
    expect(codes([{ id: 't', type: 'text', content: { body: PARAGRAPH } }])).toEqual([]);
  });

  it('does not flag a features + CTA campaign with real copy', () => {
    const features: EmailBlock = {
      id: 'f',
      type: 'features',
      content: {
        columns: [
          { title: 'Evening classes', description: 'Two new weekday evening groups for teachers who work during the day.' },
          { title: 'Weekend intensive', description: 'A two-day beginners course covering lesson planning and classroom management.' },
          { title: 'Interview coaching', description: 'One-to-one sessions to prepare for interviews with schools abroad.' },
        ],
      },
    };
    const r = checkEmailContent(
      compile([
        { id: 't', type: 'text', content: { body: 'Hi {{first_name}}, here is what is new this term at the academy.' } },
        features,
        { id: 'c', type: 'cta', content: { text: 'See the timetable', url: 'https://example.com' } },
      ]),
    );
    expect(r.warnings).toEqual([]);
  });

  it('warns on a short text-only email but not as image-heavy', () => {
    expect(codes([{ id: 't', type: 'text', content: { body: 'Quick reminder: our webinar starts tomorrow at 10am.' } }])).toEqual(['low_text']);
  });

  it('flags image-heavy even with 50+ words when two large images carry the email', () => {
    const img = (id: string): EmailBlock => ({ ...thinHero, id, content: { ...thinHero.content, subheadline: PARAGRAPH.slice(0, 200) } });
    const r = checkEmailContent(compile([img('a'), img('b')]));
    expect(r.largeImages).toBe(2);
    expect(r.words).toBeGreaterThanOrEqual(50);
    expect(r.warnings.map((w) => w.code)).toEqual(['image_heavy']);
  });

  it('ignores the logo row, preheader and footer boilerplate', () => {
    const html = compile([{ id: 't', type: 'text', content: { body: 'One two three four five.' } }]);
    expect(html).toContain('logo.png'); // the brand logo is rendered…
    const r = checkEmailContent(html);
    expect(r.words).toBe(5); // …but only the sender's own five words count
    expect(r.largeImages).toBe(0);
  });

  it('counts the Outlook-only duplicate button once', () => {
    const r = checkEmailContent(compile([{ id: 'c', type: 'cta', content: { text: 'Book now', url: '#' } }]));
    expect(r.words).toBe(2);
  });

  it('handles empty or missing HTML', () => {
    expect(checkEmailContent('').warnings.map((w) => w.code)).toEqual(['low_text']);
    expect(checkEmailContent(null).words).toBe(0);
  });
});

describe('visibleWordCount', () => {
  it('ignores tags, entities, numbers and punctuation; counts merge tags as words', () => {
    expect(visibleWordCount('<p>Hi&nbsp;{{first_name}}, 2026 &mdash; <b>sale</b> -- ends!</p>')).toBe(4);
  });
});
