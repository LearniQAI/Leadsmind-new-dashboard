/**
 * Deterministic A/B testing utility using cyrb53 hash.
 */

const cyrb53 = (str: string, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

export interface Variant {
  id: string;
  weight: number; // 0 to 100
}

export function getDeterministicVariant(visitorId: string, variants: Variant[]): string {
  if (variants.length === 0) return '';
  if (variants.length === 1) return variants[0].id;

  // Hash the visitor ID to get a consistent number between 0 and 100
  const hash = cyrb53(visitorId);
  const normalizedHash = hash % 100;

  let cumulativeWeight = 0;
  for (const variant of variants) {
    cumulativeWeight += variant.weight;
    if (normalizedHash < cumulativeWeight) {
      return variant.id;
    }
  }

  return variants[variants.length - 1].id;
}
