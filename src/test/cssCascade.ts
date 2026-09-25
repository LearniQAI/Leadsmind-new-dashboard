// Test utility: a small, faithful CSS cascade (jsdom's getComputedStyle ignores specificity,
// !important and inheritance, so it can't judge style-precedence bugs). Ranking follows the
// CSS spec: !important > inline style > specificity > source order; unset / `inherit` walks to
// the parent (except non-inherited props); var(--x) resolves the (inherited) custom property.
// Shared by blockTypography.test.tsx and studentCanvasStyle.test.tsx.
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

export type Decl = { value: string; important: boolean };
export type Rule = { selector: string; decls: Record<string, Decl>; order: number; maxWidth?: number };

export function specificity(selector: string): [number, number, number] {
  let result: [number, number, number] = [0, 0, 0];
  selectorParser((root) => {
    const of = (container: any): [number, number, number] => {
      const s: [number, number, number] = [0, 0, 0];
      container.each?.((n: any) => {
        if (n.type === 'id') s[0]++;
        else if (n.type === 'class' || n.type === 'attribute') s[1]++;
        else if (n.type === 'tag') s[2]++;
        else if (n.type === 'pseudo') {
          if (n.value.startsWith('::')) s[2]++;
          else if (n.value === ':where') { /* 0 */ }
          else if ([':is', ':not', ':has'].includes(n.value)) {
            const best = n.nodes.map(of).sort((x: number[], y: number[]) => y[0] - x[0] || y[1] - x[1] || y[2] - x[2])[0] ?? [0, 0, 0];
            s[0] += best[0]; s[1] += best[1]; s[2] += best[2];
          } else s[1]++;
        }
      });
      return s;
    };
    result = of(root.nodes[0]);
  }).processSync(selector);
  return result;
}

export function parseRules(css: string, startOrder: number): Rule[] {
  const rules: Rule[] = [];
  let order = startOrder;
  postcss.parse(css).walkRules((r) => {
    const media = r.parent?.type === 'atrule' && (r.parent as any).name === 'media' ? (r.parent as any).params : '';
    const maxWidth = /max-width:\s*(\d+)px/.exec(media)?.[1];
    const decls: Record<string, Decl> = {};
    r.walkDecls((d) => {
      const decl = { value: d.value, important: !!d.important };
      // expand the one shorthand in play: a single-value `margin`
      if (d.prop === 'margin' && !/s/.test(d.value.trim())) for (const side of ['top', 'right', 'bottom', 'left']) decls[`margin-${side}`] = decl;
      else decls[d.prop] = decl;
    });
    for (const selector of r.selectors) rules.push({ selector, decls, order: order++, maxWidth: maxWidth ? Number(maxWidth) : undefined });
  });
  return rules;
}

const NON_INHERITED = /^margin/;

export function makeCascade(rules: Rule[], viewportWidth = 1280) {
  const computed = (el: Element | null, prop: string): string => {
    if (!el) return 'initial';
    const cands: { v: Decl; rank: number[] }[] = [];
    for (const r of rules) {
      if (!r.decls[prop] || (r.maxWidth !== undefined && viewportWidth > r.maxWidth)) continue;
      let ok = false;
      try { ok = el.matches(r.selector); } catch { ok = false; }
      if (ok) cands.push({ v: r.decls[prop], rank: [r.decls[prop].important ? 1 : 0, 0, ...specificity(r.selector), r.order] });
    }
    const inline = (el as HTMLElement).style?.getPropertyValue(prop);
    if (inline) cands.push({ v: { value: inline, important: (el as HTMLElement).style.getPropertyPriority(prop) === 'important' }, rank: [(el as HTMLElement).style.getPropertyPriority(prop) === 'important' ? 1 : 0, 1, 0, 0, 0, Infinity] });
    cands.sort((a, b) => { for (let i = 0; i < a.rank.length; i++) if (a.rank[i] !== b.rank[i]) return b.rank[i] - a.rank[i]; return 0; });
    const win = cands[0]?.v.value;
    if (!win) return NON_INHERITED.test(prop) ? 'initial' : computed(el.parentElement, prop);
    if (win === 'inherit') return computed(el.parentElement, prop);
    const v = /^var\((--[\w-]+)\)$/.exec(win.trim());
    return v ? computed(el, v[1]) : win;
  };
  return computed;
}

