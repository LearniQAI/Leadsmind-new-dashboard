// Validates the workspace's CAN-SPAM postal address (Settings › Email Domains). Same flat-result
// shape and heuristic-not-exhaustive spirit as senderName.ts: light sanity checks, not real address
// verification/geocoding — there is no equivalent of Resend's DNS check to verify a physical
// address against, so this catches only the obviously-wrong values a required field invites
// ("N/A", "-", a repeat of the From name).

export const POSTAL_ADDRESS_MAX = 300;
const POSTAL_ADDRESS_MIN = 10;

export type PostalAddressCheck = { ok: boolean; address: string; reason: string };

const fail = (reason: string): PostalAddressCheck => ({ ok: false, address: '', reason });

// Case-insensitive exact-match placeholders. A short heuristic (min length + digit + 2 words)
// below catches most other non-answers without needing an exhaustive list.
const PLACEHOLDERS = new Set(['n/a', 'na', 'none', 'test', 'tbd', 'address', 'my address', '-', '.', 'asdf']);

export function validatePostalAddress(raw: string | null | undefined): PostalAddressCheck {
  // A real address commonly spans lines (street / city, region zip); collapse for the length and
  // shape checks, but keep the original (trimmed) line breaks for storage and display.
  const address = (raw ?? '').trim().replace(/[ \t]+/g, ' ');
  const flat = address.replace(/\s+/g, ' ');
  if (!flat) return fail('Enter your business postal address.');
  // Checked before the length/shape heuristics below: most placeholders ("N/A", "TBD", ...) are
  // also too short to reach them, and "not a placeholder" is the more useful message.
  if (PLACEHOLDERS.has(flat.toLowerCase())) return fail('Enter a real postal address, not a placeholder.');
  if (flat.length < POSTAL_ADDRESS_MIN) return fail('That looks too short to be a real postal address.');
  if (flat.length > POSTAL_ADDRESS_MAX) return fail(`Keep the address under ${POSTAL_ADDRESS_MAX} characters.`);
  if (!/\d/.test(flat)) return fail('A postal address usually includes a number (street number, unit, or postal/zip code).');
  if (flat.split(' ').filter(Boolean).length < 2) return fail('Enter a full postal address (street, city and postal/zip code).');
  return { ok: true, address, reason: '' };
}
