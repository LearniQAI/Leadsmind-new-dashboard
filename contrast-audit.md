# Systemic Text-Contrast Audit — Document/Preview Templates

## Note on the screenshot provided

The image attached to this task is the "Add New Lead" contact-creation form (`/contacts/new`) from an earlier, unrelated conversation in this session — it does not show an invoice preview, and none of its text is low-contrast. It does not match the prompt's description ("Billed To"/"Issue Date"/address/document-number text near-invisible). Rather than guess at a mismatched premise, this audit traced the actual invoice/quote/proposal/statement preview components directly from source and confirmed the described bug exists — in a different, portal-facing invoice view than the internal one, detailed below. Flagging this mismatch rather than silently treating the wrong image as evidence.

**No browser tool is available in this environment** (same constraint as the prior calendar audit) — every contrast ratio below is computed from the actual hex values (Tailwind's stock palette, unmodified in this repo's `tailwind.config.js`) using the standard WCAG relative-luminance formula, not eyeballed or read off a rendered screenshot.

## Top-line answer

**Confirmed: this is the same bug, independently reintroduced five more times, not a single leftover instance.** The actual culprit is **not** `dash-textMuted` (that token was already correctly fixed to `#475569` and is not implicated here at all — re-verified, still holding, see Part B below). It's a **separate, entirely unrelated styling convention**: five "printable" client-facing document templates (invoice, two separate quote/proposal views, one account-statement view, one SARS tax-invoice PDF template) each hand-roll their own label/muted-text color using Tailwind's **stock `gray-400`** (`#9CA3AF`, **~2.55:1 contrast on white — fails WCAG AA by a wide margin**) and, inconsistently, stock `gray-500` (`#6B7280`, ~4.91:1 — technically passes AA but by the thinnest possible margin, and inconsistent hue-wise with everything else in the same templates).

**Root cause of the repetition, confirmed by direct comparison:** these five files are near-identical copy-pasted layouts (same grid structure, same label pattern: `text-[9-10px] font-black uppercase tracking-widest text-gray-400`, repeated 7-21 times per file) — clearly one template was duplicated to create the others, carrying the same wrong color forward every time, rather than any of them referencing one shared source of truth. A **sixth** file in the same family, `src/components/invoices/InvoiceMasterDetail.tsx` (the internal/dashboard-side invoice preview), already correctly uses `text-slate-600` (`#475569`, ~7.6:1) throughout, with an inline comment noting it was previously modernized away from the app's "old dark theme" — confirming the correct pattern already existed in this exact file family, it just was never propagated to the other five when they were built/copied.

**Fixed in this pass:** all five broken files standardized onto `text-slate-600` — the exact value already proven correct in `InvoiceMasterDetail.tsx` and requested explicitly in this task (same hex as the already-corrected `dash-textMuted`, `#475569`, ~7.6:1 on white). Not a new value invented — reused verbatim, exactly as instructed.

## Part A — Root Cause of the Screenshot-Described Instance

**Which component actually renders "Billed To"/"Issue Date" with near-invisible text:** two internal-looking candidates exist in this codebase and were both checked directly, not assumed:

1. `src/components/invoices/InvoiceMasterDetail.tsx` (the dashboard-internal invoice detail/preview, with "Download PDF"/"Print" buttons at line ~258-262) — **checked and confirmed already correct.** Its "Billed To" (line 336) and "Issue Date" (line 354) labels use `text-slate-600` (`#475569`, ~7.6:1) — not `gray-400`. This file is clean.
2. `src/components/portal/SingleInvoiceView.tsx` (the **client-facing portal** invoice view — `/portal/invoices/[id]`, also with "Print"/"Save PDF" buttons at lines 141-146) — **confirmed broken.** Its "Billed To" (line 183) and "Issue Date" (line 191) labels, plus the seller address block (line 162), due date label (195), all four table-header cells (205-208), and the "Verified Merchant" footer block (251), all used `text-gray-400`.

This is almost certainly the actual component behind the screenshot description — same label names, same "Print"/"Save PDF" controls, same document layout — just the portal-facing twin of the internal one, not the internal one itself. **This confirms the prompt's suspicion exactly: this is a genuinely separate styling instance from the two previously-patched ones (header search, footer), not a shared token.**

