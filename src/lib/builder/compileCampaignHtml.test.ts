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

  // 2026-09-27 deliverability + CAN-SPAM audit: the footer used to be flat "LeadsMind Campaign
  // Engine" / "© LeadsMind Inc" branding with no postal address at all, on every customer's email.
  describe('footer identity (never the platform brand; CAN-SPAM postal address)', () => {
    it('shows the sending workspace\'s own name and address, HTML-escaped, never "LeadsMind"', () => {
      const html = compileCampaignHtml(blocks, { ...kit, senderName: 'Acme <Co> & "Sons"', postalAddress: '123 Main St & Co' });
      expect(html).toContain('Sent by Acme &lt;Co&gt; &amp; &quot;Sons&quot;.');
      expect(html).toContain(`&copy; ${new Date().getFullYear()} Acme &lt;Co&gt; &amp; &quot;Sons&quot;.`);
      expect(html).toContain('123 Main St &amp; Co');
      // The <title> tag (never shown to the recipient) is unrelated; only the footer branding bug
      // is asserted here — it used to hardcode "LeadsMind Campaign Engine" / "LeadsMind Inc.".
      expect(html).not.toContain('LeadsMind Campaign Engine');
      expect(html).not.toContain('LeadsMind Inc');
    });

    it('falls back to a visible placeholder, not a blank/omitted line, when unset (on-screen preview only — sending is refused without one)', () => {
      const html = compileCampaignHtml(blocks, kit);
      expect(html).toContain('Sent by this sender.');
      expect(html).toContain('Postal address not yet set');
    });
  });
});
