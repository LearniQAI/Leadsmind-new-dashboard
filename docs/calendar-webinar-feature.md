# Webinar — a Real, First-Class Booking Type (Built on the Class/Group-Session Infrastructure)

**The core product decision, stated up front:** Webinar is a genuine **peer**
of Class — its own `calendar_type` value, its own real defaults and copy —
**not** a rename or re-skin of Class. Both flow through the exact same
underlying group-session machinery (capacity cap, atomic booking-or-waitlist,
per-attendee records, cancel semantics, video-conferencing modes), because
that machinery is what actually needs to be correct, and duplicating it for a
second type would only create two places to get it wrong. They coexist as
separate, independently selectable engine types.

---

## Step 1 — Audit + decision

### 1.1 What Class does today (confirmed by reading the real code)

- `booking_calendars.calendar_type` is a CHECK-constrained TEXT column:
  `personal | round_robin | collective | class_booking | service_menu | event`.
  Group-session behavior everywhere in the app keys off the literal string
  `'class_booking'`.
- **Availability** (`scheduling.ts: getAvailableSlots`) — for a class calendar,
  an existing session at a time doesn't remove that slot; it annotates it with
  `{appointmentId, capacity, spotsLeft, full, waitlistEnabled}` so the public
  page can show "N left" or "Full · waitlist".
- **Booking** (`public.ts: bookClassSession`, now `bookGroupSession`) — the
  first booker creates the session row (`max_attendees`, `current_attendee_count`,
  `waitlist_enabled` copied from the calendar), then every booker (including
  the first) goes through the real Postgres function
  `fn_secure_booking_or_waitlist` — an atomic, row-locked capacity check that
  either books them (writing a real per-attendee `booking_waitlists` row) or
  queues them on the waitlist.
- **Per-attendee records** — `booking_waitlists` extended (Task 71's
  predecessor work) so every confirmed attendee has their own row
  (`confirmed=true, position=NULL, booked_at` set), their own manage token,
  and their own cancel action (`cancelAttendeeSpot`) that frees only their
  seat and offers it to the next waitlisted person — never touching the
  session itself. A host can cancel the **whole** session
  (`cancelClassSession`, now `cancelGroupSession`) which cancels every
  attendee row and notifies everyone, with no waitlist offers.
- **Video-conferencing** — `meetingLink.ts` resolves a real Google Meet / Zoom
  / Teams / internal link for the session exactly like a 1:1 booking; the
  session's attendees share one link.
- None of this logic contains the word "class" as a behavioral branch beyond
  the one string comparison `calendar_type === 'class_booking'`, repeated in
  ~14 files. It's genuinely generic group-session machinery.

### 1.2 Decision: Webinar is Class's real peer, not Class relabeled

Considered the three options from the prompt:

- **Pure relabeling** (Webinar = Class with different words) — rejected. The
  prompt explicitly asks for a first-class type, and a webinar really does
  have different real defaults worth encoding (see below), not just different
  words on the same config.
