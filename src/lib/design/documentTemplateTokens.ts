/**
 * Shared color token for the client-facing "document template" family:
 * invoices, quotes/proposals, account statements, tax-invoice PDFs, and any
 * future printable, light/white-background client-facing document (receipts
 * included) — as opposed to dashboard chrome or dark-theme portal surfaces,
 * which are different visual systems with their own correct values.
 *
 * Why this file exists: the exact same contrast bug (Tailwind's stock
 * `text-gray-400` / `text-gray-500` used for label/secondary text on a white
 * background — ~2.55:1 and ~4.91:1 contrast respectively, the first failing
 * WCAG AA outright and the second passing with almost no margin) was found
 * and independently fixed FIVE separate times across this exact template
 * family in one pass (see contrast-audit.md), after already having been
 * fixed twice more elsewhere in the dashboard — with three different
 * resulting hex values for conceptually the same "muted secondary text" role
 * (dashboard chrome's `dash-textMuted`, the header search input's
 * `text-slate-500`, and this family's `text-slate-600`). Nothing stopped an
 * 8th document template from being built tomorrow with a fourth copy-pasted
 * wrong value — this constant is the fix for that, not just for the color.
 *
 * DOCUMENT_MUTED_TEXT is the one proven-correct value for THIS family only
 * (light/white document backgrounds). It matches `text-slate-600`
 * (`#475569`, ~7.6:1 contrast on white) — the value `InvoiceMasterDetail.tsx`
 * had already independently converged on before this file existed, and the
 * value the other five document templates were migrated onto in the same
 * pass that created this file.
 *
 * Deliberately NOT merged with `dash-textMuted` (dashboard chrome) or the
 * header search input's `text-slate-500` — those are different visual
 * systems that may have legitimately different correct values for their own
 * contexts. See contrast-audit.md's "Three Different Hex Values" note for
 * that separate, lower-priority cleanup question.
 *
 * If you are building a 7th document/receipt template, import this constant
 * for any label/secondary/muted text instead of typing `text-gray-400`,
 * `text-gray-500`, or any other gray by hand.
 */
export const DOCUMENT_MUTED_TEXT = 'text-slate-600';