**Exact culprit color, confirmed via the actual Tailwind config (not assumed to be `dash-textMuted`):** `tailwind.config.js` does not override Tailwind's `gray` palette, so `text-gray-400` resolves to stock Tailwind `#9CA3AF`. Computed contrast against a white (`#FFFFFF`) background using the standard WCAG relative-luminance formula: **2.55:1** — fails the 4.5:1 AA minimum for body text by more than 40%, consistent with the "near-white-on-white" symptom described.

**Confirmed NOT the same token as the prior two fixes:** the earlier header-search and footer-copyright fixes both use(d) the dashboard chrome's own `dash-textMuted` Tailwind alias (`tailwind.config.js:143`, `#475569`) — a completely different class (`!text-dash-textMuted` vs. `text-gray-400`), defined in a completely different part of the config (the `dash.*` custom color group vs. Tailwind's built-in `gray` scale). The document-template family never references `dash-textMuted` at all — it's print/PDF-styled markup that was built (or copy-pasted) independently of the rest of the dashboard's token system, exactly as the prompt suspected.

## Part B — Repo-Wide Sweep

### Same-culprit sweep: every `text-gray-400` / `text-gray-500` in a document/print template

Searched `src/` for `text-gray-[234]00` and cross-referenced against every file carrying the `printable-area` marker class (the reliable signal for "this is a print/PDF-style document," used consistently across this template family) plus every invoice/quote/proposal/statement-adjacent component. Found **six** files in this family; one was already correct.

| File | Role | `text-gray-400` count | `text-gray-500` count | Status before this pass |
|---|---|---|---|---|
| `src/components/invoices/InvoiceMasterDetail.tsx` | Internal invoice detail/preview | 0 | 0 | Already correct (`text-slate-600`) |
| `src/components/portal/SingleInvoiceView.tsx` | **Client portal invoice view — the screenshot's likely source** | 9 | 6 | Broken |
| `src/components/invoices/templates/SarsTaxInvoicePdf.tsx` | SARS-compliant tax-invoice PDF template | 16 | 5 | Broken |
| `src/components/proposals/ProposalMasterDetail.tsx` | Internal proposal/quote detail-preview | 7 | 5 | Broken |
| `src/components/portal/PublicQuotePortal.tsx` | Client-facing public quote/proposal acceptance page | 11 | 4 | Broken |
| `src/components/portal/StatementGeneratorModal.tsx` | Account-statement PDF generator | 9 | 5 | Broken |

No separate "Receipt" template exists in this codebase (grepped for `Receipt` across `src/`; the only receipt-shaped surfaces are `SingleInvoiceView.tsx` itself, used for paid invoices, and an unrelated POPIA data-erasure receipt — see below) — confirmed absent rather than assumed, so there was nothing further to check under that name.

### Broader check: other near-white grays used for real content vs. genuinely decorative elements

Went beyond the specific `gray-400`/`gray-500` culprit and checked every `text-gray-200`/`text-gray-300`/`text-slate-200`/`text-slate-300`/`text-neutral-200`/`text-neutral-300`/`text-zinc-200`/`text-zinc-300` (the near-white end of each default Tailwind gray scale) across the same document-template family, to catch anything even fainter than the main culprit.

- **`SarsTaxInvoicePdf.tsx:144`** — `<FileText size={20} className="text-gray-200" />`. This is a decorative icon glyph sitting inside a colored summary chip (the VAT total box), not text content. **Category (b) — intentional, left alone.**
- **`InvoiceMasterDetail.tsx:322`** — `<h1 className="text-5xl font-black uppercase tracking-tighter text-slate-100 select-none pointer-events-none mb-4">Invoice</h1>`. This is the large "INVOICE" background watermark behind the letterhead — `select-none` and `pointer-events-none` are strong, deliberate signals this is meant to be a subtle background design element, not readable content (it sits behind/beside the real, high-contrast "Document No." block next to it). **Category (b) — intentional, left alone, exactly the kind of element the prompt warned not to flatten.**
- **`PublicQuotePortal.tsx:48-50`** — a large diagonal "Accepted" ribbon/stamp at `opacity-40`. Also clearly decorative (a watermark-style status stamp, not information conveyed only through this element — the real acceptance status is shown elsewhere on the page at full contrast). **Category (b) — intentional, left alone.**
- No other `-200`/`-300` instances of any gray family were found used for actual label/data text anywhere in this template family — the failure was consistently at the `-400`/`-500` step, not fainter.

### Ambiguous instances found in the original pass — both now closed out (see Part D below)

