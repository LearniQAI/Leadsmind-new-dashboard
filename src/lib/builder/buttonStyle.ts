// Button look shared by the Button block (components/builder/user/Button.tsx) and the Hero's
// secondary button, so a button configured the same way looks the same in both.
import type { CSSProperties } from 'react';

export const BUTTON_SIZE_CLASSES: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-4 text-base font-bold',
  xl: 'px-10 py-5 text-lg font-black uppercase tracking-tighter',
};

/** 'color' is the Background field — but for outline/ghost/link variants it doubles as the
 *  border/text colour (the template-authoring convention), so it must NOT also become the
 *  fill, or a black outline button renders as a solid black box with black text. */
export function buttonInlineStyle(o: { variant?: string; color?: string; textColor?: string; borderRadius?: number | string }): CSSProperties {
  const hollow = o.variant === 'outline' || o.variant === 'ghost' || o.variant === 'link';
  return {
    borderRadius: `${o.borderRadius}px`,
    backgroundColor: hollow ? 'transparent' : (o.color || undefined),
    color: o.textColor || undefined,
    border: o.variant === 'outline' ? `2px solid ${o.color}` : undefined,
  };
}
