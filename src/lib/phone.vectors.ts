// Shared test vectors for normalizePhone (TS) and normalize_phone_e164 (SQL). Both MUST agree on
// every row: phone.test.ts checks the TS side, the live suite checks the SQL function.
export const PHONE_VECTORS: Array<[string | null, string | null]> = [
  ['+27821234567', '+27821234567'],
  ['0821234567', '+27821234567'],
  ['082 123 4567', '+27821234567'],
  ['082-123-4567', '+27821234567'],
  ['(082) 123 4567', '+27821234567'],
  ['27821234567', '+27821234567'],
  ['+27 82 123 4567', '+27821234567'],
  ['0027821234567', '+27821234567'],
  ['+0821234567', '+27821234567'], // a local number someone prefixed with '+'
  ['+082 123 4567', '+27821234567'], // exactly what every caller's `"+" + phone` produced
  ['whatsapp:+27821234567', '+27821234567'],
  ['whatsapp:0821234567', '+27821234567'],
  ['  +27821234567  ', '+27821234567'],
  ['+447700900123', '+447700900123'],
  ['00447700900123', '+447700900123'],
  ['+15551234567', '+15551234567'],
  ['5551234567', null], // 10 digits, no 0/+/00: country unknown, never guessed
  ['0333 1234567', null], // 11 digits starting 0 (real malformed data)
  ['+02612345678', null], // +0 + 10 digits: not a local number, not a country code
  ['12345', null],
  ['abc', null],
  ['', null],
  [null, null],
];
