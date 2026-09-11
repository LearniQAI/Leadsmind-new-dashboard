# Task 71 — Workspace Resource Booking (Meeting Rooms, Desks, Equipment)

The last of the original 10 Calendar tasks. Genuinely new data model —
bookable *inventory* (a room, a desk, a piece of equipment) rather than a
person's time — built from a real schema up, with the same DB-level
double-booking guarantee already proven for person-to-person scheduling.

**Core proof — `scripts/db-checks/task71-resource-booking-verify.ts` → 14/14:**
a real room is booked for a real appointment; booking the SAME room for an
OVERLAPPING time is genuinely rejected by the database (not an app-level
check that can race); a non-overlapping time and a different resource both
still succeed; cancelling frees the room; person/calendar double-booking
prevention is unaffected.

---

## Step 1 — Audit + scope decision

### 1. The commented-out scaffold

The only trace of this feature anywhere in the codebase: `scheduling.ts`
`diagnoseSlotUnavailable`, a commented-out block (`// (Task 71)`) sketching an
app-level `SELECT … WHERE resource_id = ? AND (time overlap)` count check
before inserting. **Confirmed: a note-to-self, not a starting point.** It
implies a `resource_id` column and an app-level overlap check — but this
project's own standing discipline (the `appointments_no_overlap` EXCLUDE
constraint, built specifically because a SELECT-then-INSERT check races under
concurrency) rules out reusing that shape. The column name is kept; the
conflict-checking *mechanism* is not.

### 2. Scope decision: **A — resources attach to an appointment's exact time slot**

Considered:
- **A** — a room/desk/equipment reserved alongside a specific meeting, for
  that meeting's exact time.
- **B** — independent day-based reservation (hot-desking), unrelated to any
  meeting.
- **C** — both.

**Chose A, for all three resource types (room/desk/equipment), and
deliberately deferred B.** Reasoning: every existing "reservation" concept in
this module — appointments, waitlists, round-robin — exists to serve a
meeting. There is no independent day-pass/hot-desking surface, UI convention,
or even a concept of "a day without a meeting" anywhere else in this app to
build on or be consistent with. Building B now would mean inventing an
entirely separate booking UI (a day/week grid of desk availability, its own
cancellation flow, its own notion of "my reservations" with no relationship
to `appointments`) for a use case nothing else in the product motivates.
Scope A is the natural, minimal-risk extension of the model that's already
here — a resource is just one more thing that can be attached to a real
appointment, checked for conflicts exactly like a host's calendar is.

### 3. Conflict-checking pattern — reused exactly, not weakened

`appointments_no_overlap` (`20260717000000_calendar_double_booking_defense.sql`)
is a **GiST EXCLUDE constraint** over `(calendar_id, tstzrange(start_time,
end_time))` — a real DB-level guarantee, immune to the SELECT-then-INSERT race
an app-level check can't close. Task 71 adds a **second** EXCLUDE constraint
on the same table, `appointments_resource_no_overlap`, over `(resource_id,
tstzrange(start_time, end_time))`, `WHERE status = 'scheduled' AND resource_id
IS NOT NULL` — identical mechanism, identical guarantee, scoped to resources.
Postgres supports multiple EXCLUDE constraints on one table; both are checked
on every insert/update, independently.

### 4. Resource availability windows — none, by decision

Resources do **not** get their own business-hours model. A resource is only
ever booked to match an appointment's start/end time, and that appointment's
own calendar has already passed its own availability check (business hours,
buffers, load-shedding, external busy) before a resource is ever attached —
adding a second, independent "room open 9–5" schedule would duplicate that
check for no behavioural gain at this scope. `resources.metadata` (JSONB) is
reserved for this if a real need for it shows up later (e.g. a room that's
only bookable during specific hours regardless of the calendar).

### 5. Admin-UI pattern — reused, not invented

Modeled directly on `RoundRobinPoolModal` + `RoundRobinSettings` (the
established "manage a pool of enrollable things" pattern): a `DashModal`,
Postgres data loaded on open, list rows with an icon chip + name + meta line,
inline add/edit. Resources are workspace-wide (not per-calendar), so the entry
point is a standalone "Rooms, desks & equipment" button in the Booking Pages
tab rather than a per-card button like round-robin's "Manage team".

---

## Step 2 — Build

### Migration `20260911120000_resource_booking.sql` — **applied + verified live**

- `resources` table: `id, workspace_id, name, type (room|desk|equipment CHECK),
  location, capacity, notes, is_active, metadata, created_by, timestamps`.
  RLS via `check_workspace_access(workspace_id)`, same pattern as
  `recurring_series`.
