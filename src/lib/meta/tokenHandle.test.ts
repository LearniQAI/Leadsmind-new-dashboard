import { describe, it, expect, vi } from 'vitest';

// A reversible stand-in with GCM-like failure behaviour: decrypt() throws on anything it did not produce.
vi.mock('@/lib/encryption', () => ({
  encrypt: (s: string) => 'E:' + Buffer.from(s, 'utf8').toString('base64'),
  decrypt: (s: string) => {
    if (!s.startsWith('E:')) throw new Error('bad ciphertext');
    return Buffer.from(s.slice(2), 'base64').toString('utf8');
  },
}));

import { sealPageToken, openPageToken, isPageTokenHandle, PageTokenHandleError, PAGE_TOKEN_HANDLE_TTL_MS } from './tokenHandle';

const B = { workspaceId: 'ws1', userId: 'u1', pageId: 'page1' };
const T = 'EAAB-real-looking-page-token';

describe('page token handles', () => {
  it('round-trips for the same user, workspace and page', () => {
    const h = sealPageToken(T, B);
    expect(isPageTokenHandle(h)).toBe(true);
    expect(openPageToken(h, B)).toBe(T);
  });

  it('the handle does not contain the token in the clear', () => {
    const h = sealPageToken(T, B);
    expect(h).not.toContain(T);
    expect(h.startsWith('pgh1.')).toBe(true);
  });

  it('is refused for another user, workspace or page', () => {
    const h = sealPageToken(T, B);
    expect(() => openPageToken(h, { ...B, userId: 'u2' })).toThrow(PageTokenHandleError);
    expect(() => openPageToken(h, { ...B, workspaceId: 'ws2' })).toThrow(PageTokenHandleError);
    expect(() => openPageToken(h, { ...B, pageId: 'page2' })).toThrow(PageTokenHandleError);
  });

  it('expires', () => {
    const now = 1_000_000;
    const h = sealPageToken(T, B, now);
    expect(openPageToken(h, B, now + PAGE_TOKEN_HANDLE_TTL_MS - 1)).toBe(T);
    expect(() => openPageToken(h, B, now + PAGE_TOKEN_HANDLE_TTL_MS + 1)).toThrow(PageTokenHandleError);
  });

  it('refuses a raw token, empty values and non-strings', () => {
    for (const v of [T, '', 'whatsapp_placeholder', undefined, null, 42, {}]) expect(() => openPageToken(v, B)).toThrow(PageTokenHandleError);
  });

  it('refuses a tampered or truncated handle', () => {
    const h = sealPageToken(T, B);
    expect(() => openPageToken(h.slice(0, -4), B)).toThrow(PageTokenHandleError);
    expect(() => openPageToken('pgh1.garbage', B)).toThrow(PageTokenHandleError);
    expect(() => openPageToken('pgh1.E:' + Buffer.from('{"t":"x"}').toString('base64'), B)).toThrow(PageTokenHandleError);
  });

  it('the error is user-safe and generic', () => {
    try { openPageToken('nope', B); } catch (e: any) { expect(e.userSafe).toBe(true); expect(e.message).not.toMatch(/token|decrypt|cipher/i); }
  });
});