- `src/components/crm/ErasureReceiptModal.tsx` — a POPIA erasure receipt's print-only style override. **Closed out in Part D: verified correct, no action needed** — was never actually ambiguous, just unexamined.
- `src/app/affiliate-portal/(dashboard)/AffiliatePortalClient.tsx` — dark-theme `text-gray-400` usage. **Closed out in Part D: checked, confirmed correct for its dark-theme context.**

### Re-verification: the two previously-fixed instances

- **Footer copyright** (`src/components/layouts/footer/FooterOne.tsx:22`) — still `!text-dash-textMuted` (`#475569`, ~7.6:1). **Holding, no regression.**
- **Header search** (`src/components/layouts/header/DashboardHeader.tsx:188,228` — "Search workspace..."/"Search anything..." labels) — currently implemented as `text-slate-500` (`#64748B`), computed contrast **~4.76:1 on white — passes AA**, not regressed. Worth noting for the record: this is a *different* hex than `dash-textMuted` (`#475569`) even though both pass — if this was the exact spot fixed previously, it was fixed with a different value than the footer's, which is itself a minor instance of the same "one bug, several different patches" pattern this whole audit is meant to eliminate. Not urgent (it passes AA with a real, if thin, margin) but flagged for a future consolidation pass — not changed here since it isn't failing.

## Part C — Systemic Fix Applied

**Fix:** every confirmed-broken `text-gray-400` and `text-gray-500` instance in the five broken files was replaced with **`text-slate-600`** (`#475569`, ~7.6:1 on white) — the exact value already used correctly in the sixth file of this same family (`InvoiceMasterDetail.tsx`) and the one requested in this task. No new value was invented; nothing print-specific or separately-constant was needed since all six files already share the same underlying styling system (Tailwind utility classes on light/white document backgrounds), unlike the `ErasureReceiptModal.tsx` case above which genuinely does use a separate print-media mechanism.

`text-gray-500` was folded into the same fix as `text-gray-400` (not left as "technically passing"), because leaving it in place would have preserved exactly the inconsistency this task is meant to eliminate — three different grays (`gray-400`, `gray-500`, and the correct `slate-600`) coexisting in the same template family for the same semantic role ("muted label/secondary text"), each with a different, undocumented contrast margin. All five files now use exactly one value for this role, matching the sixth, already-correct file.

**Left unchanged, confirmed correct already:** all primary/high-contrast content text (`text-gray-800`/`900`/`950`, contact names, line-item descriptions, totals) — these were already dark enough (`~12-16:1` range) and were not part of the bug. `text-gray-600`/`text-gray-700` (the one or two pre-existing instances found) were also left as-is — both already comfortably pass AA (`~7.9:1`+) on their own.

### Files changed

| File | `gray-400`→`slate-600` | `gray-500`→`slate-600` |
|---|---|---|
| `src/components/invoices/templates/SarsTaxInvoicePdf.tsx` | 16 | 5 |
| `src/components/proposals/ProposalMasterDetail.tsx` | 7 | 5 |
| `src/components/portal/PublicQuotePortal.tsx` | 11 | 4 |
| `src/components/portal/StatementGeneratorModal.tsx` | 9 | 5 |
| `src/components/portal/SingleInvoiceView.tsx` | 9 | 6 |

**Confirmed via computed contrast, not eyeballed:** `#475569` on `#FFFFFF` = **7.6:1**, comfortably clears the 4.5:1 AA minimum for body text (and clears the stricter 7:1 AAA threshold too) at every font size used across these templates (9px through the largest body copy), with a wide safety margin — unlike the `gray-500` value it replaced, which passed AA by less than 0.5:1.

## Why this keeps happening (original recommendation — now implemented, see Part D)

Three fixes so far (header search, footer, and five document templates in one pass) each used the *correct* value once found, but there was no single shared constant that document/print templates import — each of the six files in this family independently typed out `text-gray-400`/`text-gray-500`/`text-slate-600` by hand. **This is now fixed — see Part D, "Shared Constant to Prevent Recurrence."**

---

# Follow-Up Pass — Closing Out Parts 1 & 2, and Preventing Recurrence (Part D)

A dedicated follow-up prompt asked for the two "ambiguous, flagged" items above to be independently resolved (not left in permanent limbo) and for the original pass's own recommendation (a shared constant) to actually be implemented.

## Part 1 — POPIA erasure-receipt print-only override: verified correct, closed out

