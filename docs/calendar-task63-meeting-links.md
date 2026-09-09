# Task 63 — Fix fake video-meeting link generation

**Core criterion met: no booking, in any mode, ever produces a
`meeting_link` that looks functional but isn't.** Every path now emits a
real link or an honest "not available yet" state.

---

## Step 1 — Audit findings

**Where the links were generated (4 booking-creation paths):**

| Path | `google_meet` before | `zoom` before |
|---|---|---|
| `appointments.ts: createAppointment` (internal/staff) | **fake** `https://meet.google.com/<rand>-<rand>-<rand>` | **fake** `https://zoom.us/j/<rand>` (or the literal `.../real_oauth_meeting_link_pending` placeholder) |
| `public.ts: bookAppointment` (free public) | silently `null` | silently `null` |
| `portalBookings.ts` (client portal) | silently `null` | silently `null` |
| `api/payfast/webhook` (paid) | silently `null` | silently `null` |

So the fabricated URLs lived only in path #1, but the other three were
*silently* linkless with no message to booker or host.

**`createGoogleMeetLink` (Task 62):** real `calendar/v3` conference-create
call against `user_calendar_connections` (provider `google`). Returned
`null` on any failure (no connection / refresh fail / API error). Took no
host argument — it used `requireWorkspaceAccess()` (the *acting* user),
which is wrong for a round-robin host and impossible on the public/portal/
paid paths (no session).

**`meeting_link` display:** booker's public success screen shows only a
generic "confirmed" message — the link reaches the booker via the
**confirmation email** (`notifications.ts`). Host sees it in the staff
notification email + `AppointmentDetailsModal` + (booker) the
`/book/manage/[token]` page.

**`internal_meet`:** confirmed still real — `${APP_URL}/meet/[id]`, a
working room. Untouched.

**Decision — `google_meet` mode, host hasn't connected Google Calendar
(Step 1.3):** give the booker a **working LeadsMind `/meet/[id]` room now**
(persisted as `meeting_mode: 'internal_meet'`), record
`meeting_link_status: 'google_meet_pending_connection'`, and add a one-line
nudge to the **host's** notification ("connect Google Calendar to
auto-generate Meet links"). Rationale: never a fake link, never a hard
failure that punishes the booker for the host's incomplete setup, and
never *nothing* — the internal room is a genuine equivalent. The host
learns what to do; the booker just gets a link that works.

---

## Step 2/3 — Build

**New shared resolver — `src/lib/calendar/meetingLink.ts`** (`resolveMeetingLink()`),
used by **all four** paths (no parallel logic — Step 2.3):

| Requested mode | Result |
|---|---|
| `internal_meet` | `${APP_URL}/meet/[id]` — unchanged |
| `custom_link` (+ configured URL) | that URL |
| `custom_link` (no URL) | internal room |
| `phone` / `client_choice` | `null`, status `none` |
| `in_person` | keeps the configured address, status `none` |
| **`google_meet`** — host connected, API ok | **real Google Meet link** (`createGoogleMeetLink(details, hostUserId)`), mode `google_meet` |
| **`google_meet`** — host connected, API fails | internal room, status `google_meet_unavailable`, host notified |
| **`google_meet`** — host NOT connected | internal room, status `google_meet_pending_connection`, host nudged |
| **`zoom`** | **`null`**, mode `zoom`, status `zoom_pending_integration` — never a `zoom.us` URL |
| unknown | internal room |

- Host resolution: `appointments.user_id` (round-robin assignee) → else
  `workspaces.owner_id`.
- `src/lib/calendar/googleMeet.ts` — `createGoogleMeetLink(details, hostUserId?)`.
  Explicit host for booking flows; `requireWorkspaceAccess()` fallback kept
  for internal instant-meetings, now lazy-imported so booking flows don't
  pull the request-scoped auth module.
