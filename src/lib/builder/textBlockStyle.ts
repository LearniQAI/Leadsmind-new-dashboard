// What a Heading / Paragraph / Text block applies to its text, as plain CSS values per
// breakpoint — mirroring each builder component's own render logic, so the flattened student
// lesson view (lib/lms/flattenLessonCanvas) can show the same typography the builder shows.
// Pure and server-safe. textBlockStyle.test.tsx renders the real components and checks this
// against them, so a change to a component's typography that isn't mirrored here fails a test.
//
// Class-based builder values are converted to the CSS they produce (Tailwind defaults — this
// project's tailwind.config doesn't override fontWeight / lineHeight / fontSize).

import { pickBoxStyle } from './boxStyle';
import { responsiveValue, type Device } from './spacing';

/** Heading's default size per level when no font size is set (Heading.tsx; used there too). */
export const HEADING_BASE_SIZES: Record<string, string> = {
  h1: 'text-5xl md:text-6xl',
  h2: 'text-4xl md:text-5xl',
  h3: 'text-3xl md:text-4xl',
  h4: 'text-2xl md:text-3xl',
  h5: 'text-xl md:text-2xl',
  h6: 'text-lg md:text-xl',
};

// Heading/Paragraph weight classes (font-normal … font-black) and leading-* classes.
const WEIGHT: Record<string, string> = { normal: '400', medium: '500', semibold: '600', bold: '700', black: '900' };
const LEADING: Record<string, string> = { tight: '1.25', normal: '1.5', relaxed: '1.625', loose: '2' };
const ALIGN = new Set(['left', 'center', 'right', 'justify']);

/** Each component's craft.props defaults (Heading/Paragraph/Text.tsx). Craft merges these under
 *  the stored props when it loads a node, so the builder renders them even when a stored node
 *  lacks the key; the student view must apply the same. Pinned to the components by a test. */
export const TEXT_BLOCK_DEFAULTS: Record<string, Record<string, unknown>> = {
  Heading: { level: 'h2', fontWeight: 'bold', textAlign: 'left', color: '#111827', lineHeight: 'tight' },
  Paragraph: { fontSize: 16, fontWeight: 'normal', textAlign: 'left', color: '#4b5563', lineHeight: 'relaxed' },
  Text: { fontSize: 16, textAlign: 'left', color: '#000000' },
};

export type TextCssKey =
  | 'fontSize' | 'fontWeight' | 'fontStyle' | 'lineHeight' | 'color' | 'letterSpacing' | 'textAlign'
  | 'backgroundColor' | 'paddingLeft' | 'paddingRight' | 'marginLeft' | 'marginRight';
export type TextCss = Partial<Record<TextCssKey, string>>;

const px = (v: unknown) => (v ? `${v}px` : undefined);
const str = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : String(v));

/** Background + left/right box, as pickBoxStyle resolves them (top/bottom belong to the
 *  universal spacing, which the student view already applies on its own wrapper). */
function horizontalBox(p: Record<string, any>, device: Device): TextCss {
  const b = pickBoxStyle(p, device) as Record<string, string | undefined>;
  const out: TextCss = {};
  for (const k of ['backgroundColor', 'paddingLeft', 'paddingRight', 'marginLeft', 'marginRight'] as const) {
    if (b[k] !== undefined) out[k] = b[k];
  }
  return out;
}

export function textBlockCss(name: string, stored: Record<string, any>, device: Device): TextCss {
  const p = { ...(TEXT_BLOCK_DEFAULTS[name] ?? {}), ...stored }; // as Craft loads the node
  const rv = (key: string, def?: unknown) => responsiveValue(p, key, device, def);
  const out: TextCss = {};
  if (name === 'Heading') {
    // Heading.tsx: size/weight/alignment/colour on the wrapper (inherited by the <h*>), leading-*
    // on the <h*> (defaulting to leading-tight). Letter spacing + font family are carried
    // separately (flattenLessonCanvas heading fields, Batch 1).
    out.fontSize = px(rv('fontSize'));
    out.fontWeight = WEIGHT[rv('fontWeight') as string];
    const align = rv('textAlign'); if (ALIGN.has(align)) out.textAlign = align;
    out.color = str(rv('color'));
    out.lineHeight = LEADING[rv('lineHeight') as string] ?? LEADING.tight;
  } else if (name === 'Paragraph') {
    // Paragraph.tsx: every value on the wrapper; size defaults to 16; weight/leading classes
    // only when the value is known.
    out.fontSize = px(rv('fontSize', 16));
    out.fontWeight = WEIGHT[rv('fontWeight') as string];
    const align = rv('textAlign'); if (ALIGN.has(align)) out.textAlign = align;
    out.lineHeight = LEADING[rv('lineHeight') as string];
    out.color = str(rv('color'));
    out.letterSpacing = px(rv('letterSpacing'));
  } else if (name === 'Text') {
    // Text.tsx reads its BASE typography values only (its Tablet/Mobile values are ignored by
    // the builder too — the audit's open item); mirrored as-is for parity.
    out.fontSize = p.fontSize !== undefined && p.fontSize !== null && p.fontSize !== '' ? `${p.fontSize}px` : undefined;
    if (ALIGN.has(p.textAlign)) out.textAlign = p.textAlign;
    out.color = str(p.color);
    const w = typeof p.fontWeight === 'string' ? p.fontWeight : p.fontWeight != null ? String(p.fontWeight) : '';
    const italic = /italic$/.test(w);
    out.fontWeight = str(italic ? w.replace(/italic$/, '') : w);
    if (italic) out.fontStyle = 'italic';
    out.lineHeight = px(p.lineHeight);
    out.letterSpacing = px(p.letterSpacing);
  } else {
    return out;
  }
  Object.assign(out, horizontalBox(p, device));
  for (const k of Object.keys(out) as TextCssKey[]) if (out[k] === undefined) delete out[k];
  return out;
}
