// E.164 normalisation. MUST stay byte-for-byte equivalent to the SQL function
// public.normalize_phone_e164 (migration 20260921000012), which backs contacts.phone_e164 — the
// live test suite compares the two over a shared vector table. See the migration for the rules.
// Numbers with no '+'/'00' prefix are assumed South African (the platform default); anything that
// can't be resolved returns null rather than being guessed.

export function normalizePhone(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const v = String(raw).replace(/^\s*whatsapp:/i, '').trim();
  const digits = v.replace(/[^0-9]/g, '');
  if (digits === '') return null;

  if (v.startsWith('+')) {
    if (digits[0] === '0') return digits.length === 10 ? `+27${digits.slice(1)}` : null; // "+0821234567"
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.startsWith('00')) {
    const n = digits.length - 2;
    return n >= 8 && n <= 15 ? `+${digits.slice(2)}` : null;
  }
  if (digits[0] === '0' && digits.length === 10) return `+27${digits.slice(1)}`;
  if (digits.startsWith('27') && digits.length === 11) return `+${digits}`;
  return null;
}

/** Splits a Twilio address into its channel prefix and the raw number: "whatsapp:+2782…" -> ["whatsapp:", "+2782…"]. */
export function splitChannelPrefix(addr: string): { prefix: string; number: string } {
  const m = /^(\s*whatsapp:)(.*)$/i.exec(addr ?? '');
  return m ? { prefix: 'whatsapp:', number: m[2].trim() } : { prefix: '', number: (addr ?? '').trim() };
}
