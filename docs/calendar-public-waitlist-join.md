# Public Waitlist Join + Waitlist-Enabled Session Creation + Portal Cancel Fix

Completes the group-session/waitlist feature's missing entry points so the
offer→accept→advance loop Task 65 built is usable end-to-end by real
customers and admins — **without** expanding into the broader class-booking
feature.

Core proof — `scripts/db-checks/task-public-waitlist-verify.ts` → **15/15**:
a real visitor, zero admin involvement, lands on a full session's public
page, joins the waitlist, and later receives + accepts a real offer when a
spot opens.

---

## Step 1 — Audit findings

1. **Public booking page** (`/book/[slug]` → `BookingClientWrapper` →
   `BookingFlow`) is entirely 1:1 slot-based: `fetchPublicSlots` →
   `getAvailableSlots` (a slot with any appointment is removed), `bookAppointment`
   creates one 1:1 appointment. No capacity, no session concept — a
   `class_booking` calendar booked publicly today just makes a 1-person
   appointment.
2. **`fn_secure_booking_or_waitlist(p_workspace_id, p_appointment_id, p_contact_id)`**
   — real, already does the hard part atomically: `FOR UPDATE` lock →
   `current_attendee_count < max_attendees` ⇒ increment + `{mode:'booked'}`;
   else `waitlist_enabled` ⇒ insert `booking_waitlists` at `MAX(position)+1`
   + `{mode:'waitlist', position}`; else `{success:false}`. **"booked" mode
   only bumps the counter — no per-attendee record** (a pre-existing model
   limitation, out of scope).
3. **`CalendarSettingsModal`** — react-hook-form + zod, fields
   `name / calendar_type / meeting_mode / location / description / price`.
   `booking_calendars` already has `capacity` + `waitlist_enabled` columns
   (phase25 migration) with no form fields.
4. **`portalBookings.ts` cancel** — sets `status='cancelled'` and stops.
   The `current_attendee_count` decrement for group sessions is **missing
   entirely** (not a bug — never written). `manage.ts`'s
   `cancelAppointmentByToken` has the correct version to copy.
5. **Public join data** — `bookAppointment` collects `firstName, lastName,
   email, phone?, notes?, popiaConsent, answers` via `BookingForm`. The
   waitlist-join reuses the identical form + payload.

---

## Step 2 — Build

### Public waitlist-join (front door on the existing `/book/[slug]`)

| File | Change |
|---|---|
| `scheduling.ts: getAvailableSlots` | **class-aware**: for `calendar_type === 'class_booking'`, a slot with an existing session is NOT removed — it's annotated `{ appointmentId, capacity, spotsLeft, full, waitlistEnabled }`. A full session with no waitlist is hidden; a full session with a waitlist stays as a "join waitlist" slot. Every other calendar type: **unchanged**. |
| `public.ts: bookClassSession(calendarId, slot, leadData)` *(new)* | Upsert contact → POPIA → if no session at that time, create it (`max_attendees = calendar.capacity`, `current_attendee_count = 1`, `waitlist_enabled` from the calendar) + `resolveMeetingLink` + confirmation email. If a session exists → call **`fn_secure_booking_or_waitlist`** (reused, not reimplemented) → `{mode:'booked'}` or `{mode:'waitlist', position}`. |
| `waitlist.ts: sendWaitlistJoinAck` *(new)* | "You're #N on the waitlist — we'll email you if a spot opens" email on public join. |
| `BookingClientWrapper` / `BookingFlow` / `TimeSlotPicker` / `BookingForm` | `isClass` flow: full slots render amber **"Full · Waitlist"**, partial slots show **"N left"**; the submit button becomes **"Join the waitlist"**; the success screen shows **"You're #N on the list…"** for `mode:'waitlist'`. 1:1 flow untouched. |
| `book/[slug]/page.tsx` | Sidebar shows "Group session · Up to N spots · waitlist" for `class_booking`. |

The publicly-joined `booking_waitlists` row is **identical** to an
admin-added one, so Task 65's offer → accept → cron-advance loop picks it
up with no changes.

### Waitlist-enabled session creation UI

