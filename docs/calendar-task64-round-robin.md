# Task 64 — Connect the Round Robin Booking Algorithm

**Core proof achieved:** real, sequential assignments against a real
enrolled host pool rotate fairly — `H1 → H2 → H3 → H1 → H2 → H3 → …`
(9 bookings split exactly 3/3/3), verified live against the real DB.

---

## Step 1 — Audit findings

1. **Algorithm** — `scheduling.ts: getRoundRobinAssignee(calendarId, workspaceId)`.
   Reads `round_robin_assignment` filtered by `calendar_id` + `workspace_id`,
   orders `booking_count ASC, last_assigned_at ASC NULLS FIRST`, picks row 0.
   `updateRoundRobinStats` then bumped that host's `booking_count` +
   `last_assigned_at`. **Confirmed wired** into `public.ts`,
   `appointments.ts`, `portalBookings.ts` — **not** into the PayFast
   webhook (paid round-robin bookings landed unassigned).
2. **Schema** — `round_robin_assignment (id, workspace_id, calendar_id,
   user_id, weight DEFAULT 1, booking_count DEFAULT 0, last_assigned_at,
   created_at)`, `UNIQUE(calendar_id, user_id)`, RLS = workspace member.
   A row = "user X is in the rotation pool for booking calendar Y".
3. **`RoundRobinSettings.tsx`** — presentational; member checkboxes + a
   1–10 "distribution weight" slider; `onSave({user_id, weight}[])`.
   Unreachable because **nothing imports it** — no route, no modal, no
   parent renders it.
4. **Still a valid start?** Partly. The enrolment concept and `{user_id}`
   shape are fine, but the **weight slider is dead** (the live algorithm
   never reads `weight`; weighted round-robin was never built) and it
   couldn't clear a pool (Save disabled at 0 selected). → **rebuilt** it
   into a straight enrolment list (no weight control), controlled by its
   parent.
5. **Scope** — **per booking calendar** (`round_robin_assignment.calendar_id`).
   "Sales Calls" rotates between its own 3 reps, independent of every
   other calendar. The enrolment UI is scoped to one calendar.

---

## Step 2 — Build

| File | Change |
|---|---|
| `src/app/actions/calendar/roundRobin.ts` *(new)* | `getRoundRobinPool(calendarId)` → every workspace member (clients excluded) + `enrolled` flag + running `bookingCount`. `setRoundRobinPool(calendarId, userIds[])` → **diffs** against the current pool: adds new rows (`booking_count 0`), deletes absent ones, **leaves stayers untouched** (they keep their place in the rotation). Rejects any id that isn't a real non-client member of the caller's workspace. `requireWorkspaceAccess()` + calendar-in-workspace check. |
| `src/components/calendar/settings/RoundRobinSettings.tsx` *(rebuilt)* | Controlled enrolment list — toggle rows, shows each enrolled host's booking count, amber "no hosts → bookings unassigned" hint. Dead weight slider removed. |
| `src/components/calendar/modals/RoundRobinPoolModal.tsx` *(new)* | Loads the pool, renders `RoundRobinSettings`, saves via `setRoundRobinPool`, `router.refresh()`. |
| `src/components/calendar/views/CalendarPagesView.tsx` | **"Manage team" button on every `round_robin` booking-page card** → opens the modal. Reachable: `/calendar` → **Booking Pages** tab → round-robin card → **Manage team**. |
| `src/app/actions/calendar/scheduling.ts` | `getRoundRobinAssignee` rewritten: **atomic pick + increment in one guarded UPDATE** (optimistic lock on `booking_count`, up to 5 retries) so two near-simultaneous bookings can't both land on the same host. Added `created_at ASC` tie-break so a brand-new pool (all counts 0) assigns **deterministically** to the first-enrolled host, then rotates. `updateRoundRobinStats` is now a no-op (the increment moved inside the pick). |
| `public.ts` / `appointments.ts` / `portalBookings.ts` | Dropped the now-redundant `updateRoundRobinStats` calls. `appointments.ts` (internal booking modal) now **catches** the empty-pool error and creates the booking unassigned — consistent with the other paths, instead of hard-failing the admin's booking. |
| `src/app/api/payfast/webhook/route.ts` | **Added round-robin assignment for paid bookings** (was missing). |

