# Calendar Module — Milestone 3 Audit (Tasks 62–71)

**Audit only. No code was written, fixed, or built in this pass.**
Method: full static source trace with `file:line` citations (same standard as
`docs/calendar.md`, `crm.md`, `tasks.md`). No live browser/DB verification was
available in this environment.

---

## Step 1 — The real Calendar area as it exists today

### 1.1 Routes / pages / components (confirmed real paths)

| Surface | Path | Real? |
|---|---|---|
| Internal calendar dashboard | `src/app/calendar/page.tsx` → `src/components/calendar/CalendarClient.tsx` | ✅ live, linked from nav |
| Waitlist manager | `src/app/calendar/waitlist/page.tsx` → `WaitlistManager.tsx` | ✅ live |
| Analytics | `src/app/calendar/analytics/page.tsx` → `CalendarAnalyticsClient.tsx` | ✅ live |
| Instant Meet | `src/app/calendar/instant-meet/page.tsx` → `InstantMeetClient.tsx` | ✅ live |
| Public booking page | `src/app/book/[slug]/page.tsx` → `BookingClientWrapper.tsx` → `BookingFlow.tsx` | ✅ live |
| Public booking (domain-scoped) | `src/app/book/domain/[domainName]/[slug]/page.tsx` | ✅ exists (not deep-traced) |
| Self-service manage (token) | `src/app/book/manage/[token]/page.tsx` → `ManageBookingClient.tsx` | ✅ live (post-dates `docs/calendar.md` follow-up pass) |
| Video meeting room | `src/app/meet/[id]` (referenced; Jitsi-style internal room) | ✅ referenced everywhere |
| `src/app/calendar/CalendarClient.tsx` | — | ⚠️ **duplicate/legacy file** — `page.tsx` imports `@/components/calendar/CalendarClient`, not this one. Verify and delete. |
| `src/app/social/calendar/*` | social post scheduling | ❌ unrelated to booking (content calendar) |

**Server actions** (`src/app/actions/calendar/`):
`core.ts` (public slug lookup only), `calendars.ts` (CRUD, live),
`appointments.ts` (internal booking CRUD + instant meet + meet attendance),
`public.ts` (anonymous booking), `scheduling.ts` (slot computation + round-robin),
`manage.ts` (token cancel/reschedule).
Plus the **top-level barrel** `src/app/actions/calendar.ts` (waitlist, outcomes,
intake forms, status updates, analytics) — still partly on the weak
`getCurrentWorkspaceId()` auth pattern for non-waitlist functions.

**Libs** (`src/lib/calendar/`): `scheduling` logic aside, notable files —
`notifications.ts` (real, email confirmations), `calendarSync.ts` (external
Google/Outlook busy-sync + push), `googleMeet.ts` (real Google Meet API call),
`sms.ts` (`sendCalendarSMS` — **orphan, zero callers**),
`recurring.ts` (`generateRecurringSlots` — **imported once, never called**),
`manageToken.ts` (HMAC token, real), `payfast.ts`, `eskomsepush.ts`,
`saHolidays.ts`, `timezone.ts`, `popia.ts`, `crossConnect.ts`,
`accountingHook.ts`, `transcription.ts`, `availability.ts`
(`getHostAvailability` / `calculateAvailableSlots` — **entire file has zero
callers**, see below).

**`docs/calendar.md` references `src/app/actions/calendar/round-robin.ts`
(`getNextHost`) — that file no longer exists.** The dead weighted/priority
round-robin algorithm it flagged has since been deleted. Good.

### 1.2 Real database schema (calendar/booking)

Live tables (from migrations `phase17` → `phase28`, `meet_foundational`,
`meet_automation`, `phase20_waitlist`, `sprint4_documents_meetings`,
`20260717 double_booking_defense`, `20260721 tighten_public_policies`):