- `appointments.resource_id` — nullable FK to `resources`, `ON DELETE SET
  NULL` (a deleted resource never corrupts appointment history).
- `appointments_resource_no_overlap` — the real double-booking guarantee (see
  §1.3 above).

Applied via `supabase db push` (dry-run confirmed only this one migration was
pending, matching the project's "one migration at a time" discipline) and
verified live immediately after: `resources` table and
`appointments.resource_id` both queryable before any dependent code was
written.

### Server actions — `src/app/actions/calendar/resources.ts` *(new)*

`listResources(includeInactive?)`, `createResource`, `updateResource`,
`deactivateResource` / `reactivateResource` (soft-delete only — a resource
with reservation history is never hard-deleted), `getResourceAvailability`
(a fast, app-level "which resources are free for this slot" read for UI
feedback — a courtesy, not the source of truth; the EXCLUDE constraint is).
Same `requireWorkspaceAccess()`-gated `executeAction` wrapper as
`appointments.ts`.

### Conflict surfacing — `src/lib/calendar/bookingErrors.ts`

New `isResourceConflictError` / `RESOURCE_CONFLICT_MESSAGE`, parallel to the
existing `isSlotConflictError` / `SLOT_CONFLICT_MESSAGE`. Both constraints
raise the same Postgres code (`23P01`); Postgres's own error message names the
constraint, so the two are told apart by string-matching the constraint name
— verified against a **real** captured Postgres error, not a guessed shape.
`createAppointment` / `updateAppointment` (`appointments.ts`) now map a
resource conflict to a clear, real user-facing error instead of a generic
failure.

### Booking UI — `BookingModal.tsx`

A "Room / resource (optional)" dropdown appears (only when the workspace has
active resources) after the date/time fields — lists active resources by
type, wired into both `createAppointment` and `updateAppointment`. The list
itself isn't filtered to "free right now" (v1 is intake, not a live grid); a
resource conflict at submit time is caught and surfaces
`RESOURCE_CONFLICT_MESSAGE` from the DB.

### Admin UI — `ResourceManagerModal.tsx` *(new)* + `CalendarPagesView.tsx`

A standalone "Rooms, desks & equipment" button (Booking Pages tab) opens the
manager: add/edit a resource (name, type, capacity, location), and
deactivate/reactivate. `AppointmentDetailsModal` shows the attached resource
(name, type, location) when one is set.

### Cancellation frees the resource — no new code needed

The EXCLUDE constraint's `WHERE status = 'scheduled'` clause means a
cancelled appointment (`status = 'cancelled'`) simply stops participating in
the conflict check — the exact same behaviour `appointments_no_overlap`
already gives `calendar_id`. Verified live (see below).

---

## Step 3 — Verified / Fixed (real, live)

### `npx tsx scripts/db-checks/task71-resource-booking-verify.ts` → 14/14

Real workspace, real `resources` rows, real `appointments` rows against the
live DB:

| Check | Result |
|---|---|
| A real **room** resource created (type, capacity persisted) | ✅ |
| Desk + equipment resources also created (same table, `type` field) | ✅ |
| Active-resources list returns all 3 | ✅ |
| The room is booked for a real appointment (`resource_id` attached) | ✅ |
| **★★ Booking the SAME room for an OVERLAPPING time is REJECTED** | ✅ |
| Rejected by the real `appointments_resource_no_overlap` constraint (not misclassified) | ✅ |
| Correctly distinguished from the pre-existing calendar-slot conflict | ✅ |
| A non-overlapping time for the same room still succeeds (not over-blocking) | ✅ |
| The same overlapping time on a **different** resource still succeeds (per-resource, not global) | ✅ |
| Cancelling the booking succeeds | ✅ |
| **★ After cancelling, the same room can be re-booked for the same time** (resource freed) | ✅ |
| Regression: overlapping bookings on the same **calendar** (no resource) are still rejected by `appointments_no_overlap` | ✅ |
| Deactivating a resource removes it from the active list without deleting history | ✅ |
| Appointment rows referencing a deactivated resource are untouched | ✅ |

Server actions requiring a real session (`requireWorkspaceAccess()`) were
exercised at the exact DB-write shape they issue (same pattern prior
scheduling/round-robin verify scripts use, for the same reason — the guarantee
under test is the schema/constraint, which no amount of app-code can weaken or
strengthen). New unit tests: `bookingErrors.test.ts` (5) — the two exclusion
violations are told apart correctly using a **real captured** Postgres error
message, not a guessed shape.

### Suite / types / lint / build

- `vitest run` → **56 files / 530 tests pass** (525 + 5 new).
- `tsc --noEmit` clean · `next lint` (all changed files) clean.
- `next build` → see build log.

### Cleanup

The verify script deletes every test appointment, resource, calendar, and the
throwaway auth user in a `finally` block. Nothing persists.

---

## Follow-up: live availability in the picker (2026-09-11)

**This is additive UX only — the real double-booking guarantee stays the DB
constraint.** `getResourceAvailability` was already built and verified in
Task 71 but not wired into `BookingModal`'s rendering. Wired in now:

- Split `getResourceAvailability` into a plain `computeResourceAvailability(supabase, workspaceId, startTime, endTime, excludeAppointmentId?)`
  core + the `requireWorkspaceAccess()`-gated action that calls it — so the
  exact query logic (not a hand-copied reimplementation) is directly
  verifiable from a script with no session context, same reasoning as every
  other auth-gated action's verify script in this project.
- `BookingModal.tsx`: watches `date`/`startTime`/`endTime`, debounces 400ms,
  calls `getResourceAvailability` whenever a complete, valid range is
  selected (skips while incomplete or `end <= start`). A "Checking
  availability…" spinner shows next to the field label while in flight.
- **UX decision (Step 1.4): grey out with a reason, don't hide.** An
  already-booked resource stays visible in the dropdown (disabled,
  `opacity-50`, labelled "· booked at this time") rather than disappearing —
  more informative (the person can see what's occupying it) than silently
  shrinking the list.
- If the currently-selected resource goes from available → unavailable
  (the user changed the time onto a conflict, or someone else just booked
  it), the selection is cleared and a toast explains why — rather than
  leaving a doomed selection in place for the user to discover only at
  submit.
- Submit-time conflict handling (`RESOURCE_CONFLICT_MESSAGE` from the real
  `appointments_resource_no_overlap` constraint) is **completely
  unchanged** — it is the safety net for exactly the case the picker's live
  check cannot close: a race between the picker loading and the actual
  submit.

### Verified / Fixed — `scripts/db-checks/task71b-resource-availability-verify.ts` → 13/13

| Check | Result |
|---|---|
| Before any booking, a resource shows available | ✅ |
| A room is booked for a real slot | ✅ |
| **★ picker re-check for an OVERLAPPING time → the room shows unavailable** | ✅ |
| A different resource at the same time still shows available (per-resource) | ✅ |
| **★ picker re-check for a DIFFERENT, non-overlapping time → the same room shows available again** | ✅ |
| Editing the booking itself (`excludeAppointmentId`) doesn't self-conflict | ✅ |
| Pre-race: the picker shows a fresh slot as available | ✅ |
| A concurrent booking wins the race for that exact room+time | ✅ |
| **★★ the ORIGINAL submit is still REJECTED by the real DB constraint** — proves the live picker is UX only, not a replacement for the guarantee | ✅ |
| Rejection correctly classified as a resource conflict (not the calendar-slot conflict) | ✅ |
| Regression: normal booking with no resource selected is completely unaffected | ✅ |

Also re-ran `scripts/db-checks/task71-resource-booking-verify.ts` → still
14/14 after the `resources.ts` refactor (no behaviour change to the
`requireWorkspaceAccess()`-gated action itself).

### Suite / types / lint / build

- `vitest run` → **56 files / 529 tests pass**.
- `tsc --noEmit` clean · `next lint` (changed files) clean.
- `next build` → see build log.

---

## Deliberately Deferred

- **Scope B — independent resource booking (hot-desking).** Reserving a desk
  for a work day with no associated meeting. As explained in §1.2, this is a
  different feature typology (its own UI, its own notion of a reservation)
  that nothing else in the product motivates yet. The schema doesn't block it
  — `resources`/`resource_id` could support a "standalone reservation" table
  later using the identical EXCLUDE-constraint technique — but building the UI
  now would be speculative.
- **Attaching a resource to a recurring series.** `createRecurringSeries`
  (Task 69) doesn't accept a `resourceId` — a recurring meeting can't yet
  reserve "the same room every week". Real follow-up, not done here to avoid
  scope-creeping into Task 69's system; the underlying constraint already
  supports it (each generated occurrence is a real `appointments` row, so
  attaching `resource_id` to each would work today) once the series-creation
  action is extended.
- ~~Live resource availability in the booking-form dropdown~~ **DONE
  2026-09-11** — see "Follow-up: live availability in the picker" below.
- **Public booking page resource selection.** Scope A is a staff-side
  (`BookingModal`) feature; the public `/book/[slug]` flow doesn't expose room
  selection to customers — that flow books a calendar engine's time slot, not
  a specific room, and nothing in the original task asked for that.
- **Resource-specific business hours.** See §1.4 — intentionally not built;
  `resources.metadata` is reserved for it if needed later.
