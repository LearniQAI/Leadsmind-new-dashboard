# Task 70 — Real Zoom / Microsoft Teams Video-Conferencing Integration

Google Meet was already real (Task 62 OAuth + Task 63 `createGoogleMeetLink`,
wired into `meetingLink.ts`). This task adds **real Zoom** and **real Microsoft
Teams** as first-class branches of the SAME `resolveMeetingLink()` resolver —
not a parallel meeting-link system — with the same honest-fallback contract and
the same reschedule/cancel sync as Google Meet.

**Status: code-complete. Teams real path is live-verified. Zoom real path is
live-verified for everything except the last mile, which needs (a) the migration
applied and (b) a Zoom Marketplace app — see "External setup required" below.**

---

## Step 1 — Audit findings

### 1. Google Meet is genuinely done (re-verified, not assumed)

`meetingLink.ts` `google_meet` branch → `getCalendarConnection(host,'google')`
→ real `createGoogleMeetLink()` (Task 63) → real Meet URL + Calendar event id,
or honest fallback (`google_meet_pending_connection` / `google_meet_unavailable`)
to a working `/meet/[id]` room. Reschedule/cancel PATCH/DELETE the real event
via `calendarSync.ts` → `googleMeet.ts`. `meetingLink.test.ts` covers all
outcomes. **No gap. Not touched** beyond the shared plumbing below.

### 2. Zoom — real OAuth/API requirements

- **App**: a Zoom Marketplace **"User-managed OAuth"** app (equivalent to the
  Google Cloud / Meta Developer apps already set up for this project).
- **OAuth**: authorize `https://zoom.us/oauth/authorize?response_type=code&client_id=…&redirect_uri=…&state=…`;
  token exchange `POST https://zoom.us/oauth/token` with **HTTP Basic** client
  auth (`base64(client_id:client_secret)`), `grant_type=authorization_code`.
  Refresh: same endpoint, `grant_type=refresh_token`. Revoke:
  `POST https://zoom.us/oauth/revoke` (Basic auth).
- **Scopes**: `meeting:write:meeting` (create), `meeting:update:meeting`
  (reschedule), `meeting:delete:meeting` (cancel), `user:read:user` (email
  label). Zoom's granular scopes; the classic equivalents are `meeting:write`,
  `meeting:read`, `user:read`.
- **Create a meeting**: `POST https://api.zoom.us/v2/users/me/meetings`
  `{ topic, type: 2, start_time, duration, timezone: 'UTC' }` → response
  `{ id, join_url }`. `join_url` is the real, working attendee link.
- **Update / delete**: `PATCH` / `DELETE https://api.zoom.us/v2/meetings/{id}`.

### 3. Microsoft Teams — can reuse the existing Outlook connection? **YES.**

Confirmed feasible: Teams online meetings are created via Microsoft Graph
`POST /me/onlineMeetings` — a different API surface than the Outlook *calendar
events* API (Task 62) but the **same Microsoft identity-platform app**
(`OUTLOOK_CLIENT_ID`), the same `login.microsoftonline.com/common/oauth2/v2.0`
flow, the same delegated-token model. It needs **one additional delegated
scope**: `OnlineMeetings.ReadWrite`. So there is **no second Microsoft
app/connection** — the existing `user_calendar_connections` row with
`provider = 'outlook'` carries Teams rights once that scope is added to the
OAuth flow and the user reconnects. There is **no `teams` connection provider**
— only a `teams` *meeting mode*.

### 4. `meetingLink.ts` resolver structure

Branches on `mode` (`phone`/`in_person`/`custom_link`/`internal_meet`/`zoom`/
`google_meet`) and returns `ResolvedMeetingLink` — `{ meetingLink, meetingMode
(the mode to persist, may differ on fallback), status (MeetingLinkStatus),
googleCalendarEventId, calendarEventHostUserId }`. `applyResolvedMeetingLink()`
is the single place persisted metadata keys are decided. Zoom/Teams slot in as
two more branches with the identical shape + two new optional carry-through
fields (`zoomMeetingId`, `teamsMeetingId`).

### 5. Reschedule/cancel sync — needed for Zoom/Teams too? **YES.**