| Table | Purpose | State |
|---|---|---|
| `booking_calendars` | booking pages. Cols: `workspace_id`, `slug`, `calendar_type` (`personal`/`round_robin`/`collective`/`class_booking`/`service_menu`/`event`), `meeting_mode` (`google_meet`/`zoom`/`phone`/`in_person`/`custom_link`/`client_choice`), `timezone`, `slot_duration`, `buffer_time`, `availability` (JSONB keyed `"0"`–`"6"`, seeded Mon–Fri 09:00–17:00), `price`, `capacity`, `waitlist_enabled`, `location`, `cancellation_window_hours` (default 24), `custom_fields`, `custom_link` | ✅ real, actively used |
| `appointments` | bookings. Cols incl. `calendar_id` (nullable), `contact_id`, `user_id` (assignee), `status` (`scheduled`/`showed_up`/`no_show`/`cancelled`), `meeting_link`, `meeting_mode`, `metadata` JSONB, `deal_id`, `reminder_24h_sent`, `reminder_1h_sent`, `max_attendees`, `current_attendee_count` | ✅ real, actively used |
| `round_robin_assignment` | RR pool. Cols: `calendar_id`, `user_id`, `workspace_id`, `weight`, `booking_count`, `last_assigned_at` | ⚠️ **read + stat-updated only — NOTHING inserts rows** (no enrolment path). See Task 64. |
| `host_availability_profiles` | per-host hours/buffer/notice/horizon, keyed `(user_id, day_of_week)` | ⚠️ **read-only in code — no UI writes it.** Falls back to defaults everywhere. |
| `meet_date_overrides` | per-date block/custom-hours | ⚠️ **read-only in code — no UI writes it.** |
| `booking_leases` | 5-min PayFast optimistic locks | ✅ real |
| `booking_waitlists` | waitlist queue; `offered_at`, `offer_expires_at`, `confirmed`, `position` | ⚠️ partial — offer path works, **nothing ever sets `confirmed = true`** (see Task 65 / `docs/calendar.md` follow-up) |
| `booking_outcomes` | post-meeting routing rules | ⚠️ action exists (`calendar.ts: createOutcome`), **UI (`OutcomeManager.tsx`) is orphaned** |
| `booking_intake_forms` | per-calendar intake questions | ⚠️ action exists (`saveIntakeForm`), **UI (`IntakeFormBuilder.tsx`) is orphaned** |
| `booking_packages` / `contact_booking_credits` | paid session credit packs | ⚠️ schema real, `CreditPackageEditor.tsx` orphaned |
| `booking_slot_analytics` | slot demand analytics | ✅ read by analytics |
| `service_items` | service-menu line items | schema only, not traced to live UI |
| `user_calendar_connections` | per-user Google/Outlook OAuth tokens (`provider` `google`/`outlook`, `credentials`, `status`) | ❌ **DEAD: no code path ever inserts a row.** `calendarSync.ts` reads it; nothing populates it. |
| `platform_connections` (shared table) | workspace-level OAuth (`platform` `google_calendar` / `outlook_calendar` / `zoom` …) | ⚠️ **Google path real; Outlook/Zoom never populated** (see Task 62 / 63 / 70) |
| `meet_transcripts`, `meet_attendance_logs`, `meet_audit_trails` | meeting-room telemetry | ✅ real, wired to `/meet/[id]` |
| `sa_public_holidays` | SA holiday calendar (seeded 2026–2027) | ✅ real |

**No table anywhere for: recurring-meeting rules (RRULE), room/desk/equipment
resources, Apple Calendar / Exchange connections.** Confirmed absent by full
migration grep.

### 1.3 Two parallel availability engines (important — `docs/calendar.md` only describes one)

- **LIVE engine:** `scheduling.ts: getAvailableSlots` / `validateSlot`.
  Single source of truth for `public.ts` (public booking), `appointments.ts`
  (internal), and `manage.ts` (reschedule). Layers: booking horizon, SA
  holidays, `meet_date_overrides`, `booking_calendars.availability` JSON
  (+ hardcoded Mon–Fri 09:00–17:00 fallback), `host_availability_profiles`
  buffer/notice, existing appointments + buffer, PayFast leases, EskomSePush
  load-shedding. **Does NOT consult external Google/Outlook calendars.**