- Status persisted in `appointments.metadata.meeting_link_status` — **no
  migration** (matches the project's JSONB-first convention).
- `src/lib/calendar/meetingLinkStatus.ts` — client-safe status vocabulary +
  `meetingLinkNote(status, 'booker' | 'host')` messaging.

**Honest pending state surfaced to both parties:**
- `notifications.ts` — booker + host confirmation emails append the note
  (`meetingLinkNote`). Zoom: booker sees "coming soon — host will send the
  link separately"; host sees "send the Zoom link manually".
- `AppointmentDetailsModal.tsx` (host) — Zoom shows an amber "not available
  yet — send manually" line instead of "No meeting link generated"; the
  Google fallback statuses show the host nudge under the working link.
- `/book/manage/[token]` (`manage.ts` + `ManageBookingClient.tsx`, booker) —
  shows the booker note when there's no live link.

**Zoom real integration: NOT built** — that is Task 70 (`resolveMeetingLink`
has one obvious `mode === 'zoom'` branch to change when it lands).

---

## Step 4 — Verified / Fixed

### Live DB verification — `npx tsx scripts/db-checks/task63-verify.ts` → **9/9 passed**

Real Supabase, throwaway workspace + calendar + real `appointments` rows,
real module graph, real `getCalendarConnection`. Only Google's HTTP is
faked (that boundary needs a real OAuth consent screen — manual QA below).

| Check | Result |
|---|---|
| `zoom` → `meeting_link` null, no `zoom.us` URL | ✅ |
| `zoom` → status `zoom_pending_integration` | ✅ |
| `google_meet`, host not connected → real `/meet/[id]`, **not** a `meet.google.com/<rand>` URL | ✅ |
| `google_meet`, host not connected → status `google_meet_pending_connection` | ✅ |
| `google_meet`, host connected + API ok → a **real Google Meet link** returned & mode persisted `google_meet` | ✅ |
| `google_meet`, host connected + API 500 → falls back to real `/meet/[id]`, status `google_meet_unavailable`, no fake link | ✅ |
| `internal_meet` → unchanged real `/meet/[id]` room | ✅ (regression) |
| persisted booking: `meeting_link` stays `null` for zoom, status recorded in `metadata` | ✅ |

### Unit tests — `src/lib/calendar/meetingLink.test.ts` → **15 passed**

All modes incl. every google_meet branch + `meetingLinkNote` copy; explicit
assertions that a `zoom.us` / bare `meet.google.com` URL is never produced.

### Full suite / static

- `vitest run` → **46 files / 441 tests pass** (16 new).
- `tsc --noEmit` → clean.
- `next lint` (all changed files) → clean.
- `next build` → see build log.

---

## Deliberately Deferred

- **Real Zoom OAuth/API integration — Task 70.** Not a gap in this task;
  the honest `zoom_pending_integration` state is the agreed interim. One
  branch in `resolveMeetingLink` to flip when Task 70 ships.
- **Manual OAuth QA (owed — no browser here):**
  1. As a host who **has** connected Google Calendar (Task 62 flow), book a
     `google_meet`-mode meeting → confirm a real `meet.google.com/xxx-...`
     link in the appointment + both emails, and that it opens a real room.
  2. As a host who has **not** connected → confirm a `/meet/[id]` link (not
     a fake Google URL), and the "connect Google Calendar" nudge in the
     host email.
  3. Book a `zoom`-mode meeting → confirm **no link**, and the "coming
     soon / send manually" copy in the booker email, host email, and the
     appointment detail view.
  4. `internal_meet` regression → unchanged.
- **Reschedule + Google Meet:** `manage.ts` reschedule updates the
  appointment time but does not patch the Google Calendar event's time —
  the Meet link still works, the Google event shows the old time. Minor;
  worth a follow-up when Google event lifecycle (update/delete on
  cancel/reschedule) is tackled.
- **`client_choice` meeting mode** (booker picks the medium) — no create-UI
  exists for it; `resolveMeetingLink` treats it as no-link. Out of scope.
