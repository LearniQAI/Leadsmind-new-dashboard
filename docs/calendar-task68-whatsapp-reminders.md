# Task 68 — SMS / WhatsApp Appointment Reminders

Adds real WhatsApp appointment reminders to `/api/cron/reminders` (which
already sends real email + SMS reminders from Task 67), reusing the project's
one real WhatsApp-sending stack — and definitively resolves the twice-flagged
`lib/calendar/sms.ts` loose thread.

**Core proof — `scripts/db-checks/task68-whatsapp-reminders-verify.ts` → 15/15:**
a real appointment ~1h out, Meta Graph + Resend HTTP intercepted so the actual
outbound payloads are asserted — an out-of-window contact gets the approved
`appointment_reminder` **template**, an in-window contact gets a **free-text**
message whose body is byte-identical to the SMS reminder, an opted-out contact
and a contact with no phone are **skipped gracefully**, and email + SMS still
deliver for all of them (the reminder-sent flag is set for every appointment).

---

## Step 1 — Audit findings

### 1. What `/api/cron/reminders` actually calls to send SMS

`src/app/api/cron/reminders/route.ts` → `import { sendSMS } from '@/lib/sms'`.
It builds per-workspace Twilio config via
`resolveWorkspaceTwilioCredentials(workspace)` + `workspace.twilio_number` and
calls `sendSMS({ to, message, config })`. **`@/lib/sms` is the real SMS path.**

### 2. `lib/calendar/sms.ts` — the contradiction, definitively resolved

