import { describe, expect, it } from 'vitest';
import { PLAYER } from './playerIdentity';
import { contrastRatio } from '@/lib/color/accessibleAccent';

// Guard for the player's signature palette: every real foreground/background pairing used by the
// player surfaces must stay WCAG AA (4.5:1 text, 3:1 UI/graphics). If a base hue is retuned and a
// derived variant can no longer reach its target, this fails instead of shipping a regression.
const TEXT = 4.5;
const UI = 3;

const pairings: [string, string, string, number][] = [
  ['heading/body text on card', PLAYER.text, PLAYER.surface, TEXT],
  ['heading/body text on raised tint', PLAYER.text, PLAYER.raised, TEXT],
  ['muted text (times, subtitles) on card', PLAYER.textMuted, PLAYER.surface, TEXT],
  ['muted text on raised tint (hover rows, popover)', PLAYER.textMuted, PLAYER.raised, TEXT],
  ['violet text (active chapter time) on raised', PLAYER.violetText, PLAYER.raised, TEXT],
  ['magenta text (speaker names) on raised', PLAYER.magentaText, PLAYER.raised, TEXT],
  ['scrubber fill start on rail', PLAYER.violetUi, PLAYER.track, UI],
  ['scrubber fill end on rail', PLAYER.magentaUi, PLAYER.track, UI],
  ['waveform bars / focus ring on raised wash', PLAYER.violetUi, PLAYER.raised, UI],
  ['waveform peaks on raised wash', PLAYER.magentaUi, PLAYER.raised, UI],
  ['white icon on play-button gradient start', '#FFFFFF', PLAYER.fillFrom, TEXT],
  ['white icon/text on gradient end', '#FFFFFF', PLAYER.fillTo, TEXT],
  ['play button edge vs card', PLAYER.fillFrom, PLAYER.surface, UI],
  ['play button edge (magenta end) vs card', PLAYER.fillTo, PLAYER.surface, UI],
];

describe('audio player signature palette', () => {
  it.each(pairings)('%s meets AA', (_label, fg, bg, min) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  it('is exposed to Tailwind unchanged (tokens and component constants cannot drift)', async () => {
    // Tailwind's own loader (jiti) — the exact path the CSS build uses to read the config.
    const { default: loadConfig } = await import('tailwindcss/loadConfig');
    const config = loadConfig(`${process.cwd()}/tailwind.config.js`) as any;
    expect(config.theme.extend.colors.player).toEqual(PLAYER);
  });
});
