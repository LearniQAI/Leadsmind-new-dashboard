// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDocument } from 'htmlparser2';
import { sanitizeBlogHtml } from './sanitizeBlogHtml';
import { sanitizeRichTextHtml } from './sanitizeHtml';

// Pins the pure-JS blog sanitizer against the DOMPurify implementation it replaces on the blog
// post render path: same XSS protection, never more permissive.

const VECTORS: Record<string, string> = {
  scriptTag: '<p>a</p><script>alert(1)</script>',
  scriptSrc: '<script src="https://evil.example/x.js"></script>',
  scriptMixedCase: '<ScRiPt>alert(1)</sCrIpT>',
  scriptNested: '<scr<script>ipt>alert(1)</scr</script>ipt>',
  onerrorImg: '<img src=x onerror=alert(1)>',
  onclick: '<p onclick="alert(1)">x</p>',
  onmouseover: '<a href="https://ok.example" onmouseover="alert(1)">x</a>',
  onloadBody: '<body onload=alert(1)>',
  onfocusAutofocus: '<input autofocus onfocus=alert(1)>',
  jsHref: '<a href="javascript:alert(1)">x</a>',
  jsHrefCase: '<a href="JaVaScRiPt:alert(1)">x</a>',
  jsHrefTab: '<a href="java\tscript:alert(1)">x</a>',
  jsHrefEntity: '<a href="&#106;avascript:alert(1)">x</a>',
  jsHrefEntityColon: '<a href="javascript&colon;alert(1)">x</a>',
  jsHrefNewline: '<a href="jav&#x0A;ascript:alert(1)">x</a>',
  jsHrefLeadingSpace: '<a href="  javascript:alert(1)">x</a>',
  vbscript: '<a href="vbscript:msgbox(1)">x</a>',
  dataHtmlHref: '<a href="data:text/html,<script>alert(1)</script>">x</a>',
  dataHtmlBase64: '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>',
  dataImgSrc: '<img src="data:image/svg+xml,<svg onload=alert(1)>">',
  dataImgPng: '<img src="data:image/png;base64,iVBORw0KGgo=">',
  iframeJs: '<iframe src="javascript:alert(1)"></iframe>',
  iframeData: '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>',
  iframeSrcdoc: '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
  iframeYoutube: '<iframe src="https://www.youtube.com/embed/abc" width="560" height="315" frameborder="0" allowfullscreen></iframe>',
  iframeProtocolRelative: '<iframe src="//evil.example/x"></iframe>',
  styleTag: '<style>body{background:url(javascript:alert(1))}</style><p>x</p>',
  styleAttr: '<p style="background:url(javascript:alert(1))">x</p>',
  styleExpression: '<div style="width:expression(alert(1))">x</div>',
  svgOnload: '<svg onload=alert(1)></svg>',
  svgScript: '<svg><script>alert(1)</script></svg>',
  svgAnimate: '<svg><animate onbegin=alert(1) attributeName=x dur=1s></svg>',
  svgUse: '<svg><use href="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="/></svg>',
  svgForeign: '<svg><foreignObject><iframe src="javascript:alert(1)"></iframe></foreignObject></svg>',
  mathMaction: '<math><maction actiontype="statusline#" xlink:href="javascript:alert(1)">x</maction></math>',
  mathMtext: '<math><mtext><table><mglyph><style><!--</style><img title="--&gt;&lt;/mglyph&gt;&lt;img &Tab;src=1 onerror=alert(1)&gt;">',
  mxssNoscript: '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
  mxssTemplate: '<template><img src=x onerror=alert(1)></template>',
  mxssFormNesting: '<form><math><mtext></form><form><mglyph><style></math><img src onerror=alert(1)>',
  object: '<object data="javascript:alert(1)"></object>',
  embed: '<embed src="javascript:alert(1)">',
  base: '<base href="javascript:alert(1)//">',
  meta: '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
  link: '<link rel="stylesheet" href="javascript:alert(1)">',
  form: '<form action="javascript:alert(1)"><button>x</button></form>',
  buttonFormaction: '<button formaction="javascript:alert(1)">x</button>',
  dataAttr: '<p data-x="1" data-foo="bar">x</p>',
  ariaAttr: '<p aria-label="x" role="button">x</p>',
  commentTrick: '<!--><script>alert(1)</script>-->',
  cdata: '<![CDATA[<script>alert(1)</script>]]>',
  unclosed: '<a href="https://ok.example"><b>unclosed',
  nullByte: '<scr\u0000ipt>alert(1)</scr\u0000ipt>',
  relativeHref: '<a href="/blog/other">x</a>',
  anchorHref: '<a href="#section">x</a>',
  mailto: '<a href="mailto:a@b.example">x</a>',
  tel: '<a href="tel:+123">x</a>',
  httpsLink: '<a href="https://example.com/a?b=1&c=2" target="_blank" rel="noopener">x</a>',
  fbPost: '<div class="fb-post" data-href="https://www.facebook.com/x/posts/1" data-show-text="true"></div>',
  richArticle:
    '<h2>Title</h2><p>Hello <strong>bold</strong> <em>it</em> <a href="https://example.com">link</a></p>' +
    '<ul><li>one</li><li>two</li></ul><blockquote>q</blockquote><pre><code>x &lt; y</code></pre>' +
    '<table><thead><tr><th>h</th></tr></thead><tbody><tr><td colspan="2">c</td></tr></tbody></table>' +
    '<figure><img src="https://cdn.example/a.png" alt="a" width="100"><figcaption>cap</figcaption></figure>',
};

