# Task 69 — Recurring / repeating meetings

From-scratch build. The prior state was a single uncalled helper
(`lib/calendar/recurring.ts::generateRecurringSlots` — fixed-count, no RRULE,
no UNTIL, no cap, imported once by `public.ts` and never called), no schema,
no UI.

---

## Step 1 — Architecture decisions (resolved before any code)

### Data model — **Option B (materialised), dedicated `recurring_series` table**

One `recurring_series` row holds the **RFC-5545 RRULE** (the source of truth)
plus the settings every occurrence shares; **N real `appointments` rows** (one
per occurrence) are generated eagerly at creation.

*Why not Option A (virtual/computed occurrences):* every calendar subsystem
already built operates on real `appointments` rows —
- the reminder cron (`start_time` window scan) and the AI-brief cron,
- `getAvailableSlots` / `validateSlot` conflict scans,
- the `appointments_no_overlap` GiST EXCLUDE constraint (double-booking defense),
- all five calendar views (they render a flat `appointments` array),
- `getAppointments`, `getMeetingAnalytics`, the waitlist triggers.

A virtual model would require rewriting all of them to synthesise occurrences.
Option B keeps every one of them correct with **zero changes** — an occurrence
*is* an ordinary appointment. Row volume is bounded: a series is capped at
**60 occurrences** (`MAX_OCCURRENCES`), generated up-front, so no rolling
regeneration job is needed (weekly-for-a-year = 52).

**Exceptions** (one occurrence edited/cancelled on its own) = the child row
itself, flagged `is_exception = true`, keeping `original_start_time` so it stays
traceable to the series. No separate exception table.

### External sync — **ONE native recurring event per series**

Google Calendar's API natively accepts `recurrence: ["RRULE:…"]` on a single
event insert, with one `conferenceData` block → **one Meet link shared by every
instance**. Confirmed feasible on the existing Task 62
`user_calendar_connections` + `getFreshCalendarAccessToken` model —
`createGoogleRecurringEvent` is `createGoogleMeetLink` plus a `recurrence` array.
We store **one** `google_recurring_event_id` on the series. Per-occurrence
changes address Google's instance ids (`<eventId>_<UTC-basic-start>`):
PATCH `status: cancelled` for a cancelled occurrence, PATCH `start`/`end` for a
moved one. We emit a real RRULE string and never invent a custom representation.

### Edit-scope semantics (this / this-and-following / entire series)

| Scope | Cancel | Reschedule |
|---|---|---|
| **This event only** | occurrence row → `cancelled` + `is_exception`; Google instance PATCH `status: cancelled` | occurrence row moved + `is_exception`; Google instance PATCH times |
| **This and following** | this + all later scheduled rows → `cancelled`; series RRULE truncated with `UNTIL`; Google recurring event RRULE PATCHed (or DELETEd if nothing remains) | **deferred** — a "following" time-shift means splitting into a sub-series; real calendar apps do it but it's materially larger. Offer "this" or "entire series". |
| **Entire series** | all future scheduled rows → `cancelled`; `recurring_series.status = cancelled`; Google recurring event DELETEd | every future non-exception occurrence shifted by the same delta; `dtstart` moved; Google recurring event anchor PATCHed |

Wired into the **same** helpers the single-meeting flow uses
(`sendCancellationNotice` / `sendRescheduleNotice`, `googleMeet.ts`), not a
parallel mechanism.

### Round-robin (Task 64) — **ONE host for the whole series**

Resolved once at series creation via the existing `getRoundRobinAssignee`
(one increment = one assignment decision for the series, not N). A rotating
host per week is bad UX for a recurring 1:1/standup and would scatter the
Google event across N hosts' calendars. Every occurrence row gets
`user_id = seriesHost`.

### Meeting links (Task 63) — **ONE for the whole series**

Matches Google's native recurring-event behaviour (single conferenceData/Meet
link for all instances). Resolved once; copied to every occurrence's
`meeting_link` + `metadata.meeting_link_status`. `google_meet` with no host
connection falls back to one shared internal `/meet/[firstOccurrenceId]` room
with status `google_meet_pending_connection` (same honest-fallback rule as
Task 63); `zoom` → `null` + `zoom_pending_integration`.

### Reminders (Task 67) — **no change required**

Real occurrence rows are picked up by the existing cron exactly like single
meetings — each occurrence has its own `reminder_1h_sent` / `reminder_24h_sent`
/ `brief_sent`. Verified live, not modified.

### Public booking — **deferred, internal / admin-created only**

A customer self-booking a recurring slot via `/book/[slug]` needs N-date
availability checking with partial-availability UX, N-session payment (PayFast
leases are single-slot), and per-occurrence waitlist interaction — a materially
larger scope, not required to deliver the core feature. The dead
`generateRecurringSlots` import in `public.ts` is removed.

---

## Step 2 — Build

