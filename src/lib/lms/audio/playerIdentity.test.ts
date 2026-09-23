import { describe, expect, it } from 'vitest';
import { PLAYER } from './playerIdentity';
import { contrastRatio } from '@/lib/color/accessibleAccent';

// Guard for the player's signature palette: every real foreground/background pairing used by the
// player surfaces must stay WCAG AA (4.5:1 text, 3:1 UI/graphics). If a base tone is retuned and a
// derived variant can no longer reach its target, this fails instead of shipping a regression.
const TEXT = 4.5;
const UI = 3;
const WHITE = '#FFFFFF';

const pairings: [string, string, string, number][] = [
  ['heading/body text on card', PLAYER.text, PLAYER.surface, TEXT],
  ['heading/body text on raised field (hover rows)', PLAYER.text, PLAYER.raised, TEXT],
  ['muted text (times, labels) on card', PLAYER.textMuted, PLAYER.surface, TEXT],
  ['muted text on raised field', PLAYER.textMuted, PLAYER.raised, TEXT],
  ['scrubber fill on rail', PLAYER.ink, PLAYER.track, UI],
  ['focus ring / active marker on card', PLAYER.ink, PLAYER.surface, UI],
  ['waveform loud end (tips) on waveform field', PLAYER.ink, PLAYER.raised, UI],
  ['waveform quiet end (centre) on waveform field', PLAYER.waveQuiet, PLAYER.raised, UI],
  ['white icon on play button / white text on ink chips', WHITE, PLAYER.ink, TEXT],
  ['play button edge vs card', PLAYER.ink, PLAYER.surface, UI],
];

describe('audio player signature palette', () => {
  it.each(pairings)('%s meets AA', (_label, fg, bg, min) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  it('is fully monochrome (no chroma anywhere in the palette)', () => {
    for (const [name, hex] of Object.entries(PLAYER)) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      expect({ name, spread: Math.max(r, g, b) - Math.min(r, g, b) }).toEqual({ name, spread: 0 });
    }
  });

  it('is exposed to Tailwind unchanged (tokens and component constants cannot drift)', async () => {
    // Tailwind's own loader (jiti) — the exact path the CSS build uses to read the config.
    const { default: loadConfig } = await import('tailwindcss/loadConfig');
    const config = loadConfig(`${process.cwd()}/tailwind.config.js`) as any;
    expect(config.theme.extend.colors.player).toEqual(PLAYER);
  });
});
