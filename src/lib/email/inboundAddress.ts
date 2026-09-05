/**
 * Per-workspace inbound-email receiving address (Email Channel Part 1).
 *
 * Format: `{workspace-slug}@{INBOUND_EMAIL_DOMAIN}` — the same "identifier in
 * the local-part of a shared receiving domain" scheme already proven live for
 * the Email→SMS bridge (`+<phone>@sms.leadsmind.io`, see
 * docs/EMAIL_SMS_BRIDGE.md), reusing `workspaces.slug` (already globally
 * unique) rather than adding a new column or attempting per-workspace custom
 * receiving domains (a much larger DNS/ops undertaking not needed here).
 *
 * Real, separate ops step still required before this works in production:
 * MX records for INBOUND_EMAIL_DOMAIN must point at Resend's inbound servers
 * (same as the existing sms.leadsmind.io setup), and a Resend inbound webhook
 * must be configured for `email.received` on that domain. See
 * docs/EMAIL_SMS_BRIDGE.md for the sibling setup this mirrors.
 */

export const INBOUND_EMAIL_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN || 'inbox.leadsmind.io';

/** Builds the receiving address a workspace's contacts should reply to. */
export function workspaceInboundAddress(slug: string): string {
  return `${slug}@${INBOUND_EMAIL_DOMAIN}`;
}

const ADDRESS_PATTERN = new RegExp(`^([a-z0-9-]+)@${INBOUND_EMAIL_DOMAIN.replace(/\./g, '\\.')}$`, 'i');

/**
 * Extracts the workspace slug from a candidate `To` / `Delivered-To` address,
 * or null if the address isn't on our receiving domain. Case-insensitive —
 * email local-parts are conventionally treated case-insensitively in practice
 * even though RFC 5321 technically allows case-sensitivity.
 */
export function extractWorkspaceSlugFromAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const match = String(address).trim().match(ADDRESS_PATTERN);
  return match ? match[1].toLowerCase() : null;
}

/** Parses a display name out of an RFC 5322 "From" header value, if present. */
export function parseFromHeader(from: string | null | undefined): { name: string | null; email: string | null } {
  if (!from) return { name: null, email: null };
  const trimmed = from.trim();
  const angleMatch = trimmed.match(/^(.*?)<([^>]+)>$/);
  if (angleMatch) {
    const name = angleMatch[1].trim().replace(/^["']|["']$/g, '');
    return { name: name || null, email: angleMatch[2].trim().toLowerCase() || null };
  }
  return { name: null, email: trimmed.toLowerCase() || null };
}
