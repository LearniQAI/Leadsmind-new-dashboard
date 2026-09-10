# Per-Attendee Class-Session Records — Step 1 audit + migration (needs applying)

**Migration written: `supabase/migrations/20260910000000_class_session_attendee_records.sql`.
Per project discipline it must be applied + verified before the dependent
code lands. Once it's on the DB, I'll build Step 2/3.**

---

## Step 1 — Audit findings

### 1. `fn_secure_booking_or_waitlist` "booked" mode today
`SELECT … FOR UPDATE` the session → if `current_attendee_count < max_attendees`:
`UPDATE appointments SET current_attendee_count = current_attendee_count + 1`
→ `RETURN {mode:'booked', appointment}`. A code comment literally says
*"Create attendee record (if we had an attendees table…) — for simplicity in
this demo, we'll return a success status."* **No per-attendee row is created.**
Waitlist mode does insert a `booking_waitlists` row (with `position`).

### 2. Data-model decision → **extend `booking_waitlists`** (not a new table)

`booking_waitlists` is already "one contact's relationship to one group
session": `UNIQUE(appointment_id, contact_id)`, a `confirmed` flag, FKs to
`appointments` + `contacts`. The Task 65 accept flow **already** turns a
waitlist row into `confirmed = true` — that is exactly a per-attendee record.
Every queue query filters `confirmed = false`, so confirmed rows are already
excluded from offer/advance/cron.

A separate `class_session_attendees` table would duplicate the same two FKs
and the uniqueness constraint, and force every waitlist read to UNION two
tables. Extending is the *clearer* model here, not just the smaller one — one
row, one lifecycle:

| state | `confirmed` | `position` | `cancelled_at` |
|---|---|---|---|
| on the waitlist | false | set | null |
| holds a spot | true | null | null |
| cancelled their spot | (either) | — | set |

Migration adds: `position` → nullable, `booked_at TIMESTAMPTZ`,
`cancelled_at TIMESTAMPTZ`, a partial index for "active confirmed attendees
of a session", a `booked_at` backfill for rows Task 65 already confirmed, and
the updated function (booked mode upserts the row + returns `attendee_id`;
idempotent for someone who already holds a spot).

### 3. Manage token → **`waitlistToken.ts` already scopes to the record**

`manageToken.ts` = HMAC over `appointmentId` — wrong for a class session
(N attendees share one appointment). `waitlistToken.ts` = HMAC over
`waitlist:${booking_waitlists.id}` — **already scopes to the exact
per-attendee record.** The Task 65 offer/accept page `/book/waitlist/[token]`
uses it. Plan: extend that same page + `waitlistAccept.ts` to also serve a
**confirmed** attendee (show their booking + a "cancel my spot" button),
using the identical token. New booked-confirmation emails link there with
each attendee's own token. No new token scheme, no new route required.

### 4. Portal visibility

`src/app/(portal)/portal/bookings/page.tsx`:
`.from('appointments').select('*, calendar:…').eq('contact_id', contact.id)`.
Only the session's `contact_id` (first booker) matches. Fix: also fetch
appointments where the contact has an **active confirmed** `booking_waitlists`
row (`confirmed = true AND cancelled_at IS NULL`), and pass a per-attendee
manage token alongside each so `BookingsClient` can offer cancel/reschedule
on the attendee's own record rather than the shared session row.

### 5. Cancel semantics — the two operations are NOT distinct today

`manage.ts: cancelAppointmentByToken` on a group session does **both**:
`status='cancelled'` **and** `current_attendee_count -= 1`. Since the token
re-check rejects a `cancelled` status, it can only run once — so "the first
booker cancels" currently nukes the whole session for everyone *and* only
frees one spot (inconsistent).

**Target:**
- **One attendee cancels their own spot** (per-attendee token): mark that
  `booking_waitlists` row `cancelled_at = now()`, `current_attendee_count -= 1`,
  `notifyNewlyOfferedWaitlist(appointmentId)`. **Never** touch
  `appointments.status`. Other attendees unaffected.
- **Cancel the whole session** (host/admin): `appointments.status='cancelled'`,
  mark every active attendee row cancelled, email every attendee, **no**
  waitlist offers (nothing is available).

"Cancel the whole session with attendee notifications" **does not exist as a
distinct operation today** — the staff `deleteAppointment` /
`updateAppointmentStatus('cancelled')` buttons just flip status with no
attendee awareness. **Scope decision:** this task builds the per-attendee
cancel fully (that's its core), and makes the existing staff cancel paths
notify + cancel all attendee records for a group session (a `cancelClassSession`
helper wired into those existing buttons — no new admin UI). A dedicated
"manage session roster" admin screen is a separate follow-up.

### 6. Confirmation emails today

`sendBookingConfirmation` emails `apt.contact` unless `overrideRecipient` is
passed. `bookClassSession` (the recent work) *does* pass `overrideRecipient`
per booker — so each booker gets an email — **but** the manage link in it is
`generateManageToken(apt.id)` (the shared session token). Fix: a new
`NotifyOptions.attendeeRecordId` → the email's manage URL becomes
`/book/waitlist/${generateWaitlistToken(attendeeRecordId)}` (that attendee's
own scoped link).

---

## Step 2/3 plan (after the migration is applied)

1. `waitlist.ts` / new helper: `cancelAttendeeSpot(attendeeRecordId)` +
   `getAttendeeRecord`.
2. `fn_secure_booking_or_waitlist` — done in the migration.
3. `bookClassSession` — use the RPC for the first booker too (so it also gets
   a per-attendee record), thread `attendee_id` into the confirmation email.
4. `notifications.ts` — `attendeeRecordId` option → per-attendee manage URL.
5. `waitlistAccept.ts` + `/book/waitlist/[token]` + `WaitlistAcceptClient` —
   serve the confirmed-attendee "your spot / cancel" state.
6. `acceptWaitlistOffer` — set `booked_at` when confirming.
7. `portal/bookings/page.tsx` + `BookingsClient` — include confirmed-attendee
   sessions with per-attendee tokens; cancel routes through the attendee
   record.
8. Staff cancel (`deleteAppointment`, `updateAppointmentStatus`) →
   `cancelClassSession` for group sessions (notify + cancel all attendee rows).
9. Live: 2 people book one 2-spot session → each gets their own email + link;
   each manages only their own; A cancels → only A's spot frees + waitlist
   offer fires; full Task-65 chain still green.
