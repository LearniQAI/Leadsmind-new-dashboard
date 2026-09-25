import { describe, expect, it } from 'vitest';
import { checkDmarc } from './senderDomainVerification';

const txt = (map: Record<string, string[]>) => async (h: string) => map[h] ?? [];

describe('checkDmarc (advisory)', () => {
  it('requires an enforcing policy', async () => {
    expect(await checkDmarc('a.com', txt({ '_dmarc.a.com': ['v=DMARC1; p=reject'] }))).toBe(true);
    expect(await checkDmarc('a.com', txt({ '_dmarc.a.com': ['"v=DMARC1; p=quarantine; pct=100"'] }))).toBe(true);
    expect(await checkDmarc('a.com', txt({ '_dmarc.a.com': ['v=DMARC1; p=none;'] }))).toBe(false);
    expect(await checkDmarc('a.com', txt({}))).toBe(false);
  });
});
