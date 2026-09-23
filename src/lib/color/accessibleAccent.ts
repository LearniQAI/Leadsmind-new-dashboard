// Phase 3 audio player: a real WCAG check on the per-course theme accents (Signal #FF1E3C,
// Ember #FF6B1A, Grove #16A34A) found that Ember fails EVEN the 3:1 non-text/UI-component
// minimum against white (2.85:1), and none of the three clear 4.5:1 for normal text (Signal
// 3.82, Grove 3.30, Ember 2.85). Raw theme.primaryHex is fine for large filled elements (the
// play button's white-on-accent background, chip backgrounds) but not for accent-colored TEXT
// or thin UI elements (rings, scrubber fill) — those need a darkened variant computed here
// rather than hoping every current and future theme happens to clear the bar.

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexToRgb(hexA));
  const lB = relativeLuminance(hexToRgb(hexB));
  const [lighter, darker] = lA > lB ? [lA, lB] : [lB, lA];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Darkens toward black (multiplicatively, preserving hue) until the target contrast against
 *  `against` is met, capped at pure black so it always terminates. */
export function darkenUntil(hex: string, against: string, targetRatio: number): string {
  let [r, g, b] = hexToRgb(hex);
  let current = rgbToHex([r, g, b]);
  let guard = 0;
  while (contrastRatio(current, against) < targetRatio && guard < 40) {
    r *= 0.92; g *= 0.92; b *= 0.92;
    current = rgbToHex([r, g, b]);
    guard++;
  }
  return current;
}

export interface AccessibleAccent {
  /** Raw theme color — fine for large filled backgrounds (play button, active chips) where the
   *  foreground is white, or other elements meeting the 3:1 non-text bar on their own. */
  raw: string;
  /** >= 3:1 against white — for rings, scrubber fill/thumb, progress bars: real UI components,
   *  never body text. */
  ui: string;
  /** >= 4.5:1 against white — the only variant safe to use as small/normal text color. */
  text: string;
}

const cache = new Map<string, AccessibleAccent>();

export function getAccessibleAccent(hex: string, against = '#FFFFFF'): AccessibleAccent {
  const key = `${hex}:${against}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const result: AccessibleAccent = {
    raw: hex,
    ui: darkenUntil(hex, against, 3),
    text: darkenUntil(hex, against, 4.5),
  };
  cache.set(key, result);
  return result;
}
