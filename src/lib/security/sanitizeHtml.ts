import DOMPurify from 'isomorphic-dompurify';

// Tiptap-compatible rich text: preserve semantic formatting, links, images, tables and
// HTTPS embeds while rejecting executable elements, event handlers and javascript: URLs.
const RICH_TEXT_OPTIONS = {
  ALLOWED_TAGS: [
    'a', 'b', 'blockquote', 'br', 'code', 'del', 'div', 'em', 'figcaption', 'figure',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'iframe', 'img', 'li', 'mark', 'ol',
    'p', 'pre', 's', 'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'th', 'thead',
    'tr', 'u', 'ul',
  ],
  ALLOWED_ATTR: [
    'align', 'alt', 'class', 'colspan', 'height', 'href', 'id', 'loading', 'rel', 'rowspan',
    'src', 'target', 'title', 'width', 'allow', 'allowfullscreen', 'frameborder',
  ],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|#|\/)/i,
};

export function sanitizeRichTextHtml(html: string | null | undefined): string {
  return DOMPurify.sanitize(html || '', RICH_TEXT_OPTIONS);
}