- **DEAD engine:** `lib/calendar/availability.ts: getHostAvailability` /
  `calculateAvailableSlots` / `intersectSlots`. This is the one that *does*
  call `getExternalBusySlots` (Google/Outlook free/busy) and does collective
  multi-host intersection. **Zero callers** (grep: only its own file + docs).
  Entire external-calendar-aware availability path is orphaned.

### 1.4 Cron / scheduled infrastructure

`vercel.json` registers 20 crons. Calendar-relevant:
- **`/api/cron/reminders`** — `schedule: "0 * * * *"` (hourly). **REAL and
  scheduled.** Sends 24h + 1h reminders by **email (`sendEmail`) and SMS
  (`sendSMS` via workspace Twilio)**, flips `reminder_24h_sent` /
  `reminder_1h_sent`. Auth: `Bearer CRON_SECRET`.
- **`/api/cron/pre-meeting-brief`** — route exists, has a real `GET` (cron) and
  `POST` (button) handler, sends an AI briefing email to the host 2h before.
  **NOT in `vercel.json` → never fires on a schedule.** Only reachable via the
  "Send Pre-Meeting Briefing" button (`ContactBriefClient.tsx`).
- Reusable worker pattern: `src/app/api/cron/workers/*` (e.g.
  `sms-dispatch`, `whatsapp-dispatch`, `email-queue`) — established queue-worker
  structure Task 68 could plug into rather than hand-rolling.

### 1.5 Reuse opportunities already in the codebase

| Capability | Where | Reusable for |
|---|---|---|
| Google Calendar OAuth (calendar scopes) | `src/app/api/auth/google/route.ts` + `/callback` → writes `platform_connections` `google_calendar`. Uses `GOOGLE_CLIENT_ID`/`_SECRET`, scopes `calendar.events calendar.readonly`. **Distinct code path from Supabase-auth Google login** (`/auth/callback`, see `auth-methods-oauth-build.md`) — different callback URL, different purpose. ⚠️ likely shares the same `GOOGLE_CLIENT_ID` env var; confirm both redirect URIs are registered and don't collide. | Task 62 (Google connect), Task 70 (Meet) |
| Real Google Meet link creation | `lib/calendar/googleMeet.ts: createGoogleMeetLink` — real `calendar/v3` insert w/ `conferenceData`. Reads `platform_connections` `google_calendar`. | Task 63, Task 70 |
| Microsoft OAuth **callback** | `src/app/api/auth/microsoft/callback/route.ts` → writes `platform_connections` `outlook_calendar`. **No initiation route** (`/api/auth/microsoft` does not exist), and UI says "coming soon". | Task 62 (Outlook), Task 66 (Exchange) |
| External free/busy + outbound push | `lib/calendar/calendarSync.ts` (`getExternalBusySlots`, `syncBookingToExternal`, `refreshUserCalendarToken`) — real Google `freeBusy` + Outlook `getSchedule` + event push. Reads `user_calendar_connections` (**empty table**). `public.ts` already calls `syncBookingToExternal` on every free booking (currently a no-op). | Task 62, Task 66 |
| Twilio SMS/WhatsApp send | `lib/sms.ts: sendSMS`, `lib/twilio/resolveWorkspaceTwilioCredentials`, `/api/cron/workers/whatsapp-dispatch`, `whatsapp_broadcast.ts` | Task 68 |
| Email send | `lib/email.ts: sendEmail` (Resend). Already used by `notifications.ts` + reminders cron. | Task 65 |
| Event-triggered notification pattern | `lib/calendar/notifications.ts` (booker + host, best-effort try/catch, calendar-timezone formatting, manage-token link). HR's `sendHRNotification` is the structural reference. | Task 65, 67, 68 |
| HMAC capability token | `lib/calendar/manageToken.ts` (mirrors `shipmentToken.ts`/`unsubscribeToken.ts`) | Task 65 (guest links) |
| Cron auth + worker queue | `Bearer CRON_SECRET` check, `cron/workers/*` | Task 67, 68 |
| Load-shedding / holiday / override gating | already in `scheduling.ts` | Task 69 (recurring must respect it per-occurrence) |

---

## Step 2 / Step 3 — Task-by-task findings

### Task 62 — Real Google Calendar & Outlook "Connect" — **PARTIALLY BUILT (Google) / DEAD-MISLEADING (Outlook)**

