import { describe, it, expect } from 'vitest';
import { validatePostalAddress, POSTAL_ADDRESS_MAX } from './postalAddress';

describe('validatePostalAddress', () => {
  it.each([
    '123 Main Street, Cape Town, 8001, South Africa',
    '1 Infinite Loop\nCupertino, CA 95014',
    'PO Box 123, Nairobi 00100',
  ])('accepts a real address: %s', (address) => {
    const r = validatePostalAddress(address);
    expect(r.ok).toBe(true);
    expect(r.address).toBe(address.trim());
  });

  it.each([
    [null, /Enter your business postal address/],
    ['', /Enter your business postal address/],
    ['   ', /Enter your business postal address/],
    ['Cape Town', /too short/],
    ['x'.repeat(POSTAL_ADDRESS_MAX + 1), /under 300/],
    ['N/A', /placeholder/],
    ['none', /placeholder/],
    ['TBD', /placeholder/],
    ['Main Street Cape Town', /usually includes a number/],
    ['1234567890', /full postal address/],
  ])('rejects %j', (address, reason) => {
    const r = validatePostalAddress(address as string | null);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(reason);
  });

  it('collapses internal whitespace runs but keeps line breaks for storage', () => {
    const r = validatePostalAddress('123   Main   St\nCape Town,  8001');
    expect(r.ok).toBe(true);
    expect(r.address).toBe('123 Main St\nCape Town, 8001');
  });
});