- `CalendarSettingsModal`: `capacity` (number) + `waitlist_enabled`
  (checkbox) fields, shown only when Engine Type is **Class/Group**,
  consistent with the existing form (zod schema + `form.reset` + a
  grouped panel).
- `calendars.ts`: `EDITABLE_CALENDAR_FIELDS` += `capacity`,
  `waitlist_enabled`; `pickEditableFields` **strips** them for non-class
  calendars and clamps capacity to `≥ 1`. Persists to the real
  `booking_calendars.capacity` / `.waitlist_enabled` that `bookClassSession`
  + `getAvailableSlots` read.

### Portal group-session cancel fix

- `portalBookings.ts: cancelAppointmentFromPortal` — for a group session
  (`max_attendees > 1`, `current_attendee_count > 0`) the cancel now also
  **decrements `current_attendee_count`** and calls
  `notifyNewlyOfferedWaitlist(appointmentId)` — byte-for-byte the same
  behaviour as `manage.ts`'s already-working path. 1:1 cancels unchanged.

---

## Step 3 — Verified / Fixed (real, live)

### `npx tsx scripts/db-checks/task-public-waitlist-verify.ts` → **15/15**

One real chain, Resend HTTP intercepted so email bodies are asserted:

| Step | Result |
|---|---|
| class calendar (`capacity 2`, `waitlist_enabled true`) — public slot shows **open, 2 spots** | ✅ |
| 2 public bookings via `bookClassSession` → both `mode:'booked'`; session `current_attendee_count == 2` | ✅ |
| **public slot now shows `full: true` + `waitlistEnabled: true`** (the "Join waitlist" state) | ✅ |
| **3rd public visitor joins the waitlist** (`mode:'waitlist'`, `position 1`) — real `booking_waitlists` row created, "you're #1" email sent — **zero admin** | ✅ |
| a spot frees via the portal-cancel-equivalent decrement + `notifyNewlyOfferedWaitlist` → **the publicly-joined person is offered it** (`offered_at` set), exactly like an admin-added entry — real **offer email with `/book/waitlist/<token>` link** | ✅ |
| that person **accepts** → real spot claimed (`current_attendee_count` back to 2), removed from waitlist (`confirmed`), "off the waitlist" confirmation email | ✅ |

### Unit tests

- `portalBookings.cancel.test.ts` *(new, 3)* — group session ⇒ decrement +
  `notifyNewlyOfferedWaitlist`; 1:1 ⇒ neither; empty group session ⇒ safe
  no-op. (Exercises the exact fix — `cancelAppointmentFromPortal` is
  portal-session-gated so it can't be scripted, but the code is identical
  to `manage.ts`'s live-tested version and the downstream is proven above.)

### Suite / build

- `vitest run` → **51 files / 474 tests pass**.
- `tsc --noEmit` clean · `next lint` (changed files) clean.
- `next build` → see build log.

---

## Deliberately Deferred

- **Per-attendee records for group-session "booked" attendees** —
  `fn_secure_booking_or_waitlist`'s "booked" mode only increments the
  counter; there is no row linking a specific booked person to a session.
  So a booked (non-waitlisted) class attendee has no self-service
  cancel/manage link, and the portal only shows a group session to whoever
  is its `contact_id` (the first booker). Fixing this needs a DB-function
  change (attendee table / `booking_waitlists` row with `confirmed=true`
  for booked people) + a migration — the "class booking" feature proper,
  explicitly out of this scope.
- **A UI to schedule multiple sessions from one class calendar** — a
  class calendar's sessions are created on-demand by the first public
  booking at an open slot time (from `getAvailableSlots`). A dedicated
  "add 6 weekly sessions" scheduling UI is class-booking-feature territory.
- **Real end-to-end email delivery** — placeholder `RESEND_API_KEY`; the
  live run intercepts the Resend call and asserts the rendered body.
- **A `class_booking` calendar's `getAvailableSlots` when reached via
  `manage.ts` reschedule** — rescheduling a group-session appointment via
  a manage token is an untested edge; group sessions aren't the manage
  link's primary use.
