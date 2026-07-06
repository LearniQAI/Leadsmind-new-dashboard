# LeadsMind — Dead Code & Package Audit
Date: 2026-07-06
Branch: sprint2

Investigation only. Nothing was deleted, modified, or moved as part of this audit.

## Summary Table

| Item | Type | Verdict | Risk |
|------|------|---------|------|
| libs/workers/src/automation-executor.ts | File | KEEP | — |
| libs/workers/src/crons/booking-reminder-worker.ts | File | SAFE TO DELETE | LOW |
| libs/workers/src/crons/session-reminder-worker.ts | File | SAFE TO DELETE | LOW |
| src/app/invoice/ (singular) | Directory | SAFE TO DELETE | LOW |
| src/app/project/ (singular) | Directory | NEEDS INVESTIGATION | MED |
| express | Package | KEEP | MED (type-only, but load-bearing) |
| @react-native-async-storage/async-storage | Package | SAFE TO REMOVE | LOW |
| @tinymce/tinymce-react | Package | NEEDS INVESTIGATION | MED |
| moment | Package | SAFE TO REMOVE (after 1-line migration) | LOW |
| dayjs | Package | SAFE TO REMOVE (after 1-line migration) | LOW |
| apexcharts / react-apexcharts | Package | KEEP | — |
| recharts | Package | NEEDS INVESTIGATION (candidate to remove) | LOW-MED |

---

## Detailed Findings

### AUDIT 1 — libs/workers/ directory

Note: the three files were assumed to live directly under `libs/workers/`, but the actual paths are:
- `libs/workers/src/automation-executor.ts`
- `libs/workers/src/crons/booking-reminder-worker.ts`
- `libs/workers/src/crons/session-reminder-worker.ts`

#### automation-executor.ts (`executeLMSAction`)
- Import count: 4 (indirect, via event bus)
- Call chain: `libs/core/src/events/lms-event-bus.ts:112` dynamically imports it and re-exports `executeLMSAction`. That event-bus function is itself called from `libs/infra/src/queues/email-queue.ts:127`, and `emitLMSEvent` (same file) is dynamically imported and invoked from:
  - `src/app/actions/studentProgress.ts:49`
  - `src/app/actions/studentEnrollments.ts:115`
  - `src/app/api/webhooks/payments/route.ts:104,173`
  - `src/app/api/student/courses/[id]/certificate/route.ts:87`
- Referenced in vercel.json: NO (not a cron; triggered by application events, not a schedule)
- Referenced in configs: NO
- **Verdict: KEEP** — actively wired into the LMS enrollment/payment/certificate event flow. Not dead.

#### booking-reminder-worker.ts (`runBookingAutomations`)
- Import count: 0
- Files that import it: NONE — no route, no cron, no dynamic import anywhere in `src/` or `libs/`
- Referenced in vercel.json: NO
- Referenced in package.json scripts: NO
- Referenced in other configs: NO
- **Verdict: SAFE TO DELETE** — fully-built feature (appointment reminders + no-show sweep) with real Supabase/email/SMS logic, but it has no entry point anywhere in the app. It is never invoked. Low risk to delete, though worth flagging to the team in case this was mid-integration (see "Needs Manual Review" note below).

#### session-reminder-worker.ts (`checkAndSendSessionReminders`)
- Import count: 0
- Files that import it: NONE
- Referenced in vercel.json: NO
- Referenced in package.json scripts: NO
- Referenced in other configs: NO
- **Verdict: SAFE TO DELETE** — same situation as booking-reminder-worker.ts: complete, working code (LMS live-session reminders) with zero callers.

**Context on vercel.json crons:** the only 4 scheduled crons are `affiliate-recurring`, `affiliate-onboarding`, `quota-refill`, `tracking-sync`. Two *other* worker files in the same `libs/workers/src/crons/` folder — `reengagement-loop.ts` and `abandonment-scanner.ts` — do have live API routes (`src/app/api/cron/reengagement-loop/route.ts`, `src/app/api/cron/abandonment-scanner/route.ts`) but **those routes are also absent from vercel.json**, meaning they're not on an automatic schedule either (they'd need external/manual triggering via the `CRON_SECRET`-gated endpoint). This wasn't part of the requested audit scope but is adjacent — flagging for awareness, not a verdict.

---

### AUDIT 2 — src/app/invoice/ directory (singular)

- Files inside:
  - `src/app/invoice/app-invoice-add/page.tsx`
  - `src/app/invoice/app-invoice-edit/page.tsx`
  - `src/app/invoice/app-invoice-list/page.tsx`
  - `src/app/invoice/app-invoice-preview/page.tsx`
  - plus their backing components under `src/components/pagesUI/invoice/**`