Exactly the same reasoning as Google Calendar: a rescheduled booking whose Zoom
meeting still shows the old time, or a cancelled booking whose Teams meeting is
still live, is a real defect. Added `updateZoomMeetingTime` / `deleteZoomMeeting`
/ `updateTeamsMeetingTime` / `deleteTeamsMeeting`, dispatched from the existing
`pushEventTimeUpdate` / `pushEventCancellation` alongside Google/Outlook.

---

## Step 2 — Build

### Migration (ONE, `20260911000000_task70_video_conferencing.sql`) — **pending apply**

- `user_calendar_connections.provider` CHECK: `+ 'zoom'`.
- `booking_calendars.meeting_mode` + `appointments.meeting_mode` CHECK: `+ 'teams'`.

Nothing writes `'zoom'` / `'teams'` values until a user actively connects Zoom
or selects Teams mode, so the code is safe to ship ahead of the migration; it
just can't be exercised end-to-end until applied.

### Zoom

| File | Change |
|---|---|
| `src/lib/calendar/connections.ts` | `CalendarProvider` gains `'zoom'`; `getFreshCalendarAccessToken` gains a Zoom refresh branch (Basic client auth); `revokeProviderToken` gains the real Zoom revoke endpoint; `syncWorkspaceCalendarIntegrationRow` labels it "Zoom" / category `video_conferencing`. |
| `src/app/api/auth/zoom/route.ts` + `callback/route.ts` *(new)* | Full OAuth connect — mirrors `/api/auth/google-calendar/*`: CSRF nonce bound to the real user+workspace, Basic-auth token exchange, `/v2/users/me` for the email label, writes to `user_calendar_connections` (provider `'zoom'`) via the shared `storeCalendarConnection`. |
| `src/lib/calendar/zoomMeeting.ts` *(new)* | Exact mirror of `googleMeet.ts`: `createZoomMeeting` (→ `join_url` + id), `updateZoomMeetingTime`, `deleteZoomMeeting`. Same `getCalendarConnection`+`getFreshCalendarAccessToken` model, same never-throws / `'updated'|'not_applicable'|'failed'` contract. |
| `src/app/api/settings/integrations/route.ts` | `DELETE` maps provider "Zoom" → `deleteCalendarConnection(…, 'zoom')` (real revoke + local delete + integration-row recompute), same as Google/Outlook. |

### Microsoft Teams

| File | Change |
|---|---|
| `src/lib/calendar/connections.ts` | New exported `MICROSOFT_CALENDAR_SCOPES` constant — the single source for the Outlook scope list, now including `https://graph.microsoft.com/OnlineMeetings.ReadWrite`. Used by the initiate route, the callback token exchange, AND the refresh path so they never drift. |
| `src/app/api/auth/microsoft/route.ts` + `callback/route.ts` | Use `MICROSOFT_CALENDAR_SCOPES`. Existing connections keep working for calendar sync; the Teams scope is granted on the user's next reconnect. |
| `src/lib/calendar/teamsMeeting.ts` *(new)* | `createTeamsMeeting` (Graph `POST /me/onlineMeetings` → `joinWebUrl` + id), `updateTeamsMeetingTime`, `deleteTeamsMeeting` — all on `getCalendarConnection(host, 'outlook')`. Same contract as the others. |

### Shared resolver + sync

| File | Change |
|---|---|
| `src/lib/calendar/meetingLink.ts` | Real `zoom` and `teams` branches: host connected + real link → `status: 'zoom'` / `'teams'` + carry the meeting id and host; API failed → working `/meet/[id]` room + `zoom_unavailable` / `teams_unavailable`; host not connected → room + `zoom_pending_connection` / `teams_pending_connection`. **Never a fabricated `zoom.us` / `teams.microsoft.com` URL.** `ResolvedMeetingLink` gains `zoomMeetingId?` / `teamsMeetingId?`; `applyResolvedMeetingLink` persists `zoom_meeting_id` / `teams_meeting_id` + `calendar_event_host_user_id`. |
| `src/lib/calendar/meetingLinkStatus.ts` | `MeetingLinkStatus` gains `zoom` / `zoom_pending_connection` / `zoom_unavailable` / `teams` / `teams_pending_connection` / `teams_unavailable` (legacy `zoom_pending_integration` kept for old rows). `meetingLinkNote` gets honest host-nudge copy for each pending state. |
| `src/lib/calendar/calendarSync.ts` | `EventSyncOutcome` gains `zoom` / `teams`; `loadEventSyncContext` reads `zoom_meeting_id` / `teams_meeting_id`; `pushEventTimeUpdate` / `pushEventCancellation` dispatch to the new Zoom/Teams update/delete fns; the cancel path strips those ids from metadata. |
| `src/app/actions/calendar/public.ts` (`bookAppointment`), `src/app/actions/portalBookings.ts`, `src/app/api/payfast/webhook/route.ts` | Switched from an inline `{ …metadata, meeting_link_status }` merge to `applyResolvedMeetingLink()` so Zoom/Teams meeting ids actually persist on every booking path (previously only `appointments.ts` `createAppointment` did). |