**Google:**
- UI entry: Settings → Integrations Hub (`integrations-hub/page.tsx:116`,
  status `available`) → `ConnectProviderModal` → for a provider name containing
  "google", `window.location.href = '/api/auth/google'`
  (`ConnectProviderModal.tsx:117-119`).
- `/api/auth/google/route.ts` → real Google consent screen (offline, calendar
  scopes). `/callback` → real token exchange → upsert into
  **`platform_connections`** (`platform: 'google_calendar'`).
- `googleMeet.ts: createGoogleMeetLink` reads exactly this row → real.
- **BUT:** `calendarSync.ts` (busy-slot import + booking push-out) reads
  **`user_calendar_connections`**, a *different* table this flow never writes.
  So connecting Google Calendar today gets you real Meet-link creation but
  **no availability sync and no outbound event push** — `syncBookingToExternal`
  finds no connection and returns `false` every time.
- No token-refresh wiring for the `platform_connections` copy either
  (`googleMeet.ts` refreshes inline per-call; fine for Meet, not for sync).
- No disconnect/status UI in the calendar module itself.

**Outlook:**
- Same Integrations Hub card, status `available` (`:118`).
- `ConnectProviderModal` has **no `google` match → falls to
  `setOauthWarning('OAuth connection for … is coming soon')`**
  (`ConnectProviderModal.tsx:121`). Button is decorative.
- `/api/auth/microsoft/callback/route.ts` exists and is real, but there is
  **no `/api/auth/microsoft` initiation route** to send the user to Microsoft.
  Callback is unreachable.
- Verdict: **dead/misleading** — shows "available", does nothing.

**Reuse:** the Google connect flow is genuinely usable as the Task 70 Meet
foundation. For Outlook, only the callback half exists — treat as a from-scratch
initiation + table-alignment job.

**Cross-cutting bug to fix in this task:** pick ONE token store. Recommend
consolidating `googleMeet.ts` + `calendarSync.ts` + both OAuth callbacks onto a
single table (`platform_connections` is workspace-scoped and already half-wired;
`user_calendar_connections` is user-scoped, which is what per-host free/busy
actually needs — this is a real design decision, not a rename).

---

### Task 63 — Fix fake video-meeting link generation — **PARTIALLY BUILT (confirmed fake, precise nature below)**

`appointments.ts: createAppointment` (internal booking), step 4
(`:87-98`):
- `meeting_mode === 'google_meet'` →
  `` `https://meet.google.com/${rand}-${rand}-${rand}` `` — **pure fake string,
  not a real room.** Note it does **not** call `createGoogleMeetLink` here.
- `meeting_mode === 'zoom'` → checks `platform_connections` `zoom`; if present
  → literal `'https://zoom.us/j/real_oauth_meeting_link_pending'` (a
  placeholder string that was never finished); if absent (**always**, since no
  Zoom OAuth route exists) → `` `https://zoom.us/j/${randomInt}` `` — **fake.**
- `meeting_mode === 'internal_meet'` (step 7, `:137-149`) → **does** call
  `createGoogleMeetLink` (real), falling back to `/meet/${id}` (real internal
  room). So the *internal* option is real; the two branded options are fake.

`public.ts: bookAppointment` (`:152-166`): only generates a link for
`internal_meet` or empty `custom_link` (→ `/meet/${id}`). **For a `google_meet`
or `zoom` calendar booked publicly, `meeting_link` is left `null` entirely** —
no link at all reaches the booker.

`createInstantMeeting` — real (`createGoogleMeetLink` → `/meet/${id}` fallback).

**Relationship to Task 70:** a proper fix for `google_meet` mode = call the
existing real `createGoogleMeetLink` (needs Task 62 Google connect). `zoom` /
`teams` modes genuinely require Task 70's new OAuth integrations — there is no
smaller local fix for those two. A useful *interim* fix independent of Task 70:
for any calendar whose provider isn't actually connected, fall back to
`internal_meet` / `/meet/[id]` instead of emitting a fake URL, and fix the
public-path `null` link. Scope 63 and 70 together for Meet; 63 can ship the
"stop emitting fakes" safety fix now.

