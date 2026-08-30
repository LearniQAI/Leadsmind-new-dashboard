// Part 3 / 4 — shared "Shadow" + "Border" + "Aspect ratio" prop model for the Video and Image
// elements. Prop names match BackgroundBorderControl / the published renderer so nothing else
// has to change: boxShadow (none|sm|md|lg|xl), borderStyle (none|solid|dashed|dotted),
// borderWidth, borderColor, borderRadius (uniform) / borderRadiusIndividual + the 4 corners.

import type { CSSProperties } from 'react';

// Inline box-shadow values (mirror Tailwind's shadow-sm/md/lg/xl). Applied as an inline
// style rather than a utility class so a dynamic value from this lib file never depends on
// Tailwind's content scanner having seen the class string.
export const SHADOW_VALUE: Record<string, string> = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
};

/** aspectRatio value -> the % used for the classic padding-top ratio box. */
export const ASPECT_PADDING: Record<string, string> = {
  '16:9': '56.25%',
  '4:3': '75%',
  '3:2': '66.667%',
  '1:1': '100%',
  '9:16': '177.78%',
  '21:9': '42.857%',
};

export const ASPECT_OPTIONS = [
  { value: '16:9', label: '16:9' },
  { value: '4:3', label: '4:3' },
  { value: '1:1', label: '1:1 (square)' },
  { value: '9:16', label: '9:16 (vertical)' },
  { value: '21:9', label: '21:9 (ultra-wide)' },
];

const px = (v: unknown): string | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'number') return `${v}px`;
  const s = String(v).trim();
  if (s === '') return undefined;
  return /^-?\d*\.?\d+$/.test(s) ? `${s}px` : s;
};

export const FRAME_STYLE_KEYS = [
  'boxShadow', 'aspectRatio',
  'borderStyle', 'borderWidth', 'borderColor',
  'borderRadius', 'borderRadiusIndividual',
  'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius',
] as const;

/** Kept for call-site compatibility; shadow is now an inline style, so this is always ''. */
export function frameClassName(_props: Record<string, any>): string {
  return '';
}

/** Shadow + border + corner-radius as one inline style patch. */
export function frameBorderStyle(props: Record<string, any>): CSSProperties {
  const s: Record<string, string | undefined> = {};

  const shadow = SHADOW_VALUE[props.boxShadow as string];
  if (shadow) s.boxShadow = shadow;

  if (props.borderRadiusIndividual) {
    s.borderTopLeftRadius = px(props.borderTopLeftRadius) ?? '0px';
    s.borderTopRightRadius = px(props.borderTopRightRadius) ?? '0px';
    s.borderBottomRightRadius = px(props.borderBottomRightRadius) ?? '0px';
    s.borderBottomLeftRadius = px(props.borderBottomLeftRadius) ?? '0px';
  } else {
    const r = px(props.borderRadius);
    if (r !== undefined) s.borderRadius = r;
  }

  if (props.borderStyle && props.borderStyle !== 'none') {
    s.borderStyle = String(props.borderStyle);
    s.borderWidth = px(props.borderWidth ?? 1) ?? '1px';
    s.borderColor = props.borderColor ? String(props.borderColor) : '#111827';
  }

  return s as CSSProperties;
}

export function stripFrameKeys(props: Record<string, any>): void {
  FRAME_STYLE_KEYS.forEach((k) => {
    delete props[k];
    delete props[`${k}_mobile`];
    delete props[`${k}_tablet`];
  });
}
