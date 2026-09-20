import { describe, it, expect } from 'vitest';
import { compileCampaignHtml, renderEmailLayout, parsePersonalTokens } from '@/lib/builder/emailRenderer';

const kit: any = { brandColorPrimary: '#2563eb', brandFontDefault: 'Inter', logoUrl: null };
const blocks: any = [
  { id: 'h', type: 'hero', content: { imageUrl: 'https://x/y.png', imageAlt: 'a', headline: 'Hello', subheadline: 'Hi {{first_name}} at {{company}}', buttonText: 'Go', buttonUrl: 'https://x' }, conditions: { tag: '', visibility: 'show' } },
  { id: 't', type: 'text', content: { body: 'Dear {{first_name}} {{last_name}}, invoice {{invoice_amount_zar}}' }, conditions: { tag: '', visibility: 'show' } },
];

describe('compileCampaignHtml (shared by Save design and Send/Schedule)', () => {
  it('is byte-identical to what "Save design" produced (skipPersonalization=true)', () => {
    expect(compileCampaignHtml(blocks, kit, 'pre')).toBe(renderEmailLayout(blocks, kit, {}, {}, 'pre', true));
  });

  it('keeps every token intact, including the unsubscribe link', () => {
    const html = compileCampaignHtml(blocks, kit);
    expect(html).toContain('href="{{unsubscribe_link}}"');
    expect(html).toContain('{{first_name}}');
    expect(html).not.toContain('Valued Customer');
    expect(html).not.toContain('href=""');
  });

  it('worker-side personalization then populates link and tokens per recipient', () => {
    const link = 'https://app/public/unsubscribe?email=a%40b.c&workspace_id=w&token=t';
    const out = parsePersonalTokens(compileCampaignHtml(blocks, kit), { first_name: 'Ada', last_name: 'L', company: 'Acme', email: 'a@b.c' }, { unsubscribe_link: link });
    expect(out).toContain(`href="${link}"`);
    expect(out).toContain('Hi Ada at Acme');
    expect(out).not.toMatch(/\{\{/);
  });
});