---

### Task 64 — Connect the Round Robin booking algorithm — **DEAD/MISLEADING (algorithm real, cannot run in production)**

- The algorithm is real and **is wired**: `scheduling.ts: getRoundRobinAssignee`
  (`:182-199`) — `ORDER BY booking_count ASC, last_assigned_at ASC NULLS FIRST`,
  lowest-load-first. Called from `public.ts:111` and `appointments.ts:83`;
  `updateRoundRobinStats` runs afterward. This much matches `docs/calendar.md`.
- **The gap: nothing ever populates `round_robin_assignment`.** Grep of every
  `.from('round_robin_assignment')` call — 5 hits, all `select` or the stats
  `update`, **zero `insert`/`upsert`**.
- The UI that would do it, `src/components/calendar/settings/RoundRobinSettings.tsx`
  (member picker + weight sliders, `onSave` callback), is **orphaned — never
  imported anywhere.** `CalendarSettingsModal.tsx` has no team-assignment step;
  `CalendarClient.tsx` renders no per-calendar settings panel.
- Net effect: create a `round_robin` calendar → `getRoundRobinAssignee` throws
  `'No team members assigned…'` → `public.ts` catches and silently falls back to
  "assign to workspace" (`user_id = null`); `appointments.ts` lets the throw
  bubble to a failed booking.
- Verdict: the "connect" in the task name is real but points at the wrong layer
  — the algorithm is connected; the **enrolment UI + write action** is what's
  missing (plus `weight` is stored but the live algorithm ignores it).

---

### Task 65 — Booking-confirmation emails + self-service cancel/reschedule — **MOSTLY BUILT (post-dates `docs/calendar.md`'s "flagged, not fixed")**

**Confirmation emails: REAL now.** `lib/calendar/notifications.ts`
(`sendBookingConfirmation`) sends to booker + resolved host, real booking data,
calendar-timezone-stamped, includes meeting link + manage-token URL. Wired into
`public.ts: bookAppointment` (`:192`), `appointments.ts: createAppointment`
(`:156`), and (per `docs/calendar.md` follow-up) the PayFast webhook and
`portalBookings.ts`. Best-effort try/catch — a send failure never fails the
booking.
- Caveat (from `docs/calendar.md`): `RESEND_API_KEY` was a placeholder in that
  environment → **actual delivery never verified live.** Still owed.
- No in-app `notifications` row is written — email only.

**Self-service cancel/reschedule: REAL now.** `src/app/book/manage/[token]/`
+ `src/app/actions/calendar/manage.ts` + `lib/calendar/manageToken.ts`
(HMAC `${appointmentId}.${hmac}`, same pattern as `shipmentToken.ts`).
`resolveVerifiedAppointment` re-verifies the signature **and** reloads live
state on every action call (not just page render), rejects past/cancelled
appointments, enforces `cancellation_window_hours`, reuses `getAvailableSlots` /
`validateSlot` for reschedule, sends notices via `notifications.ts`.
- Second, older self-service surface also exists: `portalBookings.ts`
  (authenticated client-portal, `src/components/portal/BookingsClient.tsx`).
- Verdict: **built and structurally sound; needs live QA** (email delivery,
  the actual page flow, token-swap boundary) — none done.

**Still genuinely missing in this area:** waitlist *acceptance* — no code sets
`booking_waitlists.confirmed = true` or turns an accepted offer into a booking.
The DB trigger `fn_handle_cancellation_promotion` only sets `offered_at` /
`offer_expires_at`, and (per `docs/calendar.md` follow-up correction) fires on a
**decrease in `current_attendee_count`**, not on `status`.

---

### Task 66 — Apple Calendar / Exchange sync — **ENTIRELY ABSENT**

No CalDAV, no `.ics` subscription feed, no Exchange/EWS, no Apple anything.
`user_calendar_connections.provider` CHECK is `('google','outlook')` only.
The one partial thing in the neighbourhood: `calendarSync.ts`'s Outlook branch
already speaks Microsoft Graph — an Exchange-Online tenant would ride on the
same Graph code once Task 62's Outlook connect exists. Apple = greenfield
(easiest path is a read-only signed `.ics` feed URL per calendar + inbound
CalDAV later).

