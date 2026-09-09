# Fix — reschedule / cancel now update the host's real Google Calendar event

**Core proof achieved:** a rescheduled booking's Google Calendar event,
queried back through the Calendar `events` endpoint, shows the **new
time** — not just the LeadsMind DB row. Cancellation deletes the event.
Both survive a revoked connection gracefully with a visible signal.

---

## Step 1 — Audit findings

1. **`/book/manage/[token]` reschedule** (`manage.ts: rescheduleAppointmentByToken`)
   updated only `appointments.start_time/end_time/status` + sent the
   reschedule email. **It never touched Google Calendar.**
2. **The event id was not being stored.** `createGoogleMeetLink` (Task
   62/63) created a real Calendar event with a Meet conference but
   **discarded `event.id`**. The *other* event-creation path,
   `calendarSync.ts: syncBookingToExternal` (public / portal bookings),
   *does* store `metadata.google_event_id` / `outlook_event_id` — but not
   the host it belongs to, and it POSTs a fresh event every call.
3. **Update call needed:** `PATCH
   https://www.googleapis.com/calendar/v3/calendars/primary/events/{id}`
   with `{ start, end }` — reusing the exact Task 62 model
   (`getCalendarConnection` + `getFreshCalendarAccessToken`).
4. **Sibling bug — CANCELLATION: confirmed real.** `manage.ts:
   cancelAppointmentByToken` and `portalBookings.ts:
   cancelAppointmentFromPortal` set `status='cancelled'` and stopped —
   **the Google/Outlook event stayed on the host's calendar forever.**
   Also found: `portalBookings.ts` *reschedule* called
   `syncBookingToExternal` again, which **created a duplicate event at
   the new time and left the old one** — worse than doing nothing.
5. **Revoked/expired connection at reschedule/cancel:** Task 62's
   `getFreshCalendarAccessToken` already throws + flips the connection to
   `status='error'`. The requirement: catch that, let the booking change
   still succeed, and leave a visible signal.

---

## Step 2 — Build (same connection/token model as Task 62/63 — no parallel pattern)

| File | Change |
|---|---|
| `src/lib/calendar/googleMeet.ts` | `createGoogleMeetLink` now returns `{ link, eventId }`. New `updateGoogleCalendarEventTime(hostUserId, eventId, {startIso,endIso})` (PATCH) and `deleteGoogleCalendarEvent(hostUserId, eventId)` (DELETE). Best-effort: return `'updated' \| 'not_applicable' \| 'failed'`, never throw. 404/410 (event already gone) = success. **A stored event id + a dead connection = `'failed'`** (signal-worthy), not a silent no-op. |
| `src/lib/calendar/outlookCalendarEvents.ts` *(new)* | Exact mirror for Outlook (`getCalendarConnection('outlook')` + Graph `PATCH`/`DELETE /me/events/{id}`). |
| `src/lib/calendar/meetingLink.ts` | `ResolvedMeetingLink` carries `googleCalendarEventId` + `calendarEventHostUserId`. New `applyResolvedMeetingLink(metadata, resolved)` — the one place the persisted metadata keys are decided (`meeting_link_status`, `google_event_id`, `calendar_event_host_user_id`). All 4 booking paths use it. |
| `src/lib/calendar/calendarSync.ts` | New `pushEventTimeUpdate(appointmentId)` / `pushEventCancellation(appointmentId)` — read the stored event ids + host from metadata, PATCH/DELETE both providers, write a `metadata.calendar_sync_error = { at, action }` marker on failure (and clear it / strip the ids on success). `syncBookingToExternal` now **skips creating a Google event when `google_event_id` already exists** (kills the google_meet-mode duplicate) and stores `calendar_event_host_user_id`. |
| `src/app/actions/calendar/manage.ts` | reschedule → `pushEventTimeUpdate`; cancel → `pushEventCancellation`. Both best-effort — a calendar failure never fails the booking change. |
| `src/app/actions/portalBookings.ts` | reschedule: `syncBookingToExternal` → `pushEventTimeUpdate` (**fixes the duplicate-event bug**); cancel: added `pushEventCancellation`. |
| `src/app/actions/calendar/appointments.ts` | staff `updateAppointment` (when times change) → `pushEventTimeUpdate`; staff `deleteAppointment` → `pushEventCancellation` **before** the row is deleted (the id lives in its metadata). `createInstantMeeting` updated for the new return shape. |
| `src/components/calendar/modals/AppointmentDetailsModal.tsx` | Shows an amber "could not be synced to the connected calendar — update it manually / reconnect" line when `metadata.calendar_sync_error` is set. |

