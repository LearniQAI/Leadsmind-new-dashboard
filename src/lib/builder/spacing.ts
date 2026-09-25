// Universal top/bottom spacing — ONE prop convention, ONE resolver, for every canvas block.
//
// Prop shape: the builder's existing flat convention (the one BoxModelControl, SectionSettings
// and pickBoxStyle already read/write, and ~200 live Section/Container nodes already carry):
//   paddingTop / paddingBottom / marginTop / marginBottom          — Desktop (base)
//   <key>_tablet / <key>_mobile                                    — breakpoint overrides
// Values are pixel numbers (legacy rows also hold numeric strings / "56px"; both read fine).
//
// Breakpoint resolution mirrors useResponsiveValue (lib/builder/hooks.ts), the mechanism every
// other responsive prop uses: Tablet = _tablet ?? base, Mobile = _mobile ?? base, driven by the
// builder's Desktop/Tablet/Mobile toggle in the editor and by autoDetectViewport (767/1023px)
// on published pages. The one refinement: an empty value ('' / null) counts as "not set" and
// falls back, so clearing a Tablet field re-inherits Desktop instead of forcing zero.
//
// Where the style is applied is decided in exactly one place — SELF_SPACED_BLOCKS below:
//  - blocks listed there already paint spacing on their own box (so padding sits inside their
//    background/border) and read these keys through spacingStyle();
//  - every other block gets spacingStyle() on its node wrapper (NodeSpacingBox), in the editor
//    canvas and on published pages alike, and the keys are stripped before its own render
//    (resolver.ts) so they can never double-apply or leak onto the DOM.

import type { CSSProperties } from 'react';

export type Device = 'desktop' | 'tablet' | 'mobile';
export const DEVICES: Device[] = ['desktop', 'tablet', 'mobile'];

export const SPACING_KEYS = ['paddingTop', 'paddingBottom', 'marginTop', 'marginBottom'] as const;
export type SpacingKey = (typeof SPACING_KEYS)[number];

/** Every stored prop name the universal spacing controls own (4 keys x 3 breakpoints). */
export const ALL_SPACING_PROP_NAMES: string[] = SPACING_KEYS.flatMap((k) => DEVICES.map((d) => responsivePropName(k, d)));

/** Resolver names (node.data.name) whose component applies these keys to its own box.
 *  Navbar must be here: it is `position: sticky`, and a wrapper element would become its
 *  parent box (exactly its own height), leaving it no room to stick. */
export const SELF_SPACED_BLOCKS = new Set(['Container', 'Section', 'Heading', 'Paragraph', 'Text', 'Divider', 'Navbar']);

/** Historical implicit spacing some blocks render when a key is unset. The renderer and the
 *  settings panel (as the placeholder) both read this, so they can't drift apart. */
export const SPACING_DEFAULTS: Record<string, Partial<Record<SpacingKey, number>>> = {
  Section: { paddingTop: 64, paddingBottom: 64 },
  Divider: { paddingTop: 16, paddingBottom: 16 },
};

// Negative margins are allowed (overlap/pull-up effects are a legitimate layout tool);
// negative padding is invalid CSS, so padding floors at 0.
export const SPACING_BOUNDS: Record<'padding' | 'margin', { min: number; max: number }> = {
  padding: { min: 0, max: 1000 },
  margin: { min: -1000, max: 1000 },
};

export function responsivePropName(key: string, device: Device): string {
  return device === 'desktop' ? key : `${key}_${device}`;
}

const isSet = (v: unknown) => v !== undefined && v !== null && v !== '';

/** The value that applies at `device` (override first, then Desktop), or undefined. */
export function readResponsive(props: Record<string, any>, key: string, device: Device): any {
  if (device !== 'desktop') {
    const override = props[responsivePropName(key, device)];
    if (isSet(override)) return override;
  }
  return isSet(props[key]) ? props[key] : undefined;
}

/** 12 -> "12px", "12" -> "12px", "2rem"/"10%" pass through, unset -> undefined. */
export function cssLength(v: unknown): string | undefined {
  if (!isSet(v)) return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? `${v}px` : undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  return /^-?\d*\.?\d+$/.test(s) ? `${s}px` : s;
}

export function clampSpacing(key: SpacingKey, n: number): number {
  const { min, max } = SPACING_BOUNDS[key.startsWith('padding') ? 'padding' : 'margin'];
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** The CSS for the four spacing keys at `device`; unset keys fall back to `defaults` (a
 *  component's own historical default, e.g. Section's 64px), else are omitted entirely. */
export function spacingStyle(
  props: Record<string, any>,
  device: Device,
  defaults: Partial<Record<SpacingKey, number | string>> = {},
): CSSProperties {
  const out: Record<string, string> = {};
  for (const key of SPACING_KEYS) {
    const len = cssLength(readResponsive(props, key, device) ?? defaults[key]);
    if (len !== undefined) out[key] = len;
  }
  return out as CSSProperties;
}

/** True when any spacing key holds a non-zero value at any breakpoint. Decides whether a
 *  wrapper exists at all: per-node (not per-breakpoint) so the DOM shape never changes when the
 *  viewport crosses a breakpoint, and zeros don't count so a block whose values are all 0
 *  (e.g. legacy "0" rows) renders with no extra element, exactly as before. A 0 used as a
 *  Tablet/Mobile override still applies — that node has a non-zero value elsewhere. */
export function hasSpacing(props: Record<string, any> | undefined): boolean {
  if (!props) return false;
  return ALL_SPACING_PROP_NAMES.some((name) => {
    const len = cssLength(props[name]);
    return len !== undefined && !/^-?0*\.?0+(px)?$/.test(len);
  });
}

/** Just the spacing props (for cheap Craft collectors that shouldn't re-render on every edit). */
export function pickSpacingProps(props: Record<string, any> | undefined): Record<string, any> {
  const out: Record<string, any> = {};
  if (!props) return out;
  for (const name of ALL_SPACING_PROP_NAMES) if (isSet(props[name])) out[name] = props[name];
  return out;
}

export function omitSpacingProps<T extends Record<string, any>>(props: T): T {
  const out: Record<string, any> = { ...props };
  for (const name of ALL_SPACING_PROP_NAMES) delete out[name];
  return out as T;
}
