---
type: deferred-item
id: tracker
raised: 2026-08-16
raised-in: "[[2026-08-16-static-code-review]]"
status: Open
---

# Deferred Items Tracker

Single running list of everything **explicitly marked "Deliberately Deferred"**
across audits and build passes, so nothing gets lost. Each row has a status of
`Open` or `Resolved`. New deferrals: add a row here **and** link this tracker
from the audit / ADR that raised them.

## Open

| # | Item | Raised in | Why deferred | Owner / next step |
|---|---|---|---|---|
| D1 | Drop `workspace_webhooks` table | [[2026-08-16-static-code-review]] | Dropping a table is irreversible; the row-migration script must run first and its brand-new signing secrets be handed to each workspace admin | Run `scripts/migrate-workspace-webhooks-to-webhook-endpoints.js`, confirm `Failed: 0`, then write + apply a `DROP TABLE` migration |
| D2 | Drop `lms_quizzes` (+ decide fate of `lms_certificates`, `lms_adaptive_rules`, `lms_adaptive_rules_v2`) | [[2026-08-31-lockdown-sweep]] / [[ADR-0005-legacy-lms-quiz-cluster-scoped-drop]] | Three unscoped tables hold a real FK into `lms_quizzes.id`; none in the original audit scope, none with real rows/callers, but dropping now forces an unasked-for decision on those three | Deliberate follow-up: confirm the three are dead, then drop all four together in dependency order |
| D3 | Drop the array tag columns (`contacts.tags`, `opportunities.tags`, `conversations.tags`, `pages.tags`, `lead_finder_results.smart_tags`) | [[ADR-0006-smart-tags-relational-model]] | Can't drop until every reader/writer is verified repointed onto the Smart Tags relational model | Audit remaining array-column reads in `src/`, repoint, then drop columns |
| D4 | `src/lib/automation/lms_actions.ts` — `update_community_privilege` / `send_whatsapp_template` still use the session-scoped Supabase client | [[2026-08-16-static-code-review]] (section E) | Out of scope for that pass — they don't write to any table the pass targeted; flagged, not cleared | Review these two actions for the same tenant-scope discipline applied elsewhere |
| D5 | Generic `oauth_clients` UPDATE RLS policy has zero callers | [[2026-08-16-static-code-review]] (section E) | Harmless dead policy; removing it wasn't in scope | Drop the policy in a cleanup migration, or consciously keep |
| D6 | Full **live verification** of both security passes | [[2026-08-16-static-code-review]] | All fixes are static-only; Postgres RLS behaviour, webhook delivery and real user flows have not been observed executing | Work `docs/SECURITY_REVIEW_LIVE_VERIFICATION.md` sections A–E against staging |
| D7 | AI route mock-key fallbacks (`sk_mock_key` / `PLACEHOLDER` / `sk-proj-O15jtbs`) | [[2026-08-16-static-code-review]] (section E) | Intentional sandbox behaviour; risk is a production key coincidentally matching a pattern | Confirm production `OPENAI_API_KEY` trips none of the checks; consider an explicit `AI_SANDBOX` flag instead |
| D8 | High Value Client auto-tagging is DISABLED | code comment, `src/app/api/cron/workers/auto-tag-sweep/route.ts:11` | Shipped with a placeholder rule | Define the real rule, re-enable. See [[CRM]] |
| D9 | Lead Finder map is fake | Full Production-Readiness Plan, task 77 | Milestone 4 cleanup item, not yet done | Replace with a real map. See [[Milestone-4]], [[CRM]] |
| D10 | Dead Stripe SaaS-billing code path | [[Finance-Billing]] / README | Platform billing moved to Paystack; `createCheckoutSession` + `STRIPE_*_PRICE_ID` left in `src/app/actions/finance.ts` | Decide delete vs. keep-as-fallback ([[Milestone-2]] tasks 26–27) |
| D11 | Yoco payment integration | README payment-methods table | Blocked on Yoco partner approval; no backend exists, removed from UI | Revisit when partner approval lands |
| D12 | Bank connections / real cash balance | code comment, `src/app/api/finance/overview/route.ts:52` | "Coming soon" — cash balance hard-defaults to 0 | Build bank-connection ingestion. See [[Finance-Billing]] |
| D13 | Dead automation type vocabulary `src/types/workflow.types.ts` | [[Marketing-Automation]] | 5 trigger + 9 action types, zero imports anywhere in `src/` | Milestone 2 task 25 — remove or reconnect |
| D14 | Milestone 3 backlog (HR / LMS completion / Calendar / Telephony — 31 tasks) | Full Production-Readiness Plan | Scheduled milestone, not started | See [[Milestone-3]] |

## Resolved

| # | Item | Resolved by | Date |
|---|---|---|---|
| R1 | `webhook_delivery_logs.webhook_id` FK pointed at the wrong table (delivery logging impossible) | FK repointed to `webhook_endpoints`, `20260725000004_consolidate_webhook_tables.sql` | 2026-08-16 pass |
| R2 | Second quiz engine `lms_quiz_submissions` left unreviewed | Table dropped as confirmed-dead, `20260903000016` / [[ADR-0005-legacy-lms-quiz-cluster-scoped-drop]] | 2026-08-31 |
| R3 | `quiz_attempts.lesson_id` had no FK/cascade (orphan rows on course delete) | `ON DELETE SET NULL` + nullable, `20260903000014` / [[ADR-0002-quiz-attempt-fk-set-null]] | 2026-08-31 |
| R4 | `QuizAnalyticsConsole` silently disconnected from real attempts (read legacy `lms_quiz_submissions`) | `getQuizSubmissionsAction` repointed to `quiz_attempts` | 2026-08-31 |