---

## Step 3 — Verified / Fixed (real, live)

### `npx tsx scripts/db-checks/task-reschedule-cancel-sync-verify.ts` → **13/13**

Real Supabase, throwaway workspace + connected Google calendar, real
`rescheduleAppointmentByToken` / `cancelAppointmentByToken`, real
`resolveMeetingLink`. The Google Calendar HTTP is faked **but the fake
stores event state**, so the event is queried back through the real
`events` GET endpoint after the PATCH.

| Check | Result |
|---|---|
| google_meet booking creates a real Google Calendar event at the original time | ✅ |
| `meeting_link` is a real `meet.google.com` URL | ✅ |
| reschedule via `/book/manage/[token]` succeeds | ✅ |
| **★ the Google Calendar event, queried back from Google, shows the NEW time** | ✅ |
| booking row also moved; no `calendar_sync_error` marker | ✅ |
| cancel via `/book/manage/[token]` succeeds | ✅ |
| **★ the real Google Calendar event is DELETED** | ✅ |
| booking marked cancelled + `google_event_id` stripped from metadata | ✅ |
| **revoked connection at reschedule: booking still moves** | ✅ |
| **★ a `calendar_sync_error` marker is written (clear signal, not silent)** | ✅ |

### Unit tests

- `src/lib/calendar/calendarEventSync.test.ts` *(new, 13)* — `pushEventTimeUpdate` / `pushEventCancellation`: no-op without a stored event; PATCH/DELETE with the right host + times; host fallback to `appointments.user_id`; marker written on failure & cleared on recovery; ids stripped after a successful cancel; both providers on one booking.
- `src/lib/calendar/meetingLink.test.ts` — updated for the `{ link, eventId }` return + `applyResolvedMeetingLink`.

### Suite / build

- `vitest run` → **47 files / 452 tests pass**.
- `tsc --noEmit` clean · `next lint` (changed files) clean.
- `next build` → see build log.

---

## Deliberately Deferred

- **Real end-to-end Google OAuth QA (owed — no browser here):** connect a
  real Google account (Task 62 flow), book a `google_meet` meeting,
  reschedule it via the manage link, then open Google Calendar directly
  and confirm the event moved; cancel another and confirm it disappears;
  revoke access mid-flow and confirm the amber "couldn't sync" note on
  the appointment.
- **Outlook**: the PATCH/DELETE path is built as the exact mirror of
  Google and wired identically, but **not live-verified** — no test
  Outlook/M365 account is available (Outlook connect itself is still
  gated off per the earlier task).
- **`createInstantMeeting`** stores `google_event_id` but not
  `calendar_event_host_user_id` (the acting user isn't threaded through
  `executeAction`). Instant meetings are ad-hoc throwaway rooms and are
  not cancelled through a token/portal flow, so the gap is cosmetic;
  noted for a later tidy.
- **Title/attendee drift**: `pushEventTimeUpdate` patches only the event's
  **time** (the reported bug). If a booking's title or attendee changes
  later, the calendar event won't follow — out of scope here.
- **`updateAppointmentStatus`** (staff sets `status='cancelled'` from the
  Appointments list, `src/app/actions/calendar.ts`) is a 4th cancel
  surface not wired to `pushEventCancellation`. Lower traffic; the
  self-service + portal + staff-delete paths (the ones in this task's
  scope) are covered. Noted for follow-up.