- Navigation links pointing to `/invoice` (singular) from **outside** this directory: 0
- Router.push calls to `/invoice`: 0 (the only `route.push("/invoice/...")` calls are inside `InvoiceListTable.tsx`, itself part of this same isolated directory tree)
- `Link` components pointing to `/invoice`: only self-references within the same tree (add→preview, edit→preview, list→edit/preview)
- Imports from this directory by anything outside it: 0
- The real, production invoicing feature lives at `src/app/invoices/` (plural) — `page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx` — backed by `src/components/invoices/InvoiceBuilder.tsx`, `InvoiceMasterDetail.tsx`, and `src/app/api/v1/invoices/`. The sidebar (`src/data/sidebar-data.ts:21`) links to `/invoices`, never `/invoice`.
- **Verdict: SAFE TO DELETE** — `src/app/invoice/` (singular) is a self-contained, unreferenced leftover from the original admin-template scaffold. It duplicates the real `invoices` (plural) feature and has zero inbound links from anywhere in the live app.

---

### AUDIT 3 — src/app/project/ directory (singular)

- Files inside:
  - `src/app/project/page.tsx`
  - `src/app/project/project-create/page.tsx`
  - `src/app/project/project-details/page.tsx`
  - `src/app/project/project-details/[id]/page.tsx`
- Root `page.tsx` content: **yes, a redirect** — `redirect("/projects")` (the real, plural feature).
- Navigation links to `/project` (singular) from outside the directory: **2 found**, both inside `src/components/common/ProjectSingleCard.tsx` (`href={`/project/project-details/${item.id}`}`, used twice).
- Router.push calls to `/project`: 0
- Imports from this directory: 0 (nothing imports `src/app/project/*` files directly — routing is filesystem-based, so the only way in is the `Link`s above)
- **`ProjectSingleCard` is not dead** — it's used in 5 places:
  - `src/components/pagesUI/clients/client-details/ClientDetailsMainArea.tsx` — reachable via the **real** `/clients/client-details` route
  - `src/components/pagesUI/project/project/ProjectMainArea.tsx` — orphaned demo component, no `page.tsx` routes to it
  - `src/components/pagesUI/pages/search/SearchTabOneItem.tsx`, `SearchTabThreeItems.tsx` — demo search-results page, not in sidebar
- Subdirectory findings:
  - `project-details/page.tsx` hardcodes `id={1}` (demo-only), no inbound links.
  - `project-details/[id]/page.tsx` **is** reachable — a user viewing a client's associated project card on the real `/clients/client-details` page will navigate here.
  - `project-create/page.tsx` has zero inbound links anywhere (dead entry point, reachable only by typing the URL directly).
- **Verdict: NEEDS INVESTIGATION** — this directory is *not* cleanly dead like `invoice/`. The root `page.tsx` redirect and `project-create/` are safe to remove, but `project-details/[id]/page.tsx` is a genuine (if thin/demo-quality) dependency of the real client-details page through `ProjectSingleCard`. Recommend: either wire `ProjectSingleCard` to point at a proper `/projects/[id]` route and then delete this whole directory, or keep just `project-details/[id]` and delete the rest. Do not delete wholesale without addressing `ProjectSingleCard`'s link first.

---

### AUDIT 4 — express package

- Import count in `src/`: 0 (one text match, `"DHL Express"` in `ShipmentsClient.tsx`, is a shipping-carrier label, not the package)
- Import count in `server/`: 1 — `server/middleware/CreditGuard.ts:1`: `import { Request, Response, NextFunction } from 'express'`
- In package.json: YES (`"express": "^5.2.1"`, plus `"@types/express": "^5.0.6"`)
- `CreditGuard.ts`'s `verifyAICreditBalance` is **not run as Express middleware** (there's no `app.use()`/`app.listen()` anywhere in the repo) — it's called from a live Next.js route, `src/app/api/v1/ai/content/generate/route.ts:2,35`, via a hand-rolled req/res/next wrapper. The only reason `express` is imported is for its `Request`/`Response`/`NextFunction` **type** declarations.
- **Verdict: KEEP** — technically only a type dependency, not a runtime server framework, but the package must stay installed for this file to type-check/build. Removing it would break `server/middleware/CreditGuard.ts` unless someone first replaces the three type imports with local interfaces (small, low-risk follow-up, but not "delete now").

---

### AUDIT 5 — @react-native-async-storage/async-storage

- Import count: 0
- Files that import it: NONE (only unrelated match was the string "requestAsyncStorage" — a Next.js internal, in `src/lib/supabase/server.ts:10` — not this package)
- In package.json: YES (`"@react-native-async-storage/async-storage": "^1.19.5"`)
- **Verdict: SAFE TO REMOVE** — this is a React Native package with no purpose in a Next.js web app, and it has zero imports anywhere in the codebase.

---

### AUDIT 6 — @tinymce/tinymce-react

