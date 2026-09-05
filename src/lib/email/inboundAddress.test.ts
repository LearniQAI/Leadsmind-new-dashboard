import { describe, it, expect } from 'vitest';
import { workspaceInboundAddress, extractWorkspaceSlugFromAddress, parseFromHeader, INBOUND_EMAIL_DOMAIN } from './inboundAddress';

describe('workspaceInboundAddress / extractWorkspaceSlugFromAddress', () => {
  it('round-trips a workspace slug through the receiving address', () => {
    const addr = workspaceInboundAddress('world-teachers-academy');
    expect(addr).toBe(`world-teachers-academy@${INBOUND_EMAIL_DOMAIN}`);
    expect(extractWorkspaceSlugFromAddress(addr)).toBe('world-teachers-academy');
  });

  it('is case-insensitive on both the slug and the domain', () => {
    expect(extractWorkspaceSlugFromAddress(`World-Teachers-Academy@${INBOUND_EMAIL_DOMAIN.toUpperCase()}`)).toBe('world-teachers-academy');
  });

  it('does not match the unrelated Email->SMS bridge domain', () => {
    expect(extractWorkspaceSlugFromAddress('+27821234567@sms.leadsmind.io')).toBeNull();
  });

  it('does not match an address on a different domain entirely', () => {
    expect(extractWorkspaceSlugFromAddress('acme@gmail.com')).toBeNull();
  });

  it('handles null/empty input safely', () => {
    expect(extractWorkspaceSlugFromAddress(null)).toBeNull();
    expect(extractWorkspaceSlugFromAddress('')).toBeNull();
  });
});

describe('parseFromHeader', () => {
  it('parses "Display Name <email>" form', () => {
    expect(parseFromHeader('Jane Doe <jane@example.com>')).toEqual({ name: 'Jane Doe', email: 'jane@example.com' });
  });

  it('lowercases the email but preserves display-name casing', () => {
    expect(parseFromHeader('Jane Doe <Jane@Example.COM>')).toEqual({ name: 'Jane Doe', email: 'jane@example.com' });
  });

  it('strips quotes around the display name', () => {
    expect(parseFromHeader('"Doe, Jane" <jane@example.com>')).toEqual({ name: 'Doe, Jane', email: 'jane@example.com' });
  });

  it('handles a bare email with no display name', () => {
    expect(parseFromHeader('jane@example.com')).toEqual({ name: null, email: 'jane@example.com' });
  });

  it('handles null/empty input safely', () => {
    expect(parseFromHeader(null)).toEqual({ name: null, email: null });
    expect(parseFromHeader('')).toEqual({ name: null, email: null });
  });
});
