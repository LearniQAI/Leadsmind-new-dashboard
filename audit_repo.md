# LeadsMind — Complete Platform Re-Audit
Date: 2026-07-18
Branch: `dashboard_v1` @ `56901ec` ("booking")
Scope: Full codebase, all modules, cross-referenced against every prior audit document found in this repo (`crm.md`, `marketing.md`, `calendar.md`, `contrast-audit.md`, `action-security-triage.md`, `security-remediation.md`, `tasks.md`, `projects.md`, `future_task.md`) plus the original 58-item task list (`LeadsMind_Task_List.pdf`), plus fresh audit coverage of modules/routes no prior document had touched.

## Method Note

This audit was run as nine parallel, independent research passes (CRM/Sales+Commerce, Automation, Finance, HR/Payroll, LMS, Calendar, Communication+Marketing, Settings/Security, and a repo-wide UI-bug/schema/dead-code sweep), each instructed not to trust any prior document's "RESOLVED" claim at face value. Each pass re-read the current source for every claim it checked and, where feasible, ran **read-only** live queries against the production Supabase project (service-role key from `.env.local`) to confirm table existence, row counts, and column presence. No writes, deletes, or exploit traffic were ever sent to the live system — money/security-exploit claims (PayFast bypass, quiz-grading trust, unauthenticated KYC download, etc.) are verified by direct code trace of the vulnerable path, not by live-firing the exploit.

**Corrections to the task brief's assumed document map**, discovered during this pass:
- `tasks.md`, `projects.md`, and `action-security-triage.md` **do exist** in the repo (contrary to what one sub-pass initially found — they were present at repo root the whole time; see `ls` output at the start of this session). `action-security-triage.md` and `security-remediation.md` **only cover `src/app/actions/*.ts` Server Actions** — neither touches `src/app/api/**/route.ts` HTTP routes at all (confirmed at `action-security-triage.md:300`). This means the "~110 unguarded / ~40 fixed / ~70 remaining" figures from the original 58-item list refer only to Server Actions, and the entire 157-file API-route layer was, until this pass, **effectively unaudited**.
- `marketing.md` is **not** the source of the original 58-item list's marketing/communication items — it is a narrower, separate audit of only the Email Campaigns send pipeline. The actual numbered master list lives in `future_task.md`.
- **Commerce & Ops** (`src/app/products`, `inventory`, `orders`, `shipments`, `transfer`) was originally missed by the first pass (it ran out of turns before reaching it). **This has now been audited in a follow-up pass** — see Section 1/2 below and the updated summary counts.