---

### Task 67 — Scheduled pre-meeting reminders — **PARTIALLY BUILT (reminders real; "pre-meeting brief" not scheduled)**

- **Appointment reminders: REAL and live.** `/api/cron/reminders` is in
  `vercel.json` (hourly), sends 24h + 1h email + SMS, idempotent via
  `reminder_24h_sent` / `reminder_1h_sent`. This substantially covers the task.
- Gaps: only two fixed offsets (24h, 1h), not configurable per calendar; the
  hourly cron with a ±15-min window means an appointment can be missed if
  timing lands wrong; no WhatsApp (Task 68); `meeting_link` shows `"TBD"` when
  null (common for Meet/Zoom calendars per Task 63).
- **Pre-meeting AI brief (`/api/cron/pre-meeting-brief`): built but NOT
  scheduled** — absent from `vercel.json`. Add one line to wire it, or fold it
  into the reminders cron.
- **Reuse:** the cron infra, `CRON_SECRET` auth, and `notifications.ts` are all
  in place. No new scheduling infrastructure needed — extend the existing cron.

---

### Task 68 — SMS / WhatsApp appointment reminders — **PARTIALLY BUILT (SMS real, WhatsApp absent)**

- **SMS: REAL** — `/api/cron/reminders` already sends SMS via `lib/sms.ts:
  sendSMS` + per-workspace Twilio creds (`resolveWorkspaceTwilioCredentials`,
  `workspace.twilio_number`). Silently skips if Twilio unconfigured.
- `lib/calendar/sms.ts: sendCalendarSMS` — a second, standalone Twilio-REST
  implementation — is an **orphan (zero callers).** Dead code; don't build on
  it, delete it or converge on `lib/sms.ts`.
- **WhatsApp: absent from the calendar path.** Infra exists elsewhere
  (`/api/cron/workers/whatsapp-dispatch`, `whatsapp_broadcast.ts`,
  `voiceNoteWhatsApp.ts`) — Task 68's WhatsApp half should reuse that dispatch
  worker, not the calendar `sms.ts`.
- No per-contact channel preference (SMS vs WhatsApp vs email) anywhere.

---

### Task 69 — Recurring / repeating meetings — **DEAD STUB / EFFECTIVELY ABSENT**

- `lib/calendar/recurring.ts` exists: `RecurrenceRule` type
  (`daily|weekly|monthly` + `interval` + `occurrences`) and
  `generateRecurringSlots()`. It is **imported by `public.ts` (`:8`) and never
  called** anywhere in that file. No other importer.
- **No schema:** no `recurrence_rule` / `rrule` column on `appointments` or
  `booking_calendars`, no `recurring_series` table, no parent/child linkage.
  Confirmed by full migration grep.
- **No UI:** neither `BookingModal.tsx` nor `CalendarSettingsModal.tsx` nor the
  public `BookingFlow.tsx` has any recurrence input.
- Verdict: a single helper function with a naive fixed-count model (no RRULE, no
  UNTIL, no exception dates, no per-occurrence availability check). Treat as a
  from-scratch build; the helper is a starting sketch at best.

---

### Task 70 — Real Zoom / Google Meet / Teams video integration — **PARTIALLY BUILT (Meet) / ABSENT (Zoom, Teams)**

| Provider | State |
|---|---|
| **Google Meet** | `createGoogleMeetLink` is a **real** `calendar/v3` conference-create call. Depends on Task 62's Google connect (`platform_connections` `google_calendar`). Currently only invoked on `internal_meet` mode (not `google_meet` mode — see Task 63). Closest to done. |
| **Zoom** | **Absent.** No OAuth route, no API client. `appointments.ts:90-93` checks `platform_connections` `zoom` and would emit `'…real_oauth_meeting_link_pending'` — a literal unfinished placeholder. From-scratch: Zoom OAuth (S2S or user), `POST /users/me/meetings`. |
| **Teams** | **Absent.** No code references Teams at all. Would ride on Task 62 Microsoft/Graph OAuth (`onlineMeeting` / `POST /me/onlineMeetings`), which itself only has a callback stub. |