**Mechanism, confirmed by reading the component directly (`src/components/crm/ErasureReceiptModal.tsx`):** it's a hybrid of two things, not a single mechanism —

1. A genuine hand-written `@media print { ... }` block inside an inline `<style>` tag, scoped to `#popia-receipt-print-area` (`visibility: hidden` on everything else, the receipt itself made `visibility: visible` and positioned absolutely, `background: white !important; color: black !important;`).
2. Tailwind's built-in `print:` variant classes on individual elements (`print:text-gray-500`, `print:text-gray-600`, `print:bg-white`, `print:border-black/20`, etc.) — which Tailwind compiles to its own `@media print { ... }` rules, so this is mechanically the same kind of CSS as (1), just generated rather than hand-written.

This is genuinely separate from the Tailwind class system the six document templates use in one important way, discovered while checking this: **`globals.css` (lines 563-608) already defines a shared, reusable print mechanism** — a `.printable-area` class implementing the identical pattern (visibility-hiding, absolute positioning, forced `background: white !important; color: black !important;`, plus explicit dark-theme-color-to-print-safe-color remaps) — and this is exactly what the six document templates (`SarsTaxInvoicePdf.tsx`, `InvoiceMasterDetail.tsx`, `SingleInvoiceView.tsx`, `StatementGeneratorModal.tsx`, `ProposalMasterDetail.tsx`) already hook into via a single `className="... printable-area ..."`. `ErasureReceiptModal.tsx` does **not** use this shared class — it reimplements the same logic locally via its own `id`-scoped inline `<style>` block instead.

**Not fragile, confirmed rather than assumed:** the concern was whether this depends on a browser's default print-color-adjustment behavior (e.g., "print economy" mode stripping backgrounds), which could silently regress if print styles change elsewhere. It doesn't — the wrapper forces `background: white !important` and `color: black !important` explicitly at the container level, and every text color override (`print:text-gray-500` etc.) is an explicit, always-applied CSS rule, not a browser heuristic being relied on. This holds regardless of any browser's default print rendering behavior.

