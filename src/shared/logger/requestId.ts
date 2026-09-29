// UUID v4 (loosely: any RFC 4122 version) — used to validate a client-supplied x-request-id
// before trusting it. The public form-submit route is unauthenticated, so an attacker-controlled
// header must never be persisted/logged verbatim without this check.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function newRequestId(): string {
  return crypto.randomUUID();
}

// Reads x-request-id from an incoming request and returns it only if it's a well-formed UUID;
// otherwise mints a fresh one server-side. Never trust-and-log an arbitrary client string.
export function getRequestId(headers: Headers): string {
  const incoming = headers.get('x-request-id');
  if (incoming && UUID_RE.test(incoming)) return incoming;
  return newRequestId();
}
