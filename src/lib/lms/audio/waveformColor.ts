// Per-lesson waveform colour (content_blocks.audio_waveform_color). The admin may pick ANY colour;
// what is rendered is always waveformColorFor(pick): the pick darkened just enough, with hue kept,
// to clear the same bar the monochrome default is held to. Loud bars at full intensity need
// >= 3:1 (WCAG non-text/graphics) against the waveform field. That field is PLAYER.raised
// (#F5F5F5), which is slightly darker than the white card, so it is the harder surface.
//
// Only the admin's raw pick is stored. The adjustment runs at render time on every surface, so
// the contrast guarantee comes from this one tested function and never trusts a stored value:
// a bad value written straight to the DB still renders compliant. Because it is deterministic,
// the builder can show "your pick" next to "what students see".
//
// The default is unchanged by construction: no pick (or an unreadable one) returns PLAYER.ink,
// the exact value every surface passed before this feature existed.
import { PLAYER } from './playerIdentity';
import { contrastRatio, darkenUntil } from '@/lib/color/accessibleAccent';

/** Minimum contrast for a full-intensity waveform bar against the waveform field. */
export const WAVEFORM_MIN_CONTRAST = 3;
/** The surface the bars are drawn on (full player and mini player). */
export const WAVEFORM_FIELD = PLAYER.raised;

const HEX6 = /^#[0-9A-F]{6}$/;

/** Canonical stored form, '#RRGGBB' upper-case, or null if not a 6-digit hex colour. */
export function normalizeWaveformColor(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const upper = input.trim().toUpperCase();
  return HEX6.test(upper) ? upper : null;
}

/** The colour actually rendered for a lesson's waveform. Always >= WAVEFORM_MIN_CONTRAST on the
 *  waveform field (asserted exhaustively by waveformColor.test.ts). */
export function waveformColorFor(pick: string | null | undefined): string {
  const normalized = normalizeWaveformColor(pick);
  if (!normalized) return PLAYER.ink;
  return darkenUntil(normalized, WAVEFORM_FIELD, WAVEFORM_MIN_CONTRAST).toUpperCase();
}

export interface WaveformColorResolution {
  /** The admin's pick, normalised (null = default monochrome). */
  pick: string | null;
  /** What students see. */
  rendered: string;
  /** True when the pick had to be darkened to meet contrast. */
  adjusted: boolean;
  /** Contrast of `rendered` against the waveform field. */
  contrast: number;
}

export function resolveWaveformColor(pick: string | null | undefined): WaveformColorResolution {
  const normalized = normalizeWaveformColor(pick);
  const rendered = waveformColorFor(normalized);
  return {
    pick: normalized,
    rendered,
    adjusted: normalized !== null && rendered !== normalized,
    contrast: contrastRatio(rendered, WAVEFORM_FIELD),
  };
}
