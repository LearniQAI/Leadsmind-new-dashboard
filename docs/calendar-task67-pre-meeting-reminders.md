# Task 67 — Scheduled Pre-Meeting Reminders (re-verify + fix missing AI-brief cron)

Primarily re-verification of an already-real feature plus one known fix
(the AI pre-meeting brief cron was never registered in `vercel.json`).

---

## Step 1 — Audit findings

### 1. `/api/cron/reminders` — real, scheduled, both channels

- **Schedule:** `vercel.json` → `"0 * * * *"` (hourly). Real.
- **What it sends:** for `appointments` with `status in ('confirmed','scheduled')`
  falling in a ±15-min window around *now+24h* or *now+1h* (and the matching
  `reminder_24h_sent` / `reminder_1h_sent` flag still false):
  - **Email** via `sendEmail` (`lib/email.ts`, the shared Resend wrapper),
    tag `calendar_reminder`.
  - **SMS** via `sendSMS` (`lib/sms.ts`) with
    `resolveWorkspaceTwilioCredentials(workspace)` + `workspace.twilio_number`.
  - Idempotency: `reminder_1h_sent` / `reminder_24h_sent` set only after both
    channels succeed for that appointment.
- **Gap found (Step 2.2):** the reminder content used
  `Meeting Link: ${apt.meeting_link || 'TBD'}` — it did **not** consult Task 63's
  `metadata.meeting_link_status` / `meetingLinkNote()`. So a Zoom booking
  (link legitimately `null`, status `zoom_pending_integration`) produced a
  meaningless `Meeting Link: TBD` line instead of the honest "coming soon"
  copy, and there was no channel-consistent handling of the
  `google_meet_pending_connection` / `google_meet_unavailable` states.

### 2. AI pre-meeting brief — `/api/cron/pre-meeting-brief`

- **What it does:** `handleBriefingCron()` scans `appointments` with
  `status = 'scheduled'` whose `start_time` is **115–120 min ahead** (a 5-min
  window tied to *now*). For each, it runs `ResearchAgent.enrichContact()`
  (company + individual enrichment → `ai_research_reports` row with a
  `ScoringEngine` lead score), then emails an HTML briefing (lead-suitability
  score, operational profile, inferred pain points, conversation openers) to
  the **assigned agent** (`appointment.user_id` → `users.email`, else
  `account-manager@leadsmind.io`) via `sendEmail`.
- **Also** exposes `POST` — same cron path via bearer token, **or** an
  authenticated single-contact call (the "Send Pre-Meeting Briefing Email"
  button), workspace-membership checked against the *contact's* workspace.
- **Confirmed absent from `vercel.json`.** The route, its auth, and its logic
  all exist and work — but Vercel only runs cron paths explicitly listed in
  `vercel.json`, so in production this sweep **never fired**. This is the
  task's core fix.

### 3. AI/LLM infra + credit gating

- **Infra:** `ResearchAgent` calls OpenAI (`gpt-4o`) via the `openai` SDK with
  `process.env.OPENAI_API_KEY` — the same OpenAI-key backing every other AI
  feature in this app. Tool calls (web search / scrape) are stubbed; the
  enrichment report is largely templated with the LLM supplying the
  `individual_profile` sub-object. (Quality of that templating is a
  pre-existing concern, noted as Deferred — not in scope for this task.)
- **Credit gating — gap found & fixed:** every other metered AI feature
  (`/api/v1/ai/content/generate`, `/api/finance/revenue-forecast`,
  `/api/ads/campaigns/[id]/recommendations`) gates on
  `runCreditGuard(workspaceId)` then `consumeAICredit(workspaceId)`
  (`src/lib/ai/creditGuard.ts`, RPC `deduct_ai_credit` → `ai_usage_credits`).
  The pre-meeting brief did **neither** — an unmetered LLM run per upcoming
  appointment. Now gated the same way (Step 2.3 below).

### 4. SMS path — Twilio consistency

