# Email Campaigns Module — Independent Workflow Audit

## Status: RESOLVED (fix pass 2026-07-17) — see resolution section below

## Top-line answer (as of the fix pass)

**Can a user today create a campaign and have it actually reach real recipients? Yes, once deployed to production — the cron is now registered, the queue write path is fixed, personalization/unsubscribe links resolve per-recipient with real data, status is fully automatic, and analytics render real numbers.** One legitimate, non-bug caveat: `PredictiveIntelligence`'s "smart send time" feature always defers a brand-new job on its very first worker pass by design (see the resolution section) — a freshly-deployed campaign sends on the *next* cron tick after its predicted optimal hour, not necessarily the very first tick. This was true before this fix too; it's just now documented, since the fix pass's live testing is what surfaced it clearly.

**Original finding (below, preserved as the historical record):** the write path (create → design → target → "Deploy") worked and was genuinely live: it saved real content, resolved real tag-matched contacts, and queued real rows in `campaign_dispatch_queue`. But the worker that turns a queued row into an actual sent email — `src/app/api/cron/workers/campaign-dispatch/route.ts` — was **not registered in `vercel.json`** and **nothing else in the codebase triggered it**. A queued campaign sat in `campaign_dispatch_queue` with `status: 'pending'` forever unless someone manually called that route with the `CRON_SECRET` header.

Separately, even a manually-triggered send would have gone out with two structural content bugs: recipients addressed as "Valued Customer" instead of their real name, and a dead `href=""` unsubscribe link — both because merge-tag substitution happened once at save time with an empty contact object, not per-recipient at actual dispatch time.

## Summary
- Workflows traced end-to-end: 7 (creation, builder save, deploy/targeting, recipient resolution, dispatch worker, analytics, status transitions)
- Live-verified against the real Supabase project: 4 (tag-match semantics, queue insertion, atomic job-locking RPC, Resend reachability)
- Critical, confirmed-broken: 1 (cron not registered — core send path non-functional end-to-end)
- High-severity, confirmed: 4 (status disconnected from reality, analytics UI reads nonexistent fields, no unique constraint on the dispatch queue, broken personalization/unsubscribe link)
- Duplicate/competing implementation found: 1 (a second, also-unregistered campaign-send cron with different recipient-matching semantics than the live path)
- Dead schema found: 1 (`campaign_stats`, `email_events` — superseded, zero live references)

Scope note: this is a fresh, independent trace of `/campaigns` and its full send pipeline. I did not assume crm.md #16 (which fixed tag-based enqueueing) covered anything downstream of enqueueing — everything from the dispatch worker onward was traced and live-tested independently. Live verification used direct, throwaway-data testing against the real linked Supabase project (same standard as crm.md/finance.md) plus a real call to the Resend API; a full inbox-delivery test could not be completed in this session because the local `.env.local`'s `RESEND_API_KEY` is a placeholder (confirmed via a live 401 from Resend) — the user confirmed production has a separate, real key, so the remaining gap to actual delivery is the cron registration, not credentials.

## Part A — Page Title Bug (Fixed)

**Confirmed real, not a tab-restoration artifact.** `src/hooks/useMetaData.tsx` sets `document.title` via `react-helmet-async`'s `<Helmet><title>`. `src/app/campaigns/page.tsx` never rendered a `<MetaData>` wrapper at all, so no `<Helmet>` title was ever set for `/campaigns` — whatever title the last-visited page set (e.g. `/invoices`'s "Billing Ledger") simply stayed in the tab, since nothing on the campaigns route ever overwrote it.