**`lib/calendar/sms.ts` (`sendCalendarSMS`) is a genuine dead duplicate. Zero
code callers anywhere in the repo** (`grep` for `sendCalendarSMS` /
`calendar/sms` → only this file's own declaration + three stale doc mentions).
It is a second, standalone hand-rolled Twilio-REST implementation that
duplicates `@/lib/sms` (the one the cron actually uses).

There was never a real contradiction — the earlier audit's two notes were about
**two different files**:
- *"SMS real (in reminders cron)"* → true, and it's `@/lib/sms`.
- *"`calendar/sms.ts` orphan"* → also true, and it's a different file that
  nothing imports.

`lib/calendar/sms.ts` was also independently flagged in
`docs/schema-drift-audit.md` (#18) for reading a non-existent
`workspaces.twilio_phone_number` column — i.e. even if something *had* called
it, it would have silently failed. **Resolution: deleted.**

### 3. The real WhatsApp-sending stack to reuse

The canonical, most-correct WhatsApp dispatch in the project is
`src/app/api/cron/workers/whatsapp-dispatch/route.ts` (the broadcast worker).
Its pattern:
- WhatsApp connection = `platform_connections` where `platform = 'whatsapp'`,
  `.credentials` (JSONB: `phone_number_id`, `access_token_encrypted`, …).
- `new MetaAdapter(credentials)` → `.sendWhatsApp(to, text)` (free text) /
  `.sendWhatsAppTemplate(to, name, lang, params)` (approved template).
  Same adapter `voiceNoteWhatsApp.ts` and `reputation/send-request` use.
- Phone normalised to `+E.164`.

### 4. Data a WhatsApp reminder needs

Exactly the SMS reminder's data: `appointments` (`title`, `start_time`,
`meeting_link`, `metadata.meeting_link_status`) + `contacts` (`first_name`,
`phone`). The meeting-link state is resolved once in the route
(`meetingLinkNote(linkStatus, 'booker')`, Task 63/67) and the resulting
`smsText` string is **passed straight through** to the WhatsApp sender — no
second resolution.

### 5. Consent / opt-in — the established pattern (reused, not skipped)

`whatsapp-dispatch` enforces two real WhatsApp compliance rules, both reused
here:
1. **Opt-out re-check at send time**: `contact.opted_out || contact.sms_opt_out`
   → skip. (Those are the columns the broadcast worker treats as the WhatsApp
   opt-out signal.)
2. **24h customer-service window**:
   `isWithinWhatsAppSessionWindow(conversations.last_customer_message_at)` for
   `platform = 'whatsapp'`. **Inside** the window a business may free-text the
   contact. **Outside** it, a business-initiated message *must* be a
   pre-approved template — free-texting is a policy violation and Meta rejects
   it (error 131047). No template configured → **skip**, never force free text.

---

## Step 2 — Build

| Change | File |
|---|---|
| **Deleted** the dead duplicate. | ~~`src/lib/calendar/sms.ts`~~ |
| **New** `sendWhatsAppAppointmentReminder(params)` — the whole WhatsApp reminder decision in one testable function: no-connection / no-phone / opted-out → `{status:'skipped'}`; in-window → `adapter.sendWhatsApp(phone, smsBody)` (the SMS body verbatim); out-of-window → `adapter.sendWhatsAppTemplate(phone, 'appointment_reminder', 'en_US', [name, date, time])`; provider error or adapter throw → `{status:'failed'}` — **never throws**. Template name/lang overridable via `WHATSAPP_APPOINTMENT_REMINDER_TEMPLATE` / `_LANG`. | `src/lib/calendar/whatsappReminder.ts` |
| Reminders cron now also loads the workspace's `platform_connections` (whatsapp) credentials + the per-contact `conversations.last_customer_message_at`, and after email/SMS calls `sendWhatsAppAppointmentReminder` per appointment. **Strictly additive & isolated**: it runs only *after* `reminder_1h_sent`/`reminder_24h_sent` is recorded (so a WhatsApp send can never outlive an email/SMS failure into a duplicate next run) and in its own try/catch (a WhatsApp problem never errors the cron or touches the other channels). Response gains `whatsapp_sent`. Contact select gained `id, opted_out, sms_opt_out`. | `src/app/api/cron/reminders/route.ts` |

### Graceful-skip behaviour (Step 2.5)

Every non-send path returns a value, logged at `info` as
`cron.reminders.whatsapp.outcome`, and the loop moves on:
`no_connection` (workspace never connected WhatsApp), `no_number` (contact has
no phone), `opted_out` (`opted_out` or `sms_opt_out`), `no_template` (out of
window, no approved template). `failed` (Meta rejected, e.g. non-WhatsApp
number) is logged at `error` and likewise swallowed. Email and SMS for the same
appointment are entirely unaffected in all cases.

---

## Verified / Fixed (real, live)

### `npx tsx scripts/db-checks/task68-whatsapp-reminders-verify.ts` → 15/15

Real workspace + `platform_connections` (whatsapp) + contacts + appointments;
`graph.facebook.com/.../messages` and `api.resend.com/emails` intercepted so the
real request bodies are asserted; `@/lib/sms` in sandbox mode (mock send):

| Check | Result |
|---|---|
| cron runs, reports `whatsapp_sent = 2` | ✅ |
| **out-of-window contact** → WhatsApp `type: 'template'`, `template.name = 'appointment_reminder'`, params `['Outwin','Thu, 10 Sept 2026','07:02']` | ✅ |
| **in-window contact** (has a `conversations.last_customer_message_at` 30 min ago) → WhatsApp `type: 'text'`, body === the SMS reminder string (`Reminder: "T68 inwin" starts in 1 hour. Link: https://meet.google.com/abc-defg-hij`) | ✅ |
| **opted-out contact** (`sms_opt_out = true`) → **no** WhatsApp send; still gets the email reminder | ✅ |
| **no-phone contact** → **no** WhatsApp send; still gets the email reminder | ✅ |
| regression: `reminder_1h_sent` set for all 4 appointments (email + SMS both succeeded) | ✅ |
| regression: every contact with an email received one | ✅ |
| regression: re-run sends 0 reminders and 0 WhatsApp (flag honoured, no duplicate WhatsApp) | ✅ |

**Step 3.1 (real delivery)**: the send reaches the real
`MetaAdapter.sendWhatsApp` / `.sendWhatsAppTemplate` → a real
`POST graph.facebook.com/v18.0/{phone_number_id}/messages` with a real WhatsApp
Cloud API payload; the HTTP call is intercepted in the harness (there is no live
WhatsApp Business number wired to this environment — same constraint as every
other channel's live test, `RESEND_API_KEY` / Twilio included). A workspace with
a genuine connected WABA hits Meta unchanged — the code path, payload shape,
credentials source and template mechanism are identical to the
already-in-production `whatsapp-dispatch` broadcast worker.

**Step 3.2 (content parity)**: the in-window free-text body is the exact
`smsText` the SMS channel sends — same `meetingLinkNote(linkStatus, 'booker')`
resolution, same "Link: …" vs honest status-note logic (asserted).

**Step 3.4 (SMS/email regression — the path `sms.ts` deletion touches)**: green
above; also `scripts/db-checks/task67-verify.ts` still passes unchanged.

### `lib/calendar/sms.ts` — resolved

Confirmed dead (zero code callers; `@/lib/sms` is the real SMS path). **Deleted.**
Audit + schema-drift docs updated.

### Suite / types / lint / build (Step 3.5)

- New `src/lib/calendar/whatsappReminder.test.ts` — 8 unit tests (skip
  branches, in/out-of-window routing, phone normalisation, `failed` on provider
  error, `failed` (not throw) on adapter throw).
- `vitest run` → **52 files / 482 tests pass**.
- `tsc --noEmit` clean · `next lint` (changed files) clean.
- `next build` → **BUILD EXIT 0**, 242/242 static pages. (Two earlier attempts
  hit Windows `.next` filesystem races in the post-content finalize phase —
  `collect-build-traces` JSON parse / `mkdir ENOENT` — from concurrent build
  cleanup, not this change; a clean run is green.)

---

## Deliberately Deferred

- **Meeting link inside the out-of-window template.** The project's canonical
  `appointment_reminder` UTILITY template has a fixed 3-parameter body
  (`name`, `date`, `time`) and no URL parameter — WhatsApp templates are
  pre-approved with a fixed structure, so the meeting link can only ride the
  **in-window free-text** path (where it does, verbatim from the SMS body). A
  reminder template with a link/button component is a WhatsApp-Manager +
  template-submission task, not a code change.
- **A per-workspace reminder-template picker UI.** `whatsapp-dispatch` reads a
  per-campaign `template_name`; there is no per-workspace "appointment reminder
  template" setting. This task uses the well-known `appointment_reminder` name
  (overridable per-deploy via env) — a Settings field mapping each workspace's
  own approved template is a follow-up.
- **SMS ⇄ WhatsApp de-duplication / channel preference.** Today a contact with
  a phone *and* a connected-WhatsApp workspace gets both an SMS and a WhatsApp
  reminder (matching the existing "email AND SMS both send" behaviour). A
  "prefer WhatsApp when available, else SMS" toggle is a product decision, not
  built here.
- **Real end-to-end WhatsApp delivery to a live handset.** No live WhatsApp
  Business number is connected to this environment; the verification intercepts
  the real Graph call and asserts the real payload, exactly as the email
  (`RESEND_API_KEY` placeholder) and SMS (Twilio sandbox) live tests do.
- **A dedicated delivery-status/retry queue for reminder WhatsApp sends.**
  `whatsapp-dispatch` has `whatsapp_dispatch_queue` with backoff; reminder
  WhatsApp is best-effort fire-and-forget (like the cron's existing SMS). If a
  send fails it is logged and not retried — acceptable for a time-boxed
  reminder, and consistent with the SMS channel next to it.