Confirmed: `reminders` → `sendSMS({ config: resolveWorkspaceTwilioCredentials(workspace), fromNumber: workspace.twilio_number })`,
i.e. the workspace-scoped Twilio credential resolver + shared `sendSMS`
wrapper, identical to the rest of the app. No second SMS pipeline. No change
needed.

---

## Step 2 — Fixes

| # | File | Change |
|---|---|---|
| 2.1 | `vercel.json` | Registered `/api/cron/pre-meeting-brief` at `*/5 * * * *`. The route's look-ahead window is a fixed 5-min band (now+115 → now+120 min), so it must run every 5 minutes to tile that band without gaps; a brief therefore lands ~2 hours before the meeting. |
| 2.2 | `src/app/api/cron/reminders/route.ts` | Now selects `appointments.metadata`, derives `meeting_link_status`, and builds both the email and SMS body from a line array: the `Meeting Link:` line appears only when a real link exists, and `meetingLinkNote(status, 'booker')` (the Task 63 copy — e.g. Zoom "coming soon — your host will send you the meeting link separately") is appended. No more `TBD`. |
| 2.3 | `src/app/api/cron/pre-meeting-brief/route.ts` | Added `runCreditGuard` + `consumeAICredit`, matching the other metered AI features. Bulk cron: a workspace out of AI credits has its brief **skipped** (logged `cron.pre_meeting_brief.skipped_no_credits`, reported `{ skipped: 'no_ai_credits' }`) — never a hard failure of the sweep. Single-contact `POST`: returns the guard's 402 body. One credit consumed per delivered brief. |

Nothing else required a fix — the rest of the reminder system audited as
genuinely real.

---

## Step 3 — Verification (real, live)

`npx tsx scripts/db-checks/task67-verify.ts` → **21/21 passed**. Real Supabase
(throwaway workspace/contacts/appointments), real route handlers invoked with
a real `CRON_SECRET` bearer, real `ai_research_reports` / `ai_usage_credits`
writes, real `ScoringEngine`. Only outbound HTTP (Resend, OpenAI) is
intercepted; Twilio is put in sandbox mode so the SMS body is built by the
real `sendSMS` without a live send.

### Verified / Fixed

**Existing hourly reminder cron**
- Runs, returns `{ success: true, reminders_sent: 3 }`.
- **google_meet** booking → email + SMS carry the real
  `https://meet.google.com/...` link; no `TBD`.
- **Zoom** booking (link `null`, `zoom_pending_integration`) → **no**
  `Meeting Link:` line; the honest "coming soon … host will send you the
  meeting link separately" note is present in both channels; no `TBD`.
- Plain booking with a link → still delivered unchanged (regression).
- Email **and** SMS both dispatched for all 3 (the `reminder_1h_sent` flag is
  written only after both channels succeed — proves the Twilio `sendSMS` path
  ran).
- Re-run in the same window sends nothing (`reminder_1h_sent` honored —
  regression).

**AI pre-meeting brief cron (now registered)**
- With the appointment ~117 min ahead, `briefGET` returns
  `{ success: true, processedCount: 1 }`.
- A real HTML briefing email is delivered to the host — contains a real
  lead-suitability score (`/ 100`) and the "Prospect Intelligence Summary"
  section.
- A real `ai_research_reports` row is persisted with a numeric `lead_score`.
- Exactly **1 AI credit consumed** from `ai_usage_credits` (same meter as
  every other AI feature).
- Out-of-credit workspace: cron still returns `success: true` and the
  appointment is reported `skipped: no_ai_credits` — no brief sent, no crash.
- `vercel.json` entry present with schedule `*/5 * * * *`.

**Static / suite**
- `tsc --noEmit` — clean (pre-existing stale `.next/types` warnings only).
- `next lint` on all changed files — clean.
- `vitest run src/lib/calendar/` — 45/45 pass.
- `next build` — see build log.

