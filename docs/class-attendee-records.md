# Per-Attendee Records for Booked Class-Session Attendees

Closes the gap where `fn_secure_booking_or_waitlist`'s "booked" branch only
incremented `appointments.current_attendee_count` and never linked a specific
person to their spot — so only the session's original `contact_id` (the first
booker) could see, manage, or cancel a booking. Every other booked attendee was
invisible to the portal and had no self-service link.

**Core proof — `scripts/db-checks/task-attendee-records-verify.ts` → 28/28:**
two different people book the same 2-spot session, each gets their **own**
confirmation email with their **own** manage link, each link manages **only**
that person's booking; A cancels → only A's record is cancelled, the session is
untouched, one seat frees and goes to the **waitlist** (not "session
cancelled"); the waitlisted person accepts → back to 2/2; the host cancels the
whole session → every remaining attendee notified.

---

## Step 1 — Audit + decisions

See `docs/class-attendee-records-step1.md` (unchanged). Key decisions:

- **Extend `booking_waitlists`, not a new table.** It already models "one
  contact's relationship to one group session" with `UNIQUE(appointment_id,
  contact_id)`, a `confirmed` flag and the right FKs. Task 65's accept flow
  already produced exactly the row we want (`confirmed = true`). One row, one
  lifecycle: `waiting` (confirmed=false, position set) → `holds a spot`
  (confirmed=true, position NULL, `booked_at` set) → `cancelled` (`cancelled_at`
  set).
- **Reuse `waitlistToken.ts`** — it is already HMAC-scoped to
  `booking_waitlists.id`, i.e. the exact per-attendee record. The
  `/book/waitlist/[token]` route becomes the whole-lifecycle page
  (offer → accept → manage/cancel). No new token scheme, no new route.
- **Two distinct cancel operations** (they weren't distinct before):
  *one attendee cancels their own spot* (per-attendee token / portal) vs
  *host cancels the whole session* (staff action). See below.

---

## Step 2 — The migration (applied + verified before any dependent code)

`supabase/migrations/20260910000000_class_session_attendee_records.sql` —
applied to the live DB by the user, then verified live by the agent before the
code below was written (project rule: one migration, applied and verified,
never batched).

- `booking_waitlists.position` → nullable (a booked attendee has no queue slot).
- `+ booked_at TIMESTAMPTZ`, `+ cancelled_at TIMESTAMPTZ`.
- Partial index `idx_booking_waitlists_active_confirmed (appointment_id) WHERE
  confirmed = true AND cancelled_at IS NULL` (portal visibility, session-cancel
  fan-out).
- Backfill `booked_at` for rows Task 65 already confirmed.
- `fn_secure_booking_or_waitlist` rewritten: the "booked" branch now
  `INSERT … ON CONFLICT (appointment_id, contact_id) DO UPDATE` writes the
  per-attendee row **in the same transaction** as the counter increment, and
  returns `attendee_id`. Idempotent — a contact who already holds an active
  confirmed spot returns `mode: 'already_booked'` and is **not** double-counted.

Live verification of the migration alone: RPC "booked" returns `attendee_id`;
re-call returns `already_booked` with the same id and no second increment; row
shape `position:null, confirmed:true, booked_at set, cancelled_at:null`.

---

## Step 3 — Dependent code

| File | Change |
|---|---|
| `src/lib/calendar/waitlist.ts` | New `getAttendeeRecord(id)`, `cancelAttendeeSpot(id, {skipWindow?})` (marks only that row `cancelled_at`, frees one seat guarded `> 0`, `notifyNewlyOfferedWaitlist`, emails that one attendee, **never** touches `appointments.status`), `cancelClassSession(appointmentId)` (host cancel — marks **every** non-cancelled participation row cancelled, emails each, **no** waitlist offers). Queue queries (`advanceWaitlistForAppointment`, `notifyNewlyOfferedWaitlist`, `advanceExpiredWaitlistOffers`) now also filter `cancelled_at IS NULL` and `position IS NOT NULL` so a confirmed/cancelled attendee row can never be mistaken for a queue entry. |
| `src/lib/calendar/notifications.ts` | `NotifyOptions.attendeeRecordId` — when set, the "manage this booking" link in the confirmation email becomes `/book/waitlist/<waitlistToken(recordId)>` (the attendee's own scoped link) instead of the shared session manage token. |
| `src/app/actions/calendar/public.ts` | `bookClassSession`: the **first booker** now goes through `fn_secure_booking_or_waitlist` too (session created with `current_attendee_count: 0`, then the RPC books them) so they get a real per-attendee record like everyone else. `attendee_id` from the RPC is threaded into `sendBookingConfirmation` on every booked path. `already_booked` short-circuits without a duplicate email. |
| `src/app/actions/calendar/waitlistAccept.ts` | `acceptWaitlistOffer` now sets `booked_at` and passes `attendeeRecordId` so a promoted attendee's email links to their own record. New `getAttendeeBooking(token)` (read-only confirmed-attendee view + `cancellable` per the calendar's window) and `cancelAttendeeByToken(token)` → `cancelAttendeeSpot`. |
| `src/app/book/waitlist/[token]/page.tsx` + `src/components/calendar/public/AttendeeManageClient.tsx` *(new)* | The token page first tries `getAttendeeBooking`: a confirmed holder sees "Your spot is confirmed" + session details + meeting link + **Cancel my spot** (or a "cancellations closed" / "session cancelled" state). Otherwise it falls through to the existing offer→accept view. |
| `src/app/(portal)/portal/bookings/page.tsx` | Also loads `booking_waitlists` rows for this contact (`confirmed = true, cancelled_at IS NULL`) and merges those sessions into the list, each annotated `_isGroupAttendee` + a token scoped to the attendee's own record. The first booker appears via the attendee-scoped copy, so their portal cancel also frees only their seat. |
| `src/app/actions/portalBookings.ts` | New `cancelMyClassSpot(appointmentId)` — resolves the caller's own active attendee record, then `cancelAttendeeSpot(record.id)` (window enforcement, seat free, waitlist offer, email all handled there). |
| `src/components/portal/BookingsClient.tsx` | A `_isGroupAttendee` booking cancels via `cancelMyClassSpot` (not `cancelAppointmentFromPortal`), with copy that makes clear the session still runs; Reschedule is hidden for a shared session. |
| `src/app/actions/calendar/appointments.ts` (`updateAppointment` status→cancelled, `deleteAppointment`) + `src/app/actions/calendar.ts` (`updateAppointmentStatus`) | For a group session (`max_attendees > 1`), staff cancel/delete now calls `cancelClassSession(id)` first — every attendee and waitlister is notified and their records marked cancelled, with no waitlist offers. Best-effort; a notify failure never blocks the staff action. |

---

## Verified / Fixed (real, live)

### `npx tsx scripts/db-checks/task-attendee-records-verify.ts` → 28/28

Real DB rows, Resend HTTP intercepted so every email body is asserted:

- 2 different people book the same 2-spot session → **2 per-attendee rows**,
  both `confirmed, position NULL, booked_at set, cancelled_at NULL`.
- Each attendee gets their **own** "Booking confirmed" email; the manage link in
  each resolves to **that attendee's own** `booking_waitlists.id`; the two links
  are different and neither contains the other's id.
- Each token via `getAttendeeBooking` shows only its own booking; the offer
  route (`getWaitlistOffer`) refuses a confirmed attendee's token.
- **A cancels her spot** → only A's row `cancelled_at` set; B's row untouched
  and still confirmed; **`appointments.status` stays `scheduled`**; count 2 → 1;
  A gets a "your spot is cancelled" email; the **waitlisted** person gets a
  "spot opened up" **offer** email (not a "session cancelled" email) and her row
  gets `offered_at`; A's token no longer resolves a live booking.
- The waitlisted person **accepts** → `confirmed = true`, `booked_at` set, count
  back to 2/2.
- **Host cancels the whole session** (`cancelClassSession`) → every remaining
  participation row `cancelled_at` set; B and C both get "Session cancelled"
  emails; A (already cancelled) is **not** re-emailed.

### `npx tsx scripts/db-checks/task-public-waitlist-verify.ts` → 15/15

The full Task-65 / public-waitlist chain still green (the two `booking_waitlists`
reads that assumed one row per session were scoped to `confirmed = false`, since
confirmed attendee rows now share the table — the behaviour under test is
unchanged).

### Suite / types / lint / build

- `vitest run` → **51 files / 474 tests pass** (waitlist.test.ts mock builder
  gained `.is()` + a `cancelled_at` filter to match the new queries).
- `tsc --noEmit` clean · `next lint` (all changed files) clean.
- `next build` → **BUILD EXIT 0**, 242/242 static pages (a first run OOM-crashed
  in static generation — an env heap limit, not a code error; clean on retry
  with `--max-old-space-size=8192`, same as prior calendar tasks).

### Test data

Both verification scripts seed a throwaway auth user + workspace + calendar and
delete every appointment, `booking_waitlists` row, contact, calendar and the
user in a `finally` block. Nothing persists.

---

## Deliberately Deferred

- **A dedicated "manage session roster" admin screen** — staff can cancel a
  whole session (list/detail cancel + delete are now attendee-aware) but there
  is no UI to view the attendee list, remove one attendee, or message them.
  `cancelClassSession` + the per-attendee records are the data foundation for
  it; the screen itself is a separate piece of work.
- **Per-attendee reschedule** — a shared session has one time; "reschedule" for
  one attendee of a class doesn't have coherent semantics (it would be a
  cancel + re-book on another session). Reschedule is hidden for group-session
  attendees in the portal rather than half-implemented.
- **Real end-to-end email delivery** — `RESEND_API_KEY` is still a placeholder;
  the live runs intercept the Resend call and assert the rendered body.
- **Group-session `getAvailableSlots` via a `manage.ts` reschedule token** —
  unchanged from the previous task's deferral; group sessions aren't the manage
  link's primary use.
- **Historic single-booker group sessions created before this migration** —
  their first booker already has a `booking_waitlists` row only if they went
  through Task 65's accept flow; a pure "first public booking created the
  session" row predating this change has the counter but no attendee record for
  the creator. New bookings are correct; a one-off backfill for any such legacy
  rows is not included (there is no evidence any exist on this workspace's
  data — class calendars are new).
