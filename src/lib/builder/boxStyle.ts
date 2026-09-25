// Part 2 "Size and position" / "Color" sections: Text / Heading / Paragraph now accept
// backgroundColor + per-side padding/margin props (same prop names as BoxModelControl and the
// published renderer already use elsewhere). This turns those props into a CSSProperties patch
// for the element wrapper and lists the keys to strip from the DOM-spread rest object.
//
// Breakpoint-aware: every key resolves at `device` (Tablet/Mobile overrides first) — the panels
// have always written _tablet/_mobile values here, but this used to read the base value only,
// so those overrides never rendered. Top/bottom come from the shared spacingStyle() so these
// blocks resolve the universal spacing controls exactly like every other block.

import type { CSSProperties } from 'react';
import { cssLength, readResponsive, spacingStyle, type Device } from './spacing';

export const BOX_STYLE_KEYS = [
  'backgroundColor',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
] as const;

export function pickBoxStyle(props: Record<string, any>, device: Device = 'desktop'): CSSProperties {
  const s: Record<string, string | undefined> = {};
  const bg = readResponsive(props, 'backgroundColor', device);
  if (bg && bg !== 'transparent') s.backgroundColor = String(bg);
  (['Right', 'Left'] as const).forEach((side) => {
    const pad = cssLength(readResponsive(props, `padding${side}`, device));
    const mar = cssLength(readResponsive(props, `margin${side}`, device));
    if (pad !== undefined) s[`padding${side}`] = pad;
    if (mar !== undefined) s[`margin${side}`] = mar;
  });
  return { ...s, ...spacingStyle(props, device) } as CSSProperties;
}

/** Delete the box-style props (and their _mobile/_tablet variants) from a rest object so
 *  they aren't forwarded onto the DOM element. */
export function stripBoxStyleKeys(props: Record<string, any>): void {
  BOX_STYLE_KEYS.forEach((k) => {
    delete props[k];
    delete props[`${k}_mobile`];
    delete props[`${k}_tablet`];
  });
}
