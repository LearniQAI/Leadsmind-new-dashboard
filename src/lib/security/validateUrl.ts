export class UrlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UrlValidationError';
  }
}

/**
 * Validates a user-supplied URL to prevent SSRF attacks.
 * Call this before any server-side fetch() of a user-provided URL.
 *
 * @throws UrlValidationError if URL is invalid or points to
 *         private/internal network
 */
export function validateExternalUrl(url: string): URL {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new UrlValidationError('Invalid URL format');
  }

  // Only allow HTTPS
  if (parsed.protocol !== 'https:') {
    throw new UrlValidationError(
      'Only HTTPS URLs are permitted'
    );
  }

  // Block private IPv4 ranges
  const PRIVATE_IP_RANGES =
    /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.|0\.)/;

  if (PRIVATE_IP_RANGES.test(parsed.hostname)) {
    throw new UrlValidationError(
      'Private IP addresses are not permitted'
    );
  }

  // Block localhost variants. IPv6 hostnames come back bracketed
  // from the URL parser (e.g. "[::1]"), and IPv6 loopback/any-address
  // literals are canonicalized to "::1" / "::" regardless of the
  // input form (e.g. "0000::1" -> "::1"), so bracketed forms cover them.
  const BLOCKED_HOSTS = [
    'localhost',
    '0.0.0.0',
    '[::1]',
    '[::]',
  ];

  if (BLOCKED_HOSTS.includes(parsed.hostname.toLowerCase())) {
    throw new UrlValidationError(
      'Localhost URLs are not permitted'
    );
  }

  // Block AWS/GCP/Azure metadata endpoints
  if (
    parsed.hostname === '169.254.169.254' ||
    parsed.hostname === 'metadata.google.internal'
  ) {
    throw new UrlValidationError(
      'Cloud metadata endpoints are not permitted'
    );
  }

  return parsed;
}