**Contrast, computed directly (not assumed from the original pass's citation):** against the forced white background, `print:text-gray-600` (`#4B5563`) = ~7.9:1, `print:text-gray-500` (`#6B7280`) = ~4.91:1. Both clear the 4.5:1 AA minimum — `gray-500`'s margin is thin but real, not a failure.

**Verdict: verified correct, no action needed.** Closed out, not left flagged.

**One-line recommendation for the future (not implemented in this pass, per the task's explicit "doesn't need a rebuild unless actually broken"):** `ErasureReceiptModal.tsx` should eventually be migrated onto the shared `.printable-area` class in `globals.css` instead of maintaining its own duplicate `@media print` block — it's not broken today, but it is a second hand-maintained copy of logic that already exists once, shared, and correctly, which is exactly the kind of duplication this whole audit exists to eliminate before it causes a future divergence.

## Part 2 — Affiliate portal dark-theme `text-gray-400`: checked, confirmed correct for its context

**Every `text-gray-400` instance found** (48 occurrences, all in `src/app/affiliate-portal/(dashboard)/AffiliatePortalClient.tsx` — confirmed via grep across the whole `affiliate-portal` directory that no other file in this area uses `text-gray-400`/`text-gray-500`). No `text-gray-500` usage exists in this file at all.

**Real background, confirmed from the actual layout (not assumed):** `src/app/affiliate-portal/(dashboard)/layout.tsx` sets the page background to `bg-[#04091a]`. Text sits directly on that or on nested translucent/dark card surfaces: `bg-white/5` (the most common card background), `bg-white/[0.02]` (table header rows), `bg-slate-950`, `bg-[#0b1329]` (modal), and `bg-gray-500/10` (a status badge).

**Computed contrast for `text-gray-400` (`#9CA3AF`) against every background variant found, using the same WCAG relative-luminance formula as the rest of this document — worst case (lightest/most demanding background) reported:**

| Background | Effective color | Contrast vs. `#9CA3AF` |
|---|---|---|
| `bg-white/5` over page (most common card bg) | ≈ `#10151f` | **~7.11:1 — the lowest of all checked** |
| `bg-gray-500/10` over page (status badge) | ≈ `#0e1424` | ~7.23:1 |
| `bg-[#0b1329]` (modal) | `#0b1329` | ~7.24:1 |
| `bg-white/[0.02]` over page | ≈ `#090e1f` | ~7.54:1 |
| `bg-[#04091a]` (page) | `#04091a` | ~7.78:1 |
| `bg-slate-950` | `#020617` | ~7.92:1 |

**Every single context clears WCAG AA (4.5:1) comfortably, and every one clears AAA (7:1) too.** This confirms the original pass's hypothesis exactly: `text-gray-400` failing badly on white (~2.55:1) and `text-gray-400` on this dark portal (~7.1–7.9:1) are the same class name producing opposite verdicts because light-gray-on-dark and light-gray-on-white are different contrast directions entirely — not a coincidental shared bug.

**Verdict: no fix applied.** Confirmed and documented explicitly so this does not get flagged as a false positive by some future contrast sweep that only pattern-matches on the class name `text-gray-400` without computing against the real background, the same mistake this check exists to avoid making about itself.

## Part 3 — Shared constant for the document-template family

**Implementation:** `src/lib/design/documentTemplateTokens.ts` — a new, small, documented module exporting a single named constant:

```ts
export const DOCUMENT_MUTED_TEXT = 'text-slate-600';
```

The file's doc comment explains what it's for, why it exists (pointing back to this document's history of the same bug recurring), and explicitly states it is *not* to be merged with `dash-textMuted` or the header search's `text-slate-500` — those remain separate, intentionally, per this task's explicit constraint (see "Three Different Hex Values" below).

**Migration, all 6 files (the 5 fixed in the original pass plus the already-correct `InvoiceMasterDetail.tsx`):** every literal `text-slate-600` Tailwind class was mechanically replaced with a template-literal interpolation of the new constant — e.g. `className="text-[10px] font-black text-slate-600 uppercase"` → `className={\`text-[10px] font-black ${DOCUMENT_MUTED_TEXT} uppercase\`}` — and each file now imports `DOCUMENT_MUTED_TEXT` from the new shared module. This was a pure string-interpolation transform: every other class on every element (sizing, weight, tracking, spacing) is untouched, so the rendered output — including every decorative/watermark element confirmed intentional in Part B — is byte-for-byte the same `text-slate-600` (`#475569`) as before. Confirmed via `npx tsc --noEmit` (0 errors) and a direct diff review of a sample file (`InvoiceMasterDetail.tsx`) showing only the mechanical substitution, nothing else changed.

| File | Instances migrated |
|---|---|
| `src/components/invoices/templates/SarsTaxInvoicePdf.tsx` | 21 |
| `src/components/invoices/InvoiceMasterDetail.tsx` | 16 |
| `src/components/portal/PublicQuotePortal.tsx` | 15 |
| `src/components/portal/SingleInvoiceView.tsx` | 15 |
| `src/components/portal/StatementGeneratorModal.tsx` | 14 |
| `src/components/proposals/ProposalMasterDetail.tsx` | 12 |
| **Total** | **93** |

**Why a constant, not a wrapper component:** these six files apply the muted-text color inline, always combined with several other utility classes in the same string (size, weight, letter-spacing, layout) across a mix of `<p>`, `<span>`, `<th>`, `<td>`, and `<label>` elements with no consistent shape. Wrapping each of the 93 call sites in a `<DocumentMutedText>` component would have meant restructuring markup at every single site — a much larger, higher-regression-risk change for the same outcome. An imported, documented constant achieves the actual goal (one shared source of truth that a future 7th template's author will find by searching for "document muted text" or seeing it imported in any of the six existing files) without touching JSX structure at all.

## Three Different Hex Values — flagged as a separate, lower-priority future cleanup item

Not resolved in this pass, per the task's explicit instruction not to attempt a rushed consolidation. For the record, so it isn't lost: the same conceptual role — "muted/secondary text, still needs to read clearly" — currently has three different, independently-arrived-at correct values across three different visual systems in this codebase:

- **Dashboard chrome:** `dash-textMuted` = `#475569`
- **Header search input:** `text-slate-500` = `#64748B` (passes AA at ~4.76:1, but is a different hex than the other two)
- **Document/print templates:** `DOCUMENT_MUTED_TEXT` = `text-slate-600` = `#475569` (same hex as `dash-textMuted`, coincidentally — different token, same value)

Whether these should ever become one single global token is a legitimate future question, but doing that now would mean asserting dashboard chrome and print/document letterheads must always share a muted-text value going forward, which isn't something this pass has grounds to decide. Left as three intentionally-separate, each-individually-correct systems.