| Artefact | What |
|---|---|
| `supabase/migrations/20260910130000_recurring_meetings.sql` | `recurring_series` table (RLS via `check_workspace_access`) + `appointments.series_id` / `is_exception` / `original_start_time`. **Applied to the linked remote and verified before dependent code.** |
| `src/lib/calendar/recurrence.ts` | RFC-5545: `buildRRule`, `parseRRule`, `expandOccurrences` (hard-capped at 60), `normaliseRecurrence` (validation), `describeRecurrence`. Replaces the deleted `recurring.ts`. **v1 grammar: FREQ DAILY/WEEKLY/MONTHLY + INTERVAL + COUNT or UNTIL.** |
| `src/lib/calendar/googleMeet.ts` | `createGoogleRecurringEvent`, `updateGoogleRecurringEventRule`, `cancelGoogleEventInstance`, `updateGoogleEventInstanceTime`, `googleInstanceId` — same never-throw / getFreshCalendarAccessToken model as the existing functions. |
| `src/lib/calendar/recurringSeries.ts` | The engine — `createRecurringSeriesCore`, `updateRecurringScopeCore`, `getSeriesForAppointmentCore`. Plain module (not `"use server"`) taking an explicit `{ workspaceId, userId }`. |
| `src/app/actions/calendar/recurringMeetings.ts` | Thin `"use server"` wrappers — `requireWorkspaceAccess()` then delegate. (The engine can't be reached from a client except through these.) |
| `src/lib/calendar/notifications.ts` | `sendBookingConfirmation` gains `options.recurrenceSummary` — one line in both booker + host emails. |
| `src/components/calendar/modals/BookingModal.tsx` | "Repeat" section (Does not repeat / Daily / Weekly / Monthly; every-N; ends after N occurrences or on a date) — new meetings only. Submits to `createRecurringSeries` when set. |
| `src/components/calendar/modals/RecurrenceScopeModal.tsx` | The standard "This event / This and following / All events" scope prompt. |
| `src/components/calendar/CalendarClient.tsx` | Cancel/reschedule of an appointment with `series_id` routes through the scope prompt → `updateRecurringScope`; non-series appointments keep the exact existing path (regression-safe). |
| `src/components/calendar/modals/AppointmentDetailsModal.tsx` | "⟳ Recurring" badge (+ "· edited" for an exception). |

---

## Step 3 — Verification (real, live)

`npx tsx scripts/db-checks/task69-verify.ts` → **43/43 passed**. Real Supabase
(throwaway workspace / calendars / round-robin pool / contact), the real engine,
the real reminder cron route. Google Calendar + Resend HTTP are intercepted so
the exact request payloads are asserted (same pattern as Tasks 63 / 65 — a real
OAuth consent screen can't run here).

### Verified / Fixed

**Create (weekly × 4, `google_meet`)**
- 4 real appointment rows, first == `dtstart`, 7 days apart, all linked to the series.
- **Exactly ONE Google Calendar event POST** (not 4), carrying
  `recurrence: ["RRULE:FREQ=WEEKLY;INTERVAL=1;COUNT=4"]` + a Meet `createRequest`.
- **All 4 occurrences share ONE meeting link** = the real
  `meet.google.com/…` link from that one event.
- `recurring_series` row persists the RRULE, `google_recurring_event_id`, count.
- **ONE** confirmation email, containing "Repeats weekly, 4 occurrences".

**Round-robin → one host**
- All occurrences assigned to the **same** host.
- `round_robin_assignment.booking_count` incremented by **exactly 1** for the
  whole 3-occurrence series (not 3).

**Edit / cancel a single occurrence ("this only")**
- Reschedule: only that occurrence moves, flagged `is_exception`; siblings
  untouched; Google gets a PATCH to `…/events/<eventId>_<basicStart>` with a new time.
- Cancel: that occurrence → `cancelled` + `is_exception`; 3 of 4 still
  `scheduled`; Google gets an instance PATCH `status: cancelled`.

**"This and following" cancel**
- Occurrences 4–6 of a 6-daily series → `cancelled`; 1–3 remain; series RRULE
  truncated to `…;UNTIL=…`; Google recurring event PATCHed with the truncated rule.

**"Entire series" cancel**
- All future occurrences → `cancelled`; `recurring_series.status = cancelled`;
  the whole Google recurring event **DELETEd**.

**Reminders regression**
- A recurring occurrence ~1 h out is picked up by the existing hourly reminder
  cron and gets its own "in 1 hour" email — no cron change.

**Fallbacks & non-recurring regression**
- Host with no Google connection → series still created, **no Google POST**,
  honest internal-room fallback (`google_meet_pending_connection`).
- A plain appointment has `series_id = NULL`; `updateRecurringScope` refuses it
  ("not part of a recurring series"); it is left untouched.

**Static / suite**
- `tsc --noEmit` clean (pre-existing stale `.next/types` warnings only).
- `next lint` on all changed files — clean.
- `vitest run src/lib/calendar/` — 95/95 (19 new in `recurrence.test.ts`).
- `next build` — see log.

### Deliberately Deferred

- **Public-facing recurring booking** (customer self-serve on `/book/[slug]`) —
  N-date availability + partial-availability UX + N-session payment + per-occurrence
  waitlist. Materially larger; not needed for the core feature.
- **"This and following" *reschedule*** — a time-shift of "following" is a
  series split into a new sub-series. The scope modal disables it for reschedule
  and points the user at "this occurrence" or "entire series".
- **`BYDAY` / `BYMONTHDAY` / `BYSETPOS`** ("Mon+Wed+Fri", "3rd Tuesday",
  last-weekday-of-month). v1 is FREQ + INTERVAL + COUNT/UNTIL; monthly is
  same-day-of-month. `recurrence.ts` is structured to grow these.
- **Outlook recurring-event sync** — Google is the live-proof provider (as in
  Tasks 63/65). Outlook's recurrence is a structured object, not an RRULE
  string; the single-event PATCH/DELETE mirror already exists in
  `outlookCalendarEvents.ts`, native recurrence there is a follow-up.
- **Real-OAuth Google QA** — HTTP is intercepted here; a browser consent run is
  owed, same standing item as Task 63.
- **DST wall-clock drift** for non-UTC calendars — occurrence arithmetic is on
  the absolute instant (server runs UTC), matching the rest of this module's
  existing date handling. A "9am every week" series across a DST boundary would
  shift by an hour in local time. Noted; needs the same tz-aware treatment
  `getAvailableSlots` uses.
- **Editing series details** (title / meeting mode / recurrence rule of an
  existing series) — only reschedule + cancel by scope are wired. Title/mode
  edits of a whole series are a follow-up.
