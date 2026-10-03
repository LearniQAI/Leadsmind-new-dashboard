// Meta "mock" mode: lets local development and tests exercise the Meta connect + send paths without real
// Meta credentials. It is OFF unless META_MOCK_MODE === 'true', and it can never be on in production,
// whatever the env says. In production a `mock_` id/token is rejected, never treated as a working connection
// (a mock connection reports every send as successful while nothing leaves the building).
export function isMetaMockMode(): boolean {
  return process.env.META_MOCK_MODE === 'true' && process.env.NODE_ENV !== 'production';
}

export function isMockValue(v: unknown): boolean {
  return typeof v === 'string' && v.startsWith('mock_');
}

export const MOCK_CREDENTIALS_REJECTED =
  'Test credentials (starting with "mock_") are not accepted. Enter your real Meta credentials.';
export const META_NOT_CONFIGURED =
  'Meta sign-in is not configured on this server. Connecting is unavailable until it is set up.';