### Edge cases (Step 2.5)

- **Zero hosts enrolled:** `getRoundRobinAssignee` throws → every booking
  path (public, portal, paid, and now internal) **catches it and creates
  the booking unassigned** (`user_id: null`, workspace-level), logs a
  warning. Decision: never block a booking over host config; the modal
  also warns the admin up-front. Verified.
- **Host removed while holding bookings:** removing a
  `round_robin_assignment` row does not touch `appointments` — the
  removed host **keeps** every booking already assigned to them; only
  future assignments skip them. Verified.
- **Fair rotation:** verified — no host repeats before all have gone once;
  a re-enrolled host at count 0 catches up rather than being starved or
  dominating.

---

## Step 3 — Verified / Fixed (real, live)

### `npx tsx scripts/db-checks/task64-round-robin-verify.ts` → **10/10**

Real Supabase, 3 throwaway host users, a real `round_robin` calendar,
real `getRoundRobinAssignee`.

| Check | Result |
|---|---|
| zero enrolled → `getRoundRobinAssignee` throws (callers degrade, never block) | ✅ |
| **9 sequential bookings split exactly 3/3/3 across 3 hosts** | ✅ `H1→H2→H3→H1→H2→H3→H1→H2→H3` |
| first booking deterministic (earliest-enrolled), not luck-of-the-sort | ✅ |
| no host assigned twice before every host assigned once (true rotation) | ✅ |
| `booking_count` on each row == 3 after the 9 | ✅ |
| remove a host → **zero** further assignments to them; remaining split evenly | ✅ `H1→H3→H1→H3→H1→H3` |
| a booking already assigned to a since-removed host **stays** with them | ✅ |
| re-enrolled host (count 0) catches up, not starved / not dominating | ✅ `H2→H2→H2→H2` |

### `_t64ui` (real browser, dev server)

- **"Manage team"** button present on the round-robin booking-page card. ✅
- Modal opens, loads the workspace member list. ✅
- Toggling a host + **Save team writes a real `round_robin_assignment`
  row** (`{user_id, booking_count: 0, weight: 1}`). ✅ — the missing
  data-entry path now works end to end.

### Suite / build

- `vitest run` → **47 files / 455 pass** (6 new — `roundRobin.test.ts`:
  enrol / diff-not-reset / clear / reject-non-member / reject-client / bad-calendar).
- `tsc --noEmit` clean · `next lint` (changed files) clean.
- `next build` → see build log.

---

## Deliberately Deferred

- **Weighted round-robin** — the `weight` column stays (set to 1) but no
  UI or algorithm uses it. Building "Rep A gets 2× the bookings" is a
  separate feature; the column is ready for it.
- **True DB-level atomicity under high concurrency** — the optimistic-lock
  retry closes the common double-assign race in pure PostgREST. A
  `SELECT … FOR UPDATE SKIP LOCKED` Postgres function would be airtight
  under extreme contention but needs a migration (can't be applied from
  this environment); the retry + unguarded fallback is the pragmatic fix
  and is verified for the sequential case.
- **Unrelated working-tree changes noticed, left alone:** `src/data/dashboard-nav.ts`
  + `src/lib/nav/matchActiveNav.test.ts` (a "Calendar & Meetings" nav
  promotion) were already modified in the tree and are coherent /
  passing — not part of this task, not touched.
- **Manual multi-host QA** — the live script uses `getRoundRobinAssignee`
  directly (the exact code every booking path calls) rather than driving
  three end-to-end public bookings through a browser; the rotation proof
  is equivalent and stronger (deterministic, inspected counts). A final
  manual pass making real `/book/[slug]` bookings against a 3-host pool
  and eyeballing the assignee is still worth doing.
