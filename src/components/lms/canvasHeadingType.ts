"use client";

import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { CanvasResponsive, LessonCanvasItem } from '@/lib/lms/flattenLessonCanvas';
import type { TextCssKey } from '@/lib/builder/textBlockStyle';
import { fontStack } from '@/lib/builder/blockTypography';
import { loadGoogleFontFamily } from '@/lib/builder/loadGoogleFont';

const SUFFIX = { desktop: 'd', tablet: 't', mobile: 'm' } as const;

/**
 * Student-facing letter spacing + font family for a canvas Heading (shared by the student
 * player and the public preview). Values ride in CSS variables; `.lm-ls-*` / `.lm-ff-*`
 * (globals.css) apply each one only at breakpoints where it was resolved (the builder's
 * 1023px / 767px), so an unset breakpoint keeps the renderer's own default styling.
 */
export function canvasHeadingTypeProps(item: LessonCanvasItem): { className: string; style: CSSProperties } {
  if (item.kind !== 'heading') return { className: '', style: {} };
  const classes: string[] = [];
  const vars: Record<string, string> = {};
  const apply = (values: CanvasResponsive | undefined, name: 'ls' | 'ff', toCss: (v: string) => string) => {
    for (const [device, value] of Object.entries(values ?? {}) as [keyof typeof SUFFIX, string][]) {
      if (!value) continue;
      classes.push(`lm-${name}-${SUFFIX[device]}`);
      vars[`--lm-${name}-${SUFFIX[device]}`] = toCss(value);
    }
  };
  apply(item.letterSpacing, 'ls', (v) => v);
  apply(item.fontFamily, 'ff', fontStack);
  return { className: classes.join(' '), style: vars as CSSProperties };
}

/** Load every heading font family a lesson uses (students only have the app's base fonts). */
export function useCanvasHeadingFonts(items: LessonCanvasItem[] | null | undefined): void {
  const families = Array.from(new Set(
    (items ?? []).flatMap((i) => (i.kind === 'heading' ? Object.values(i.fontFamily ?? {}) : [])).filter(Boolean) as string[],
  ));
  const key = families.join('|');
  useEffect(() => {
    for (const family of families) loadGoogleFontFamily(family);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the stable identity of `families`
  }, [key]);
}

// ---- Builder typography for Heading / Paragraph / Text (item.textStyle) ----
// Same mechanism as above, generalised: every property the builder applies to the block's text
// gets a CSS variable per breakpoint plus a class (globals.css .lm-<abbr>-<d>) that applies it
// only at breakpoints where it was resolved. Those rules sit after the Tailwind utilities, so
// they win over the reading view's own equal-specificity defaults (text-[15px], font-bold, …).
const TEXT_ABBR: Record<TextCssKey, string> = {
  fontSize: 'fs', fontWeight: 'fw', fontStyle: 'fst', lineHeight: 'lh', color: 'c', letterSpacing: 'ls',
  textAlign: 'ta', backgroundColor: 'bg', paddingLeft: 'pl', paddingRight: 'pr', marginLeft: 'ml', marginRight: 'mr',
};

export function canvasTextStyleProps(item: LessonCanvasItem): { className: string; style: CSSProperties; setsColor: boolean } {
  const textStyle = item.kind === 'heading' || item.kind === 'richtext' ? item.textStyle : undefined;
  const classes: string[] = [];
  const vars: Record<string, string> = {};
  let setsColor = false;
  for (const [device, css] of Object.entries(textStyle ?? {}) as [keyof typeof SUFFIX, Partial<Record<TextCssKey, string>>][]) {
    for (const [key, value] of Object.entries(css) as [TextCssKey, string][]) {
      if (!value || !TEXT_ABBR[key]) continue;
      classes.push(`lm-${TEXT_ABBR[key]}-${SUFFIX[device]}`);
      vars[`--lm-${TEXT_ABBR[key]}-${SUFFIX[device]}`] = value;
      if (key === 'color') setsColor = true;
    }
  }
  return { className: classes.join(' '), style: vars as CSSProperties, setsColor };
}

/** Heading letter spacing / font (Batch 1) + the rest of the block's builder typography. */
export function canvasBlockTypeProps(item: LessonCanvasItem): { className: string; style: CSSProperties; setsColor: boolean } {
  const h = canvasHeadingTypeProps(item);
  const t = canvasTextStyleProps(item);
  return { className: [h.className, t.className].filter(Boolean).join(' '), style: { ...h.style, ...t.style }, setsColor: t.setsColor };
}

/** Inner-HTML reset for canvas text in the reading views: the global template `p` / `h*` rules
 *  (14px, grey) otherwise override the block's own typography on the stored rich text's inner
 *  elements. Moved here from StudentPlayerClient (see its SYSTEMIC FIX note) to share it. */
export const CANVAS_INLINE_HTML =
  '[&_p]:![font-size:inherit] [&_p]:![font-weight:inherit] [&_p]:![line-height:inherit] ' +
  '[&_p]:![color:inherit] [&_li]:![color:inherit] [&_span]:![color:inherit] ' +
  '[&_h1]:![color:inherit] [&_h2]:![color:inherit] [&_h3]:![color:inherit] ' +
  '[&_h4]:![color:inherit] [&_h5]:![color:inherit] [&_h6]:![color:inherit] ' +
  '[&_strong]:font-semibold [&_strong]:![color:inherit] [&_em]:italic [&_em]:![color:inherit] ' +
  '[&_a]:!text-sky-600 [&_a]:underline ' +
  '[&_.text-blue-600]:!text-blue-600 [&_.text-sky-500]:!text-sky-500 [&_.text-amber-500]:!text-amber-500';