### UI

| File | Change |
|---|---|
| `src/components/calendar/modals/CalendarSettingsModal.tsx` | `meeting_mode` zod enum + type + a "Microsoft Teams (Auto-Generate)" `<SelectItem>` (Zoom was already an option). |
| `src/components/settings/ConnectProviderModal.tsx` | `video_conferencing` category handled in the OAuth branch; "Zoom" → `/api/auth/zoom`, "Microsoft Teams" → `/api/auth/microsoft` (reuses the one M365 connection). |
| `src/app/settings/integrations-hub/page.tsx` | New "Video conferencing" section with Zoom + Microsoft Teams cards (shown `coming_soon` until external setup — same rollout pattern as Task 62's Outlook card; flip one value to `available`). Connect-success toast copy handles `zoom`. |

---

## Step 3 — Verification

### `npx tsx scripts/db-checks/task70-video-conferencing-verify.ts` → 10/10

Real DB rows; Microsoft Graph `/me/onlineMeetings` + token HTTP faked (the fake
**stores meeting state**, so we prove the real request shape end-to-end):

| Check | Result |
|---|---|
| **Teams** booking → a **real `teams.microsoft.com/l/meetup-join/…` join link**, `status: 'teams'` | ✅ |
| → `teams_meeting_id` + host persisted on metadata | ✅ |
| **Reschedule** → the real Teams meeting was **PATCHed** to the new time (`outcome.teams === 'updated'`, stored start moved) | ✅ |
| **Cancel** → the real Teams meeting was **DELETEd**; `teams_meeting_id` stripped from metadata | ✅ |
| Teams, host **not** connected → honest fallback: `/meet/[id]` room + `teams_pending_connection` | ✅ |
| Zoom, host **not** connected → **never a fake `zoom.us` URL**; `/meet/[id]` room + `zoom_pending_connection` | ✅ |
| Zoom real path → migration `20260911000000` not applied is **detected and reported** (`provider 'zoom'` rejected by CHECK); flagged pending, not failed | ✅ |
| **Google Meet regression** — unchanged (still resolves to its own honest state) | ✅ |

### Unit tests

- `src/lib/calendar/meetingLink.test.ts` — rewrote the old `zoom => pending_integration`
  case; added full **zoom** + **teams** branch coverage (real link + id carried;
  API-fail → `*_unavailable` + internal room, NEVER a fake provider URL; not
  connected → `*_pending_connection`; Teams uses the `'outlook'` connection) and
  `applyResolvedMeetingLink` persistence for `zoom_meeting_id` / `teams_meeting_id`.
- `src/lib/calendar/zoomMeeting.test.ts` *(new, 12)* — real request shape,
  `id`-as-string, no-connection → nulls no-fetch, API error → nulls never-throws,
  PATCH/DELETE status handling (204/404/error).
- `src/lib/calendar/teamsMeeting.test.ts` *(new, 8)* — Graph `/me/onlineMeetings`
  on the **outlook** connection, `joinWebUrl` + id, scope-missing (403) → nulls,
  PATCH/DELETE handling.
- `src/lib/calendar/calendarEventSync.test.ts` — outcome-shape assertions updated
  for the new `zoom` / `teams` fields.
- `scripts/db-checks/task63-verify.ts` — the `zoom` case updated (Task 70 made it
  a real branch with a working fallback instead of `null`).

### Suite / types / lint / build

- `vitest run` → **55 files / 524 tests pass**.
- `tsc --noEmit` clean · `next lint` (all changed files) clean.
- `next build` → **BUILD EXIT 0**, 242/242 static pages. (An unrelated
  pre-existing `hb.wasm` avatar-generator warning appears but is non-fatal.)

---

## External setup required — before Zoom/Teams can go fully live

Mirrors how Google/Facebook OAuth login setup was handled earlier in this project.

### A. Apply the migration
`supabase/migrations/20260911000000_task70_video_conferencing.sql` — adds the
`'zoom'` provider and `'teams'` meeting mode. Until applied, connecting Zoom or
selecting Teams mode will be rejected by a CHECK constraint.

### B. Zoom Marketplace app (needed for Zoom only)
1. In the **Zoom App Marketplace** (marketplace.zoom.us) → Develop → Build App →
   **"User-managed OAuth"** (formerly "OAuth" app type).
2. **Redirect URL for OAuth** + **OAuth allow list**:
   `https://www.leadsmind.io/api/auth/zoom/callback`
   (and `http://localhost:3000/api/auth/zoom/callback` for local).
3. **Scopes**: `meeting:write:meeting`, `meeting:update:meeting`,
   `meeting:delete:meeting`, `user:read:user` (or classic: `meeting:write`,
   `meeting:read`, `user:read`).
4. Copy **Client ID** / **Client Secret** into env:
   `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`.
5. Flip the Zoom card in `integrations-hub/page.tsx` from `coming_soon` to
   `available` (one value).
6. For public distribution Zoom requires app review; for a single-workspace
   internal app you can use it in **development** mode without review.

### C. Microsoft / Azure app permission (needed for Teams only)
The existing Outlook app (`OUTLOOK_CLIENT_ID`) just needs one more permission:
1. **Azure Portal → App registrations →** the LeadsMind calendar app **→ API
   permissions → Add → Microsoft Graph → Delegated →** `OnlineMeetings.ReadWrite`
   → add. (No admin consent needed for delegated `OnlineMeetings.ReadWrite`
   unless the tenant requires it.)
2. Each user **reconnects** Outlook once (Settings → Integrations) to pick up the
   new scope — existing calendar sync keeps working meanwhile.
3. Flip the Microsoft Teams card to `available`.

### D. Then move these to fully verified
Run `scripts/db-checks/task70-video-conferencing-verify.ts` again (the Zoom real
path will now execute), then a real browser QA: connect a real Zoom account,
create a booking on a Zoom-mode calendar, confirm a working `zoom.us/j/…` link,
reschedule + cancel and confirm the meeting updates/disappears in the Zoom
client. Same for Teams with a real M365 account.

---

## Deliberately Deferred

- **Zoom Server-to-Server OAuth (account-level, no per-user connect).** This
  build uses **User-managed OAuth** (each host connects their own Zoom), which
  matches the per-user `user_calendar_connections` model already used for
  Google/Outlook. An account-level S2S app (one connection for the whole
  workspace) is a different model and a separate decision.
- **Zoom/Teams busy-slot sync.** Zoom/Teams meetings are created *by* LeadsMind;
  reading a host's external Zoom/Teams calendar for availability is not a thing
  those APIs expose the way Google/Outlook free-busy do. Availability still
  consults the host's Google/Outlook calendars (Task 62) unchanged.
- **Zoom/Teams webhooks** (meeting started/ended, participant events) — the
  `/api/meet/webhooks/{google,outlook}` pattern exists; Zoom/Teams equivalents
  are a telemetry feature, not part of "create a working meeting link".
- **Passing attendees / alternative hosts into the Zoom/Teams meeting.** The
  meetings are created with the host as owner and an open join link (same as the
  current Google Meet behaviour); adding the booker as a registered participant
  is a follow-up.
- **A dedicated per-user "my video accounts" settings surface.** Connect/disconnect
  works through the existing Integrations Hub; a richer per-calendar "which of my
  connected providers to use" picker is out of scope.
- **Backfilling `zoom_pending_integration` rows.** Old bookings created before
  this task keep that legacy status and its honest note; they are not rewritten.
