import { describe, it, expect } from 'vitest';
import { buildAutomationEmail, isPermanentEmailError } from '@/lib/automation/automationEmail';

const LINK = 'https://app.test/public/unsubscribe?email=a%40x.com&workspace_id=w1&token=abc';
const contact = { first_name: 'Ada', last_name: 'L', company: 'Acme', email: 'a@x.com' };

describe('buildAutomationEmail', () => {
  it('always includes the real signed unsubscribe link (footer appended when the author has none)', () => {
    const plain = buildAutomationEmail({ subject: 'Hi', body: 'Hello there' }, contact, LINK);
    expect(plain.html).toContain(`href="${LINK}"`);
    expect(plain.text).toContain(`Unsubscribe: ${LINK}`);
    const html = buildAutomationEmail({ subject: 'Hi', body: '<p>Hello</p>', isHtml: true }, contact, LINK);
    expect(html.html).toContain(`href="${LINK}"`);
    expect(html.html).not.toContain('{{');
  });

  it('does not add a second footer when the author placed {{unsubscribe_link}}', () => {
    const r = buildAutomationEmail({ subject: 'Hi', body: '<p><a href="{{unsubscribe_link}}">Opt out</a></p>', isHtml: true }, contact, LINK);
    expect(r.html.split(LINK).length - 1).toBe(1);
  });

  it('resolves first_name and the advertised contact.first_name tags, in subject and body', () => {
    const r = buildAutomationEmail({ subject: 'Hi {{contact.first_name}}', body: 'Dear {{first_name}} of {{company}}' }, contact, LINK);
    expect(r.subject).toBe('Hi Ada');
    expect(r.html).toContain('Dear Ada of Acme');
  });

  it('escapes contact values and plain-text bodies, and keeps line breaks', () => {
    const r = buildAutomationEmail({ subject: 's', body: 'Hi {{first_name}}\nbye <b>' }, { ...contact, first_name: '<script>x</script>' }, LINK);
    expect(r.html).not.toContain('<script>');
    expect(r.html).toContain('&lt;script&gt;');
    expect(r.html).toContain('<br>');
    expect(r.html).toContain('bye &lt;b&gt;');
  });
});

describe('isPermanentEmailError', () => {
  it('treats bad address / config failures as permanent (never worth retrying)', () => {
    for (const m of ['Contact has no email address', 'invalid recipient', 'Email delivery is unavailable for this workspace — connect a Resend account', 'Resend API key not configured', "Set a From email on a domain you've verified"]) {
      expect(isPermanentEmailError(new Error(m))).toBe(true);
    }
  });
  it('treats network / rate-limit / server failures as transient (retry with backoff)', () => {
    for (const m of ['fetch failed', 'Too many requests', 'Internal server error', 'ETIMEDOUT']) {
      expect(isPermanentEmailError(new Error(m))).toBe(false);
    }
  });
});