- TinyMCE import count: 6 files
- Files using TinyMCE:
  - `src/form/blog/blog-create-form.tsx` (older blog form; content-studio's newer `BlogEditorContent.tsx` uses Tiptap instead — likely superseded)
  - `src/components/elements/forms/form-editors/FormEditorsMain.jsx` (demo/showcase page, `/elements/forms-editors` — not in sidebar)
  - `src/components/pagesUI/project/project-create/ProjectDescription.jsx` and `ProjectCreateForm.tsx` (part of the orphaned `project-create` demo page flagged in Audit 3)
  - `src/components/pagesUI/company/company-details/CompanySendMailModal.tsx` (part of `src/app/company/*` — **not linked from the sidebar**, same template-leftover pattern as `project`/`invoice` singular)
  - `src/components/pagesUI/apps/email-read/EmailReadMainArea.tsx`, `email-compose/EmailComposeMainArea.tsx` (routed at `/apps/email-read`, `/apps/email-compose` — also absent from the sidebar)
- Tiptap already in use: **YES** — 5 files, including the real `content-studio` and `blog` editor surfaces (`src/app/content-studio/ContentStudioWorkspaceClient.tsx`, `src/components/blog/editor/BlogEditorContent.tsx`, `BlogEditorToolbar.tsx`, `IframeEmbed.ts`, `src/components/builder/user/InlineTextEditor.tsx`).
- **Verdict: NEEDS INVESTIGATION** — every single one of the 6 TinyMCE usages traces back to either an orphaned template demo page (`company`, `apps/email-*`, `elements/forms-editors`, `project-create`) or a blog form that appears superseded by the Tiptap-based content studio. None were confirmed reachable from the live sidebar navigation. If that holds up under a closer look (confirm `company`/`apps` routes truly have no entry point, e.g. via deep links or search), this package becomes SAFE TO REMOVE alongside deleting those demo pages. Do not remove the package while any of these 6 files still exist.

---

### AUDIT 7 — moment vs dayjs vs date-fns

- **moment**: 1 file, 1 usage — `src/redux/slices/wishlistSlice.ts:4,31` (`const now = moment();`)
- **dayjs**: 1 file, 1 usage — `src/components/elements/charts/apex-charts-candlestick/CandlestickChartsAdvanced.tsx:4,276` (`dayjs(val).format('MMM DD HH:mm')`), which is itself inside the `/elements/*` chart-gallery demo section
- **date-fns**: 56 files already using it — the dominant, real date library across calendar, CRM, invoicing, kanban, etc.
- Moment functions used: just the bare constructor `moment()` (no formatting/parsing chain shown beyond that single call)
- Dayjs functions used: `dayjs(val).format(...)`
- **Recommendation: Remove both `moment` and `dayjs`** — each has exactly one trivial call site, and `date-fns` already covers the same need everywhere else in the app. Swap `moment()` → `new Date()` (or a `date-fns` equivalent) in `wishlistSlice.ts`, and `dayjs(val).format('MMM DD HH:mm')` → `format(new Date(val), 'MMM dd HH:mm')` in the (demo-only) candlestick chart, then drop both packages. This is a ~10-minute migration, not a "safe to delete outright" package removal — hence listed as "after 1-line migration" in the summary table.

---

### AUDIT 8 — apexcharts vs recharts

- **apexcharts**: 69 files import `apexcharts`/`react-apexcharts`. The large majority (~62) are under `src/components/elements/charts/apex-charts-*` — a demo/showcase gallery (`/elements/apex-charts-*` routes), not linked from the sidebar. However, a real, load-bearing subset exists:
  - `src/components/pagesUI/dashboard/employee-dashboard/WorkingHourMonthChart.tsx` / `WorkingHourWeekChart.tsx` / `WorkingHourYearChart.tsx`
  - `src/components/pagesUI/dashboard/crm-dashboard/PieChartAud.tsx`, `LineChartYear.tsx`, `LineChartWeek.tsx`, `LineChartMonth.tsx`
  - `src/components/pagesUI/apps/home/SalesChartYearly.tsx`
  - These back real, reachable dashboards (`/dashboard`, likely `/dashboard/hrm-dashboard`, `/dashboard/crm-dashboard`).
- **recharts**: 1 file — `src/components/builder/AnalyticsDashboard.tsx`, used from 2 real routes: `src/app/admin/help/analytics/page.tsx` and `src/app/tasks/dashboard/page.tsx`.
- Where apexcharts is used: dashboard charts (real) + full chart-type showcase gallery (demo)
- Where recharts is used: website-builder analytics dashboard (real, but single call site)
- **Recommendation: Consider removing `recharts`, not `apexcharts`** — apexcharts is both far more heavily used and has confirmed real dashboard usage across multiple production surfaces; migrating those off it would be high-effort/high-risk. Recharts has exactly one real call site, so migrating `AnalyticsDashboard.tsx` to apexcharts (already the app's dominant chart library) and dropping `recharts` is the lower-effort, lower-risk direction — the opposite of what the audit prompt assumed. This still requires a small migration (rewrite one dashboard's chart), so it's a "candidate," not an immediate deletion.
- **Risk level: LOW-MED** for recharts removal (1 file to migrate, low usage); apexcharts removal would be **HIGH** risk/effort and is not recommended.

---

### AUDIT 9 — Other potentially unused packages

- **puppeteer still in package.json**: YES (`"puppeteer": "^24.43.1"`) — and it is **actively used** in 4 files: `src/lib/seo-crawler.ts`, `src/app/api/pdf/route.ts`, `src/app/api/kyc/reports/download/[contactId]/route.ts`, `libs/services/src/pdf/cert-generator.ts`. Not dead — KEEP.
- **lodash usage count**: 0 in `src/`. Notably, `lodash` itself is **not even a declared dependency** in package.json — only `@types/lodash` (devDependency) exists, which now types nothing. **`@types/lodash` is SAFE TO REMOVE** (orphaned type package).
- **axios usage count**: 0 in `src/`, and not present in package.json at all — nothing to remove, just confirming it isn't a hidden dependency.

---

## Safe to Delete/Remove (confirmed — zero usages found)

- `libs/workers/src/crons/booking-reminder-worker.ts` — zero callers anywhere
- `libs/workers/src/crons/session-reminder-worker.ts` — zero callers anywhere
- `src/app/invoice/` (singular, entire directory + its `src/components/pagesUI/invoice/**` backing components) — zero inbound navigation, fully superseded by `src/app/invoices/`
- `@react-native-async-storage/async-storage` (package) — zero imports, wrong platform for this app
- `@types/lodash` (devDependency) — `lodash` itself isn't even installed

## Needs Manual Review

- `src/app/project/` (singular) — mostly dead, but `project-details/[id]/page.tsx` is reachable via `ProjectSingleCard` from the real `/clients/client-details` page. Fix the link before deleting, or keep that one route.
- `@tinymce/tinymce-react` — all 6 usages trace to demo/orphaned pages (`company`, `apps/email-*`, `elements/forms-editors`, `project-create`) or a likely-superseded blog form; confirm none of those pages are secretly reachable (e.g. via a header search or deep link not covered by this grep-based audit) before removing.
- `moment` / `dayjs` — each has one trivial call site; requires a small code change (not a pure deletion) before the package can go.
- `recharts` — one real call site (`AnalyticsDashboard.tsx`); requires migrating that dashboard to `apexcharts` before removal.
- `express` — only used for TypeScript types in `server/middleware/CreditGuard.ts`; could eventually be replaced with local type definitions, but don't remove the package until that's done.
- Adjacent finding (not in original scope): `libs/workers/src/crons/reengagement-loop.ts` and `abandonment-scanner.ts` have live API routes but are **not** in `vercel.json`'s cron schedule — worth confirming with the team whether they're triggered externally or are also effectively dormant.

## Do Not Touch

- `libs/workers/src/automation-executor.ts` — actively used via the LMS event bus (enrollment, payment webhook, certificate flows).
- `express` (as a package, for now) — see above, still required for compilation.
- `apexcharts` / `react-apexcharts` — real dashboards depend on it; do not remove.
- `puppeteer` — actively used for PDF generation and SEO crawling.
- `date-fns` — the app's primary, correctly-used date library.

## Estimated Bundle Size Reduction

Rough, unpacked-package-size based estimates (actual client bundle impact will be smaller since some of these are server-only or tree-shaken; this reflects `node_modules`/install footprint):

| Package | Approx. size | Status |
|---|---|---|
| `@react-native-async-storage/async-storage` | ~0.3 MB | confirmed removable |
| `@types/lodash` | ~0.3 MB | confirmed removable |
| `moment` | ~3 MB (whole package) / ~70 KB min+gzip if bundled | removable after migration |
| `dayjs` | ~0.1 MB (already tiny; minimal win) | removable after migration |
| `@tinymce/tinymce-react` + `tinymce` core (transitive) | ~10-15 MB unpacked, several hundred KB if ever client-bundled | removable pending page cleanup |
| `recharts` | ~2 MB unpacked, ~130 KB min+gzip if bundled | removable after 1-file migration |
| `express` + `@types/express` | ~0.6 MB combined | not currently removable (type dependency) |

**Confirmed-safe total (files + packages with zero usage):** roughly 1 MB of `node_modules` footprint plus removal of one full orphaned page directory (`src/app/invoice/`, ~10 files) and two dead worker files. The bigger wins (`tinymce`, `recharts`, `moment`/`dayjs`) are real but gated on small code changes first, not blind deletion.
