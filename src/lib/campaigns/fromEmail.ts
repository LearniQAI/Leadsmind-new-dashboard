// A campaign is sent either through the workspace's LeadsMind-managed sending
// domain or its own Resend account (BYO); both only accept From addresses on a
// domain verified for that workspace. Platform-owned
// domains therefore can't be assumed valid for a customer:
//  - resend.dev is Resend's sandbox (delivers only to the account owner) — never valid.
//  - leadsmind.io is valid ONLY for a workspace whose own Resend provider is
//    configured with a leadsmind.io From (i.e. the platform's own workspace,
//    whose Resend account really owns that domain). For any other workspace a
//    leadsmind.io From can never authenticate, so it is rejected, not substituted.
const PLATFORM_DOMAINS = new Set(['leadsmind.io', 'resend.dev']);

const domainOf = (email: string) => email.trim().split('@')[1]?.toLowerCase() ?? '';

export function isPlatformSenderDomain(domain: string): boolean {
  return PLATFORM_DOMAINS.has(domain.toLowerCase());
}

export function isUsableCampaignFromEmail(
  email: string | null | undefined,
  providerFrom?: string | null,
): email is string {
  if (!email) return false;
  const parts = email.trim().split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1].includes('.')) return false;
  const domain = parts[1].toLowerCase();
  if (!PLATFORM_DOMAINS.has(domain)) return true;
  return domain !== 'resend.dev' && !!providerFrom && domainOf(providerFrom) === domain;
}

/**
 * First usable address among the campaign's own From and the workspace
 * provider's configured From (required when the provider is saved). Returns
 * null when neither is usable — callers must surface an error, not guess.
 */
export function resolveCampaignFromEmail(
  campaignFrom: string | null | undefined,
  providerFrom: string | null | undefined,
): string | null {
  for (const c of [campaignFrom, providerFrom]) if (isUsableCampaignFromEmail(c, providerFrom)) return c.trim();
  return null;
}

export const FROM_EMAIL_REQUIRED_MESSAGE =
  "Set a From email on your verified sending domain (Settings › Domains) before sending. Platform addresses like hello@leadsmind.io can't be used as your From address.";

export const NO_SENDER_MESSAGE =
  'Verify a sending domain in Settings › Domains (or connect your own Resend account) before sending email.';