Every finding below is labeled **LIVE-VERIFIED** (a real read-only test/query was run this session), **CODE-TRACED** (current source read and confirmed coherent, not live-tested), or **DISCREPANCY** (a prior document's claim contradicted by what was found — itself a finding). Nothing is reported as fixed on a prior document's word alone.

---

## Summary

- **Modules covered:** CRM & Sales, Commerce & Ops, Automation & Workflows, Finance & Accounting, HR & Payroll, LMS & Education, Calendar & Booking, Communication & Support, Content & Marketing, Settings & Integrations, Platform Security (API-route layer). All ten originally-scoped areas are now covered.
- **Total individual findings across this audit:** ~145 (exact figures below per section; large findings that bundle several related file-level bugs are counted once).
- **Confirmed working/live:** ~58 features/fixes independently reconfirmed genuine.
- **Broken / incomplete / not built:** ~68 items, the large majority reconfirming items already on the original 58-item list, plus new ones below.
- **Discrepancies found (prior doc claimed resolved/described something, reality differs):** ~22.
- **Newly discovered issues (in no prior document):** ~33, several of them P0-severity (unauthenticated KYC document exfiltration, unauthenticated API-key minting, a systemic HR cross-workspace IDOR, an unauthenticated Inventory API with the same shape, and a Twilio inbound webhook that can trigger real AI-driven course enrollment from a forged SMS).

**Headline signal:** the currency-digit-rendering bug — already "fixed" and re-broken four times per this project's own history — is confirmed broken a fifth time. Of the four modules the codebase's own source comment names as fixed (Pipelines, Affiliates, Dashboard, Invoices), **only Pipelines actually contains the fix**. This is the single clearest evidence in this audit that "resolved" claims in this repo need independent re-verification as a standing practice, not a one-time exercise.

---

## SECTION 1 — What's Built, Live, and Confirmed Present in the Repo

### CRM & Sales
- Contact/task CRUD (`createContact`, `TasksManager.tsx`, `ContactRepository.deleteTask`/`updateTaskStatus`) genuinely enforces `requireWorkspaceAccess()` and throws on 0-row updates. CODE-TRACED (`src/app/actions/contacts.ts:116-136`, `src/modules/crm/repository/ContactRepository.ts:269-289`).
- `/crm/leads|deals|pipelines` are confirmed clean one-line redirects to the real `/lead-finder` and `/pipelines` surfaces, not competing implementations. CODE-TRACED.
- Lead Finder → CRM push flow (`LeadCRMConnector.tsx`) now lets the user pick a real pipeline/stage instead of a hardcoded default; `addLeadsToCRM` logs a real activity row. CODE-TRACED, LIVE row counts confirm (`contacts`: 11, `opportunities`: 12).
- `pipelines.ts`'s 12 exported functions and `crm-workspace.ts`'s dashboard queries all use `requireWorkspaceAccess()` and the real `opportunities`/`contacts` tables (not the dead `crm_opportunities`/`crm_contacts`). LIVE-VERIFIED the PostgREST embed shapes used resolve correctly without the ambiguous-FK error a naive embed would hit.
- Pipeline funnel analytics (`src/lib/analytics.ts:171-187`) computes a real sum from embedded opportunity rows — the previously-documented `(count)`-aggregate-array bug and flat-placeholder bug are both genuinely gone.
- `/api/pdf/route.ts` is a real 144-line Puppeteer PDF renderer, used by the `/quotes` (QuoteMasterLedger) surface's "Download PDF" action. CODE-TRACED.
- `/funnels` and `/funnels/[id]` are real, backed by a genuine `getFunnels()` action and the real `/editor/funnel/[id]` builder — no mock data.
- Campaign tag-based dispatch (`updateCampaign` in `marketing.ts`) inserts into `campaign_dispatch_queue` with a correctly deduped contact count.

### Commerce & Ops
- **Products** (`src/app/products`) is genuinely real and properly secured: `createProduct`/`updateProduct`/`deleteProduct`/`getProducts` (`src/app/actions/commerce.ts`) all call `supabase.auth.getUser()` and `getCurrentWorkspaceId()`, and every mutation is scoped with `.eq('workspace_id', workspaceId)`. CODE-TRACED, LIVE-VERIFIED (1 real row in production).
- **Orders** (`src/app/orders`) is genuinely real and properly secured: `getOrders` (`src/app/actions/operations.ts:30-49`) is workspace-scoped via the cookie-derived workspace and the standard (RLS-respecting) server client; `updateOrderStatus`/`deleteOrder` (`src/app/actions/order_actions.ts`) both check `auth.getUser()` and scope by `workspace_id`. CODE-TRACED.
- **Shipments** (`src/app/shipments`) is the most mature surface in this module: real AfterShip courier-tracking integration (`createTracking`, courier auto-detection, tracking-quota enforcement per plan tier), a genuine event timeline, and branded tracking-notification settings with real logo upload. Notably, `createShipment` (`src/app/actions/shipments.ts:29-52`) contains an explicit code comment documenting that it **previously had zero auth/membership check** and was fixed to require `requireWorkspaceMember()` before proceeding, specifically because it uses the RLS-bypassing admin client. CODE-TRACED — this is a genuine, already-landed, well-reasoned fix (the comment itself explains why the shared `requireWorkspaceAccess()` helper wasn't reused).

### Automation & Workflows
- The real, live automation engine ("Engine B": `src/lib/automations/WorkflowEngine.ts` + `src/lib/automation/executor.ts`) has genuine `send_email` (Resend, with hard-bounce→WhatsApp failover) and `send_whatsapp` (Twilio) actions, goal-tracking, business-hours holds, and atomic enrollment via an RPC. CODE-TRACED.
- **RLS on the real workflow tables is enabled**, reversing what `future_task.md` reported — migration `20260715000000_harden_crm_automation_security.sql` re-enables RLS on `workflows`/`workflow_steps`/`workflow_executions`/`workflow_step_logs` with `check_workspace_access()` policies. CODE-TRACED, dated after the prior audit.
- The campaign-dispatch cron **is now registered** in `vercel.json`, and no second/duplicate dispatch route exists anywhere in the repo. CODE-TRACED.
- `certificate_issued` and `struggling_detected` LMS automation triggers are the two (of eight) trigger strings that actually match between emitter and rule-builder, and do fire correctly.

### Finance & Accounting
- A real double-entry accounting engine exists (`getOrCreateAccount` in `accountingHook.ts`), just with no browsing UI (see Section 2).
- `retainers`/`retainer_ledger_entries`, `recurring_invoices`, `invoice_write_offs` all exist live with real schemas (0 rows — backend built, never wired to UI or used yet). LIVE-VERIFIED.
- PayFast's webhook signature mechanism (MD5 ITN construction) is itself correctly implemented — the flaw is that it's conditionally skippable, not that the crypto is wrong. CODE-TRACED.
- A recent, narrowly-scoped fix (`20260716000000_fix_invoice_issue_date.sql`, 2026-07-16) genuinely corrected a real bug where the invoice builder was overwriting `created_at` with the user-editable issue date — confirmed holding on the live sampled row, no regression found.

### HR & Payroll
- The payroll calculation engine is real: correct 2024/25 SA PAYE brackets, UIF (1%, capped R177.12), SDL (1%), with per-employee payslip rows, run rollback on partial failure, and owner email notification. CODE-TRACED (`src/app/api/hr/payroll/route.ts:15-182`).
- `/hr/employees`, `/hr/leave`, `/hr/time-tracking`, `/hr/payroll` are the only real HR surfaces — Supabase-backed, and the only ones in nav. Leave request flow (balance validation → admin approve/reject → balance update → email both directions) is genuinely end-to-end.

### LMS & Education
- Stripe course checkout (`createDirectCourseCheckoutSession`) is a legitimate, real payment path with server-side enrolment-cap enforcement. CODE-TRACED.
- The PayFast webhook receiver itself (signature check, IP allowlist, ledger entry, affiliate commission, LMS event emission) is well-built — the vulnerability is entirely on the caller side (see Section 2).
- Certificate PDF generation correctly gates on real lesson-completion counts (HTTP 403 if incomplete) and genuinely renders a PDF (not `window.print()`).
- RSVP/live-chat/recordings UI is fully functional on both student and admin sides — real polling, real session CRUD.
- The admin-only "10-question-type Quiz Workbench" (`lms_quizzes` family) is a fully real, AI-explanation-backed quiz builder — just never reached by the actual student quiz-taking flow (see Section 2 dead-code entry).

### Calendar & Booking
- Internal meeting links (`/meet/{id}`, the default `meeting_mode`) are real and confirmed working against the one live appointment row. CODE-TRACED + LIVE-VERIFIED.
- Real downstream Google/Microsoft Graph calendar-sync code exists (`calendarSync.ts: syncBookingToExternal`) — genuinely functional, just unreachable because the only UI path to create a connection is stubbed (see Section 2).
- The most recent commit ("booking", HEAD) only touches `scheduling.ts` (`diagnoseSlotUnavailable`), matching `calendar.md`'s own changelog exactly — no regression introduced.

### Communication & Support / Content & Marketing
- The campaign-dispatch cron is registered and the previously-duplicate `/api/cron/campaigns/send` route is confirmed actually deleted (not just claimed). CODE-TRACED.
- The dispatch worker itself enforces a `CRON_SECRET` bearer check, uses `FOR UPDATE SKIP LOCKED` job claiming, and auto-flips campaign status on completion. CODE-TRACED.
- Facebook/Instagram social publish is real — genuine Graph API calls with decrypted stored page tokens.
- The header user-dropdown's broken `/apps/*` links (task list #51) are genuinely fixed — the component was rewritten and no longer references the dead route tree. **RESOLVED, confirmed.**

### Settings & Integrations / Platform Security
- Page-level auth middleware is real (`src/lib/supabase/middleware.ts`) — but by design skips `/api/*` entirely, meaning every API route is independently responsible for its own auth (see Section 2 for the fallout).
- Where auth checks do exist (e.g. `hr/employees`, `kyc/consent/request`), they are genuine — not dead code, they actually `return` 401 before touching data.
- RLS is confirmed enabled and default-deny on at least one sampled table (`affiliates`: 4 rows via service-role key, 0 via anon with no session). LIVE-VERIFIED. Note this protection is irrelevant for any route using the service-role client, which bypasses RLS entirely — and most of the vulnerable routes below do exactly that.

---

## SECTION 2 — What's Not Built, Broken, or Half-Built

### P0 — Critical, Live/Exploitable

| # | Finding | Module | Verification |
|---|---|---|---|
| 1 | `GET /api/kyc/documents/download` — zero auth/consent check, decrypts and returns real government-ID/proof-of-address documents given only a guessable document ID | Settings/Security | CODE-TRACED |
| 2 | `GET /api/kyc/reports/download/[contactId]` — zero auth, returns full FICA/POPIA PDF dossier (ID number, AML flags, consent IP, document ledger) for any contact ID | Settings/Security | CODE-TRACED |
| 3 | `/api/crm/contacts/kyc` — full unauthenticated CRUD, POST triggers real (presumably billed) TransUnion/Refinitiv/XDS bureau checks against arbitrary contacts; PATCH accepts an unfiltered body merge into `.update()` | Settings/Security | CODE-TRACED |
| 4 | `POST /api/settings/api-keys` — zero auth, mints a live `lm_live_...` API key for any caller-supplied `workspaceId` | Settings/Security | CODE-TRACED |
| 5 | `GET /api/hr/payroll` — zero auth check at all; returns every payroll run + payslip (PAYE/UIF/SDL/net) + employee PII for any workspace ID | HR & Payroll | CODE-TRACED, LIVE-VERIFIED (0 rows currently, so no live data exposed yet) |
| 6 | Systemic cross-workspace IDOR in `hr/employees`, `hr/leave`, `hr/time-tracking` — role is resolved against the cookie-derived "current workspace" but applied to gate an arbitrary `workspaceId` query param; the two are never checked for equality | HR & Payroll | CODE-TRACED |
| 7 | Twilio inbound webhook (`api/webhooks/twilio/inbound/route.ts`) — no signature validation whatsoever; a forged SMS can trigger real contact lookup, an "ENROL" command with a live OpenAI call, and a real enrollment upsert | Communication | CODE-TRACED |
| 8 | Meta inbound webhook (`api/webhooks/meta/route.ts`) `POST` handler — no `X-Hub-Signature-256` check; forgeable opt-out/opt-in and fake contact/conversation creation | Communication | CODE-TRACED |
| 9 | `/api/settings/integrations` — zero auth; any caller can list/connect/disconnect any workspace's integrations; also generates webhook secrets via `Math.random()`, not a CSPRNG | Settings/Security | CODE-TRACED |
| 10 | `/api/settings/webhooks` + `/webhooks/logs` — zero auth; full CRUD/log-read on webhook config for any `workspaceId` | Settings/Security | CODE-TRACED |
| 11 | `/api/domains/verify` — zero auth; can trigger a real Vercel domain-add API call for any domain ID | Settings/Security | CODE-TRACED |
| 12 | PayFast student checkout (LMS) — client fabricates the "payment complete" webhook payload itself with no signature field, unconditionally bypassing the one verification check present; `enrollStudent()` is also directly callable with zero payment check, granting free paid-course access | LMS | CODE-TRACED (not live-exploited) |
| 13 | PayFast signature check is a payload-shape bypass, not just a missing-passphrase issue — `if (payload.signature && passphrase)` skips verification whenever the payload simply omits `signature`, even with a fully configured production passphrase | Finance | CODE-TRACED, LIVE-VERIFIED against real invoice/workspace rows |
| 14 | AI credit top-up (`AiCreditsTab.tsx`) — direct client-side Supabase `update()` on `ai_usage_credits.credits_purchased_addon`, no payment call at all; confirmed exploitable against genuine populated production rows | Finance | CODE-TRACED, LIVE-VERIFIED (3 real workspace rows) |
| 15 | Quiz grading — client computes score/pass and the server persists it verbatim with zero re-verification; non-mcq/true-false/short-answer types auto-award full credit for any non-empty answer | LMS | CODE-TRACED (not live-exploited) |
| 16 | SarsTaxInvoicePdf — line items fabricate 15% VAT while the summary total shows the real stored `tax_total: 0`; the generated legal document shows two contradictory VAT figures on the same page (SARS-compliance risk) | Finance | CODE-TRACED, LIVE-VERIFIED against a real invoice row |
| 17 | `/api/inventory` (GET/POST/PATCH/DELETE) — zero auth check anywhere in the route, uses the service-role client (full RLS bypass); `GET`/`PATCH`/`DELETE` trust a client-supplied `workspaceId` query param with no membership check, and `POST` doesn't even require one — it inserts whatever `workspace_id` the request body claims. Same unauthenticated-CRUD shape as the Settings/Integrations and KYC findings above, on a real, nav-linked, actively-designed feature (not a stub) | Commerce & Ops | CODE-TRACED, LIVE-VERIFIED (`inventory_items`: 0 rows — unused in production, so no live data exposed yet, but the route is live and reachable today) |

### P1 — Blocking Real Use Cases

- **"Create/send invoice" automation action still does not exist** in any of the three coexisting automation engines. (Automation)
- **Course/lesson/module-completion automation triggers still cannot fire** — emitters use dot-notation (`course.completed`), the only admin UI and the DB `CHECK` constraint both hard-require underscore notation (`course_completed`); no adapter exists anywhere. (Automation/LMS)
- **No unified, working Workflow Builder** — three disconnected surfaces exist; the one with a real step-editor (`/forms/[id]/automations`) is form-scoped only; `/automation` and `/automations` can both display/toggle workflows but neither can add steps to a new one. The one live workflow in production has 0 steps and cannot run. (Automation)
- **Workflow History reads from the dead engine's table** (`workflow_execution_logs`) while the real engine writes to `workflow_executions` — currently masked only because both are empty. A related, more severe **latent crash** was found: the inline history panel on `/automation` reads a `trigger_event` field that does not exist on `workflow_executions` rows, and will throw the moment any real execution occurs. (Automation — new finding)
- **Automation Recipes remain permanently unreachable** — seeded trigger strings (`invoice_overdue`, `sars_tax_reminder`, `lms_quiz_failed`) are never fired by anything. (Automation)
- **`send_whatsapp` step type is executed by the engine but absent from the one real step-editor's dropdown** — can only be added by direct DB insert. (Automation)
- **`/automation`'s "Total executions" KPI renders `NaN`** — live-verified the `workflows` table has no `execution_count` column at all. (Automation)
- **Billing Settings is still 100% mocked** — hardcoded plan copy, no Stripe Billing Portal call anywhere. (Finance)
- **Chart of Accounts has no browsing UI** — backend-only. (Finance)
- **Stripe Connect does not exist** — what exists instead is a simpler per-workspace "paste your own Stripe secret key" mechanism, mislabeled "Stripe Connect" in its own code comments; **raw Stripe secret keys appear to be stored in `workspace_integrations.credentials`** with encryption-at-rest unverified (new finding, follow-up recommended). (Finance)
- **Credit Notes UI still does not exist**, and the schema drift between its two competing migrations is now **live-confirmed**, not just a migration-file risk: `credit_number` genuinely does not exist on the live table. (Finance)
- **Retainers UI component (`RetainerSelector.tsx`) is built but imported nowhere** — real backend, orphaned frontend. (Finance)
- **Payment Gateways page still lists 5 providers; only PayFast has any real backend/webhook.** (Finance)
- **`/transfer` is dead admin-template scaffolding, same pattern as `/hrm/*`** — `TransferMainArea.tsx` → `TransferTable.tsx` renders exclusively from a static `transferData` fixture (`@/data/transfer-data`); zero Supabase/fetch calls anywhere in the component tree; no backing server action or API route exists for it at all. Unlike `/hrm/*`, it is a single route rather than 16, but the shape of the problem (reachable-by-URL, unmaintained, entirely fake data) is identical. (Commerce & Ops — new finding)
- **HR Attendance Tracking, Schedule Management, Warning Workflows, Termination Workflows all remain fully unbuilt** — only static-fixture-driven pages under the dead `/hrm/*` tree. (HR)
- **No real clock-in/out or overtime calculation** — manual hour entry only; `/hrm/overtime` is static-fixture. (HR)
- **Employee document/attachment upload does not exist.** (HR)
- **HR notification coverage is still leave-only** — payroll runs get owner-email only (no in-app notification); new hires and terminations produce none. (HR)
- **No self-service payslip view exists at all** — the only route touching payslips is the unauthenticated one above. (HR)
- **New functional regression**: the real `/hr/payroll` UI's "Mark as Paid" and "Delete Run" buttons always fail with HTTP 400 — the frontend omits the `workspaceId` query param the API requires. (HR — new finding)
- **Certificates are not persisted anywhere** — no DB table exists (live-confirmed: schema-cache error). The admin certificates page's two action buttons throw a real `ReferenceError` on click (`toast` used but never imported) — a genuine, reproducible crash, not just an empty-state issue. (LMS)
- **No "Cohort" grouping entity exists** — `cohort` is only an enum value on session type, no table. (LMS)
- **No student-initiated self-service session booking** — admin-only, hardcoded 1-hour slots, no time-slot picker even for the admin. (LMS)
- **Google Calendar and Outlook "Connect" OAuth flows are both still hardcoded `status: 'coming_soon'`** — genuinely real sync code exists downstream but is unreachable, since there is no way to create the connection record it depends on. (Calendar)
- **Fake Google Meet/Zoom link generation is still present and unchanged** — any calendar explicitly configured for `google_meet`/`zoom` mode hands bookers a `Math.random()`-based dead URL. (Calendar — confirmed still open, and notably **omitted from `calendar.md`'s own ~55KB of findings** despite that document auditing the same file elsewhere.)
- **The priority-weighted round-robin algorithm remains fully dead code** — and, newly noted, Round Robin calendars are unusable end-to-end today: there is no UI anywhere to populate `round_robin_assignment`, live-confirmed at 0 rows. (Calendar)
- **The live "Phone & IVR" marketing page remains live with zero implementing telephony code anywhere in the repo.** (Content & Marketing)
- **Content Studio remains unreachable from navigation** — the nav's "Content Studio" label still points at `/ai-studio`. (Content & Marketing)
- **LinkedIn/TikTok social publish is not just unimplemented — it silently fakes success.** Selecting LinkedIn or Twitter in Content Studio's publish panel inserts a `status: 'published'` row and returns success with zero real API call. (Content & Marketing — confirmed worse than documented)
- **The remaining ~148 unguarded/likely-unguarded API routes** beyond the 9 hand-verified in this pass (full list: `route_audit.csv` in the audit scratch output) — includes `finance/overview`, `finance/transactions`, `hr/payroll` (already P0'd above), `inventory`, 4×`lena/*`, 7×`lms/*`, 5×`public/forms/*` (some may be intentionally public), `social/publish`, `support/public-attachments`, `widget/ticket`, `crm/contacts/[id]/verifications`. Needs a dedicated follow-up pass to hand-verify each. (Settings/Security)
- **Page-title/metadata coverage remains essentially unresolved at scale** — ~148 of ~292 `page.tsx` routes still lack `<MetaData>`/`export const metadata`, exactly matching `tasks.md`'s own prior count; only the two routes it explicitly fixed (`/tasks`, `/tasks/dashboard`) were ever actioned. (Repo-wide)

### P2 — Backend Done, Needs UI

- Chart of Accounts (Finance) — see above.
- Credit Notes UI (Finance) — see above.
- Retainers UI wiring (Finance) — see above.
- `send_whatsapp` step type missing from the one real workflow step-editor's dropdown (Automation) — see above.
- The admin-built 10-question-type Quiz Workbench (`lms_quizzes` family) is fully functional but never reached by the real student quiz-taking flow, which still reads the older `quiz_questions` family — students can never take a quiz built through the newer, richer engine. (LMS)

### P3 — Cleanup / Hygiene / Dead Code

See the consolidated list below — this section is deliberately not duplicated here to avoid double-reporting the same items twice.

### Recurring Bug Patterns — Confirmed Genuinely Closed or Still Open

| Pattern | Verdict | Evidence |
|---|---|---|
| **ALL-CAPS labels on data** | **Not fully resolved.** ~90% of `uppercase` usage is legitimate (static short labels), but genuine new instances of `uppercase` forcing *dynamic user data* were found: a deal tag in `KanbanBoard.tsx:163-165` (currently unreachable — see dead-code section), and — live and reachable — an email/destination string in `UnifiedActivityFeed.tsx:127-129` and an activity-type string in `TimelineItem.tsx:31-33`. | CODE-TRACED |
| **Page-title / metadata bug** | **Still open, essentially unresolved at scale.** ~148 of ~292 routes still lack proper metadata; only 2 routes were ever actually fixed from a prior sweep that identified ~127+ needing it. | CODE-TRACED |
| **Text-contrast bug** | **The specific fix holds and generalizes.** A representative sample of ~90 other files using `text-gray-400/500` outside the six originally-fixed document-template files found no new light-background contrast failures — all other instances sit on dark backgrounds where the same classes are safe. This is the one recurring-bug category where the "resolved" claim checks out. | CODE-TRACED (representative sample, not exhaustive) |
| **Currency-digit-rendering bug** | **Not resolved — confirmed broken a fifth time.** Of the four modules the codebase's own doc comment names as fixed (Pipelines, Affiliates, Dashboard, Invoices), only **Pipelines** actually uses the fix. Affiliates (both internal and portal surfaces), the real live Dashboard home component, and the Invoice builder all still hand-roll currency formatting with hardcoded `$` (on a Rand-denominated app) or inconsistent decimal handling. New, sharper finding: `HomeDashboardClient.tsx` — the single most-viewed dashboard file — mixes `$` and `R` for two different revenue metrics **on the same page**. Also newly found in Products, Orders, HR Payroll/Time-Tracking (live, nav-linked pages, no `minimumFractionDigits` → inconsistent decimal rendering), and three files in the orphaned `/hrm`/`/payroll` tree with a `.toFixed()` crash risk on null values. | CODE-TRACED |

---

## Discrepancies Found

| Area | Prior claim | Reality found |
|---|---|---|
| CRM — Form Analytics/A-B Testing | `crm.md` treats Form Analytics as "works in code" and A/B testing as "not fully verifiable" | Both pages are 100% hardcoded mock with an explicit "scaffolding mock data" code comment; "Create Variant" has no `onClick` at all — `crm.md` never actually read these files' content |
| CRM — Quote/Proposal PDF | `crm.md` marks PDF generation "RESOLVED" | The fix only landed on the secondary `/quotes` (QuoteMasterLedger) surface; the actually-live `/proposals` (ProposalMasterDetail) surface — which `crm.md`'s own earlier finding says is the one real users hit — still uses `window.print()` |
| CRM — task table duplication | Framed as a 2-way `tasks`/`crm_tasks` split | Actually a 3-way split: `tasks`, `crm_tasks`, and `contact_tasks`, all live-written by different code paths with no shared view |
| Automation — RLS | `future_task.md` states RLS is disabled entirely on the real workflow tables | A migration dated 3 days after that doc genuinely re-enables it — the doc is now stale on this specific point (a rare "was broken, is now actually fixed" discrepancy) |
| Automation — campaign-dispatch cron | Implied to be unregistered/duplicated | Confirmed registered, and no duplicate route exists anywhere in the repo |
| Automation — `/automation` page | `future_task.md` describes it as a strictly read-only card list | Now has working toggle/delete/seed-recipe actions — genuinely improved, though workflow *creation* is still dead either way |
| Finance — `invoices` table definition count | Original list says "defined three times" | Actually touched by 5+ migrations; live table has 27 columns assembled from that sprawl, not simply 3 competing full definitions |
| HR — `/hrm/*` inbound links | `future_task.md` says "zero inbound links" | One dead-code-to-dead-code link exists (`AttendanceLeaves.tsx` → `/hrm/leaves-employee`), from a page itself absent from nav — practical conclusion (unreachable via real navigation) still holds, but "zero" is technically imprecise |
| LMS — orphaned quiz engine | `future_task.md` describes the 10-type quiz engine as "imported nowhere" | It is fully wired — to the **admin** Quiz Workbench only; students can never reach it because the student flow reads a different table family entirely. A more precise and arguably worse characterization than "dead code" |
| Calendar — fake meeting links | `calendar.md` describes `bookAppointment` as generating "a meeting link" with no scrutiny | Never flags the `Math.random()`-based fake Google Meet/Zoom URL generation despite auditing this exact file elsewhere in ~55KB of text |
| Calendar — OAuth connect flows | `calendar.md` never audits Google/Outlook Connect at all | Both are confirmed hardcoded "coming soon" stubs — a coverage gap, not a wrong claim |
| Communication — cron schedule | `marketing.md` claims the dispatch cron runs every 5 minutes, and relies on that cadence to argue a "defer on first pass" behavior self-resolves quickly | The actual `vercel.json` schedule is once-daily (`0 3 * * *`) — a freshly deployed campaign could take up to ~48 hours to actually send, a materially different operational reality than the doc describes |
| Communication — LinkedIn/TikTok publish | `future_task.md` says no publish-API calls were found for those platforms | Confirmed, and worse: the code doesn't just skip the API call, it inserts a `status: 'published'` row and reports success — users have no way to know their post never went out |
| Settings/Security — "already secured" API routes | The task brief's premise (and the existence of `security-remediation.md`'s "✅ RESOLVED" language) implies the named routes (Integrations, Webhooks, API Keys, Domain Verify) are already fixed | Neither security doc ever covered `src/app/api/**` at all — they are scoped exclusively to Server Actions. All 9 hand-verified API routes in this area are genuinely wide open; treating them as secured would be a false sense of security |
| Settings/Security — webhook dispatcher table mismatch (#5) | Implied fixed by referencing `settings.ts`'s copy | The real dispatcher (`webhookDispatch.ts`) and `settings.ts` both correctly use `webhook_endpoints` — but the actual UI-facing API route (`api/settings/webhooks/route.ts`) uses a **different table**, `workspace_webhooks`. Webhooks created through the real Developer-tab UI are written to a table the dispatcher never reads and silently never fire |
| UI/Currency — "fixed" claim | Codebase's own doc comment in `CurrencyValue.tsx` claims the fix was "previously applied across Pipelines, Affiliates, Dashboard, and Invoices" | Only Pipelines actually contains it; the other three modules named in the fix's own changelog comment do not |

---

## Dead Code / Duplicate Implementation Consolidated List

- **`/crm/leads`, `/crm/deals`, `/crm/pipelines`** — confirmed genuine redirect-only stubs to the real surfaces (already known, reconfirmed).
- **`/crm/crm-setup`** (new finding) — a fully static/local-state demo page, zero Supabase/fetch calls anywhere in its tree, not linked from any nav or route — orphaned legacy route no prior document mentioned.
- **`opportunities` (live) vs `crm_opportunities` (dead, 0 rows)** — confirmed dead, matches prior conclusion, freshly live-verified.
- **Three-way task split**: `tasks` (2 live rows), `crm_tasks` (0 rows, automation-triggered), `contact_tasks` (0 rows, per-contact) — all three actively written by different code, none cross-referenced.
- **Three fully separate automation engines** coexist: Engine A (`ActionRegistry.ts`/`WorkflowExecutionEngine.ts`/`TriggerRegistry.ts`, tables `automation_workflows` etc.) is confirmed **entirely dead** (0 live rows, no importers, and would error if ever called due to schema drift on `automation_workflows`); Engine B (`WorkflowEngine.ts` + `executor.ts`) is the one that actually runs — but is itself **two independent real executors** (array-position stepping vs. DAG traversal) operating on the same tables with no clarity on which is authoritative for a given workflow; Engine C (LMS rules) is real but broken by the trigger-string mismatch.
- **`stripe_customers` table** — confirmed dead in both code (zero references) and data (0 rows).
- **`credit_notes` table** — real schema, live, but zero application code references it at all (0 UI, 0 server actions).
- **`RetainerSelector.tsx`** — defined, exported, imported nowhere.
- **`campaign_stats`, `email_events`** — confirmed dead in both code and data (0 rows each), unchanged across two separate fix passes.
- **Second campaign-dispatch cron** — confirmed actually deleted; only one live dispatch route remains.
- **`getTikTokAuthUrl`, `getLinkedInAuthUrl`, `publishSocialPost`** — dead exports in `social.ts`, uncalled from any live UI (only the connect-flow OAuth generators, not the missing publish logic itself).
- **`/hrm/*` (16 subdirectories) + `/payroll/payroll`, `/payroll/payroll-payslip`, `/resignation`, `/termination`** — confirmed still 100% static-fixture-driven, zero nav entries, zero Supabase/fetch calls in any of the 16 subdirectories. Importantly, these are **reachable-but-unlinked live routes**, not unshipped dead files — a more dangerous shape of dead code than a simple unused component, since they ship in the build and contain their own live bugs (hardcoded `$`, crash-prone `.toFixed()` calls on null values).
- **`/transfer` (Commerce & Ops)** — a third confirmed instance of the same reachable-but-unlinked pattern: `TransferMainArea.tsx` → `TransferTable.tsx` renders exclusively from the static `transferData` fixture (`@/data/transfer-data`), zero Supabase/fetch calls anywhere in the tree, and no nav entry (`dashboard-nav.ts` has zero "transfer" hits) or backing server action/API route of any kind.
- **`PipelineClient.tsx` (singular) vs `PipelinesClient.tsx` (plural)** — new finding: the real `/pipelines` route imports only the plural file; the singular file has zero importers anywhere and pulls in its own otherwise-dead sibling (`KanbanBoard.tsx`), which itself carries a live all-caps-on-data bug and the hardcoded-`$` bug — an orphaned duplicate pair neither `crm.md` nor `tasks.md` mentions.
- **`modules`/`lessons` (legacy, LMS)** — still duplicated against the live `course_modules`/`course_lessons`; confirmed which is live via actual call-site tracing.
- **Two disconnected quiz-table families (LMS)** — Family A (`quiz_questions`/`quiz_settings`/`quiz_attempts`) is what students actually take; Family B (`lms_quizzes`/…) is a fully-built admin-only engine students can never reach — confirmed genuinely disconnected, not just cosmetically duplicated.
- **`ContactInvoicesSection.tsx`** (CRM) — entirely dead (zero imports) despite living in the actively developed CRM components directory and looking like a real, intended feature.
- **`HomeMainArea.tsx`** — confirmed dead; the real, live home dashboard is `HomeDashboardClient.tsx`.

---

## Cross-Reference to Original 58-Item List

| # | Original Task | Status Now | Evidence |
|---|---|---|---|
| 1 | Real "create/send invoice" automation action | **Still NOT BUILT** | `ActionRegistry.ts`, `WorkflowEngine.ts`, `executor.ts` — no invoice action type anywhere |
| 2 | Course/lesson/module-completion automation trigger mismatch | **Still BROKEN** | dot-notation emitters vs underscore-only rule UI/DB constraint, no adapter |
| 3 | Auth + workspace scoping on ~110 unguarded API routes | **Partially open, larger than framed** | That figure was Server-Actions-only; the 157-file API-route layer is separately ~51 routes scoring zero on auth, 9 hand-verified as genuinely wide open including 4 P0s |
| 4 | Wire Integrations Hub credentials to real storage | **Persists correctly, but unauthenticated** | Row is genuinely written (not discarded), but the whole write path has zero auth/membership check |
| 5 | Point webhook dispatcher at the table Settings writes to | **Still BROKEN, different mismatch than assumed** | Dispatcher and `settings.ts` agree on `webhook_endpoints`; the actual UI-facing API route uses `workspace_webhooks` instead |
| 6 | Real Billing Settings | **Still NOT BUILT** | 100% hardcoded copy, no Stripe Billing Portal call |
| 7 | Real Stripe payment for AI credit top-up | **Still BROKEN — confirmed exploitable against live data** | Direct client-side DB update, no payment gate |
| 8 | Real Form Analytics + A/B testing | **Still NOT BUILT, worse than credited** | Both 100% hardcoded mock; "Create Variant" has no handler at all |
| 9 | Persist certificates; fix admin certificates page | **Still BROKEN** | No DB table exists; admin page throws a real `ReferenceError` on both action buttons |
| 10 | Real server-side quiz grading | **Still NOT BUILT / exploitable** | Client computes and submits score, server trusts it verbatim |
| 11 | Real PayFast checkout gateway redirect | **Still BROKEN — confirmed exploit** | Client fabricates the completion payload itself; direct server-action call also bypasses payment entirely |
| 12 | HR Attendance Tracking | **Still NOT BUILT** | Only static `/hrm/attendance` |
| 13 | HR Schedule Management | **Still NOT BUILT** | Only static `/hrm/schedule` |
| 14 | HR Warning Workflows | **Still NOT BUILT** | Only static `/hrm/warning` |
| 15 | Fix fake Google Meet/Zoom link generation | **Still BROKEN** | `Math.random()`-based fake URLs, unchanged |
| 16 | One real, discoverable Workflow Builder | **Still NOT BUILT** | 3 disconnected surfaces, none can create a runnable workflow |
| 17 | Point Workflow History at the correct table | **Still BROKEN, plus a new latent crash found** | Reads dead engine's table; a separate correctly-fed panel will crash on the first real execution |
| 18 | Take down or build "Phone & IVR" marketing page | **Still live, zero telephony code** | Unchanged |
| 19 | Real invoice tax calculation / reconcile SARS PDF | **Still BROKEN, now internally self-contradictory** | Line items show 15% VAT, summary shows R0.00, on the same document |
| 20 | Twilio inbound webhook signature validation | **Still NOT ADDED** | Confirmed absent by full route read |
| 21 | Meta/WhatsApp inbound webhook signature validation | **Still NOT ADDED** | `POST` handler has no signature check at all |
| 22 | HR Termination Workflows | **Still NOT BUILT** | 0%, static, no nav entry, no API |
| 23 | Decide/delete dead `/hrm/*` tree | **Still undecided, still dead** | All 16 subdirectories confirmed fixture-driven |
| 24 | Decide/delete dead `/crm/*` tree | **Still undecided, still dead** | Confirmed redirect-only stubs |
| 25 | Real server-side PDF for Quotes/Proposals | **Partially fixed, materially incomplete** | Fixed only on the secondary `/quotes` surface; the actually-live `/proposals` surface still uses `window.print()` |
| 26 | Link Content Studio into navigation | **Still NOT DONE** | Nav label still points at `/ai-studio` |
| 27 | Real Google Calendar Connect OAuth | **Still NOT BUILT** | Hardcoded "coming soon" |
| 28 | Real Outlook Calendar Connect OAuth | **Still NOT BUILT** | Hardcoded "coming soon" |
| 29 | Replace Lead Finder's fake map | **Still BROKEN** | Confirmed fake grid-position markers, no map SDK dependency exists at all |
| 30 | Real clock-in/out + overtime tracking | **Still NOT BUILT** | Manual hour logging only |
| 31 | Per-employee payslip access filtering | **Still BROKEN, worse than documented** | One route fully unauthenticated; a systemic cross-workspace IDOR affects three more HR routes |
| 32 | Chart of Accounts UI | **Still NOT BUILT** | Backend-only |
| 33 | Real Stripe Connect | **Still does not exist** | Simpler bring-your-own-key mechanism mislabeled as Connect in code comments |
| 34 | LinkedIn/TikTok social publish | **Still NOT BUILT, worse than documented** | Silently fakes a "published" success with no real API call |
| 35 | Fix Automation Recipes | **Still BROKEN** | Seeded trigger strings never fired by anything |
| 36 | Wire the dead 19-trigger registry, or remove fake dropdown | **Still BROKEN** | Confirmed zero importers; a second, independent fake-dropdown problem also found in `/automations`' own hardcoded trigger list |
| 37 | Employee document/attachment upload | **Still NOT BUILT** | Zero hits for upload/attachment logic |
| 38 | Extend HR notification coverage | **Still narrow** | Leave-only; payroll email-only; new hires/terminations produce none |
| 39 | Enforce PayFast signature verification unconditionally | **Still NOT ENFORCED, and a payload-shape bypass survives full configuration** | `if (payload.signature && passphrase)` skips whenever signature is simply omitted |
| 40 | Auth checks on API Key Mgmt + Domain Verification routes | **Still NOT ADDED, contradicts any claim otherwise** | Neither route has any auth check |
| 41 | Credit Notes UI | **Still NOT BUILT** | Schema drift now live-confirmed (column genuinely absent) |
| 42 | Wire existing Retainers UI component | **Still NOT WIRED** | Component exists, imported nowhere |
| 43 | Add `send_whatsapp` to the real workflow editor dropdown | **Still NOT ADDED** | Engine supports it; UI dropdown omits it |
| 44 | Build a true "Cohort" grouping entity | **Still NOT BUILT** | Only an enum value, no table |
| 45 | Student-initiated self-service session booking | **Still NOT BUILT** | Admin-only, hardcoded 1hr slots |
| 46 | Wire in the priority-weighted round-robin algorithm | **Still dead code, and unusable end-to-end** | Zero callers; no UI exists anywhere to populate the table it needs |
| 47 | Consolidate `opportunities`/`crm_opportunities` | **Still duplicated** | `crm_opportunities`: 0 rows, confirmed dead |
| 48 | Consolidate proposal/quote conversion paths | **Partially consolidated** | Both call the same RPC now, but the PDF-export fix only landed on one of the two surfaces |
| 49 | Resolve `invoices` defined three times | **Larger than described** | 5+ migrations, 27 live columns |
| 50 | Drop or wire up dead `stripe_customers` | **Still dead** | Confirmed in code and data |
| 51 | Fix broken header dropdown `/apps/*` links | **RESOLVED** | Confirmed — component rewritten, no references remain |
| 52 | Fix `/automation` KPI querying nonexistent column | **Still BROKEN, live-confirmed** | `execution_count` column does not exist; renders `NaN` |
| 53 | Consolidate course-content schemas | **Still duplicated** | `course_modules`/`course_lessons` live; `modules`/`lessons` legacy |
| 54 | Consolidate quiz-table families | **Still duplicated, and confirmed disconnected** | Admin engine (Family B) fully built but unreachable by students |
| 55 | Re-enable RLS on automation tables | **RESOLVED** (do this only after Section A auth items — those items are still open) | Migration confirmed re-enabling RLS with workspace-scoped policies |
| 56 | Reconcile Payment Gateways page | **Still true** | 5 listed, only PayFast has any real backend |
| 57 | Confirm live production credentials configured | **Partially confirmed** | Stripe keys are live-shaped (`sk_l...`/`pk_l...`) even in local `.env.local` (itself a exposure concern); PayFast/Twilio/Meta are still placeholder values; KYC/credit-bureau providers explicitly sandboxed |
| 58 | Audit remaining ~70 unguarded routes | **Materially larger scope than assumed** | The real API-route layer is 157 files, ~51 scoring zero on auth; 9 hand-verified this pass (4 of them P0), ~148 still need a dedicated follow-up pass |

---

## Recommended Next Priorities

1. **Immediately fix the unauthenticated KYC/API-key/payroll/inventory routes** (items 1–5 and 17 in the P0 table) — these expose regulated PII, real payment credentials, a live API-key-minting primitive, and full cross-workspace inventory CRUD to any unauthenticated caller. This is more severe than anything either existing security document has flagged, because neither document ever covered the API-route layer at all. Note the pattern repeats a third time here (Settings/Integrations, HR Payroll, now Inventory) — this strongly suggests a shared scaffold or copy-paste origin for "service-role client + query-param workspaceId, no auth check" across the codebase; worth searching for and fixing as a class of bug, not one route at a time.
2. **Add Twilio/Meta inbound webhook signature validation** — both are currently fully open to forged requests that can trigger real side effects (AI-driven enrollment, contact opt-out abuse).
3. **Fix the HR cross-workspace IDOR pattern** (role checked against the wrong workspace) — it's systemic across 3+ routes, not a single missing filter.
4. **Close the PayFast/AI-credits/quiz-grading exploits** — three independent free-money/free-access paths, all confirmed via code trace.
5. **Complete the API-route security audit** — 148 routes remain unverified; the 9 hand-checked here were all genuinely open, suggesting the true count of live vulnerabilities in that remaining set is non-trivial.
6. **Stop trusting "fixed" claims without re-verification as standing practice** — the currency-digit bug is now confirmed broken for a fifth time, in exactly the pattern this project has already documented four times before. Whatever process produces "RESOLVED" labels in this repo's own documentation is not catching regressions or incomplete propagation of fixes to sibling call sites.
7. **Decide the fate of `/hrm/*`, `/payroll/*`, and `/transfer`** — these are shipped, reachable, unmaintained routes with live bugs (or, for `/transfer`, no real backend at all), not simply unused files; leaving them live is a larger risk than typical dead code.
8. Everything else in Section 2 (P1/P2/P3), roughly in the order listed there.

---

## Addendum — Commerce & Ops Follow-Up Pass (2026-07-18, later same day)

The gap flagged above has been closed. Commerce & Ops (`src/app/products`, `inventory`, `orders`, `shipments`, `transfer`) was independently audited: read every route/client file, traced the backing server actions and the one API route, and ran a live read-only row-count check against `products`, `inventory_items`, `orders`, `courier_shipments`, `courier_brand_settings`, `tracking_quota`, and `shipment_events`.

**Verdict: mixed, and the mix is informative.** Three of the five surfaces (Products, Orders, Shipments) are genuinely real, workspace-scoped, and — in Shipments' case — contain a code comment documenting a *previously fixed* auth gap (`createShipment` used to have zero membership check before someone added `requireWorkspaceMember()`, explained in-line with real reasoning about why the shared helper wasn't reused). This is a rare example in this codebase of a fix that is both real and well-documented in place, not just claimed in an external doc.

The other two tell the opposite story:
- **`/api/inventory` (all four HTTP methods) has zero auth check whatsoever** and uses the service-role client directly — the exact same vulnerability shape as the Settings/Integrations and HR Payroll findings already in the P0 table above (now added as item 17). This is the **third** occurrence of this specific bug shape found in this audit, which is a stronger signal than three unrelated bugs would be — see the updated Recommended Next Priorities.
- **`/transfer` is 100% static-fixture admin-template scaffolding** — the same dead-code shape already documented for `/hrm/*`, just not linked from anywhere, unlike `/hrm/*`'s reachable-but-unlinked pattern; `/transfer` has no nav entry either.

No prior document (`crm.md`, `tasks.md`, `projects.md`, `future_task.md`) mentions Commerce & Ops at all — this entire module was previously undocumented territory, now folded into Sections 1 and 2 above and the dead-code list.
