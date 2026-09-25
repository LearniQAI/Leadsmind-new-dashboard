// Block typography vs. the page's global type rules — the ONE place both the builder canvas
// (Viewport.tsx, scope '.node-canvas-area') and live pages (PublishedPageRenderer.tsx, no scope)
// get their theme-font CSS from, so the two can't drift.
//
// Three rule sources fight a block's own typography settings:
//  1. The bundled dashboard stylesheet (public/assets/scss/components/_theme.scss, loaded on
//     every page via src/style/index.scss in the root layout) sets bare
//     `p { font-size:14px; line-height:22px; font-weight:400; margin-bottom:15px; color }` and
//     `h1..h6 { font-weight:700; line-height:1; font-family }` directly on the element.
//  2. The theme-font rules below force the site's heading/body font with !important.
//  3. Tailwind classes hard-coded on a block's own text element (e.g. Heading's tracking-tight).
// A rule set on the element itself always beats a value inherited from the block's wrapper,
// which is why settings applied only to a wrapper silently did nothing.
//
// Fixes carried here:
//  - RICH_TEXT_CLASS marks an element whose innerHTML is stored rich text. The inline editor
//    (TipTap) always saves `<p>…</p>`; on the canvas `.tiptap p` resets that <p> to inherit,
//    but on live pages the same <p> took rule 1 and rendered at 14px/400 whatever the block
//    said. `.builder-rich-text p` (globals.css) gives the published <p> the same reset.
//  - BLOCK_FONT_ATTR marks a text element with an explicit per-block font; it outranks rule 2.

import { sanitizeRichTextHtml } from '@/lib/security/sanitizeHtml';

export const RICH_TEXT_CLASS = 'builder-rich-text';
export const BLOCK_FONT_ATTR = 'data-block-font';
export const BLOCK_FONT_VAR = '--block-font';

const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const BODY_TEXT = ['p', 'span', 'a', 'button', 'input', 'textarea'];

/**
 * Theme heading/body fonts (forced, as before) plus the overrides that let a block's own font
 * and stored rich text win. `scope` prefixes every selector — each override is exactly one
 * class/attribute more specific than the theme rule it has to beat, at equal !important.
 */
export function themeFontCss(scope: string): string {
  const s = (sel: string) => (scope ? `${scope} ${sel}` : sel);
  const list = (sels: string[]) => sels.map(s).join(', ');
  return `
  ${list(HEADINGS)} {
    font-family: var(--font-heading) !important;
  }
  ${list(BODY_TEXT)} {
    font-family: var(--font-body) !important;
  }
  ${list([`[${BLOCK_FONT_ATTR}]`])} {
    font-family: var(${BLOCK_FONT_VAR}) !important;
  }
  ${list([`[${BLOCK_FONT_ATTR}] :is(h1, h2, h3, h4, h5, h6, p, span, a)`, `.${RICH_TEXT_CLASS} :is(p, span)`, '.tiptap p'])} {
    font-family: inherit !important;
  }
  `;
}

/** A CSS font-family stack for a stored family name (Google Fonts catalog names). */
export function fontStack(family: string): string {
  return `'${family.replace(/'/g, '')}', sans-serif`;
}

/**
 * Stored inline-edited text for an INLINE slot (a nav link, a brand name, a copyright line).
 * The inline editor saves block HTML (`<p>Home</p>`); rendered as React text that showed the
 * tags literally, and injected as-is a block <p> broke the line and took the global `p` rule.
 * Sanitised, with paragraph wrappers removed (multiple paragraphs joined by <br>). Plain-text
 * labels from templates pass through unchanged.
 */
export function inlineRichText(value: unknown): string {
  const safe = sanitizeRichTextHtml(typeof value === 'string' ? value : value == null ? '' : String(value));
  return safe
    .replace(/<\/p>\s*<p\b[^>]*>/gi, '<br>')
    .replace(/<\/?p\b[^>]*>/gi, '')
    .trim();
}
