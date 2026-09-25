"use client";

import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { CanvasResponsive, LessonCanvasItem } from '@/lib/lms/flattenLessonCanvas';
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