**Meta/Twilio Voice credential context (from prompt):** not relevant to
Zoom/Meet/Teams — those are separate OAuth apps. The internal `/meet/[id]`
Jitsi-style room is the existing fallback and works.

**Cross-reference:** Task 63 + Task 70 must be scoped together for Meet/Zoom.
Order: Task 62 (connect) → Task 70 (real link creation per provider) → Task 63
collapses into "call the real thing, stop emitting fakes".

---

### Task 71 — Room / desk / equipment booking — **ENTIRELY ABSENT**

- No `resources` / `meeting_rooms` / `desks` / `equipment` table. No
  `resource_id` on `appointments`. Confirmed by full migration grep.
- The only trace: a **commented-out block** in
  `scheduling.ts: diagnoseSlotUnavailable` (`:40-50`) sketching a
  `requestedResourceId` conflict check against `appointments.resource_id`, with
  a `// (Task 71)` marker. Dead scaffold — a note-to-self, not a starting point.
- This is a distinct data model from person-to-person scheduling (bookable
  inventory with capacity/location/type, double-booking prevention per
  resource). Greenfield build; the slot-conflict *logic shape* in
  `getAvailableSlots` is reusable, the schema is not there.

---

## Consolidated: the real data model today (one-paragraph version)

`booking_calendars` (the "engine") ← 1:N → `appointments`. Availability is
`booking_calendars.availability` JSON (day-of-week → slots) with a hardcoded
Mon–Fri 09:00–17:00 fallback; `host_availability_profiles` and
`meet_date_overrides` refine it **but are only ever read** (no write UI).
Round-robin uses `round_robin_assignment` (**never populated**). Paid bookings
lease via `booking_leases` → PayFast → webhook. Waitlists via `booking_waitlists`
+ a DB trigger that only offers, never confirms. External calendar tokens have
**two rival tables** (`platform_connections` = workspace/Google-only-wired,
`user_calendar_connections` = per-user/never-written). Meeting telemetry
(`meet_*` tables) is real and wired to `/meet/[id]`. Reminders ride
`appointments.reminder_*_sent` + the hourly `/api/cron/reminders`. No recurrence,
resource, or Apple/Exchange schema exists.

## `docs/calendar.md` accuracy

| Claim | Status |
|---|---|
| A1/A2 empty-state + dropdown root cause & fix | ✅ still accurate (`CalendarClient.tsx:47,120,180` show the lifted modal + `onCreateClick`) |
| `getAvailableSlots` is "one function, two callers, not two implementations" | ⚠️ **stale** — now three callers (adds `manage.ts`), and it omits the **separate dead `lib/calendar/availability.ts` engine** entirely |
| `round-robin.ts: getNextHost` is dead code, "not removed in this pass" | ⚠️ **stale (good)** — the file has since been **deleted** |
| Live RR path = `scheduling.ts: getRoundRobinAssignee` | ✅ accurate — but doc never flags that **`round_robin_assignment` is never populated** (Task 64) |
| Booking confirmation "flagged, not fixed" | ⚠️ **superseded** — the doc's own "Follow-Up Pass" section then fixes it (`notifications.ts`). Top-of-doc `**Update:**` says so; the mid-doc "Flagged, Not Fixed" bullets are struck through. |
| Self-service cancel/reschedule absent | ⚠️ **superseded** — `manage.ts` + `/book/manage/[token]` now exist (same follow-up pass) |
| `calendar.ts` waitlist weak-auth | ✅ still partly true — waitlist fns hardened (`executeSecureAction`), `updateAppointmentStatus`/`createOutcome`/`saveIntakeForm`/`getComprehensiveCalendarAnalytics` still weak |
| `zonedTimeToUtc` latent server-TZ bug | ✅ still present (`scheduling.ts` still calls it), still unfixed |
| PayFast RLS policy "never gates real bookings" (admin client) | ✅ still accurate |
| Dashboard "Upcoming Meetings" now live / "Task Agenda" narrow-by-design | ✅ accurate |