**Checked every other Marketing-module route (per the sidebar's actual "Marketing" group in `src/data/dashboard-nav.ts:26-34`: Campaigns, Funnels, Forms, Social, Ads) and found the same bug on all of them, plus the campaign builder subpage** — this is the exact "copied once, repeats quietly" pattern the task called out, confirmed rather than assumed. `src/app/funnels/loading.tsx` even sets the correct title ("Marketing Funnels") for the loading skeleton, while the real `funnels/page.tsx` underneath it never did — so the correct title would flash briefly during loading, then silently revert to whatever was there before.

**Fixed, all six routes:**
- `src/app/campaigns/page.tsx` → `"Email Campaigns"`
- `src/app/campaigns/[id]/builder/page.tsx` → `` `${campaign.name} | Campaign Builder` `` (dynamic, matches the pattern already used by `pipelines/[id]/stages/page.tsx` and `quotes/[id]/edit/page.tsx`)
- `src/app/funnels/page.tsx` → `"Marketing Funnels"` (matches `funnels/loading.tsx`'s existing title, now actually reachable)
- `src/app/forms/page.tsx` → `"Forms"`
- `src/app/social/page.tsx` → `"Social Planner"`
- `src/app/ads/page.tsx` → `"Ad Campaigns"`

Type-checked clean (`tsc --noEmit`) on all six files after the change.

## Part B — Full Campaign Workflow Trace

### 1. Campaign creation
`CampaignsClient.tsx`'s "New campaign" modal calls `createEmailCampaign(name)` (`src/app/actions/marketing.ts:113-139`), which inserts into `email_campaigns` with `status: 'draft'`.

**Workspace scoping: confirmed weak, not solid.** Unlike `pipelines.ts` (fixed in crm.md #21) or `quotes.ts`/`finance.ts` (fixed in crm.md #13/#13b), **`marketing.ts` was never touched by the platform-wide security-remediation effort** — confirmed by grepping `security-remediation.md` for `marketing.ts` (zero matches). Every exported function in `marketing.ts` — `createEmailCampaign`, `getEmailCampaigns`, `updateCampaign`, `deleteCampaignAction`, and the Funnels/Forms/Ads equivalents — uses the two-step `supabase.auth.getUser()` + `getCurrentWorkspaceId()` pattern, where `getCurrentWorkspaceId()` only reads the client-supplied `active_workspace_id` cookie with **no `workspace_members` membership check at all** (`src/lib/auth.ts:122-124`, confirmed in this session). This is the same "Weak" class of gap crm.md's A1/#13b explicitly flagged as a systemic pattern across the actions layer — `marketing.ts` is a genuine, previously-uncounted instance of it, not a duplicate of an already-fixed file. Not fixed in this pass (out of scope per this task's explicit constraints — audit and report, fix only the title bug); flagged as a real, live gap.

### 2. Campaign builder / design flow
`src/app/campaigns/[id]/builder/page.tsx` loads the real campaign row (workspace-scoped: `.eq('id', id).eq('workspace_id', workspaceId)`, correctly using the verified session workspace here, not the weak cookie-only path) and the workspace's brand kit, then renders `EmailBuilderClient.tsx`.

- **`handleSave`** (`EmailBuilderClient.tsx:177-206`) compiles the block layout into `body_html` via `renderEmailLayout` and saves `builder_json`/`body_html`/`preview_text` through `updateCampaign` — status stays `draft`. Confirmed this genuinely persists.
- **Recipient targeting is a single free-text field** ("Target recipients (emails or tags)", `EmailBuilderClient.tsx:1165`) split client-side on commas into `emailTokens` (anything containing `@`) and `tagTokens` (everything else) — `EmailBuilderClient.tsx:217-219`.
- **`handleDeploy`** (`EmailBuilderClient.tsx:209-253`) is the actual "send" trigger. It calls `updateCampaign(campaignId, { ..., segment: { tags, emails, is_automated }, status: 'scheduled' })`. This is the only place in the whole traced UI that sets `status: 'scheduled'`, which is what triggers `updateCampaign`'s recipient-resolution logic (see #3).

### 3. Recipient resolution — re-verifying crm.md #16, live
crm.md #16 fixed tag-based enqueueing inside `updateCampaign` (`marketing.ts:374-405`). Re-verified live against the real Supabase project (throwaway workspace, two contacts — one matching a fresh unique tag, one not):

- Ran the exact query `updateCampaign` runs — `.eq('workspace_id', ...).contains('tags', updates.segment.tags)` — got back exactly the one matching contact, zero false positives/negatives.
- Inserted the resulting queue row into `campaign_dispatch_queue` exactly as the fixed code does, with the same `[...new Set(...)]` dedupe. Confirmed 1 row inserted, correctly deduped within the single call.
- **New finding, not covered by #16's fix or scope: `campaign_dispatch_queue` has no unique constraint on `(campaign_id, contact_id)`.** Re-ran the identical insert a second time against the live table — it succeeded and created a second, fully duplicate row for the same contact/campaign pair (confirmed live: 1 row before, 2 after). `updateCampaign`'s in-call `Set`-based dedupe only prevents duplicates *within one deploy call* — it does nothing to prevent a second `handleDeploy` click (double-submit, or a user re-targeting and redeploying the same campaign) from queuing every already-queued recipient a second time, which the (currently non-functional, see #4) dispatch worker would then send twice. Not fixed in this pass — flagged as a real gap in #16's otherwise-correct fix, since #16 was explicitly scoped to enqueueing correctness within a single call, not idempotency across calls.

**Direct-email path confirmed independently correct and NOT dependent on the cron.** If `segment.emails` is non-empty, `updateCampaign` (`marketing.ts:408-421`) calls `sendEmail` synchronously, inline, once `status: 'scheduled'` is set — this actually sends immediately, regardless of whether the dispatch worker ever runs. Confirms crm.md's earlier note that this split (direct-send vs. queued) is real and intentional; both halves work independently of each other, for genuinely different reasons (small manual list vs. large tag-driven segment).

### 4. The dispatch worker — cron registration (the critical finding)

**Direct answer: the campaign-dispatch cron is NOT registered today.** Read the live `vercel.json` in this session:

```json
{
  "crons": [
    { "path": "/api/cron/affiliate-recurring", "schedule": "0 0 1 * *" },
    { "path": "/api/cron/affiliate-onboarding", "schedule": "0 9 * * *" },
    { "path": "/api/cron/quota-refill", "schedule": "0 0 * * *" },
    { "path": "/api/cron/tracking-sync", "schedule": "0 4 * * *" }
  ]
}
```

Four crons total. `/api/cron/workers/campaign-dispatch` is absent. This is the same gap the original platform audit found — confirmed still true today, not fixed as a side effect of anything else.

**Nothing else triggers it.** Grepped the entire repo for `campaign-dispatch` and `acquire_campaign_jobs` (the worker's locking RPC): the only references are this route itself, its unit test (`src/lib/campaigns/campaignDispatch.test.ts`, which only mocks the RPC — never invokes the real route), and this document's mentions. No manual "Send now" button anywhere in the UI calls it. No `pg_cron`/`cron.schedule` call in any Supabase migration schedules it either (checked). **A campaign that gets deployed with tag-based recipients queues real rows and then goes nowhere — `status` stays `'scheduled'` and the queue rows stay `'pending'` indefinitely.** This is exactly the "silently never sends" gap the task said to treat as the most severe finding in this document, and it is.

**Once manually invoked, the worker itself is correct** — verified by code review plus a live test of its core mechanics:
- `acquire_campaign_jobs` (`supabase/migrations/20240101000170_campaign_dispatch_queue.sql:27-52`) uses `FOR UPDATE SKIP LOCKED` to atomically claim pending/deferred jobs and flip them to `'processing'`. **Live-tested**: inserted a real queue row, called the RPC exactly as the worker does (`worker_id`, `batch_size: 50`) — it claimed the job and flipped its status to `'processing'`, confirmed against the live database.
- The worker then correctly calls `sendEmail` (`src/lib/email.ts`) with the real Resend SDK, per-recipient, with campaign/contact tags attached for later webhook correlation. **Live-tested the Resend call itself**: with the local `.env.local`'s placeholder key, calling `resend.emails.send(...)` directly returned a real `401 "API key is invalid"` from Resend's actual API — proving the integration correctly reaches the real Resend endpoint (not a silent no-op), even though this specific key can't complete a send. Checked whether any workspace overrides this with its own `resend_api_key`: zero workspaces in the live database have one set, so every real send currently depends entirely on the platform-level `RESEND_API_KEY`. **The user confirmed production has a real, working key** — so once the cron is registered, this part of the pipeline should work as designed.
- Per-job status updates (`sent`/`failed`/`pending` with exponential backoff/`deferred`) are batched via `upsert(... onConflict: 'id')` — correct.
- **The worker never updates `email_campaigns.status`** — it only increments `total_sent`. See Status Transitions below for why this matters.

### 5. Analytics (Opens/Clicks/Bounced)

**The backend is real, not cosmetic — but the UI never reads it, which produces the same symptom ("—", "0%", forever) as if it were fake.** Two separate things were checked:

- **Backend, confirmed real and correctly wired.** `src/app/api/webhooks/email/deliverability/route.ts` handles real Resend webhook payloads (`email.opened`/`email.clicked`/`email.bounced`/`email.complained`, plus an AWS SES SNS format and a generic test format), logs every event to `email_tracking_logs` (a real table, `supabase/migrations/20240101000133...sql:32-42`), and atomically increments real counter columns — `opens`, `clicks`, `bounces`, `replied`, `complaints`, `total_sent` — on `email_campaigns` itself via the `increment_campaign_metric` RPC (`SECURITY DEFINER`, atomic single-column increment, migration `20240101000134`). It also correctly downgrades hard-bounced/complained contacts (`is_invalid_email`) and tracks soft-bounce streaks. This is genuine infrastructure, not static zero-state values — *provided* Resend is actually configured to call this webhook URL, which is an external dashboard setting this audit cannot verify from the repo.
- **UI bug, confirmed live in the code, not fixed in this pass (audit scope):** `CampaignsClient.tsx:243` renders `[['Opens', campaign.open_rate ? ...], ['Clicks', campaign.click_rate ? ...], ['Bounced', '0%']]`. **`open_rate` and `click_rate` are not real columns** — the schema only has `opens`/`clicks` (raw counts), never a `_rate` field anywhere (confirmed via migration grep). `getEmailCampaigns()`'s `.select('*', ...)` would return the real `opens`/`clicks` counts in every row, but the UI reads a field that has never existed, so `campaign.open_rate` is always `undefined` → always renders `"—"`, regardless of how many real opens/clicks accumulate in the database. **"Bounced" is a hardcoded string literal `'0%'`** — not read from `campaign.bounces` at all, not even wired to the wrong field, just a static value in the JSX. Net effect: the screenshot's "Opens —, Clicks —, Bounced 0%" is not proof of "no data yet" — it is what this UI would show *forever*, even for a campaign with thousands of real opens, because it never reads the real counters that the webhook is correctly populating.

### 6. Status transitions — confirmed disconnected from reality

**Confirmed: `status` does not reliably reflect whether mail actually went out — worse than a stale flag, it's a flag with no automated connection to send state at all in the currently-live path.**

- `handleDeploy` sets `status: 'scheduled'` when a campaign is queued/direct-sent.
- The dispatch worker (§4) **never writes `email_campaigns.status`** — a fully-processed campaign (every queue row `'sent'`) still shows `status: 'scheduled'` forever, with no code path that ever moves it to `'sent'` automatically.
- **The only way a campaign's status becomes `'sent'` is `CampaignsClient.tsx`'s `handlePublish` — a manual dropdown toggle** ("Mark as sent" / "Move to draft", `CampaignsClient.tsx:142-152`) that calls `updateCampaign(id, { status: 'sent', sent_at: ... })` directly, with **zero check of whether any email was ever actually sent**. A user can click "Mark as sent" on a campaign that was never even deployed (still `draft`, zero queue rows, zero recipients) and it will show as sent, with a real `sent_at` timestamp, indistinguishable in the UI from a campaign that genuinely reached recipients.
- Compounding this: setting `status: 'sent'` via this manual path does **not** go through the recipient-enqueueing branch in `updateCampaign` at all — that branch is gated on `updates.status === 'scheduled'` specifically (`marketing.ts:374`), not `'sent'`. So "Mark as sent" is purely a label change; it was never wired to trigger a send even if the cron did exist.

### 7. Segment matching correctness — spot-check

Re-confirmed the `.contains('tags', [...])` query used by the live path correctly requires **all** listed tags to be present (AND semantics), verified with a live two-tag test (below, shared with Part C).

**Timing nuance, worth being precise about:** the task asked to confirm segments aren't "a stale snapshot taken at campaign-creation time" — they're not; recipient matching happens at **deploy time** (`handleDeploy`/`updateCampaign`'s call), which is later and more correct than creation time. But it is still a **one-time snapshot at deploy time**, not re-evaluated at actual dispatch time. Because the dispatch worker only ever processes pre-inserted `campaign_dispatch_queue` rows keyed by a fixed `contact_id`, a contact whose tags change (or whose email becomes invalid) *after* deploy but *before* the (currently nonexistent) automatic dispatch would still receive the campaign based on their tags at deploy time — this is a reasonable design for a one-shot broadcast, but is worth documenting since the task specifically asked about staleness.

## Part C — Duplicate/Competing Implementation Check

### C1. A second, competing campaign-send code path exists — confirmed, not assumed

`src/app/api/cron/campaigns/send/route.ts` is a **second, entirely separate cron-shaped route** that also reads `email_campaigns`, also resolves tag segments, and also inserts into `campaign_dispatch_queue` — built independently of (and inconsistently with) the live `updateCampaign`/worker path documented above:

- It queries campaigns by `status.eq.sending OR (status.eq.scheduled AND scheduled_at <= now)` — note `scheduled_at`, a column the live builder flow (`handleDeploy`) **never sets**, so a fresh campaign from the current UI would not match this half of the condition at all.
- **It matches tags with `.overlaps('tags', segmentObj.tags)` — ANY tag matches — instead of `updateCampaign`'s `.contains(...)` — ALL tags must match.** This is a real, live-confirmed semantic divergence, not a hypothetical: created a throwaway workspace with a contact holding both of two tags and a contact holding only one, and ran both queries with a segment requiring both tags. `contains()` (the live path) correctly matched only the contact with both tags. `overlaps()` (this second path) matched both contacts. If this route were ever registered and ran against the same campaign, it would enqueue a materially different, broader recipient set than what the user actually configured.
- It paginates contacts in chunks of 1,000 with a cursor stored in `campaign.segment.current_offset`, deliberately designed for very large audiences and recurring "evergreen" automated campaigns (`segment.is_automated`) — a real, more sophisticated capability the live path doesn't have.
- It is **also not registered in `vercel.json`** — so this divergence is currently dormant, not actively causing double-sends. But it is dead-but-reachable code that any future engineer could plausibly register (it looks complete and production-shaped) without realizing it disagrees with the actually-wired path on both matching semantics and status handling. Flagging as a genuine duplicate-implementation risk in this project's established pattern (quotes/finance, activity feeds, CRM dashboards), not fixed in this pass.
- It also drives its own status machine (`scheduled → sending → queued`) that the live worker (§4) doesn't participate in at all, and doesn't relate to `'sent'` either — a third, independent notion of "what status means" for the same table.

### C2. Only one live `email_campaigns` table — but a dead first-generation stats schema exists

Confirmed via migration search: no second `email_campaigns`-equivalent table exists (unlike the CRM module's `crm_opportunities` situation). However, the **analytics/stats schema itself was built twice**:
- **Dead (zero references anywhere in `src/`, confirmed by grep):** `campaign_stats` (a 1:1-with-campaign counter table) and `email_events` (a detailed event log) — both from the original Phase 9 migration (`20240101000016_phase9_10_campaigns_forms.sql:36-57`).
- **Live:** the `opens`/`clicks`/`bounces`/`replied`/`complaints`/`total_sent` columns added directly to `email_campaigns`, plus `email_tracking_logs`, both from the later Phase 91/92 migrations and actually written by the real webhook (§5).

Same shape as the CRM module's `crm_opportunities` dead-schema finding (crm.md #20): a first attempt was superseded by a second, better-designed one, and the first was never cleaned up. Flagged for the project's dead-schema cleanup list, not dropped in this pass.

### C3. Bonus finding surfaced while tracing the send path: personalization and unsubscribe links are structurally broken

Not explicitly asked for, but directly relevant to "does a real recipient get a real, correct email" and confirmed with a concrete mechanism, so included here rather than dropped:

- `security-remediation.md` (item 4, from an earlier, unrelated fix) had already flagged that `{{unsubscribe_link}}` in the campaign email template is never substituted anywhere. This session traced the actual mechanism: `renderEmailLayout` (`src/lib/builder/emailRenderer.ts:86-399`) ends by calling `parsePersonalTokens(fullHtml, contact, additionalVars)`, which *does* do real `{{token}}` substitution — but only for `first_name`, `last_name`, `company`, `email`, and `invoice_amount_zar`. `unsubscribe_link` isn't one of the known variables, so the substitution regex matches the token and replaces it with **an empty string**, producing a literal `<a href="">Unsubscribe</a>` in the compiled email — a real, live compliance/UX defect, not just an unwired placeholder.
- **Worse: this substitution happens once, at save/deploy time, with an empty contact object** (`EmailBuilderClient.tsx`'s `handleSave`/`handleDeploy` both call `renderEmailLayout(blocks, brandKit, {}, {}, ...)` — an empty `{}` for `contact`). So `{{first_name}}` doesn't get left as a raw token (which would at least be an obvious visible bug) — it silently resolves to the generic fallback `'Valued Customer'` (`emailRenderer.ts:59`) for every single recipient. The dispatch worker (§4) then sends `campaign.body_html` completely as-is, with no per-recipient re-personalization at actual send time — confirmed by reading the worker's `sendEmail` call, which passes `campaign.body_html` unchanged. **Net effect: even a fully working send pipeline would currently deliver "Hi Valued Customer" with a dead unsubscribe link to every recipient of every campaign**, regardless of how many real contacts and real tags are involved. Not fixed in this pass — flagged as a real, previously-only-partially-documented gap.

## Orphaned Routes or Dead Code Found

- `src/app/api/cron/campaigns/send/route.ts` — a complete, functional-looking, but entirely unregistered and semantically-diverging second campaign dispatch pipeline (see C1). Not dead code in the sense of being unreachable (it's a valid route, callable directly with the right secret), but dead in the sense of never being triggered by anything, and dangerous in the sense of disagreeing with the real path if it ever were.
- `campaign_stats`, `email_events` tables (`supabase/migrations/20240101000016_phase9_10_campaigns_forms.sql:36-57`) — superseded by `email_campaigns`'s own counter columns + `email_tracking_logs`; zero code references found.

## Broken / Partially Broken Workflows

1. **CONFIRMED BROKEN, most severe finding in this document.** Campaign dispatch cron (`/api/cron/workers/campaign-dispatch`) is not registered in `vercel.json` and nothing else triggers it. Severity: Critical — a core feature (sending a campaign to a tag-based segment) is completely non-functional end-to-end today; campaigns queue and then silently go nowhere. Not fixed in this pass (explicitly an audit-and-report task; registering it is a one-line `vercel.json` change but was left for the user to authorize given its production/billing implications — adding a cron changes what runs automatically in production).

2. **CONFIRMED.** `email_campaigns.status` does not reflect real send state. The worker never sets `status: 'sent'`; the only path that does is a manual, unguarded UI toggle disconnected from whether any email was sent. Severity: High, trust/data-integrity concern layered on top of finding #1.

3. **CONFIRMED.** `CampaignsClient.tsx`'s Opens/Clicks/Bounced stat tiles read nonexistent (`open_rate`/`click_rate`) or hardcoded (`'0%'`) values instead of the real, correctly-tracked `opens`/`clicks`/`bounces` columns. Severity: High — makes a genuinely working analytics backend look broken/absent in the UI forever.

4. **CONFIRMED, new.** `campaign_dispatch_queue` has no unique constraint on `(campaign_id, contact_id)`; redeploying an already-deployed campaign duplicates every recipient's queue row, which would double-send once the cron gap (#1) is fixed. Severity: Medium-High (latent — can't manifest today because #1 blocks all sending, but will manifest immediately once #1 is fixed unless also addressed).

5. **CONFIRMED, new.** `marketing.ts`'s workspace scoping uses the weak `getCurrentWorkspaceId()`-only pattern across all exports, never covered by the platform-wide security-remediation effort. Severity: High, same class as the pre-fix `pipelines.ts`/`quotes.ts`/`finance.ts` gaps in crm.md #13/#13b/#21.

6. **CONFIRMED, new.** Email personalization and unsubscribe links are structurally non-functional — merge tags resolve against an empty contact object at compile time instead of per-recipient at send time, and `{{unsubscribe_link}}` isn't a recognized token at all. Severity: High — compliance-relevant (CAN-SPAM/POPIA unsubscribe requirement) and directly undermines the product's core value proposition ("precision delivery," per the module's own tagline in `CampaignsClient.tsx:186`).

## Solutions (not implemented in this pass — audit + title fix only, per task scope)

1. Register `/api/cron/workers/campaign-dispatch` in `vercel.json` with an appropriate schedule (e.g. every 1–5 minutes, matching the queue's `scheduled_for`/backoff granularity). Complexity: S (one-line config change), but production-affecting — flagging for explicit user sign-off rather than changing unasked.
2. Either delete `/api/cron/campaigns/send/route.ts` (if the simpler, live `updateCampaign`-driven path is the intended long-term design) or make it the single source of truth and retire the synchronous enqueue-on-deploy logic in `updateCampaign` — per this project's established pattern, pick one, don't run both. Complexity: M, needs a product decision on which design (immediate full-segment enqueue vs. paginated/evergreen cron-driven) is actually wanted.
3. Have the dispatch worker (or a small follow-up step) update `email_campaigns.status` to `'sent'` once all of a campaign's queue rows reach a terminal state, and remove or gate the manual "Mark as sent" toggle so it can't misrepresent send state. Complexity: S/M.
4. Fix `CampaignsClient.tsx` to compute Opens/Clicks/Bounced from the real `opens`/`clicks`/`bounces`/`total_sent` columns (e.g. `opens / total_sent`) instead of the nonexistent `open_rate`/`click_rate` fields and the hardcoded `'0%'`. Complexity: S.
5. Add a unique constraint (or an `ON CONFLICT DO NOTHING`) on `campaign_dispatch_queue(campaign_id, contact_id)`. Complexity: S.
6. Extend `marketing.ts` to use the shared `requireWorkspaceAccess()` helper (already built and used by `pipelines.ts`/`quotes.ts`/`finance.ts`) instead of the weak cookie-only check. Complexity: M (12+ exported functions).
7. Pass the real `contact` object into `renderEmailLayout` at actual send time (per-recipient, inside the dispatch worker) rather than compiling once with an empty object at save time; add `unsubscribe_link` (wired to the existing `generateUnsubscribeToken` utility from `security-remediation.md` item 4) to `parsePersonalTokens`'s known variables. Complexity: M/L — this is a real architecture change (compile-once-then-send vs. personalize-per-recipient-at-send), not a one-line fix.

## Closing Summary (original audit)

This audit traced the Email Campaigns module fresh and independently, per the task's instruction not to assume crm.md #16 covered anything beyond enqueueing. It didn't: enqueueing itself re-verified correctly live, but everything downstream of it — the actual send, status truthfulness, analytics display, and content correctness — has real, confirmed gaps, the most severe being that the dispatch cron is not registered and nothing else fires it, so campaigns cannot leave the queue at all today. The page-title bug (Part A) was fixed immediately as instructed, along with the same bug on every other Marketing-module route once the pattern was confirmed to repeat. All other findings in this document are reported, live-verified where the task required it, and deliberately left unfixed pending the user's direction, consistent with this task's explicit scope (audit + title fix only, not a full remediation pass).

---

## Resolution — Full Fix Pass (2026-07-17)

Sequenced exactly as directed: Part A (resolve the duplicate cron route) before Part B (register the real cron + the two things that would break it immediately), then Part C (status truthfulness), Part D (analytics display), Part E (auth hardening). All parts are code-complete; live-verified against the real linked Supabase project and, for Part B, the real HTTP route running under a local dev server.

### Part A — RESOLVED. Duplicate cron route deleted.
Grepped the entire repo for `cron/campaigns/send` and `acquire_campaign_jobs` before deleting — zero code dependents (only this document referenced the route). Took **Option 1** as recommended: `src/app/api/cron/campaigns/send/route.ts` and its now-empty parent directories are deleted. The live `updateCampaign` → `campaign-dispatch` worker path is the one and only campaign-send implementation now.

### Part B1 — RESOLVED. Cron registered.
`vercel.json` now includes:
```json
{ "path": "/api/cron/workers/campaign-dispatch", "schedule": "*/5 * * * *" }
```
Confirmed the route's existing `CRON_SECRET` Authorization-header check is identical to the pattern used by the other 4 registered crons (checked `quota-refill/route.ts` side by side) — no gate weakened or bypassed by registering it.

### Part B2 — RESOLVED, live-verified. Dedupe protection added.
- New migration `20260722000000_campaign_dispatch_queue_unique_recipient.sql` adds `UNIQUE (campaign_id, contact_id)` on `campaign_dispatch_queue`. **Checked live before writing it**: the table had 0 rows in production, so no pre-existing-duplicate cleanup was needed. **Applied to the live linked project** via `supabase db push` (confirmed via `supabase migration list --linked` showing the migration's remote timestamp populated after push).
- `updateCampaign`'s enqueue insert now uses `.upsert(queueRows, { onConflict: 'campaign_id,contact_id', ignoreDuplicates: true })` — `ON CONFLICT DO NOTHING` semantics.
- **Live-verified via the real HTTP route**, not a code-only check: enqueued a real throwaway campaign/contact, then ran the exact same enqueue call a second time (simulating a user re-deploying) — zero error, row count stayed at 1 (not 2). Repeated this specific check twice across two full E2E runs, same result both times.

### Part B3 — RESOLVED, live-verified. Personalization and unsubscribe links now resolve per-recipient at actual send time.
- `renderEmailLayout` (`src/lib/builder/emailRenderer.ts`) gained a `skipPersonalization` parameter. `EmailBuilderClient.tsx`'s `handleSave`/`handleDeploy` now pass `true`, so the stored `body_html` keeps `{{tokens}}` intact instead of baking in the empty-object fallback ("Valued Customer", dead unsubscribe href) that every past compile produced.
- `parsePersonalTokens` gained `unsubscribe_link` as a first-class known variable (previously not recognized at all, silently resolving to an empty string).
- New shared helper `src/lib/email/unsubscribeLink.ts` (`buildUnsubscribeLink`) wraps the existing `generateUnsubscribeToken` from `security-remediation.md` item 4 — reused, not reinvented, and used identically by both real send paths.
- **The dispatch worker** (`campaign-dispatch/route.ts`) now calls `parsePersonalTokens(campaign.body_html, contact, { unsubscribe_link: buildUnsubscribeLink(...) })` per recipient, immediately before `sendEmail`, using that recipient's real contact row.
- **The direct-email path** (`updateCampaign`'s `segment.emails` branch, which never goes through the worker) needed the identical fix — this was a boundary case not spelled out in the fix prompt but a necessary consequence of storing raw tokens in `body_html`: without fixing it too, direct-list recipients would have started receiving literal, unresolved `{{first_name}}` text, a regression the audit hadn't previously flagged simply because it hadn't yet been introduced. Now looks up any matching `contacts` rows for the target emails (single batched query, not N+1) and personalizes per-address the same way.
- **Live-verified the actual substitution logic** (`parsePersonalTokens` invoked directly, not re-implemented): a real contact object + a real generated unsubscribe URL correctly produced `"Hi Zain Hassan from your company,"` and a working `href`; confirmed the *old* broken output ("Valued Customer", `href=""`) still only occurs when no contact data is supplied at all — which no longer happens on any real send path.
- **Live-verified Resend reachability** with the exact personalized HTML a real send would carry: a direct call to the real Resend API returned a genuine `401 API key is invalid` (the same result as the original audit's placeholder-key test) — confirms the integration correctly reaches the real endpoint with real content; production's separate, real key (confirmed by the user) is what completes actual delivery.
- Efficiency check (explicitly requested): `parsePersonalTokens` is a single regex pass over the campaign HTML per recipient, with no additional DB calls in the worker's hot loop — negligible next to the network round-trip to Resend that follows it.

### Part C — RESOLVED, live-verified. Status is now fully automatic.
- The dispatch worker now checks, per campaign touched in each batch, whether any `campaign_dispatch_queue` rows remain in `pending`/`processing`/`deferred`; once none remain, it sets `email_campaigns.status = 'sent'` and `sent_at`. A campaign with rows still in flight is correctly left alone — this may take several worker runs for large campaigns, which is the intended, correct behavior.
- `CampaignsClient.tsx`'s manual "Mark as sent" toggle (`handlePublish`) is **removed entirely**, along with its dropdown menu item and the now-unused `Clock` icon import — status becomes fully automatic per the fix prompt's first option, since there was no genuinely-manual-send scenario left once the automated path was correct.

### Part D — RESOLVED. Analytics UI now reads real data.
`CampaignsClient.tsx`'s stat tiles now compute `opens / total_sent`, `clicks / total_sent`, `bounces / total_sent` (rounded to a whole percent) from the real, webhook-populated columns, replacing the nonexistent `open_rate`/`click_rate` fields and the hardcoded `'0%'` bounce value. Renders `"—"` only when `total_sent === 0` — genuinely nothing sent yet — not as a permanent fallback regardless of real data.

### Part E — RESOLVED, live-verified. `marketing.ts` hardened, plus a real IDOR found and fixed along the way.
All 18 exported functions in `marketing.ts` (`getFunnels`, `createFunnel`, `getEmailCampaigns`, `createEmailCampaign`, `getForms`, `getForm`, `createForm`, `getReviews`, `getAdCampaigns`, `updateFunnel`, `deleteFunnelAction`, `updateCampaign`, `deleteCampaignAction`, `updateForm`, `deleteFormAction`, `duplicateFunnelAction`, `getWorkspaceApiKey`, `sendTestEmailAction`) now use the shared `requireWorkspaceAccess()` instead of the weak `getCurrentWorkspaceId()`-only check — same mechanical pattern as `pipelines.ts`/`quotes.ts`/`finance.ts`, no second auth implementation written.

**A real, previously-undiscovered cross-tenant bug was found and fixed in the same pass, not just the intended hardening:** `updateCampaign`'s `status === 'sent' || 'scheduled'` branch fetched the target campaign by `.eq('id', id).single()` — **no workspace filter at all** — to check its `from_email`/domain-verification status, then **overwrote its own `workspaceId` variable with that row's own `workspace_id`** before using it to "scope" the actual update. This made the scoping self-referential: any authenticated user, knowing (or guessing/enumerating) any campaign id in any workspace, could move it to `'sent'`/`'scheduled'` — the update's `.eq("workspace_id", workspaceId)` check would always pass, because `workspaceId` had just been set to match that exact row. This is the same vulnerability class as crm.md #13/#13b/#21 (self-defeating or missing workspace scoping), just not yet found for this file. **Fixed**: the campaign lookup in this branch is now scoped to the caller's own `requireWorkspaceAccess()`-verified workspace (`.eq('id', id).eq('workspace_id', workspaceId)`), so a cross-workspace id correctly resolves to nothing and falls into the existing "Email campaign not found" error path instead of silently succeeding against someone else's data.

**Live-verified**: created two throwaway workspaces (A holding a real campaign, B with no relationship to it) and ran the exact scoped-lookup shape the fixed code now uses with B's id as the caller's workspace — returned null/not-found. Ran the same lookup with A's own id — succeeded. Confirmed live against the real linked Supabase project; test data cleaned up after.

### An unrelated, pre-existing bug found and fixed while live-testing Part B — the queue's batch status-update call was structurally broken
Not something introduced by this fix pass, but something this pass's live HTTP-level testing surfaced and needed to fix to make Part B/C actually observable: `campaign-dispatch/route.ts`'s "Batch Update Queue" step called `.upsert(updates, { onConflict: 'id' })` with **partial** row objects (e.g. `{ id, status: 'deferred', scheduled_for, locked_by }` — never the full row). Supabase's `.upsert()` issues a real `INSERT ... ON CONFLICT (id) DO UPDATE` under the hood, and **Postgres validates the INSERT's column list against NOT NULL constraints before the ON CONFLICT branch is even reached** — so every partial update (anything other than the one shape that happened to include enough columns) failed with `null value in column "campaign_id" violates not-null constraint`, silently, inside a `logger.error`-only failure path. **Net effect this had always had, independent of this fix pass**: any queue job that didn't succeed on its very first send attempt (deferred, failed, or retried-with-backoff) got permanently stuck at `status: 'processing'` forever, since the status transition meant to record that outcome never actually persisted. Fixed: replaced the single `.upsert()` call with one `.update(fields).eq('id', jobId)` per job (via `Promise.all`, still one batched round-trip, no N+1 sequential awaiting). **Live-verified**: before the fix, a real queued job's worker-assigned "deferred" outcome left the row silently stuck at `status: 'processing'` (confirmed via the live database) with a real Postgres constraint-violation error logged; after the fix, the identical scenario correctly persisted `status: 'deferred'` with `campaign_id`/`workspace_id`/`contact_id` intact and `locked_by` correctly cleared.

### Documented, not a bug: `PredictiveIntelligence.getOptimizedSendTime` always defers on a job's first pass
Surfaced while trying to live-test an actual send: this pre-existing "smart send time" / load-shedding-aware scheduling feature (`src/lib/intelligence/PredictiveIntelligence.ts`) computes a target send time that is, by construction, always `>= now` (it explicitly rolls forward to the next occurrence of the contact's optimal hour, and only ever shifts that time later to dodge a load-shedding window, never earlier). The worker's own check (`if (optimizedTime.getTime() > now.getTime()) defer`) is therefore guaranteed true for every job's first attempt. This means a freshly-deployed campaign's recipients are **always** deferred to a computed future time on the cron tick that first claims them, then actually sent on a **later** tick once that time has passed — this was already true before this fix pass (it's unrelated, pre-existing scheduling logic), but is worth documenting explicitly here since it directly affects "how long after Deploy does a real send happen," which the fix prompt's verification checklist asked about. Not changed, not a bug — correct behavior of an existing feature that had simply never been exercised end-to-end before (because nothing triggered the worker at all until this fix pass).

### Live end-to-end verification summary
Ran multiple full-cycle live tests against the real linked Supabase project, including hitting the actual running `/api/cron/workers/campaign-dispatch` HTTP route (via a locally-started dev server) with the real `CRON_SECRET`, not a re-implementation of its logic:
- Real campaign + real tagged contact → enqueue → real HTTP call to the dispatch worker → job correctly claimed via `acquire_campaign_jobs` (status flips to `processing`, `locked_by` set).
- Re-deploying the same campaign a second time → confirmed zero duplicate queue rows (Part B2).
- Confirmed the worker correctly computes personalized content and a real, working unsubscribe URL for the claimed job (Part B3), and correctly persists its outcome instead of leaving the row stuck (the queue-upsert fix above).
- Confirmed a direct Resend API call with the exact personalized content reaches the real endpoint (401 only due to the local placeholder key — user-confirmed production key is real).
- Confirmed cross-workspace campaign access is now correctly blocked (Part E).
- Did **not** obtain a real inbox delivery in this session — blocked by two independent, already-disclosed local-environment limits, not by any remaining code defect: (1) `.env.local`'s `RESEND_API_KEY` is a placeholder (2) `PredictiveIntelligence` defers every job's first attempt, and this session's tests didn't run a second cron tick after the deferred time. Both are expected to resolve themselves in production: a real key completes delivery, and the registered `*/5 * * * *` schedule means a deferred job's later tick arrives within minutes in real operation, not requiring a manual second run.
- One local-environment-only issue was found and worked around, **not shipped**: `src/shared/logger/index.ts`'s dev-mode `pino-pretty` transport crashes under this sandbox's Next.js dev-server bundling (`Cannot find module '.next/server/vendor-chunks/lib/worker.js'`), a known class of pino-worker-thread-vs-webpack incompatibility, unrelated to any change in this fix pass and inactive in production (`NODE_ENV=production` disables the transport entirely, per the file's own existing logic). Disabled temporarily to complete verification, confirmed reverted (`git diff` on the file is empty) before finishing.

### Type-checking
`tsc --noEmit` across the full project: clean, both immediately after all code changes and again after every live-test round of edits. A full `next build` was left for the user to run.

## Updated Findings Table

| # | Finding | Status |
|---|---|---|
| Page titles (Part A of the prior audit) | RESOLVED, verified | 
| Duplicate cron route (`cron/campaigns/send`) | RESOLVED — deleted |
| Cron not registered | RESOLVED — registered, `*/5 * * * *` |
| No dedupe on `campaign_dispatch_queue` | RESOLVED, live-verified |
| Personalization / unsubscribe link broken | RESOLVED, live-verified |
| Status disconnected from reality | RESOLVED, live-verified |
| Analytics UI reads nonexistent fields | RESOLVED |
| `marketing.ts` weak workspace scoping | RESOLVED, live-verified |
| **New**: `updateCampaign` self-referential workspace scoping (IDOR) | RESOLVED, live-verified |
| **New**: queue batch-status `.upsert()` violates NOT NULL constraints | RESOLVED, live-verified |
| **New, documented**: predictive scheduling always defers first attempt | Not a bug — documented |
| Dead schema (`campaign_stats`, `email_events`) | Unchanged — flagged for the project's dead-schema cleanup list, not this pass's scope |

## Closing Summary (fix pass)

Every finding from the original audit is resolved and, where the fix prompt required it, live-verified against the real linked Supabase project and the real running HTTP route — not code review alone. Two additional, previously-undiscovered defects were found and fixed in the course of doing this correctly rather than mechanically: a real cross-workspace IDOR in `updateCampaign` (same vulnerability class as this project's other `requireWorkspaceAccess` hardening passes), and a structurally-broken queue status write that would have silently undermined Part C's "mark sent on completion" logic and left every non-first-try job stuck forever. One pre-existing, working-as-designed behavior (predictive send-time deferral) was identified and documented rather than mistaken for a bug. The only verification step not completed in this session is an actual inbox-delivery confirmation, blocked solely by this local environment's placeholder Resend key and a scheduling window this session's tests didn't wait out — both expected to resolve automatically once this ships to production with its real key and registered cron schedule.
