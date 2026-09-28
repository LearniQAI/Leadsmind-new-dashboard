// Pure HTML transform behind the Paragraph properties-panel "List style" control (None / Bullets /
// Numbers). Runs client-side only (DOMParser). Operates on the same HTML string TipTap already stores
// in `props.text` — the panel writes the result back via the ordinary setProp path, and the existing
// InlineTextEditor sync effect (`if (value !== editor.getHTML()) editor.commands.setContent(value)`)
// picks it up. No live editor instance is needed here; this is the same mechanism every other panel
// control already uses (font size, color, alignment, ...).
//
// Scope: operates on the paragraph's TOP-LEVEL children only (the shape TipTap's own getHTML() ever
// produces for this block: one or more <p>, or a single <ul>/<ol> of <li>). It does not attempt to
// re-implement every ProseMirror edge case — nested sub-lists inside an <li> are preserved as-is when
// converting between bullet and numbered (a pure tag rename), and are flattened (their own text kept,
// nesting dropped) when converting to/from "None", which matches what a user converting a whole block
// back to plain paragraphs would expect.

export type ParagraphListStyle = 'none' | 'bullet' | 'number';

/** Reads the current whole-block list style from a paragraph's stored HTML, for the panel's active state. */
export function getParagraphListStyle(html: string): ParagraphListStyle {
  const trimmed = (html || '').trim();
  if (!trimmed) return 'none';
  const root = parseFragment(trimmed);
  const children = meaningfulChildren(root);
  if (children.length === 1 && children[0].tagName === 'UL') return 'bullet';
  if (children.length === 1 && children[0].tagName === 'OL') return 'number';
  return 'none';
}

export function setParagraphListStyle(html: string, style: ParagraphListStyle): string {
  const trimmed = (html || '').trim();
  if (!trimmed) return html;
  const root = parseFragment(trimmed);
  const children = meaningfulChildren(root);
  if (children.length === 0) return html;

  if (style === 'none') {
    const out = document().createElement('div');
    for (const child of children) {
      if (child.tagName === 'UL' || child.tagName === 'OL') {
        for (const li of Array.from(child.children)) {
          if (li.tagName !== 'LI') continue;
          const p = document().createElement('p');
          p.innerHTML = li.innerHTML;
          out.appendChild(p);
        }
      } else {
        out.appendChild(child.cloneNode(true));
      }
    }
    return out.innerHTML || html;
  }

  const targetTag = style === 'bullet' ? 'UL' : 'OL';
  // Already exactly one list: rename the tag only (lossless — every <li>, including nested
  // sub-lists inside it, is untouched) unless it's already the target type.
  if (children.length === 1 && (children[0].tagName === 'UL' || children[0].tagName === 'OL')) {
    if (children[0].tagName === targetTag) return html;
    const renamed = document().createElement(targetTag.toLowerCase());
    renamed.innerHTML = children[0].innerHTML;
    return renamed.outerHTML;
  }

  // Otherwise: flatten every top-level node into one new list, one <li> per node (a paragraph's
  // own innerHTML becomes an <li>'s content; an existing list's <li>s are lifted in as-is).
  const list = document().createElement(targetTag.toLowerCase());
  for (const child of children) {
    if (child.tagName === 'UL' || child.tagName === 'OL') {
      for (const li of Array.from(child.children)) {
        if (li.tagName === 'LI') list.appendChild(li.cloneNode(true));
      }
    } else {
      const li = document().createElement('li');
      li.innerHTML = child.innerHTML ?? child.textContent ?? '';
      list.appendChild(li);
    }
  }
  return list.outerHTML;
}

function document(): Document {
  if (typeof window === 'undefined' || !window.document) {
    throw new Error('paragraphListStyle: DOM APIs are unavailable (client-only)');
  }
  return window.document;
}

function parseFragment(html: string): HTMLElement {
  const el = document().createElement('div');
  el.innerHTML = html;
  return el;
}

function elementChildren(el: HTMLElement): HTMLElement[] {
  return Array.from(el.children) as HTMLElement[];
}

// TipTap keeps a trailing (occasionally leading) empty paragraph after a top-level list or other
// non-textblock node — its own invariant, guaranteeing there's always somewhere to place the cursor
// below a list. It reappears on its own the next time content loads back into the editor regardless
// of what this module returns. It is not user content, so it's ignored here: it must never count as
// "a second top-level block" (which would make a single real list register as mixed content, i.e.
// 'none'), and it must never turn into a bogus item when flattening content into a list.
function isEmptyFillerParagraph(el: HTMLElement): boolean {
  if (el.tagName !== 'P' || (el.textContent || '').trim()) return false;
  // A lone <br> is ProseMirror's own visual cursor-placeholder for an empty paragraph, not content.
  return el.children.length === 0 || (el.children.length === 1 && el.children[0].tagName === 'BR');
}

function meaningfulChildren(el: HTMLElement): HTMLElement[] {
  return elementChildren(el).filter((c) => !isEmptyFillerParagraph(c));
}