### Deliberately Deferred

- **`ResearchAgent` enrichment quality.** The enrichment report is largely a
  hard-coded template (South-African logistics placeholder copy) with the LLM
  only filling `individual_profile`; the web-search / scrape tools are stubs.
  The brief *does* generate, score, persist and deliver real per-contact
  output, but the prose is not deep research. Rebuilding `ResearchAgent` onto
  real search + a real structured-output prompt is a separate, larger piece of
  work and was explicitly out of scope for this re-verification task.
- **Brief cron has no `brief_sent` idempotency flag.** It relies purely on the
  5-min look-ahead window tiling exactly with the `*/5` schedule. A skipped or
  delayed cron run would miss an appointment permanently; a manually re-run
  cron inside the same window would double-send. The hourly reminder cron
  solved this with `reminder_1h_sent` columns — the brief should get the
  equivalent. Deferred (needs a migration; low risk under normal Vercel cron
  reliability).
- **Real end-to-end OpenAI + Resend + Twilio sends.** The live test intercepts
  those three network boundaries (no test should burn the shared OpenAI key or
  send real email/SMS from a throwaway workspace). Everything up to and
  including the request payloads is real.

---

## Follow-up — brief cron idempotency (added same day)

The "no `brief_sent` idempotency flag" item above was fixed rather than left.

### Migration
`supabase/migrations/20260910120000_appointments_brief_sent.sql` —
`ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS brief_sent BOOLEAN DEFAULT false`.
Mirrors `reminder_1h_sent` / `reminder_24h_sent` (`20240101000197_meet_automation.sql`).
Applied to the linked remote (`supabase db push --linked`) and verified before
the code change — existing rows backfilled to `false`.

### Route changes (`/api/cron/pre-meeting-brief`)
- **Scan window widened** from a fragile `now+115 .. now+120` (5-min) band to
  `now+10 .. now+120` — "any not-yet-briefed scheduled appointment starting in
  the next ~2h". A missed/delayed cron tick now self-heals on the next run
  instead of silently dropping the brief.
- Query gains `brief_sent = false`.
- `brief_sent` is set `true` **only after** enrichment + `ai_research_reports`
  persist + `consumeAICredit` + a successful `sendEmail` — same "mark sent only
  on real success" discipline as the reminder cron. Any earlier throw leaves it
  `false` and the whole appointment is retried next run.
- **Out-of-credit skip deliberately leaves `brief_sent = false`.** A skip is a
  transient condition (workspace may top up / monthly refill lands while the
  meeting is still >10 min out), not a delivered brief — so it stays retryable
  within the widened window. (A genuine send failure is also retryable, by the
  same flag; only a fully successful brief is terminal.)

### Verified / Fixed — `scripts/db-checks/task67-brief-idempotency-verify.ts` → 20/20 live

- **Exactly-once:** run the cron, then run it **again immediately** for the same
  appointment → run #1 sends exactly one email + consumes exactly one credit +
  sets `brief_sent = true`; run #2 returns `processedCount: 0`, **no** second
  email, **no** second credit. (The core proof: two → one, not zero, not two.)
- **Self-heal:** an appointment 90 min out — outside the old 5-min band — is
  briefed exactly once under the widened window.
- **Out-of-credit retryable:** skipped appointment keeps `brief_sent = false`
  and no email; after credits are restored the *same* appointment is briefed
  once (one credit), then not re-sent on the next run.
- **Regression:** the hourly reminder cron still sends once and honours
  `reminder_1h_sent` on re-run.
- `tsc` / `next lint` clean; `task67-verify.ts` still 21/21; `next build` — see log.

### Deliberately Deferred (unchanged)
- `ResearchAgent` enrichment depth — still a templated report; separate work.
- The single-contact `POST` path (the manual "Send Briefing" button) does not
  touch `brief_sent` — manual sends are intentional and may legitimately repeat,
  and it operates on a contact, not a specific appointment. Left as-is.
