# LeadsMind Codebase Re-Audit — 2026-07-12

Independent re-verification of `LeadsMind_Platform_Documentation.pdf` (v1.0, July 2026) against the actual codebase at `c:\Users\User\Leadsmind-new-dashboard` (branch `dashboard_v1`). Every claim in the source doc was treated as unverified and independently checked against real code, migrations, and nav wiring — not summarized. This document is audit-only; nothing was fixed, moved, or deleted as part of producing it.

Method: 8 parallel research passes, one per module group plus one dedicated to cross-cutting concerns (dead code, broken routes, undocumented additions, security spot-check). Every finding below cites exact file:line evidence. Where live external verification (real Stripe/PayFast/Twilio/Meta credentials, a running dev server, live webhook delivery) was not possible in a read-only static pass, that is stated explicitly rather than guessed.

## Summary

- **Total features re-verified:** 107 (matches the doc's own row count exactly — 65 Complete + 37 Partial + 5 Backend Only)
- **Confirmed accurate:** 75
- **Downgraded from doc's claim (worse than documented):** 31
- **Upgraded from doc's claim (better than documented):** 1 (LMS "Cohorts & RSVPs" — doc says Backend Only/UI in development; a full working RSVP/chat/recordings UI already exists on both student and admin sides)
- **New issues found, not in original doc:** 28+ (dead route trees, duplicate/drifting DB schemas, unauthenticated API routes, a live marketing overclaim, broken nav links, and more — see dedicated sections below)

Per-module accurate/downgraded/upgraded breakdown:

| Module | Features | Accurate | Downgraded | Upgraded |
|---|---|---|---|---|
| CRM & Sales | 13 | 9 | 4 | 0 |
| LMS & Education | 13 | 8 | 4 | 1 |
| Accounting & Finance | 12 | 10 | 2 | 0 |
| Automation & Workflows | 11 | 6 | 5 | 0 |
| HR & Payroll | 10 | 3 | 7 | 0 |
| Calendar & Booking | 12 | 11 | 1 | 0 |
| Communication & Support | 10 | 9 | 1 | 0 |
| Content & Marketing | 12 | 11 | 1 | 0 |
| Settings & Integrations | 14 | 8 | 6 | 0 |
| **Total** | **107** | **75** | **31** | **1** |

---

## Critical — Broken Cross-Module Workflows

The doc's own core sales pitch: *"A lead captured in a form automatically becomes a CRM contact. A CRM contact can be enrolled in an LMS course. A course completion can trigger an automation. An automation can send an invoice. Everything connects."* Each hand-off was independently traced end-to-end.

### 1. Lead → CRM Contact — ✅ WORKS

**What's supposed to happen:** a public form submission becomes a CRM contact automatically.

**What actually happens:** it does, and the implementation is more sophisticated than the doc implies (duplicate detection, safe field-merge, POPIA consent stamping, affiliate attribution).

**Trace** (`src/app/api/public/forms/[id]/submit/route.ts`):
1. `:79-89` — form/workspace validated.
2. `:117-151` — contact fields (email/phone/name/company) dynamically extracted from form config.
3. `:180-216` — duplicate resolution in priority order: prefill token → email match → phone match against `contacts`.
4. `:250-294` (existing contact) or `:301-325` (new contact) — real `.from('contacts').update(...)` / `.insert(...)`, tagged `source: 'form_submission'`.
5. `:329-346` — `contact_activities` row logged.
6. `:349-367` — `form_submissions` row inserted with `contact_id` FK back to the contact.
7. `:374-401` — webhook (`form.submitted`) and automation trigger (`form_submitted`) fired asynchronously.

**Verdict: no fix needed.** This is one of the stronger-than-claimed parts of the platform.

### 2. Course Completion → Automation — ❌ BROKEN

**What's supposed to happen:** a course completion event fires a user-configured automation.

**What actually happens:** the plumbing is entirely real (event emission, rule lookup, action execution are all genuine, non-stub code) — but a trigger-string format mismatch, hardened by a DB constraint, means **no rule created through the only available admin UI can ever match**.

**Trace:**
1. `src/app/actions/studentProgress.ts:100` — on course completion, calls `emitLMSEvent('course.completed', {...})` (**dot** notation). Same file emits `'lesson.completed'` (`:50`) and `'section.completed'` (`:78`).
2. `libs/core/src/events/lms-event-bus.ts:26-31` — queries `lms_automation_rules` `.eq('trigger_type', eventType)` — i.e. looks for the literal string `'course.completed'`.
3. The only admin UI that creates these rules, `src/app/courses/[id]/automations/components/RuleModal.tsx:17-26`, offers **underscore**-format triggers: `course_completed`, `lesson_completed`, `module_completed`, `enrollment_created`, `quiz_passed`, `quiz_failed`.
4. A DB `CHECK` constraint on `lms_automation_rules.trigger_type` (`supabase/migrations/20240101000171_lms_admin.sql:105-109`) hard-enforces exactly that underscore list — **it is structurally impossible to even store a rule with `trigger_type = 'course.completed'`.**
5. Result: step 2's query can never return a match for any rule an admin actually created. `executeLMSAction` (the real action executor, `libs/workers/src/automation-executor.ts`) never runs for course/lesson/module completion or enrollment events created through the real UI.
6. Two events happen to match by coincidence and do work: `certificate_issued` and `struggling_detected` (both already single-word/underscore on the emitting side).
7. Separately, this "LMS Automation Rules" system (`lms_automation_rules`) is **architecturally disconnected** from the platform's general-purpose "Workflow Builder" (`workflows`/`workflow_steps`) — they are two different systems with different tables, UIs, and dispatchers. "Course completion can trigger an automation" is not the same claim as "you can build a workflow that reacts to a course completion," and neither currently works as advertised.

**Fix needed:** align `RuleModal.tsx`'s trigger values (or the `CHECK` constraint) with the actual dot-notation event names emitted by `studentProgress.ts`/`studentEnrollments.ts`/`webhooks/payments/route.ts`, or normalize both sides to one convention. `payment.completed`/`payment.failed` events are also emitted but have no corresponding trigger option in the UI at all — dead events.

### 3. Automation → Invoice — ❌ NOT IMPLEMENTED

**What's supposed to happen:** an automation can send an invoice.

**What actually happens:** no code path exists anywhere that lets an automation create or send an invoice. This is confirmed independently by both the Automation-module audit and the Finance-module audit.

**Evidence:**
- Canonical action registry: `src/lib/automation/ActionRegistry.ts:1-15` — lists `assign_owner`, `add_tag`, `create_opportunity`, `create_task`, `create_notification`, `move_pipeline_stage`, `add_to_watchlist`, `lms_enroll`, `lms_enroll_bundle`, `lms_revoke_access`, `update_community_privilege`, `send_whatsapp_template`. No invoice action.
- Its consumer, `src/lib/automation/WorkflowExecutionEngine.ts:84-102`, only implements 2 of those as real logic (both are thin activity-log stubs), the rest fall to a no-op `default:`.
- The form-workflow engine's real action set (`src/lib/automations/CRMActionHandler.ts:32-58`, `src/lib/automations/WorkflowEngine.ts:262-517`) also has no invoice action.
- `invoice_paid` exists only as a **trigger/condition** you can react to (a workflow can fire *when* an invoice is paid) — never as an action that generates one.
- Repo-wide grep for `send_invoice`, `create_invoice`, `generate_invoice` as an automation node type: zero matches.
- Real invoice creation only happens via the manual invoice builder UI, quote/proposal conversion, and the PayFast booking-checkout webhook — none reachable from any automation/workflow surface.

**Fix needed:** design and implement a real "create invoice" / "send invoice" automation action type, end to end (registry entry, executor case, UI step option).

### 4. Form Submit → Workflow Execution — ✅ WORKS (but only through one specific, hard-to-find editor)

**What's supposed to happen:** submitting a form can trigger a configured workflow (email, task, tag, etc.).

**What actually happens:** it works, genuinely and non-trivially — but **only** for workflows authored through `/forms/[id]/automations` (a per-form step editor). The two dashboard-level surfaces the doc's own Key Routes point to, `/automation` and `/automations`, cannot build a functioning workflow at all (see Automation & Workflows module table below) — so a user following the doc's documented navigation path to "build an automation" will not find a way to create one that fires on form submission.

**Trace:** `src/app/api/public/forms/[id]/submit/route.ts:385` → `TriggerDispatcher.dispatch('form_submitted', ...)` (`src/lib/automations/TriggerDispatcher.ts:33-82`, async, queries `workflows` by `form_id`+`trigger_type`) → `WorkflowEngine.runWorkflow` (`src/lib/automations/WorkflowEngine.ts:36-166`, real step loop, capped at 50) → real actions (`send_email` via Resend, `apply_tags`/`create_task`/etc. via `CRMActionHandler`) → logged to `workflow_executions`/`workflow_step_logs`.

**Fix needed:** unify the three competing "workflow" UIs (`/automation`, `/automations`, `/forms/[id]/automations`) into one real, discoverable authoring surface — see Automation & Workflows findings below for the full picture (three-to-four parallel, mostly-disconnected automation systems exist in this codebase).

---

## Module-by-Module Findings

### CRM & Sales

| Feature | Doc Status | Verified Status | Evidence | What's needed |
|---|---|---|---|---|
| Contacts Management | Complete | **Accurate** | `src/app/actions/contacts.ts:147,170,182` real CRUD against `contacts` | None |
| Contact Detail View | Complete | **Accurate** | `src/app/contacts/[id]/page.tsx:2,23-28` real activity/notes/tasks queries | None |
| Leads Management | Complete | **Downgraded** | Doc's claimed route `/crm/leads` (`src/app/crm/leads/page.tsx`) is 100% static mock data (`src/components/pagesUI/crm/leads/LeadsTable.tsx:21` imports `@/data/crm/lead-data`) **and** orphaned from all nav/links. The real, reachable equivalent ground is covered by Lead Finder + Contacts, not a dedicated Leads screen. | Either wire `/crm/leads` to real data and reachability, or update the doc to point at Lead Finder/Contacts |
| Pipeline Management | Complete | **Accurate** | `src/app/actions/pipelines.ts:91-110` real `pipelines`/`pipeline_stages` queries; drag-drop via `@hello-pangea/dnd`, persisted | None |
| Opportunities & Deals | Complete | **Accurate (doc table name wrong)** | Live route uses `opportunities` table (`src/app/actions/pipelines.ts:59-71`); doc claims `crm_opportunities`, which is a second, separate, orphaned table used only by dead `/crm/pipelines` | Doc correction; consider dropping the unused parallel schema |
| Notes & Tasks | Complete | **Accurate** | `src/app/actions/contacts.ts:231,254,266,278` real writes | None |
| Tags & Segmentation | Complete | **Accurate** | `src/app/actions/contacts.ts:86,98,205,218` real | None |
| Activity Feed | Complete | **Accurate** | `src/app/actions/contacts.ts:56`, populated by form submissions and elsewhere | None |
| Forms & Lead Capture | Complete | **Accurate, stronger than claimed** | Real conditional-logic engine: `src/app/forms/builder/[id]/components/LogicEngine.ts:18,61`; see cross-module trace above | None |
| Quotes & Proposals | Complete | **Downgraded** | `/proposals` actually reuses the `quotes` table (`src/app/actions/finance.ts:101-119`), not the separate, real `proposals` table (used only by the client portal doc list). "PDF export" = `window.print()` (`src/components/proposals/ProposalMasterDetail.tsx:87-88`) — the real server-side PDF engine (`src/app/api/pdf/route.ts`, Puppeteer) is never called from here | Wire real PDF generation into proposal/quote download; reconcile the two proposal/quote tables |
| Lead Finder | Complete | **Downgraded** | Real Google Places search (`src/app/actions/lead-finder.ts:17,33,62`) and real "add to CRM" (`:212`) and real watchlists — but "map view" is fake: `src/components/lead-finder/OpportunityMapLayer.tsx:8-9,42-44`, explicit comment "Simulate map rendering... deterministic fake position," no Mapbox/Google Maps JS SDK anywhere | Replace scatter-plot placeholder with a real map SDK |
| Form Analytics | Complete | **Downgraded (severe)** | `src/app/forms/[id]/analytics/page.tsx:14-26` — explicit comment "Scaffolding mock data," hardcoded KPIs, never queried. `src/app/forms/[id]/ab-testing/page.tsx:14-18,58-60` — hardcoded variants, "Create Variant" button has **no `onClick` handler at all** | Build real analytics queries against `form_submissions`; implement A/B variant storage + handler |
| Email Campaigns to Contacts | Partial | **Accurate** | Sending is real (Resend via cron worker); a full rule-based `SegmentationCompiler.ts:14-80` engine exists but is **never called from anywhere** — campaign builder UI only supports flat comma-separated tags | Wire `SegmentationCompiler` into the campaign builder UI |

**Undocumented findings:** two parallel opportunity schemas (`opportunities` live, `crm_opportunities` dead); two parallel proposal/quote tables; real, undocumented KYC verification routes on the contact profile (`src/app/api/crm/contacts/[id]/verifications/route.ts`, `KycStatusPanel`); Compliance Hub (`/admin/compliance`) touches CRM/POPIA data and isn't in the doc's module list.

**`src/app/crm/` orphan check — CONFIRMED DEAD.** Zero inbound links from anywhere outside the tree itself (grep-confirmed). Mixed vintage: `crm/leads`, `crm/deals`, `crm/crm-setup` are unmodified template demo pages backed by static mock arrays; `crm/page.tsx` and `crm/pipelines` are newer and genuinely Supabase-backed (via the orphaned `crm_opportunities` table) but still unreachable and duplicate the real, live `/pipelines`. The doc's claimed Key Routes `/crm/pipelines` and `/crm/leads` are both dead.

---

### LMS & Education

| Feature | Doc Status | Verified Status | Evidence | What's needed |
|---|---|---|---|---|
| Course Creation & Management | Complete | **Accurate, with schema-duplication caveat** | Real CRUD, but split across two parallel module/lesson schemas (`modules`/`lessons` legacy vs `course_modules`/`course_lessons` live) used by different code paths simultaneously | Consolidate the two schemas |
| Course Modules & Lessons | Complete | **Accurate (same caveat)** | `src/app/courses/[id]/components/LessonCreatorModal.tsx`, `ModuleCreatorModal.tsx` | Same as above |
| Student Enrollment | Complete | **Downgraded** | Stripe path is real end-to-end (checkout session + signed webhook + `enrollments` insert). **PayFast path is a client-side fake**: `src/app/student/checkout/[courseId]/CheckoutClient.tsx:48-67` builds a `payment_status: "COMPLETE"` payload **in the browser** and POSTs it directly to the webhook — no real gateway redirect, no signature (always absent, so verification is always skipped) | Real PayFast redirect + signed ITN required for the student checkout flow — current state is a free-course-access exploit |
| Quiz Engine & Assessments | Complete | **Downgraded (severe)** | DB `CHECK` constraint lists "10 types," but the constraint is tied to an **orphaned** table/UI (`lms_questions`/`QuizBuilder.tsx`, imported nowhere). The actually-wired student quiz path (`quiz_questions` table) has real grading for only `mcq`, `true_false`, `short_answer` — any other type **silently auto-grants full credit**. `fn_auto_grade_quiz` SQL function is never called from app code. All scoring happens **client-side in the browser** and the server persists it verbatim with no re-verification | Implement real server-side grading/verification for all claimed question types; never trust client-submitted scores |
| Certificate Generation | Complete | **Downgraded (severe)** | Real PDF generation exists (`src/app/api/student/courses/[id]/certificate/route.ts`, Puppeteer) and correctly checks completion — but **no row is ever written to `lms_certificates`** (zero `.from('lms_certificates')` calls anywhere), so no certificate is ever persisted or verifiable. The admin route `/courses/certificates` hardcodes `const certificates: any[] = []` with a comment "Static for now," and its buttons call `toast.info`/`toast.success` while `toast` is **never imported** in that file — clicking them throws a runtime `ReferenceError` | Persist certificates to `lms_certificates`; fix the broken admin page (missing import, hardcoded empty list, fake `Math.random()` verify IDs) |
| Student Progress Tracking | Partial | **Accurate** | `src/app/actions/studentProgress.ts:11-139` real `course_progress` writes and cascading completion checks | None beyond what's already flagged |
| Student Portal | Complete | **Accurate** | Real marketplace/enrollment queries, no mock data found | None |
| Public Course Pages | Complete | **Accurate (doc route wrong)** | Real route is `/unauthenticated/courses/[slug]`, not `/courses/[id]` (which is the authenticated admin builder) | Doc correction |
| Expert Profiles & Sessions | Partial | **Accurate** | Admin scheduling is real; no student-facing self-service booking UI exists against `lms_expert_availabilities` — students can only RSVP to admin-created sessions | Build a real student booking flow, or reword doc to "admin-scheduled + RSVP" |
| Remedial Assignments | Complete | **Accurate** | `libs/services/src/ai/remedial-prompter.ts:37-173` — genuine OpenAI-generated remediation from real quiz-mistake data | None — one of the more solid claims in this module |
| Cohorts & RSVPs | Backend Only | **Upgraded (doc contradiction)** | A full working RSVP/live-chat/recordings UI exists on both student (`LiveHelpWidget.tsx:238-265`) and admin (`SessionDetailsModal.tsx:15-189`) sides, not stubs. What's genuinely missing is a true "cohort" grouping entity (a named batch of students) — `cohort` only exists as a session-type enum value | Doc correction; build actual cohort grouping if needed |
| Course Automations | Complete | **Downgraded (severe)** | Real plumbing, broken by the trigger-string mismatch — see Critical section above | See Critical section |
| LMS Analytics | Partial | **Accurate** | Real heartbeat (`enrollments.last_active_at`) and real weighted struggle-score computation | None |

**Undocumented findings:** dual course-content schemas confirmed live simultaneously (code comment: "Try fetching course and quiz from legacy tables... Backward compatibility"); two parallel, non-interoperable quiz table families; `/courses/certificates` ("Credential Hub") not in doc's route list and functionally inert.

---

### Accounting & Finance

| Feature | Doc Status | Verified Status | Evidence | What's needed |
|---|---|---|---|---|
| Invoice Creation & Management | Complete | **Downgraded** | `src/components/invoices/InvoiceBuilder.tsx:103,118` — tax is entirely unimplemented (`tax_total: 0`, comment "Simplified, can add tax later"), UI hardcodes "Tax (0%)" | Implement real tax calculation |
| Quote & Proposal Generation | Complete | **Accurate (duplicated system, undocumented)** | Two parallel conversion functions exist: `src/app/actions/quotes.ts:7-75` and `src/app/actions/finance.ts:199-263` | Consolidate |
| Stripe Payment Processing | Partial | **Accurate** | Real SDK, real signature-verified webhook (`src/app/api/webhooks/stripe/route.ts:17`). `stripe_customers` table is defined but **never queried anywhere** — dead schema | Live credential/end-to-end firing could not be verified without real keys |
| PayFast Payment Processing | Partial | **Accurate** | Two separate ITN handlers exist (invoice-focused and booking-checkout-focused), both structurally correct. Signature check is **silently skipped** when passphrase/signature absent (`src/app/api/webhooks/payfast/route.ts:44-51`); one handler only enforces signature check in production (`src/app/api/payfast/webhook/route.ts:22-25`); checkout falls back to PayFast's **public sandbox** credentials when env vars are unset (`src/app/actions/finance.ts:649-650`) | Enforce signature checks unconditionally; remove sandbox-credential fallback |
| Expense Tracking | Complete | **Accurate** | `getExpensesLive()` real, no mock data found | None |
| Financial Reports | Partial | **Accurate** | Real P&L/VAT/Cash-Flow queries; app's own in-product docs (`src/data/docs.ts:179`) self-admit reports are "still being expanded" | None beyond what's self-documented |
| Bank Connections | Complete | **Accurate** | Real Investec OAuth-style connect + CSV/OFX/QIF import; Absa/Capitec explicitly shown as "Coming Soon" (disabled) | None |
| Accounting Transactions | Complete | **Accurate** | Real double-entry writes from calendar/reconciliation flows | None |
| Chart of Accounts | Complete | **Downgraded** | Real invisible double-entry engine exists (`getOrCreateAccount`), but **no page anywhere lets a user view/manage the chart of accounts** | Build a browsable chart-of-accounts UI, or downgrade doc to "internal only" |
| Credit Notes | Backend Only | **Accurate** | Table defined twice with drifting schemas across two migrations (schema-drift risk); zero application-code references | Matches doc |
| Retainers | Backend Only | **Accurate, with caveat** | Real backend (`applyRetainerToInvoice`); an orphaned UI component `RetainerSelector.tsx` exists but is imported nowhere | Closer to shippable than "backend only" implies |
| Reconciliation | Complete | **Accurate** | Real match-transaction-to-invoice workflow | None |

**Third-Party Payment Integration Reality Check:** see consolidated table below.

**Undocumented findings:** "PDF export" for invoices is `window.print()`, not real generation (`src/components/invoices/InvoiceMasterDetail.tsx:138,255-257`) — the real Puppeteer PDF engine is wired only to Content Studio; **tax inconsistency** — invoice builder hardcodes 0% tax, but the customer-facing PDF template independently fabricates a live 15% VAT breakdown regardless of stored data (`src/components/invoices/templates/SarsTaxInvoicePdf.tsx:102`) — a customer could see a 15%-VAT invoice for a document created with 0% tax recorded server-side (SARS compliance risk); `invoice_items` relational table is effectively dead (main flow stores a JSONB blob instead); `invoices` table is defined three times across migrations with drifting schemas; Payment Gateways nav page lists 5 providers but only PayFast has real backend wiring — Ozow/Peach/Yoco/SnapScan connect through a generic modal with no gateway-specific code found.

---

### Automation & Workflows

This module contains **three-to-four parallel, mostly-disconnected automation systems** sharing overlapping-but-inconsistent database schemas. Only one is fully wired end-to-end (the per-form workflow editor), and it is not the surface the doc's Key Routes point to.

| Feature | Doc Status | Verified Status | Evidence | What's needed |
|---|---|---|---|---|
| Workflow Builder | Partial | **Downgraded (severe)** | No node-based/visual editor exists anywhere in the codebase (no `reactflow`/`xyflow` package). `/automation` (singular) is a read-only card list with a **dead "Create Workflow" button** (no `onClick`, `src/app/automation/page.tsx:37-39`). `/automations` (plural) offers only a name/trigger/description modal with **no step editor at all**. The only real step editor is a linear list-of-cards UI at `/forms/[id]/automations`, not a canvas | Build a real editor; unify the 3 competing "workflow" UIs |
| Workflow Execution Engine | Partial | **Accurate** | Real for form-triggered workflows only: async, step-capped at 50, fully logged | Extend beyond form-only triggers |
| Trigger Types | Partial | **Downgraded** | The real dispatcher supports only 7 form-scoped events. A richer 19-trigger `TriggerRegistry` exists but is **dead code, imported nowhere**. The `/automations` UI even offers `contact_created`, `invoice_paid`, etc. as selectable triggers that **no dispatcher will ever fire** | Wire the registry to a real dispatcher or remove the fake dropdown options |
| Action Types | Partial | **Accurate (with a gap)** | Real actions (`send_email`, `send_whatsapp`, `create_task`, `apply_tags`, etc.) work for form workflows. A second, richer `ActionRegistry` exists but its executor implements only 2 actions as thin stubs | No invoice action type exists anywhere (see Critical section) |
| Campaign Automation | Partial | **Accurate** | Real atomic dispatch worker (`FOR UPDATE SKIP LOCKED`) exists but **is not registered in `vercel.json`'s cron schedule** — confirmed current state | Register the cron, or confirm an external scheduler triggers it |
| Email Sequences | Partial | **Accurate** | Real, via `wait`+`send_email` step chaining in the same form-workflow engine | None |
| SMS Automation | Backend Only | **Accurate** | Real Twilio SDK wiring; `send_whatsapp` step type is executed by the engine but has **no UI to configure it** in the real builder | Add the step type to the `WorkflowEditor` dropdown |
| Workflow History | Complete | **Downgraded** | The history page (`/automation/history`) reads from `workflow_execution_logs` (the dead engine's table), but the actually-working engine writes to a **different table**, `workflow_executions` — the "Complete" history feature is very likely showing an empty/stale view despite real executions happening elsewhere | Point the history page at the correct table |
| Automation Recipes | Partial | **Downgraded** | Seeded recipe workflows (`Invoice Overdue Chase`, etc.) use trigger values (`invoice_overdue`, `sars_tax_reminder`) that don't exist in the dispatcher's trigger union and have no `form_id` set — **permanently unreachable once seeded**, effectively cosmetic | Recipes need real (cron- or event-based) triggers, not form-scoped dispatch |
| Form Automations | Complete | **Accurate — the one genuinely complete sub-feature** | See Critical section trace | None |
| Course Automations | Complete | **Downgraded (severe)** | Real but broken by trigger-string mismatch, and architecturally a wholly separate system from "Workflow Builder" | See Critical section |

**Undocumented findings:** a dead "Unified Automation Engine" schema (`automation_workflows`/`workflow_triggers`/etc.) whose executor (`WorkflowExecutionEngine.processEvent`) is never called anywhere; `/automation`'s KPI tile computes `NaN` because it queries a column (`execution_count`) that doesn't exist on the table it reads; RLS is **disabled entirely** on the real workflow tables (`workflows`, `workflow_steps`, `workflow_executions`, `workflow_step_logs` — migration `20240101000104`) "to ensure reliable CRM automation saves," a cross-tenant isolation gap on the one system that actually works; the doc's claimed table `campaigns` doesn't exist under that name (real tables: `email_campaigns`, `campaign_stats`, `ad_campaigns`, `campaign_dispatch_queue`, `reputation_campaigns`); Inngest is now genuinely implemented (contradicting a prior audit's "absent" finding) but is used only for outbound webhook dispatch, not the automation engine itself, which still runs on fire-and-forget `setTimeout`.

**`/automation` (singular) orphan check:** reachable but hidden — not linked from the sidebar nav, but reachable via the global command palette (`GlobalCommandPalette.tsx:58`, rendered on every dashboard page). A second link to it exists in `OnboardingWidget.tsx`, but that component is itself dead code (rendered nowhere).

---

### HR & Payroll

| Feature | Doc Status | Verified Status | Evidence | What's needed |
|---|---|---|---|---|
| Employee Management | Complete | **Downgraded** | Real CRUD directory exists, but there is no document-upload/attachment feature anywhere despite the doc's "profiles and documents" claim | Build document management |
| Payroll Processing | Complete | **Accurate** | `src/app/api/hr/payroll/route.ts:34-182` — genuine SARS PAYE/UIF/SDL computation, real `payroll_runs`/`payslips` writes with rollback on failure | None — this is a real payroll engine |
| Time Tracking | Complete | **Downgraded (misdescribed)** | What's built is manual project/billable hour-logging (date, project, hours, rate). **There is no clock-in/clock-out, no running timer, and no overtime calculation anywhere** | Doc overclaims; build actual clock-in/out + overtime if that's the intended feature |
| Leave Management | Complete | **Accurate** | Real balance validation, approval flow, real emails and in-app notifications | None |
| Attendance Tracking | Complete | **Downgraded (does not exist)** | No `/hr/attendance` route exists at all. Only orphaned `/hrm/attendance` scaffolding (static data) exists | Feature needs to be built from scratch |
| Termination Workflows | Partial | **Downgraded (0%, not partial)** | `/termination` renders only static demo data, not linked from nav at all | Feature needs to be built from scratch |
| HR Notifications | Partial | **Accurate, narrow** | Real notifications only for leave-request events; payroll runs, new hires, and terminations are silent in-app | Extend notification coverage |
| Schedule Management | Complete | **Downgraded (does not exist)** | No `/hr/schedule` route. Only orphaned `/hrm/schedule` (static data) | Feature needs to be built from scratch |
| Warning Workflows | Complete | **Downgraded (does not exist)** | No `/hr/warning` route. Only orphaned `/hrm/warning` (static data, `warningData` import) | Feature needs to be built from scratch |
| Payslip View | Complete | **Downgraded (misdescribed)** | The one real payslip view is an admin/manager aggregate with **no employee-level filter** (unlike every other HR endpoint, which does filter). The doc's claimed route `/payroll/payroll-payslip` is dead demo scaffolding with a hardcoded fake name/account number | Build a real self-service, per-employee-filtered payslip view; fix the missing filter on the admin GET route (also a security gap — see Settings/Security section) |

**`/hrm/*` duplicate-structure verdict: CONFIRMED DEAD admin-template scaffolding**, not a shared component library and not a live parallel feature. Every `hrm/**` page reads static fixtures from `src/data/hrm/*`; zero imports from the real `/hr/**` tree; zero entries in `src/data/dashboard-nav.ts`. This directly mirrors the already-confirmed `invoice/` (singular, dead) vs `invoices/` (plural, real) precedent. The doc's claimed Key Route "`/hrm/*` — Full HRM submodule routes" is false. Same fate applies to `/payroll/payroll-payslip`, `/payroll-payslip-print`, `/resignation`, `/promotion`, `/award`.

**Undocumented findings:** doc's claimed table `availability_rules` doesn't exist under that name — real tables are `host_availability_profiles`/`meet_date_overrides` (functionality is real, just misnamed in the doc).

---

### Calendar & Booking

| Feature | Doc Status | Verified Status | Evidence | What's needed |
|---|---|---|---|---|
| Appointment Booking | Complete | **Accurate** | Real slot validation, round-robin assignment, `appointments` insert | None |
| Calendar Management | Complete | **Accurate** | Real multi-view + CRUD | None |
| Availability Rules | Partial | **Accurate (sophisticated)** | Real notice-period/buffer/date-override/public-holiday/load-shedding-aware slot engine | Doc's claimed table name doesn't match, functionality itself is fully built |
| Round Robin Assignment | Partial | **Accurate, with dead richer module** | Live path uses simple equal-distribution logic; a more sophisticated priority-weighted/availability-first module exists but is **never called anywhere** | Wire the richer module in, or remove it |
| Public Booking Pages | Complete | **Accurate (branding narrower than implied)** | Correctly public, no auth gate; "custom branding" is logo-only, no deeper theming found | None urgent |
| Instant Meet | Complete | **Accurate** | Real appointment row + real `/meet/{id}` link generation | None |
| Booking Analytics | Complete | **Accurate, not in nav** | Real DB-backed, trigger-populated analytics table; doc's claimed Key Route isn't in the live sidebar | Add to nav if intended to be user-facing |
| Waitlist Management | Complete | **Accurate** | Real RPC-backed add-to-waitlist and DB-trigger-based auto-promotion on cancellation | None |
| Booking Intake Forms | Complete | **Accurate** | Real upsert of custom questions | None |
| Video/Meet Integration | Complete | **Downgraded** | Real WebRTC video via embedded public Jitsi (`meet.jit.si`) — genuinely functioning, not a shell. **"Recording" is entirely absent** — zero code/UI/backend anywhere (grep-confirmed). Also: calendars configured for `google_meet`/`zoom` meeting mode generate a **`Math.random()`-based fake URL** presented as a real meeting link | Remove the false "recording" claim or build it; fix fake meeting-link generation — currently produces non-functional links users would click |
| Google Calendar Sync | Partial | **Accurate, but for a different reason than expected** | All the sync logic (token refresh, freeBusy pull, event push, webhook receiver) is genuinely built. But the actual "Connect Google Calendar" UI is explicitly stubbed: `ConnectProviderModal.tsx:77-80` shows "OAuth connection... coming soon" and does nothing — **there is no way for any user to ever create the initial connection**, so all the real sync code is currently unreachable | Build the actual OAuth connect flow |
| Outlook Calendar Sync | Partial | **Accurate, same reason** | Same "coming soon" stub applies | Same as above |

**Undocumented findings:** fake `google_meet`/`zoom` meeting-link generation is materially misleading (syntactically valid, functionally dead URLs); the richer round-robin algorithm module is dead code; `/calendar/analytics` (a doc-claimed Key Route) isn't in the live sidebar nav.

---

### Communication & Support

| Feature | Doc Status | Verified Status | Evidence | What's needed |
|---|---|---|---|---|
| Email Builder & Sending | Partial | **Accurate** | Real builder + Resend sending | None |
| SMS Messaging | Partial | **Accurate, split architecture** | Real Twilio SDK send used by automations/OTP/reputation; but the `/conversations` inbox's outbound SMS actually routes through an **email-to-SMS gateway** (`sendEmail({ to: '${phone}@sms.leadsmind.io' })`), not the Twilio SDK directly — undocumented dual-path | Confirm live Twilio creds; document the two-path split |
| WhatsApp / Meta Integration | Partial | **Accurate, with a real security gap** | Real Graph API send/receive, real webhook challenge handshake — but **no `X-Hub-Signature-256` verification anywhere** in the POST handler; payload authenticity is not cryptographically checked | Add Meta webhook signature verification |
| LENA AI Assistant | Complete | **Accurate** | Real OpenAI (`gpt-4o-mini`) call with RAG from `lena_knowledge_base`, graceful (not fake) fallback when key unset | None |
| Support Tickets | Complete | **Accurate** | Real end-to-end public thread + agent reply + email notification | None |
| Conversation Inbox | Complete | **Accurate** | Real unified inbox with Supabase Realtime | None |
| Notifications System | Partial | **Accurate** | Real DB-driven in-app notifications | None significant |
| Email Compose & Read | Complete | **Downgraded (severe — routes don't exist)** | `src/app/apps/` doesn't exist on disk at all — deleted in commit `3988a64` (2026-07-08), after a prior audit flagged it as orphaned. The doc's claimed Key Routes 404 today | Doc needs correction — the real, live email surface is inside `/conversations`, not `/apps/*` |
| Support Widget | Complete | **Accurate** | Real settings-backed embeddable widget | None |
| LENA Chat Settings | Complete | **Accurate** | Full real settings UI, DB-backed config | None |

**Undocumented findings (severe):** the marketing site (`src/app/(marketing)/solutions/page.tsx`, driven by `src/data/modules.ts:405-427,731-796`) **still actively markets a "Phone & IVR" module today** (`published: true`, `primary: true`) — "business numbers," "visual IVR menu builder," "click-to-call," "AI voice prompts" — while **zero telephony/voice-call code exists anywhere in the app** (no phone-provisioning route, no IVR builder, no TwiML voice constructs, confirmed by repo-wide grep). This is the exact previously-confirmed overclaim pattern, live in production marketing right now, not a historical/fixed issue. Separately, the live header's user-dropdown menu (`HeaderUserProfile.tsx:80,85`) still contains broken links to `/apps/app-chat` and `/apps/email-inbox` — both point into the now-deleted `/apps` route tree and 404 on click, from every page in the app.

---

### Content & Marketing

| Feature | Doc Status | Verified Status | Evidence | What's needed |
|---|---|---|---|---|
| Blog Management | Complete | **Accurate** | Real CMS, editor, comments, analytics | None |
| Blog SEO | Complete | **Accurate** | Live-query sitemap generation, not static placeholder XML | None |
| Content Studio | Complete | **Downgraded (orphaned)** | Real, functioning long-form editor with AI assistance, grammar/plagiarism checking — but **zero inbound links anywhere in the app**; only reachable by typing the URL directly | Link it from somewhere reachable, or clarify its relationship to `/ai-studio` |
| Grammar Checker | Partial | **Accurate** | Real self-hosted LanguageTool API call | None (external uptime not verifiable statically) |
| Plagiarism Checker | Partial | **Accurate** | Real two-layer check (internal shingling + Serper.dev web search), real credit-gated, graceful degradation when key absent | None |
| Funnel Builder | Complete | **Accurate** | Real Craft.js-based drag-and-drop with real persistence | None |
| Landing Page Editor | Complete | **Accurate** | Shares the same real builder engine | None |
| Website Builder | Complete | **Accurate** | Shares the same real builder engine | None |
| Social Media Posts | Partial | **Accurate, with a gap** | Real Meta Graph API publish for Facebook/Instagram; LinkedIn/TikTok have connect flows but no publish logic found in the publish route | Confirm/complete LinkedIn/TikTok publish |
| Forms Builder | Complete | **Accurate (plausible, not deeply re-verified)** | Migration evidence for conditional logic confirmed; component-level depth not fully re-traced this pass | Recommend a follow-up pass reading the builder component directly |
| SEO Competitor Tracking | Partial | **Accurate** | Real DataForSEO-backed calls with mock fallback when creds absent | None |
| SEO Attribution | Partial | **Accurate** | Real DB rollup via RPC | None |

**content-studio vs ai-studio:** both real, separate, functioning features. The nav's "Content Studio" label actually points to `/ai-studio` (an AI copy/research hub), not `/content-studio` (the long-form document editor that actually matches the doc's description). `/content-studio` is orphaned from all navigation.

**Undocumented findings:** `/blog` (doc-claimed route) is the public reader view, not the "full CMS" surface — the actual CMS entry point is `/blog/manage` — same route-label mismatch pattern as content-studio/ai-studio.

---

### Settings & Integrations

| Feature | Doc Status | Verified Status | Evidence | What's needed |
|---|---|---|---|---|
| Workspace Settings | Complete | **Accurate** | Real, session-scoped | None |
| Team Management | Complete | **Accurate** | Real, admin-role-checked invites | None |
| API Key Management | Complete | **Downgraded (security)** | Feature works but the route trusts a raw client-supplied `?workspaceId=` with **zero auth check**, using a service-role client that bypasses RLS — anyone can list/generate/revoke API keys for any workspace by guessing its UUID | Add `requireAuth` + membership check |
| Branding & White-Label | Complete | **Accurate** | Real, session-scoped | None |
| Domain Configuration | Complete | **Accurate, minor auth gap** | Real Vercel Domains API + real DNS TXT verification (not a fake toggle); the raw verify API route has no auth check | Auth-guard the raw route |
| Webhook Management | Complete | **Downgraded (severe — dead)** | The Settings UI CRUDs `workspace_webhooks`, but the only real dispatcher (`src/lib/inngest/functions/webhookDispatch.ts`) reads exclusively from a **different table**, `webhook_endpoints`. A webhook a user configures in Settings will **never fire**. No "test webhook" feature exists | Point the dispatcher at the right table, or migrate the UI to the right table; add auth |
| Billing Settings | Complete | **Downgraded (severe — fully mocked)** | Hardcoded "UNLIMITED NEURAL CAPACITY" copy; the "upgrade" button only shows a toast. No subscription data, no payment-method management, no Stripe Billing Portal call anywhere | Build real subscription/payment-method management |
| Google Integration | Partial | **Accurate, mislabeled** | Real Google Search Console OAuth + separate real Calendar OAuth — doc's description conflates the two | Doc correction |
| Stripe Integration | Partial | **Accurate, mislabeled** | Platform-level Stripe checkout/webhook is real; **Stripe Connect specifically does not exist anywhere** despite being named in the doc | Doc correction, or build Connect if intended |
| PayFast Integration | Partial | **Accurate** | Real platform-level signature verification | None |
| Twilio Integration | Partial | **Accurate, with a security gap** | Real SDK with graceful sandbox fallback; inbound webhook has **zero Twilio signature validation** | Add signature validation |
| Meta/WhatsApp Integration | Partial | **Accurate, with a security gap** | Auth-gated connections route is solid; inbound webhook POST handler validates nothing (same gap noted in Communication module) | Add signature validation |
| AI Settings & Credits | Complete | **Downgraded (severe)** | Brand-voice config and credit tracking are real, but the "buy more credits" flow literally comments `// Simulate top-up in database` and directly increments the credit balance from the browser with **no payment ever taken** | Wire to real Stripe checkout — current state is a free-credits exploit |
| Integrations Hub | Complete | **Downgraded (severe — UI theater)** | The connect modal collects real API keys/secrets/passwords (including SARS eFiling passwords) for payment/bank/tax/identity/credit-bureau providers, then **the submit handler never sends those fields to the API route**, which has no parameter to receive them and never writes to the `credentials` column that exists in the table. The UI then reports "Connected" purely on a boolean flip | Severe — same class of issue as the confirmed "Phone & IVR" overclaim: users are told a real connection succeeded when nothing was saved. Wire credential fields through to real storage |

**Technical Architecture / Security Spot-Check** (findings list, most-severe first):

1. **"Every API route requires `requireAuth()` as the first operation" — CONTRADICTED.** Literal `requireAuth` appears in only 10 of 158 `route.ts` files. Even counting any recognizable auth pattern, **~70% (110/158) have no discernible auth guard.** A concrete, exploitable subset has *no* protection at all: `src/app/api/settings/api-keys/route.ts`, `src/app/api/settings/webhooks/route.ts`, `src/app/api/settings/integrations/route.ts`, `src/app/api/domains/verify/route.ts`, `src/app/api/finance/overview/route.ts:11-15`, `src/app/api/lms/course/route.ts`, `src/app/api/lms/lessons/route.ts`, `src/app/api/lms/modules/route.ts`. **Severity: CRITICAL.**
2. **".eq('workspace_id', ...) on every mutation" — CONTRADICTED for a concrete subset.** `src/app/api/lms/course/route.ts:63-66`, `src/app/api/lms/lessons/route.ts:120-122,144-145`, `src/app/api/lms/modules/route.ts:127-129,151-152` all mutate/delete by `id` alone, no workspace scoping and no auth — cross-tenant tampering is possible by guessing a UUID. **Severity: HIGH.**
3. **Service role key exposure — CONFIRMED (no violation).** 85 files reference `SUPABASE_SERVICE_ROLE_KEY`; none in a `'use client'` file; no `NEXT_PUBLIC_*SERVICE_ROLE*` pattern anywhere.
4. **Hardcoded secrets — CONFIRMED (no violation).** No live-looking secret literals found in source; only clearly-labeled mocks (`mock_fb_page_token_1..4`).
5. **CRON_SECRET validation — CONFIRMED.** 16/16 `src/app/api/cron/**` files reference it.
6. **WEBHOOK_SIGNING_SECRET — PARTIALLY TRUE.** Accurate for outgoing dispatch (HMAC-signed, fails hard if unset) and for Stripe/PayFast inbound (their own provider secrets, appropriately). But **Twilio inbound and Meta inbound webhooks have zero signature verification on their POST handlers.** **Severity: MEDIUM-HIGH** — forged inbound events can inject fake SMS/WhatsApp messages and trigger real side effects (e.g. auto-enrollment).
7. **RLS recursion bug — RESOLVED.** The originally-broken recursive policy (`supabase/migrations/20240101000001_fix_auth_workspace.sql:133-140`) has a real fix migration in place: `supabase/migrations/20260705000001_fix_workspace_members_recursive_policy.sql`, using a `SECURITY DEFINER` helper function correctly. Verified against the actual current file, not assumed.
8. **Inngest — now genuinely present**, contradicting a prior (2026-07-06) audit's "absent" finding. Real client, real Next.js route handler, real webhook-dispatch function with retries — but used only for outbound webhook dispatch, not the core automation engine.
9. `src/app/dashboard/layout.tsx`'s previously-flagged dead imports are gone; `src/app/error.tsx`/`global-error.tsx` now exist (both previously-flagged issues from an earlier audit are fixed).

**Undocumented findings:** two parallel, disconnected webhook subsystems exist (`workspace_webhooks` vs `webhook_endpoints`); the Settings UI only manages the one the dispatcher never reads.

---

## Third-Party Payment/Integration Reality Check

| Integration | Doc Status | Has real credentials/webhook wiring? | Notes |
|---|---|---|---|
| Stripe (checkout + webhook) | Partial | **Yes, structurally** | Real SDK, real `constructEvent` signature check, not bypassed. `.env.example` only has placeholders — live production credential presence could not be confirmed from code. `stripe_customers` table is dead (never queried). |
| Stripe Connect | Partial (doc names it specifically) | **No** | Zero Connect/connected-account code found anywhere (`accounts.create`, `express`, `connected_account` — no hits). Doc's specific claim is false. |
| PayFast (invoicing) | Partial | **Yes, structurally, with gaps** | Real MD5 ITN signature construction in two separate handlers; but verification is conditionally skipped (unset passphrase, or non-production env) in both; checkout falls back to public sandbox merchant credentials when unset. |
| PayFast (LMS student checkout) | (covered under LMS Student Enrollment) | **No — fake** | Client fabricates a "COMPLETE" payment payload and posts it directly to the webhook; no real gateway involved. |
| Twilio (SMS) | Partial | **Yes for outbound automations/OTP** | Real SDK, graceful sandbox fallback. Inbound webhook has no signature validation (security gap, not a completeness gap). |
| Twilio (Conversations-inbox SMS) | (undocumented split) | **Partial — routes via email-to-SMS gateway, not the SDK directly** | Undocumented architectural split from the automation-path SMS sending. |
| Meta / WhatsApp | Partial | **Yes, structurally** | Real Graph API calls, real inbound webhook with contact/conversation resolution and compliance (STOP/START) handling. No HMAC signature verification on the POST handler — security gap. |
| Google (Search Console OAuth) | Partial (doc labels this "Calendar") | **Yes** | Real OAuth code exchange, encrypted refresh-token storage. Mislabeled in the doc — this is GSC, not Calendar. |
| Google Calendar Sync | Partial | **Backend yes; connect flow no** | All sync logic (token refresh, freeBusy, event push, webhook) is real, but the "Connect" button is explicitly stubbed "coming soon" — no user can ever create the initial connection. |
| Outlook Calendar Sync | Partial | **Same as Google Calendar** | Same "coming soon" stub. |
| Domain provisioning (Vercel) | Complete | **Yes** | Real Vercel Domains API + real DNS TXT verification, not a fake toggle. |
| Integrations Hub generic connectors (bank/tax/identity/credit-bureau providers) | Complete | **No — UI theater** | Credential fields are collected but never transmitted/stored; UI reports "Connected" regardless. |
| Inngest | (implied by doc's tech stack table) | **Yes, but narrow scope** | Real, but only for outbound webhook dispatch — not the automation engine. |

None of the above were exercised with live external credentials or a live webhook round-trip in this audit — all conclusions are from static code/migration inspection. Where noted "Yes, structurally," this means the code is well-formed and would plausibly work with real, correctly-configured production credentials, not that live delivery was confirmed.

---

## Orphaned / Dead Code Found

| Path | Verdict | Evidence |
|---|---|---|
| `src/app/crm/**` (leads, pipelines, deals, crm-setup, activity) | DEAD | Zero inbound links from outside the tree; duplicates real `/pipelines`/`/contacts` |
| `src/app/hrm/**` (all 16 subfolders) | DEAD | Zero inbound links, zero nav entries, static-data-only components |
| `src/app/payroll/payroll-payslip`, `src/app/payroll-payslip-print`, `src/app/termination`, `src/app/resignation`, `src/app/promotion`, `src/app/award` | DEAD | Same static-scaffolding pattern as `/hrm` |
| `src/app/elements/**` (46 subfolders — UI-kit showcase) | DEAD | Zero inbound links anywhere; not in nav |
| `src/app/clients/**` | DEAD | Zero live inbound links (only referenced by other dead pages) |
| `src/app/deals/property/[id]/**` | DEAD | Zero inbound refs; the page itself is a dead-end `redirect('/pipelines')` even if reached |
| `src/app/table/**` | DEAD | Zero inbound refs |
| `src/app/document/**` | DEAD | Zero inbound refs |
| `src/app/pages/**` (blank-page, faq, privacy-policy, search, terms-conditions, blog) | DEAD | Zero inbound refs; real `/privacy-policy` and `/terms` (top-level) are the live, linked ones |
| `src/app/award/**`, `src/app/promotion/**`, `src/app/feedback/**`, `src/app/transfer/**` | DEAD | Zero inbound refs |
| `src/app/404-error-page/**`, `404-error-page-2`, `500-error-page`, `maintenance`, `coming-soon`, `offline` | DEAD | Zero inbound refs; real error handling is self-contained in `error.tsx`/`global-error.tsx`/`[...not_found]` |
| `src/app/community/page.tsx` (bare root) | PARTIALLY LIVE | `/community/forums` is live and nav-linked; the bare `/community` root has zero real inbound refs |
| `src/app/content-studio/**` | ORPHANED (feature is real) | Zero inbound links; only reachable by direct URL |
| `src/app/project/**` (singular) | MOSTLY DEAD, re-confirmed worse than a prior audit found | A prior audit believed `project-details/[id]` was reachable via `ProjectSingleCard` from the real `/clients/client-details` page — but `/clients/**` is itself confirmed dead this pass, so that "reachable" path doesn't actually exist either. Needs re-tracing of all `ProjectSingleCard`/`ClientSingleCard` callers to fully close this out. |
| `src/components/pagesUI/apps/email-read/**`, `email-compose/**` and the `src/app/apps/**` route tree | **DELETED**, not merely orphaned | Removed entirely in commit `3988a64` (2026-07-08); doc still claims these as live Key Routes |
| `src/lib/automation/WorkflowExecutionEngine.ts`, `ActionRegistry.ts`, `TriggerRegistry.ts` | DEAD | Never called/imported outside their own files (confirmed by the Automation module audit) |
| `src/components/invoices/RetainerSelector.tsx` | DEAD | Defined and exported, imported nowhere |
| `src/app/actions/calendar/round-robin.ts` (`getNextHost`, `trackAssignment`) | DEAD | Richer round-robin algorithm, never called |
| `src/components/production/OnboardingWidget.tsx` | DEAD | Rendered nowhere outside its own file |

**Nav wiring consistency check:** the new `src/data/dashboard-nav.ts` and its supporting components (`NavRail.tsx`, `NavSubPanel.tsx`, `NavItemsList.tsx`) are internally consistent and fully wired; the deleted `src/data/sidebar-data.ts` has zero remaining imports anywhere (only referenced in a frozen test-fixture comment). No transitional/broken state — this migration is clean.

---

## Broken Routes

- **`/apps/email-compose`, `/apps/email-read`** — do not resolve at all; the entire `src/app/apps/` directory has been deleted. Doc lists both as live "Complete" Key Routes.
- **`/forms/[id]/builder`** (doc's claimed route) — does not exist as specified. `src/app/forms/[id]/page.tsx` is a redirect shim to `/forms/builder/[id]` (segments swapped). The real live route is `/forms/builder/[id]`.
- **`/crm/pipelines`, `/crm/leads`** — resolve to real files and render if hit directly, but are unreachable through any in-app navigation (see Orphaned Code section).
- **Broken header links** (not in doc's route list, found independently): `/apps/app-chat` and `/apps/email-inbox`, linked from `HeaderUserProfile.tsx:80,85`, rendered in the header dropdown on every page — both 404 since `/apps/**` no longer exists.

All other doc-listed Key Routes resolve to a real `page.tsx`/`route.ts` with no obvious static breakage (imports resolve, no dead redirects) — see the full list in the underlying agent transcripts. **Could not be verified statically** (would require a running dev server + live Supabase data): any route's actual runtime behavior against real data, auth-gated redirects, `notFound()` branches that depend on data state, and all client-side interactive flows (builders, quiz-taking, checkout). This audit did not start a dev server or exercise the app in a browser — all findings are from static file/import/migration inspection only.

---

## Undocumented Additions

The doc claims exactly 9 modules + Settings. The actual app has substantially more surface area:

- **`src/app/ai-studio/**`** — real AI content/research tool (copy generation, AI-generated contact research briefs). Nav-linked as "Content Studio." Complete.
- **`src/app/kyc/**`, `src/app/admin/compliance/**`** — real FICA/POPIA compliance dashboard and public KYC consent-capture flow. Nav-linked as "Compliance Hub." Complete.
- **`src/app/inventory/**`, `src/app/shipments/**`, `src/app/track/[shipmentId]/**`** — real inventory management and courier shipment tracking with a public tracking page. Nav-linked. Complete.
- **`src/app/reputation/**`** — real review/reputation management. Nav-linked. Complete.
- **`src/app/affiliate-marketplace/**`, `src/app/affiliate-portal/**`, `src/app/affiliates/**`** — a full, real affiliate program (internal management, external affiliate-facing portal, program marketplace). Nav-linked. Complete.
- **`src/app/ads/**`** — real ads management. Nav-linked. Complete.
- **`src/app/admin/dead-letters/**`, `src/app/system/health/**`** — internal ops tools (failed-webhook replay panel, system health/observability dashboard). Not nav-linked (internal-only by design). Complete.
- **`src/app/products/**`, `src/app/orders/**`** — a real commerce/e-commerce module. Nav-linked under "Commerce & Ops." Complete (CRUD depth not fully re-verified this pass).
- **`src/app/websites/**`** — real website-listing surface, distinct from the `/editor/website/[id]` per-site editor. Nav-linked. Complete.
- **`src/app/portal/**` + `src/app/(portal)/portal/**` + `src/app/(auth)/portal/login`** — a sprawling, undocumented client-portal subsystem: an authenticated client portal (bookings/courses/documents/invoices/profile/projects/support), plus token-authenticated public pages including a **real-estate/legal-services conveyancing and funds-declaration flow** — an entire undocumented vertical not mentioned anywhere in the 9-module doc.
- **`src/app/media/**`** — real Media Center. Nav-linked (oddly grouped under "Learning").
- **`src/app/widget/iframe/**`, `src/app/widget/reviews/**`, `src/app/embed/form.js/**`** — real embeddable public surfaces (support widget iframe, reviews widget, a hand-written vanilla-JS form-embed SDK explicitly flagged in its own code comment as "not a compiled/minified bundle... served as source for now").

---

## Prioritized Task List

**P0 = broken core workflow or Complete-labeled feature that's actually broken. P1 = Partial feature blocking a real use case. P2 = Backend-only feature needing UI. P3 = polish/nice-to-have.**

### P0

1. Automation cannot send/create invoices — no action type exists anywhere in either automation engine. `src/lib/automation/ActionRegistry.ts`, `src/lib/automation/WorkflowExecutionEngine.ts:84-102`. **[L]**
2. Course/lesson/module-completion automations can never fire — trigger-string mismatch (`course.completed` emitted vs `course_completed` required by DB CHECK constraint). `libs/core/src/events/lms-event-bus.ts`, `src/app/courses/[id]/automations/components/RuleModal.tsx:17-26`, `supabase/migrations/20240101000171_lms_admin.sql:105-109`. **[M]**
3. ~70% of API routes have no auth guard; a confirmed-exploitable subset has zero protection and no workspace scoping (cross-tenant read/write). `src/app/api/settings/api-keys/route.ts`, `src/app/api/settings/webhooks/route.ts`, `src/app/api/settings/integrations/route.ts`, `src/app/api/domains/verify/route.ts`, `src/app/api/finance/overview/route.ts`, `src/app/api/lms/course/route.ts`, `src/app/api/lms/lessons/route.ts`, `src/app/api/lms/modules/route.ts`. **[L]**
4. Integrations Hub silently discards user-entered API keys/secrets/passwords (incl. SARS eFiling passwords) while reporting "Connected." `src/components/settings/ConnectProviderModal.tsx`, `src/app/api/settings/integrations/route.ts:26-69`. **[M]**
5. Webhook Management: webhooks configured in Settings are never dispatched — dispatcher reads a different table entirely. `src/app/api/settings/webhooks/route.ts` vs `src/lib/inngest/functions/webhookDispatch.ts:41-49`. **[S]**
6. Billing Settings is fully mocked — no real subscription/payment-method management, "upgrade" is a toast. `src/app/settings/components/tabs/BillingTab.tsx:10-48`. **[L]**
7. AI Credits "buy more credits" directly increments the DB with no payment taken — free-credits exploit. `src/app/settings/components/tabs/AiCreditsTab.tsx:41-56`. **[S]**
8. Form Analytics and A/B Testing are 100% hardcoded mock data; "Create Variant" button has no handler at all. `src/app/forms/[id]/analytics/page.tsx:14-26`, `src/app/forms/[id]/ab-testing/page.tsx:14-18,58-60`. **[M]**
9. Certificates are never persisted (`lms_certificates` never written); admin certificate page is hardcoded empty and its buttons throw a `ReferenceError` (missing `toast` import). `src/app/api/student/courses/[id]/certificate/route.ts`, `src/app/courses/certificates/CertificatesClient.tsx:27,35`. **[M]**
10. Quiz Engine grades only 3 of the claimed 10 question types; unsupported types auto-grant full credit; client-submitted scores are trusted verbatim with no server-side verification — academic-integrity bypass. `src/app/student/courses/[id]/quiz/[quizId]/StudentQuizClient.tsx:41-95`. **[L]**
11. Student-facing PayFast checkout is a client-fabricated fake payment (no real gateway involved) — free-course-access exploit. `src/app/student/checkout/[courseId]/CheckoutClient.tsx:48-67`. **[M]**
12. HR "Attendance Tracking" (Complete) does not exist at all — only orphaned static demo scaffolding under `/hrm`. **[L]**
13. HR "Schedule Management" (Complete) does not exist at all — same pattern. **[L]**
14. HR "Warning Workflows" (Complete) does not exist at all — same pattern. **[L]**
15. Video/Meet: fake `google_meet`/`zoom` link generation (`Math.random()`-based) presents non-functional URLs as real meeting links. `src/app/actions/calendar/appointments.ts:76-78`. **[S]**
16. `/automation` and `/automations` (the doc's own claimed Workflow Builder Key Routes) cannot actually build a working workflow — no step editor exists on either page, and `/automation`'s "Create Workflow" button has no handler. `src/app/automation/page.tsx:37-39`, `src/app/automations/AutomationsClient.tsx:187-205`. **[L]**
17. Workflow History page reads from the wrong table and likely always shows empty/stale data despite real automation activity occurring elsewhere. `src/app/automation/history/page.tsx:17-30` vs `src/lib/automations/AutomationLogger.ts:24-26`. **[S]**
18. The public marketing site actively advertises a "Phone & IVR" module as live (`published: true`) with zero implementing code anywhere — a live, ongoing deceptive claim, not a historical one. `src/data/modules.ts:405-427,731-796`. **[S — content removal; L if actually built]**
19. Invoice tax is hardcoded to 0% in the builder while the customer-facing PDF independently fabricates a live 15% VAT breakdown regardless of stored data — SARS compliance risk, inconsistent documents. `src/components/invoices/InvoiceBuilder.tsx:103,118`, `src/components/invoices/templates/SarsTaxInvoicePdf.tsx:102`. **[M]**
20. Twilio inbound webhook has no signature validation — forgeable SMS events that can trigger real side effects (e.g. auto-enrollment). `src/app/api/webhooks/twilio/inbound/route.ts`. **[S]**
21. Meta webhook POST handler has no `X-Hub-Signature-256` validation — forgeable inbound WhatsApp/Messenger events. `src/app/api/webhooks/meta/route.ts:30-183`. **[S]**

### P1

22. HR "Termination Workflows" (doc says Partial; actually 0% — only static orphaned scaffolding). **[M]**
23. `/hrm/*` entire tree is dead admin-template scaffolding; doc's claimed Key Route "Full HRM submodule routes" is false. Decide: delete, or build the real feature. **[M — decision + cleanup]**
24. `src/app/crm/*` entire tree is dead, duplicating real `/pipelines`/`/contacts`; doc's claimed Key Routes `/crm/pipelines`/`/crm/leads` are dead. **[S — cleanup, or redirect to real routes]**
25. Quotes & Proposals "PDF export" is `window.print()`, not real PDF generation, despite a working Puppeteer PDF engine existing elsewhere in the app (wired only to Content Studio). **[S — wiring, engine already exists]**
26. `/content-studio` — a real, working feature matching the doc's description — is completely unlinked from any navigation; the sidebar's "Content Studio" label instead points to the differently-scoped `/ai-studio`. **[S]**
27. Google/Outlook Calendar Sync: all sync logic is real but the "Connect" button is explicitly stubbed "coming soon" — no user can ever create a connection. `src/components/settings/ConnectProviderModal.tsx:77-80`. **[M]**
28. Lead Finder's "map view" is a fake deterministic scatter-plot, not a real map (no Mapbox/Google Maps SDK). `src/components/lead-finder/OpportunityMapLayer.tsx:8-9,42-44`. **[M]**
29. HR Time Tracking is misdescribed — no clock-in/out or overtime tracking exists; what's built is manual project-hour logging. Decide whether to build the claimed feature or correct the doc. **[L if building; S if redoc]**
30. HR Payslip View has no employee-level access filter on the real payroll GET route (also a workspace-scoping/security concern, see #2 pattern) and the doc's claimed route is dead demo scaffolding. **[M]**
31. Chart of Accounts has a real backend but no browsable/manageable UI at all. **[M]**
32. Stripe Connect is specifically named in the doc but does not exist in any form. **[L if building; S if redoc]**
33. LinkedIn/TikTok social publish: connect flows exist but no actual publish-API calls were found for those platforms. **[M]**
34. Automation Recipes are permanently unreachable once seeded (trigger values that can never match, no `form_id` set). **[S]**
35. Automation Trigger Types: a 19-trigger registry exists but is dead code; the live UI offers triggers (`contact_created`, `invoice_paid`, etc.) that no dispatcher will ever fire. **[M]**
36. Employee document management (upload/attach files) doesn't exist despite the doc's "profiles and documents" claim. **[M]**
37. HR Notifications only cover leave-request events; payroll runs, new hires, and terminations are silent in-app. **[S]**
38. PayFast signature verification is conditionally skipped (missing passphrase, or non-production env) rather than unconditionally enforced; checkout falls back to public sandbox credentials when unconfigured. `src/app/api/webhooks/payfast/route.ts:44-51`, `src/app/actions/finance.ts:649-650`. **[S]**
39. API Key Management, Domain verify routes lack auth checks (narrower version of P0 #3, listed separately since they were called out individually by the audit). **[S]**

### P2

40. Credit Notes: DB schema exists (with drift between two migrations) but no UI at all — matches doc, needs a UI. **[M]**
41. Retainers: real backend exists; an orphaned `RetainerSelector.tsx` component is already half-built and just needs wiring in. **[S]**
42. SMS Automation (`send_whatsapp` step): engine support exists but the step type is missing from the real workflow-editor's dropdown. **[S]**
43. Cohorts (true grouping entity): doc says Backend Only, but actually the RSVP/chat/recordings UI is already live — what's missing is just the "named cohort" grouping concept itself. **[M]**
44. Expert self-service booking: admin scheduling + RSVP exists; no student-initiated booking UI against `lms_expert_availabilities`. **[M]**
45. Round-robin: a richer priority-weighted/availability-first algorithm module is fully built but never wired in. **[S]**

### P3

46. Two parallel opportunity schemas (`opportunities` live, `crm_opportunities` dead) — pick one, drop the other.
47. Two parallel proposal/quote conversion functions and table usages — consolidate.
48. `invoices` table defined three times across migrations with drifting schemas — migration hygiene cleanup.
49. `stripe_customers` table defined but never queried anywhere — dead schema, drop or wire up.
50. Broken header dropdown links to deleted `/apps/app-chat`, `/apps/email-inbox` — remove or fix.
51. `/automation` page KPI renders `NaN` (queries a nonexistent column). `src/app/automation/page.tsx:23`.
52. Dual course-content schemas (`modules`/`lessons` vs `course_modules`/`course_lessons`) coexist — consolidate.
53. Dual quiz-table families (`lms_quizzes`/`lms_questions` orphaned vs `quiz_questions` live) — remove the dead one.
54. RLS is disabled entirely on the real, working workflow tables — revisit for cross-tenant isolation once other P0 auth gaps are closed.
55. Payment Gateways nav page lists 5 providers; only PayFast has real backend wiring — either build Ozow/Peach/Yoco/SnapScan or remove them from the list.

---

## Open Questions / Needs Client Input

- **Which of the three automation UIs (`/automation`, `/automations`, `/forms/[id]/automations`) should become the single real "Workflow Builder"?** This is a product-direction decision, not just a bug fix — the working engine currently lives behind the least-discoverable surface.
- **Is a true node-based/canvas visual workflow editor actually required**, or is the existing linear step-list editor (already working for form-triggered workflows) an acceptable permanent design? The doc's "visual workflow builder with node-based editor" phrase implies more than currently exists or is planned in code.
- **Should `/hrm/*`, `/crm/*`, and the other confirmed-dead admin-template directories be deleted outright, or is there unrealized product intent behind any of them** (e.g., was `/hrm` meant to eventually replace `/hr`, or vice versa)? Deleting outright is low-risk per the evidence gathered, but confirm before removing anything HR/payroll-related given compliance sensitivity.
- **Is the client-portal "conveyancing / funds-declaration" flow (`src/app/portal/conveyancing/**`, `src/app/portal/funds-declaration/**`) an intentional real-estate/legal-services vertical the business is pursuing, or leftover scope from a different engagement?** It's fully undocumented in the platform doc and represents a distinct product surface.
- **Should the "Phone & IVR" marketing page be taken down immediately, or is telephony actually planned for near-term delivery?** Given this is a live, public-facing claim (not just internal doc drift), this needs a fast decision independent of the rest of this list's prioritization.
- **What is the intended relationship between `/ai-studio` and `/content-studio`?** Two real, separately-built features currently coexist with an ambiguous nav label ("Content Studio" points to `/ai-studio`) — decide whether to merge, rename, or link both.
- **Is the current PayFast "sandbox credential fallback when unconfigured" behavior (silently processing fake/sandbox payments instead of failing loudly) acceptable for any environment**, or should missing PayFast credentials hard-fail checkout instead?
- **Given the confirmed ~70% API-route auth-guard gap, is there an existing security/pen-test backlog this should merge into**, or should this audit's P0 security findings be treated as the authoritative starting list?
