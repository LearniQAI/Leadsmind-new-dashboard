// User-facing copy for the ?error=<code> values the social OAuth callbacks redirect with
// (see OAuthFailureCode in socialOAuth.ts). Unknown codes fall back to a generic message so a
// tampered query string can never inject text into the page.
export const CONNECT_TIMEOUT_MS = 90_000;
export const CONNECT_POLL_MS = 3_000;

export const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Authorization was cancelled or denied, so nothing was connected.',
  timeout: "didn't respond in time. Please try again.",
  provider_error: 'rejected the connection. Please try again.',
  invalid_state: 'This authorization link expired or was already used. Start the connection again.',
  no_page: 'No Facebook Page was found on that account. A Page is required to connect Facebook or Instagram.',
  save_failed: "We couldn't save the connection. Please try again.",
  no_channel: 'No YouTube channel was found on that Google account. Create a channel first, then try again.',
  webhook_failed: "Connected, but Meta didn't confirm message delivery for this Page. Reconnect to fix it.",
  missing_parameters: 'The authorization response was incomplete. Please try again.',
};

// Codes whose copy continues a sentence that starts with the platform name.
const PLATFORM_PREFIXED = new Set(['timeout', 'provider_error']);

export function connectErrorMessage(platform: string, code: string | null): string {
  const label = PLATFORM_LABELS[platform] ?? 'The provider';
  const known = code ? ERROR_MESSAGES[code] : undefined;
  if (!known) return `Couldn't connect ${label}. Please try again.`;
  return PLATFORM_PREFIXED.has(code!) ? `${label} ${known}` : known;
}

export function connectSuccessMessage(platform: string): string {
  return `${PLATFORM_LABELS[platform] ?? 'Account'} connected.`;
}

export const DISCOVERY_FAILED_MESSAGE = 'Instagram/WhatsApp not found yet — reconnect Facebook to retry.';