The doc **does not mention at all**: Tasks 62/66/67/68/69/70/71 subject matter,
`calendarSync.ts`, `googleMeet.ts`, `recurring.ts`, `sms.ts`, the reminders
cron, the two-token-store split, the orphaned settings components
(`RoundRobinSettings`, `IntakeFormBuilder`, `OutcomeManager`, `CreditPackageEditor`),
or the never-written `host_availability_profiles` / `meet_date_overrides` /
`round_robin_assignment`. It was scoped to the two dashboard bugs + booking-flow
trace, not a Milestone-3 feature audit — accurate within its scope, silent
outside it.

## Category summary

| Task | Category |
|---|---|
| 62 Google/Outlook connect | **Partial** (Google real but sync-orphaned) / **Dead-misleading** (Outlook "available", does nothing) |
| 63 fake meeting links | **Partial** — `google_meet`/`zoom` modes emit fake strings; `internal_meet` real; public path emits `null` |
| 64 round-robin | **Dead/misleading** — algorithm wired, `round_robin_assignment` never populated, enrolment UI orphaned |
| 65 confirmations + self-service | **Mostly real** (built since `calendar.md`) — needs live QA; waitlist-accept still missing |
| 66 Apple/Exchange | **Entirely absent** |
| 67 pre-meeting reminders | **Partial** — reminder cron real+scheduled; AI brief built but unscheduled |
| 68 SMS/WhatsApp reminders | **Partial** — SMS real; WhatsApp absent; `calendar/sms.ts` orphan |
| 69 recurring meetings | **Dead stub** — one uncalled helper, no schema, no UI |
| 70 Zoom/Meet/Teams | **Partial** (Meet) / **Absent** (Zoom, Teams) |
| 71 rooms/desks | **Entirely absent** — commented-out scaffold only |

## Suggested build order (dependency-driven — suggestion, not a plan)

1. **Task 62 first, and decide the token-store model** (`platform_connections`
   vs `user_calendar_connections`). Everything external hangs off this. Deliver
   Google connect end-to-end (align the table `googleMeet.ts` + `calendarSync.ts`
   read) and build the missing Outlook initiation route.
2. **Task 64** — small and self-contained: wire `RoundRobinSettings.tsx` +
   a `round_robin_assignment` write action into a per-calendar settings panel.
   Unblocks real team scheduling; no external deps. (Also add the missing
   host-availability / date-override write UI while in that panel — same gap.)
3. **Task 70 + Task 63 together** — real Meet link on `google_meet` mode (rides
   on #1), then Zoom OAuth + API, then Teams (rides on #1's Microsoft half).
   Fold 63 in: stop emitting fake URLs, fix the public-path `null` link.
4. **Task 67 + 68** — extend the existing `/api/cron/reminders` (schedule the
   AI brief; add per-calendar offset config; add WhatsApp via the
   `whatsapp-dispatch` worker). Reuse `notifications.ts`.
5. **Task 65 remainder** — live-QA the confirmation/manage flow; build
   waitlist-offer acceptance (`confirmed = true` → real booking).
6. **Task 69** — recurring: new schema (`appointments.recurrence_rule` +
   series linkage), per-occurrence availability check (reuse `getAvailableSlots`),
   UI in `BookingModal` / `CalendarSettingsModal`. Independent of externals.
7. **Task 66** — Apple (`.ics` feed) + Exchange (rides on #1's Graph code).
8. **Task 71** — rooms/desks: new `resources` schema + resource-conflict gate
   (reuse the commented sketch in `scheduling.ts`) + booking UI. Fully
   independent; can slot anywhere after #2.

### Cleanup worth folding into the above (dead/misleading code)
- Delete `src/app/actions/calendar/round-robin.ts` references in `docs/calendar.md` (file already gone).
- Delete or converge `lib/calendar/sms.ts` (orphan) and `lib/calendar/availability.ts` (orphan engine).
- Remove the unused `generateRecurringSlots` import in `public.ts` (or use it in Task 69).
- Resolve `src/app/calendar/CalendarClient.tsx` vs `src/components/calendar/CalendarClient.tsx` duplication.
- The `'https://zoom.us/j/real_oauth_meeting_link_pending'` placeholder string in `appointments.ts`.
