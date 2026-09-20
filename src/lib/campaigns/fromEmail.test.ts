import { describe, it, expect } from 'vitest';
import { resolveCampaignFromEmail, isUsableCampaignFromEmail } from '@/lib/campaigns/fromEmail';
describe('resolveCampaignFromEmail', () => {
  it('rejects sandbox and malformed addresses always', () => {
    for (const e of ['onboarding@resend.dev', 'nope', 'a@b', '', null, undefined])
      expect(isUsableCampaignFromEmail(e as any, 'onboarding@resend.dev')).toBe(false);
  });
  it('rejects leadsmind.io unless the workspace provider itself sends from leadsmind.io', () => {
    expect(isUsableCampaignFromEmail('hello@leadsmind.io', 'me@acme.com')).toBe(false);
    expect(isUsableCampaignFromEmail('x@LEADSMIND.IO', null)).toBe(false);
    expect(isUsableCampaignFromEmail('hello@leadsmind.io', 'support@leadsmind.io')).toBe(true);
  });
  it('prefers campaign From, falls back to provider From, else null', () => {
    expect(resolveCampaignFromEmail('a@acme.com', 'b@acme.com')).toBe('a@acme.com');
    expect(resolveCampaignFromEmail('hello@leadsmind.io', 'b@acme.com')).toBe('b@acme.com');
    expect(resolveCampaignFromEmail(null, 'onboarding@resend.dev')).toBeNull();
    expect(resolveCampaignFromEmail(null, 'support@leadsmind.io')).toBe('support@leadsmind.io');
  });
});
