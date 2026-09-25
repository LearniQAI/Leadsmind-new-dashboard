import React from 'react';
import type { CanvasSpacing } from '@/lib/lms/flattenLessonCanvas';

const VAR: Record<string, string> = { paddingTop: 'pt', paddingBottom: 'pb', marginTop: 'mt', marginBottom: 'mb' };
const DEVICE_SUFFIX = { desktop: 'd', tablet: 't', mobile: 'm' } as const;

/**
 * Student-facing application of the universal top/bottom spacing (flattenLessonCanvas resolves
 * it per breakpoint with the builder's own resolver). Shared by the student player and the
 * public preview page. The values ride in CSS variables and `.lm-canvas-spacing` (globals.css)
 * swaps them at the builder's 1023px / 767px breakpoints, so it's correct on first paint.
 *
 * The outer box is `display: flow-root`: it takes the list's own `space-y-*` gap as before,
 * and the inner margins stay inside it instead of collapsing into that gap — so a block's
 * margin ADDS to the reading view's rhythm, matching what it adds on the canvas.
 * No spacing = the item renders exactly as before, with no wrapper.
 */
export function CanvasItemSpacing({ spacing, children }: { spacing?: CanvasSpacing; children: React.ReactNode }) {
  if (!spacing) return <>{children}</>;
  if (children === null || children === undefined || children === false) return null;
  const vars: Record<string, string> = {};
  for (const [device, values] of Object.entries(spacing) as [keyof typeof DEVICE_SUFFIX, Record<string, string>][]) {
    for (const [key, value] of Object.entries(values)) {
      if (value && VAR[key]) vars[`--lm-${VAR[key]}-${DEVICE_SUFFIX[device]}`] = value;
    }
  }
  return (
    <div className="lm-canvas-spacing" style={vars as React.CSSProperties}>
      <div className="lm-canvas-spacing__inner">{children}</div>
    </div>
  );
}
