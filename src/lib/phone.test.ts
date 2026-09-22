import { describe, it, expect } from 'vitest';
import { normalizePhone, splitChannelPrefix } from '@/lib/phone';
import { PHONE_VECTORS } from '@/lib/phone.vectors';

describe('normalizePhone', () => {
  it.each(PHONE_VECTORS)('%j -> %j', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('is idempotent on its own output', () => {
    for (const [, out] of PHONE_VECTORS) if (out) expect(normalizePhone(out)).toBe(out);
  });
});

describe('splitChannelPrefix', () => {
  it('separates the whatsapp: prefix from the number', () => {
    expect(splitChannelPrefix('whatsapp:+27821234567')).toEqual({ prefix: 'whatsapp:', number: '+27821234567' });
    expect(splitChannelPrefix('+27821234567')).toEqual({ prefix: '', number: '+27821234567' });
    expect(splitChannelPrefix('WhatsApp: 082 123 4567')).toEqual({ prefix: 'whatsapp:', number: '082 123 4567' });
  });
});