- **Deeper behavioral fork** (view-only attendees, uncapped registration) —
  rejected, and this is the more important call: see §1.3. Building a
  materially different attendee experience (no real participation, just
  watching) or removing the hard capacity cap would require the providers'
  *actual* webinar/broadcast products (Zoom Webinars, Teams live events,
  Meet's streaming add-on) — separately licensed, separate APIs, not what this
  project integrates. Building fake "unlimited" webinar capacity on top of a
  regular meeting link would be exactly the false promise the prompt warned
  against.
- **Chosen: a real, distinct `calendar_type` value, sharing the group-session
  engine.** Real differences:
  - Distinct `calendar_type = 'webinar'` (own CHECK constraint value, own
    filter tab, own selector option) — genuinely selectable and reportable
    as its own engine type, not a Class in disguise.
  - **Different default capacity**: Class defaults to 12 (small,
    participatory), Webinar defaults to 100 (one host, many attendees) —
    applied automatically the moment someone switches a calendar's type,
    without overwriting a value they've already customized.
  - **Distinct copy everywhere it's user-visible**: the public page's sidebar
    fact says "Webinar" (not "Group session") for a webinar calendar; the
    "session is full" messaging says "This webinar is full" for webinars and
    "This group session is full" for classes; the Engine Type selector and
    the calendar-list filter tabs list Webinar as its own option, not buried
    under Class.
  - **A new, honest capacity-ceiling warning** (§1.3) that Class never
    needed as urgently but genuinely benefits from too, since the underlying
    constraint applies to both.

### 1.3 Real finding: our video integrations are regular meetings, not the providers' webinar products

Confirmed by reading the actual API calls this project makes (Task 70):

| Mode | What this app calls | What it is | What it is NOT |
|---|---|---|---|
| Google Meet | `conferenceData.createRequest` on a Calendar event | A regular Google Meet conference | Google Meet's separate live-streaming/broadcast add-on |
| Zoom | `POST /users/me/meetings` (`zoomMeeting.ts`) | A regular Zoom **Meeting** | **Zoom Webinars** — a separately sold, separately licensed product with its own `/webinars` API, registration, panelist/attendee roles, and its own (much higher) capacity tiers |
| Teams | `POST /me/onlineMeetings` (`teamsMeeting.ts`) | A regular Teams online meeting | Teams **live events** / large-scale broadcast, a distinct feature with its own capacity model |

None of the three "auto-generate" video modes this app offers call a
provider's actual webinar/broadcast product. A regular meeting's real
participant ceiling is whatever the connected account's plan allows —
commonly in the **100–300** range, sometimes higher on enterprise tiers — and
this app has no way to know or enforce the real number for a given connected
account.

**Consequence for the build:** if someone creates a Webinar, picks Zoom (or
Google Meet / Teams) as the meeting mode, and sets capacity to 500, the
booking page would happily fill 500 confirmed seats while the actual Zoom
meeting link can plausibly reject or degrade well before that — a real false
promise. This is now surfaced honestly (Step 2.3) rather than silently
allowed. It's a courtesy warning, not a hard block, since a verified
enterprise plan might genuinely support more, and internal/custom/in-person
modes have no such vendor ceiling at all.

---

## Step 2 — Build

### Migration `20260913000000_webinar_calendar_type.sql` — applied + verified live

Widens `booking_calendars_calendar_type_check` to add `'webinar'`. The real
constraint name was confirmed live (not guessed) by deliberately triggering
the violation and reading Postgres's own error message before writing the
migration. Applied via `supabase db push` (dry-run confirmed it was the only
pending migration) and verified immediately after: a real insert with
`calendar_type='webinar'` succeeds, and a `class_booking` insert alongside it
still succeeds unaffected.

No other schema change was needed — `'webinar'` rows use the exact same
`capacity` / `max_attendees` / `current_attendee_count` / `waitlist_enabled`
/ `booking_waitlists` columns Class already uses.

### New shared module — `src/lib/calendar/calendarTypes.ts`

Single source of truth, replacing several independent copies of the type
list that existed in `CalendarSettingsModal`, `CalendarToolbar`, and
`CalendarPagesView`:

- `CALENDAR_TYPE_OPTIONS` / `GROUP_SESSION_TYPES` / `isGroupSessionType()`
- `getCalendarTypeLabel()` — human labels everywhere a raw enum string used
  to leak (e.g. `AppointmentDetailsModal`'s badge, `CalendarPagesView`'s card
  subtitle).
- `getGroupSessionNoun()` — "Webinar" vs "Group session".
- `DEFAULT_GROUP_CAPACITY` — `{ class_booking: 12, webinar: 100 }`.
- `getCapacityCeilingWarning(calendarType, meetingMode, capacity)` — the
  Step 1.3 honesty check, real and reusable (used in the settings modal and
  covered by its own unit assertions in the verify script).

### Real, shared infrastructure — renamed for honesty, not just for Class

`bookClassSession` → **`bookGroupSession`**, `cancelClassSession` →
**`cancelGroupSession`** (`public.ts` / `waitlist.ts`, with every call site —
`appointments.ts`, `calendar.ts`, `BookingClientWrapper.tsx`, and the two
existing verify scripts — updated to match). This wasn't just a find/replace
for appearances: it's the same functions, now correctly named for what they
actually do, since they now genuinely serve two real calendar types. Internal
log-event tags (`calendar.class_booking.*`) renamed to
`calendar.group_session.*` for the same reason.

`scheduling.ts`, `calendars.ts`, `public.ts` all now branch on
`isGroupSessionType(calendar_type)` instead of a hardcoded
`=== 'class_booking'` string.

### UI

| File | Change |
|---|---|
| `CalendarSettingsModal.tsx` | "Webinar" added to the Engine Type selector; the capacity/waitlist panel now shows for either group-session type; capacity label/placeholder says "Attendees per webinar" vs "Spots per session"; switching a NEW calendar's type into Webinar auto-sets capacity to 100 (Class → 12) without clobbering a value already typed; a real amber capacity-ceiling warning appears when capacity exceeds the honest ceiling for the selected video mode. |
| `CalendarToolbar.tsx` | "Webinar" added as its own filter tab/type, alongside "Class". |
| `CalendarPagesView.tsx` | Webinar gets its own icon (`Presentation`, vs Class's `GraduationCap`); card subtitle uses the shared humanized label instead of a raw `.replace('_',' ')`. |
| `AppointmentDetailsModal.tsx` | The type badge uses the shared humanizer — a webinar appointment now reads "Webinar", not a raw enum string. |
| `PublicBookingLayout.tsx` / `BookingClientWrapper.tsx` / `BookingFlow.tsx` | The public page's sidebar fact and the "session is full" / waitlist-join copy use the real type-specific noun ("Webinar" vs "Group session") instead of hardcoded "Group session" leaking onto every group type. |

Confirmation emails and waitlist-offer/join emails (`notifications.ts`,
`waitlist.ts`) were already generic ("session", never "class") — audited and
confirmed they need no changes; they already say the right thing for a
webinar.

---

## Step 3 — Verified / Fixed (real, live)

### `npx tsx scripts/db-checks/task-webinar-verify.ts` → 23/23

Real workspace, real Webinar + Class calendars, real bookings, live DB:

| Check | Result |
|---|---|
| `webinar` recognized as a group-session type; `class_booking` still is too (coexistence) | ✅ |
| Distinct copy: webinar noun "Webinar", class noun "Group session" | ✅ |
| Distinct real defaults: webinar capacity 100, class capacity 12 | ✅ |
| **★ capacity-ceiling warning fires** for a webinar set to 500 attendees on Zoom, correctly naming it a regular meeting distinct from Zoom's real webinar product | ✅ |
| No warning below the honest ceiling, or on LeadsMind's own internal room (no vendor ceiling) | ✅ |
| The same warning logic also protects an unrealistically-sized Class | ✅ |
| A real Webinar calendar's public slot shows real capacity via the same `getAvailableSlots` group-session path | ✅ |
| 3 real registrations booked via the shared `bookGroupSession` + `fn_secure_booking_or_waitlist` | ✅ |
| Real per-attendee `booking_waitlists` records — the SAME table Class uses | ✅ |
| Each registrant got their own real confirmation email | ✅ |
| A 4th registrant joins the real waitlist when full, gets a real "you're on the waitlist" email | ✅ |
| **★ one attendee cancels their own spot** via the same `cancelAttendeeSpot` Class uses — only their seat frees, the webinar itself is untouched, the freed seat is offered to the waitlisted registrant | ✅ |
| **★ host cancels the whole webinar** via the same `cancelGroupSession` Class uses — every remaining registrant's record cancelled and notified | ✅ |
| **★ COEXISTENCE** — a Class calendar still books correctly with the Webinar type now present in the schema | ✅ |

### Regression — the two pre-existing group-session verify scripts, re-run after the rename

- `scripts/db-checks/task-public-waitlist-verify.ts` → **15/15** (unchanged
  behavior; only the imported function name changed).
- `scripts/db-checks/task-attendee-records-verify.ts` → **28/28**.
- `scripts/db-checks/task71-resource-booking-verify.ts` → **14/14** (confirms
  `scheduling.ts`/`calendars.ts` changes didn't disturb resource booking).

### Suite / types / lint / build

- `vitest run` → **56 files / 534 tests pass**.
- `tsc --noEmit` clean · `next lint` (every changed file) clean.
- `next build` → see build log.

### Cleanup

The new verify script deletes every test appointment, `booking_waitlists`
row, contact, both calendars, and the throwaway auth user in a `finally`
block. Nothing persists.

---

## Deliberately Deferred

- **View-only / broadcast-style attendee experience.** Real webinars often
  have a materially different attendee UI (watch-only, no camera/mic,
  Q&A/chat panel, panelist roles). Building this honestly requires the
  providers' actual webinar/broadcast APIs (Zoom Webinars, Teams live events,
  Meet streaming) — a genuinely separate integration, separate OAuth
  scopes/licensing, and likely separate connection UI from Task 70's regular-
  meeting integrations. Not attempted here; building a fake "view-only" label
  on top of a regular meeting link would be the same false-promise problem
  the capacity warning exists to prevent.
- **Uncapped / registration-only webinars.** Explicitly rejected in §1.2 for
  the same reason — this app cannot honestly promise unlimited attendees on
  the current video integrations. The real, enforced hard cap (shared with
  Class) is the responsible design at this scope.
- **Hard-blocking an over-capacity Webinar.** The capacity-ceiling warning is
  advisory, not a save-blocking validation error — a workspace may have a
  verified enterprise plan that genuinely supports more attendees than the
  conservative 100 threshold. Turning this into a hard block would need real
  per-workspace plan verification, which isn't available.
- **A dedicated Webinar analytics/registration-list view.** Attendees are
  fully queryable today via the existing `booking_waitlists` records (same
  admin surfaces Class uses); a webinar-specific "registrants" dashboard is a
  follow-up, not required for the booking/cancellation flow to be real and
  correct.
- **Recurring webinar series.** `createRecurringSeries` (Task 69) doesn't
  accept a resource or a group-session type distinction yet — a recurring
  weekly webinar isn't wired up. Out of scope here; the same deferral already
  applies to recurring Class sessions.
