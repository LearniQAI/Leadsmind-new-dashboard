import sanitizeHtml from 'sanitize-html';

// Server-safe replacement for sanitizeRichTextHtml on the public blog post render path.
//
// The DOMPurify build needs a DOM on the server (isomorphic-dompurify -> jsdom), which has to be
// bundled, traced and loaded inside the serverless function. This is a pure-JS allowlist sanitizer
// (htmlparser2, no DOM, no native code) with the SAME tag/attribute allowlist and an equal-or-
// stricter URL rule, so it can be loaded on the server with nothing to trace. It is only for the
// blog post body; the shared sanitizeHtml.ts is left untouched for its other (client-side) users.
//
// Equivalence is pinned by sanitizeBlogHtml.test.ts, which runs both implementations over an
// attack corpus and asserts this one never emits a tag/attribute/value DOMPurify would have removed.

const ALLOWED_TAGS = [
  'a', 'b', 'blockquote', 'br', 'code', 'del', 'div', 'em', 'figcaption', 'figure',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'iframe', 'img', 'li', 'mark', 'ol',
  'p', 'pre', 's', 'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'th', 'thead',
  'tr', 'u', 'ul',
];

const ALLOWED_ATTR = new Set([
  'align', 'alt', 'class', 'colspan', 'height', 'href', 'id', 'loading', 'rel', 'rowspan',
  'src', 'target', 'title', 'width', 'allow', 'allowfullscreen', 'frameborder',
  'data-href', 'data-show-text',
]);

// DOMPurify applies ALLOWED_URI_REGEXP to every allowed attribute except these "URI-safe" ones, so
// e.g. width="100" or target="_blank" never survived it. The same rule is applied here so the
// output is never more permissive.
const URI_SAFE_ATTR = new Set(['alt', 'class', 'id', 'title']);
const ALLOWED_URI = /^(?:(?:https?|mailto|tel):|#|\/(?!\/))/i;
// Control characters and whitespace are ignored by browsers inside a URL scheme ("java\tscript:").
// eslint-disable-next-line no-control-regex
const URL_NOISE = new RegExp('[\\u0000-\\u0020\\u007f-\\u009f\\u00a0\\u1680\\u180e\\u2000-\\u2029\\u205f\\u3000]', 'g');

function attrAllowed(name: string, value: string): boolean {
  if (!ALLOWED_ATTR.has(name)) return false;
  if (URI_SAFE_ATTR.has(name)) return true;
  if (value === '') return true; // boolean attributes (allowfullscreen)
  return ALLOWED_URI.test(value.replace(URL_NOISE, ''));
}

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  // Everything is filtered by transformTags below; sanitize-html still needs a per-tag allowlist.
  allowedAttributes: { '*': [...ALLOWED_ATTR] },
  // Anything but these schemes is dropped by sanitize-html first; the regex above is the second,
  // stricter layer (it also rejects scheme-less relative values, as DOMPurify did).
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href', 'src', 'data-href'],
  allowProtocolRelative: false,
  // Contents of these are executable or inert-but-dangerous: drop them with the tag rather than
  // leaving their text behind.
  nonTextTags: ['script', 'style', 'textarea', 'option', 'svg', 'math', 'noscript', 'template', 'xmp', 'noembed', 'noframes', 'object', 'embed', 'applet'],
  disallowedTagsMode: 'discard',
  transformTags: {
    '*': (tagName, attribs) => {
      const clean: Record<string, string> = {};
      for (const [name, value] of Object.entries(attribs)) {
        const lc = name.toLowerCase();
        if (attrAllowed(lc, String(value))) clean[lc] = String(value);
      }
      return { tagName, attribs: clean };
    },
  },
};

export function sanitizeBlogHtml(html: string | null | undefined): string {
  return sanitizeHtml(html || '', OPTIONS);
}