type Sig = Set<string>;

/** Every element and attribute in the output, as comparable signatures. */
function signatures(html: string): { tags: Sig; attrs: Sig; text: string } {
  const tags: Sig = new Set();
  const attrs: Sig = new Set();
  let text = '';
  const walk = (nodes: any[]) => {
    for (const n of nodes) {
      if (n.type === 'tag' || n.type === 'script' || n.type === 'style') {
        tags.add(n.name);
        for (const [k, v] of Object.entries<string>(n.attribs || {})) attrs.add(`${n.name}|${k}=${v}`);
        walk(n.children || []);
      } else if (n.type === 'text') text += n.data;
    }
  };
  walk(parseDocument(html).children as any[]);
  return { tags, attrs, text };
}

describe('sanitizeBlogHtml', () => {
  describe('XSS vectors', () => {
    for (const [name, input] of Object.entries(VECTORS)) {
      it(`${name}: no executable markup survives`, () => {
        const out = sanitizeBlogHtml(input);
        const sig = signatures(out);
        for (const banned of ['script', 'style', 'svg', 'math', 'object', 'embed', 'form', 'input', 'button', 'base', 'meta', 'link', 'template', 'noscript', 'body']) {
          expect(sig.tags.has(banned), `${banned} in: ${out}`).toBe(false);
        }
        for (const a of sig.attrs) {
          const attr = a.split('|')[1];
          const name = attr.split('=')[0];
          expect(name.startsWith('on'), a).toBe(false);
          expect(['style', 'srcdoc', 'formaction', 'xlink:href'].includes(name), a).toBe(false);
          expect(/^data-(?!href$|show-text$)/.test(name), a).toBe(false);
          const value = attr.slice(name.length + 1).replace(/[\u0000- ]/g, '').toLowerCase();
          expect(/^(javascript|vbscript|data):/.test(value), a).toBe(false);
        }
        // No raw executable string can reappear as text that the browser would re-parse as markup.
        expect(out).not.toMatch(/<script/i);
        expect(out).not.toMatch(/\son\w+\s*=/i);
      });
    }
  });

  describe('equal or stricter than the DOMPurify implementation it replaces', () => {
    for (const [name, input] of Object.entries(VECTORS)) {
      it(`${name}: nothing DOMPurify removed is emitted`, () => {
        const next = signatures(sanitizeBlogHtml(input));
        const old = signatures(sanitizeRichTextHtml(input));
        for (const t of next.tags) expect(old.tags.has(t), `tag <${t}> not allowed by DOMPurify`).toBe(true);
        for (const a of next.attrs) expect(old.attrs.has(a), `attribute ${a} not allowed by DOMPurify`).toBe(true);
      });
    }
  });

  describe('legitimate rich text is preserved', () => {
    it('keeps formatting, links, tables, images and https embeds', () => {
      const out = sanitizeBlogHtml(VECTORS.richArticle);
      const sig = signatures(out);
      for (const t of ['h2', 'p', 'strong', 'em', 'a', 'ul', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'figure', 'img', 'figcaption']) {
        expect(sig.tags.has(t), t).toBe(true);
      }
      expect(out).toContain('href="https://example.com"');
      expect(out).toContain('src="https://cdn.example/a.png"');
      expect(out).toContain('alt="a"');
    });

    it('keeps an https YouTube embed and its src', () => {
      const out = sanitizeBlogHtml(VECTORS.iframeYoutube);
      expect(out).toContain('<iframe');
      expect(out).toContain('src="https://www.youtube.com/embed/abc"');
    });

    it('keeps the Facebook post plugin attributes', () => {
      const out = sanitizeBlogHtml(VECTORS.fbPost);
      expect(out).toContain('data-href="https://www.facebook.com/x/posts/1"');
      expect(out).toContain('class="fb-post"');
    });

    it('keeps relative and anchor links, mailto and tel', () => {
      expect(sanitizeBlogHtml(VECTORS.relativeHref)).toContain('href="/blog/other"');
      expect(sanitizeBlogHtml(VECTORS.anchorHref)).toContain('href="#section"');
      expect(sanitizeBlogHtml(VECTORS.mailto)).toContain('href="mailto:a@b.example"');
      expect(sanitizeBlogHtml(VECTORS.tel)).toContain('href="tel:+123"');
    });

    it('heading ids survive so the table of contents anchors work', () => {
      expect(sanitizeBlogHtml('<h2 id="heading-0">A</h2>')).toBe('<h2 id="heading-0">A</h2>');
    });
  });

  it('handles empty input', () => {
    expect(sanitizeBlogHtml(null)).toBe('');
    expect(sanitizeBlogHtml(undefined)).toBe('');
    expect(sanitizeBlogHtml('')).toBe('');
  });

  it('does not load a DOM implementation', () => {
    // The whole point of the replacement: this module must not pull jsdom into the server bundle.
    const src = readFileSync(join(__dirname, 'sanitizeBlogHtml.ts'), 'utf8');
    expect(src).not.toMatch(/from\s+['"](jsdom|isomorphic-dompurify|dompurify)['"]/);
  });
});
