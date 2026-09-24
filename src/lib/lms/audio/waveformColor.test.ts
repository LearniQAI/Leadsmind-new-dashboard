import { describe, expect, it } from 'vitest';
import { PLAYER } from './playerIdentity';
import {
  WAVEFORM_FIELD,
  WAVEFORM_MIN_CONTRAST,
  normalizeWaveformColor,
  resolveWaveformColor,
  waveformColorFor,
} from './waveformColor';
import { contrastRatio } from '@/lib/color/accessibleAccent';

// The safety guarantee behind the admin's open colour picker: WHATEVER is picked, the rendered
// waveform colour clears the same AA non-text bar (3:1) the monochrome default is held to by
// playerIdentity.test.ts, on the harder of the two player surfaces.

const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// Deliberately bad picks: white, near-white, pastels, and saturated colours that are too light
// against white (yellow, cyan, lime, the Ember accent that already failed 3:1 on white).
const BAD_PICKS: [string, string][] = [
  ['pure white', '#FFFFFF'],
  ['same as the waveform field', '#F5F5F5'],
  ['near-white grey', '#EEEEEE'],
  ['pale pink', '#FFE4EC'],
  ['pastel mint', '#C8F7DC'],
  ['baby blue', '#CFE8FF'],
  ['lemon yellow', '#FFFF00'],
  ['cyan', '#00FFFF'],
  ['lime', '#00FF00'],
  ['Ember theme orange (2.85:1 on white)', '#FF6B1A'],
  ['light grey', '#BBBBBB'],
  ['gold', '#FFD700'],
];

describe('waveform colour: default is unchanged', () => {
  it.each([null, undefined, '', 'red', '#fff', '#12345', '#GGGGGG', 'javascript:alert(1)', '  '])(
    'no/invalid pick %j renders exactly the monochrome ink',
    (pick) => {
      expect(waveformColorFor(pick as any)).toBe(PLAYER.ink);
      expect(resolveWaveformColor(pick as any).adjusted).toBe(false);
    }
  );
});

describe('waveform colour: contrast guarantee', () => {
  it.each(BAD_PICKS)('%s (%s) is adjusted to >= 3:1 on the waveform field', (_label, pick) => {
    const r = resolveWaveformColor(pick);
    expect(r.contrast).toBeGreaterThanOrEqual(WAVEFORM_MIN_CONTRAST);
    expect(contrastRatio(r.rendered, WAVEFORM_FIELD)).toBeGreaterThanOrEqual(WAVEFORM_MIN_CONTRAST);
    // ...and therefore also on the (lighter) white card.
    expect(contrastRatio(r.rendered, PLAYER.surface)).toBeGreaterThanOrEqual(WAVEFORM_MIN_CONTRAST);
    expect(r.adjusted).toBe(true);
  });

  it('holds for EVERY colour on a 52-step-per-channel grid (140,608 picks)', () => {
    const levels: number[] = [];
    for (let v = 0; v <= 255; v += 5) levels.push(v);
    let checked = 0;
    let worst = Infinity;
    for (const r of levels) for (const g of levels) for (const b of levels) {
      const c = contrastRatio(waveformColorFor(hex(r, g, b)), WAVEFORM_FIELD);
      worst = Math.min(worst, c);
      checked++;
    }
    expect(checked).toBe(52 ** 3);
    expect(worst).toBeGreaterThanOrEqual(WAVEFORM_MIN_CONTRAST);
  });

  it('leaves an already-compliant pick untouched (no silent substitution)', () => {
    for (const pick of ['#111111', '#1D4ED8', '#7C3AED', '#B91C1C', '#047857', '#0F766E']) {
      expect(contrastRatio(pick, WAVEFORM_FIELD)).toBeGreaterThanOrEqual(WAVEFORM_MIN_CONTRAST);
      const r = resolveWaveformColor(pick);
      expect(r.rendered).toBe(pick);
      expect(r.adjusted).toBe(false);
    }
  });

  it('keeps the hue of an adjusted pick (darkens, never shifts colour)', () => {
    for (const [, pick] of BAD_PICKS) {
      const [r0, g0, b0] = rgb(pick);
      const [r1, g1, b1] = rgb(waveformColorFor(pick));
      // Channel ORDER is preserved (rounding may tie adjacent channels, never swap them).
      const order = (a: number, b: number) => Math.sign(a - b);
      for (const [x0, y0, x1, y1] of [[r0, g0, r1, g1], [g0, b0, g1, b1], [r0, b0, r1, b1]]) {
        if (order(x0, y0) !== 0) expect([order(x0, y0), 0]).toContain(order(x1, y1));
      }
    }
  });

  it('is idempotent (re-adjusting a rendered colour changes nothing)', () => {
    for (const [, pick] of BAD_PICKS) {
      const once = waveformColorFor(pick);
      expect(waveformColorFor(once)).toBe(once);
    }
  });
});

describe('waveform colour: storage normalisation', () => {
  it('accepts #rrggbb in any case and stores upper-case', () => {
    expect(normalizeWaveformColor('#1d4ed8')).toBe('#1D4ED8');
    expect(normalizeWaveformColor(' #AbCdEf ')).toBe('#ABCDEF');
  });
  it.each([null, 42, '', '1D4ED8', '#1D4ED', '#1D4ED8FF', 'rgb(0,0,0)', 'url(x)'])('rejects %j', (v) => {
    expect(normalizeWaveformColor(v)).toBeNull();
  });
});
