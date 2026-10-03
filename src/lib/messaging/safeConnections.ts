// What a browser may see of a platform_connections row. `credentials` holds encrypted access tokens (and, for some
// connect paths, other secrets); a server action that returns the whole JSON ships ciphertext to every client component
// that receives the row. Server actions that feed UI must project through this allow-list instead.
//
// Allow-list, not deny-list: only keys the UI actually reads, all of them display or status values. As a second line of
// defence a key whose name looks secret is dropped even if someone adds it to the list by mistake.
const SAFE_CREDENTIAL_KEYS = [
  // status / health
  'health_status', 'discovery_status', 'token_expires_at',
  // display names and public identifiers
  'account_name', 'page_name', 'page_id', 'instagram_username', 'instagram_id',
  'waba_id', 'waba_name', 'phone_number', 'phone_number_id',
  // legacy WhatsApp keys still read by readWhatsAppCredentials()
  'whatsapp_business_account_id', 'whatsapp_business_name', 'whatsapp_phone_number',
] as const;

const SECRET_LOOKING = /(token(?!_expires)|secret|encrypted|password|api[_-]?key|private)/i;

export function sanitizeConnectionCredentials(credentials: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!credentials || typeof credentials !== 'object') return out;
  const c = credentials as Record<string, unknown>;
  for (const key of SAFE_CREDENTIAL_KEYS) {
    if (!(key in c)) continue;
    if (SECRET_LOOKING.test(key)) continue;
    const v = c[key];
    if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) out[key] = v;
  }
  return out;
}

export function toSafeConnection<T extends { credentials?: unknown }>(row: T): T {
  return { ...row, credentials: sanitizeConnectionCredentials(row.credentials) } as T;
}

/** True when a value, anywhere inside it, has a key that looks like an encrypted/secret field. For tests and assertions. */
export function containsSecretKeys(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSecretKeys);
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(([k, v]) => SECRET_LOOKING.test(k) || containsSecretKeys(v));
  }
  return false;
}
