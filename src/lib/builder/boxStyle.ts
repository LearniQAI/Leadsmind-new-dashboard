// Part 2 "Size and position" / "Color" sections: Text / Heading / Paragraph now accept
// backgroundColor + per-side padding/margin props (same prop names as BoxModelControl and the
// published renderer already use elsewhere). This turns those props into a CSSProperties patch
// for the element wrapper and lists the keys to strip from the DOM-spread rest object.

import type { CSSProperties } from 'react';

export const BOX_STYLE_KEYS = [
  'backgroundColor',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
] as const;

// A bare number (12) or numeric string ("12") becomes "12px"; anything already carrying a
// unit ("2rem", "10%") passes through untouched.
const px = (v: unknown): string | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'number') return `${v}px`;
  const s = String(v).trim();
  if (s === '') return undefined;
  return /^-?\d*\.?\d+$/.test(s) ? `${s}px` : s;
};

export function pickBoxStyle(props: Record<string, any>): CSSProperties {
  const s: Record<string, string | undefined> = {};
  if (props.backgroundColor && props.backgroundColor !== 'transparent') {
    s.backgroundColor = String(props.backgroundColor);
  }
  (['Top', 'Right', 'Bottom', 'Left'] as const).forEach((side) => {
    const pad = px(props[`padding${side}`]);
    const mar = px(props[`margin${side}`]);
    if (pad !== undefined) s[`padding${side}`] = pad;
    if (mar !== undefined) s[`margin${side}`] = mar;
  });
  return s as CSSProperties;
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
