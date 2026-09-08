# Task 62 — Step 1 Audit Findings (before building)

Two premises in the task brief turned out to be **wrong in the customer's
favour of "worse than described"**, and one new blocker (a shared OAuth
route contended with Search Console) changes the build shape. Flagging
before writing ~12 files.

---

## 1.1 — What `/api/auth/google` + callback actually write

- `src/app/api/auth/google/route.ts` (GET): builds a Google consent URL,
  scopes `calendar.events calendar.readonly`, `access_type=offline`,
  `prompt=consent`, `redirect_uri = /api/auth/google/callback`. **No
  `state`/CSRF nonce** (the repo's `createOAuthStateNonce` pattern is not
  used here).
- `src/app/api/auth/google/callback/route.ts` (GET): exchanges the code,
  then `supabase.from('platform_connections').upsert({ workspace_id,
  platform: 'google_calendar', status: 'connected', credentials: {
  access_token, refresh_token, expiry_date } }, { onConflict:
  'workspace_id, platform' })`. Redirects `/settings?success=GoogleCalendarConnected`.
  Ignores `state` entirely; trusts the session's active workspace.

### 🔴 BLOCKER A — the write **fails at the database**

`platform_connections.platform` has a CHECK constraint. Its current
definition (`20260811000000_add_x_youtube_platforms.sql`, the latest of 4
redefinitions):

```
CHECK (platform IN ('email','sms','whatsapp','instagram','linkedin','facebook','tiktok','x','youtube'))
```

`'google_calendar'` has **never** been an allowed value. So the callback's
`upsert` throws a constraint violation → `dbError` → the catch redirects to
`/settings?error=OAuthFailed`. **A user connecting Google Calendar today
gets an error page, and nothing is ever stored.** The audit's "Google
connect is real but sync-orphaned" was too generous — it's fully broken,
not mis-targeted.

Also: `platform_connections` is `UNIQUE(workspace_id, platform)` (one row
per workspace) and its RLS is now **admin/owner-only**
(`20260725000005_tighten_connections_rls.sql`). Both are wrong for
"each team member connects their own calendar."

## 1.2 — What the availability-sync code actually reads

- `src/lib/calendar/calendarSync.ts` — `getExternalBusySlots(userId,…)`,
  `syncBookingToExternal(appointmentId)`, `refreshUserCalendarToken(…)` —
  all read **`user_calendar_connections`** (`user_id`, `provider IN
  ('google','outlook')`, `status='connected'`, `credentials` JSONB with
  `{accessToken, refreshToken, expiresAt}`).
- `src/app/api/meet/webhooks/google/route.ts` and `…/outlook/route.ts` —
  also read `user_calendar_connections` (by
  `credentials->>google_channel_id` / `credentials->>outlook_subscription_id`).
- `src/lib/calendar/googleMeet.ts` — the **only** calendar file that reads
  `platform_connections` (`platform='google_calendar'`,
  `credentials.refresh_token`). Since 1.1 means that row never exists,
  `createGoogleMeetLink` **always returns `null`** today and every caller
  falls back to the internal `/meet/[id]` room. (So the "regression risk"
  on `createGoogleMeetLink` is real in code but nil in current behaviour —
  it's a no-op that degrades gracefully.)

### 🔴 BLOCKER B — nothing has ever written `user_calendar_connections`

Confirmed by grep: 0 `insert`/`upsert` into that table anywhere. The
entire external-sync layer (`calendarSync.ts` + both meet webhooks) reads a
table that is always empty. `public.ts: bookAppointment` calls
`syncBookingToExternal` on every free booking — it returns `false`
immediately, every time.

### 🔴 BLOCKER C — the second availability engine is the one wired to external sync, and it's dead

- **LIVE engine:** `scheduling.ts: getAvailableSlots` — used by public
  booking, internal booking, and reschedule. **Does not call
  `getExternalBusySlots` at all.**
- **DEAD engine:** `lib/calendar/availability.ts: getHostAvailability` —
  the one that *does* call `getExternalBusySlots` — has **zero callers**.

So even after fixing the token store, external calendar busy times will
**not** affect real booking availability until `getExternalBusySlots` is
wired into `getAvailableSlots`. This is the "prove the downstream effect"
work and it touches the core booking path.

## 1.3 — Token-store decision → **`user_calendar_connections`** (confirmed with you)

Reasoning: per-user is structurally required (round-robin/collective =
N hosts each with their own calendar; `platform_connections` is one-per-
workspace); all 4 existing sync consumers + 2 webhooks already read it;
only `googleMeet.ts` needs repointing; `platform_connections` would need a
CHECK migration + RLS loosening + is semantically the messaging-inbox
table. The `platform_connections` `google_calendar` path is flagged
**obsolete, not deleted** (it never worked).

## 1.4 — Google OAuth client distinctness — ⚠️ one client, **three** contending flows, one shared callback

`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` is reused by, per code
comments and grep:

| Flow | Initiator | Scope | Redirect URI |
|---|---|---|---|
| **Calendar** | `/api/auth/google/route.ts` | `calendar.events calendar.readonly` | `/api/auth/google/callback` |
| **Search Console (GSC)** | `seo.ts: getGoogleAuthUrl` (`SeoTab.tsx` "Connect GSC") | `webmasters.readonly` | `/api/auth/google/callback` (same!) |
| **Gmail / YouTube** | (referenced in `social.ts`, `publish.ts`, youtube callback — youtube uses its *own* callback) | gmail/youtube | mixed |

- **The Supabase-auth Google *login* client is separate** — that goes
  through Supabase's provider config + `/auth/callback`, not
  `/api/auth/google/*`. Confirmed distinct (per `auth-methods-oauth-build.md`).
  No collision there.
- **But Calendar and GSC share `/api/auth/google/callback`**, and that
  callback contains **only calendar logic** — it doesn't look at `state`,
  doesn't check scope, always writes `platform_connections google_calendar`.
  So the **GSC connect flow is also broken**: completing it runs the
  calendar callback, which then fails Blocker A anyway. `seo_projects.
  gsc_refresh_token_encrypted` / `gsc_connected=true` are read by the
  `gsc-sync` worker but **never written by anything**.

### 🟡 BLOCKER D — route contention

Task 62 cannot just "fix the callback" — that callback is shared with a
different feature. Options:
- **(recommended)** give Calendar its own dedicated routes
  `/api/auth/google-calendar/route.ts` + `/callback`, leave
  `/api/auth/google/*` alone. Register the new redirect URI in the Google
  Cloud console (ops step for you). Clean separation, no risk to GSC/SEO.
  Flag GSC-connect-is-also-broken as a separate SEO-module bug (out of
  scope here).
- (alt) make the shared callback branch on `state` nonce `platform`
  (`'google'` vs `'google_calendar'`) and on granted `scope`. Riskier —
  touches a route another team's feature depends on, and GSC's own code
  (`seo.ts`) would need the matching write logic added.

## 1.5 — `createGoogleMeetLink` — must keep working

Currently returns `null` always (Blocker A) → callers use `/meet/[id]`.
After the fix it should read `user_calendar_connections` (provider
`google`, the acting user) and reuse `refreshUserCalendarToken`. Preserve
the `null` fallback exactly so `internal_meet` bookings never hard-fail.

## 1.6 — Outlook / Microsoft Graph

- `src/app/api/auth/microsoft/callback/route.ts` exists, real token
  exchange, writes `platform_connections` `outlook_calendar` — **same
  Blocker A** (CHECK rejects it), **no `state` check**, and **no
  initiation route** (`/api/auth/microsoft/route.ts` does not exist).
- `ConnectProviderModal.tsx` for a non-Google `email_calendar` provider →
  `setOauthWarning('… coming soon')`. Button is decorative.
- No `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` usage anywhere else
  — no partial Microsoft infra to reuse (the `microsoft/callback` youtube
  comment refers to a different flow). Graph calendar scopes needed:
  `offline_access Calendars.Read Calendars.ReadWrite User.Read`.
- The Outlook branch in `calendarSync.ts` (`getSchedule`, event push) is
  already written and reads `user_calendar_connections` provider
  `'outlook'` — so once the connect flow populates that table, Outlook
  sync works through the same path as Google.

## 1.7 — Connection status is a *third* table

`workspace_integrations` (`provider` = display name e.g. "Google
Calendar", `connected` bool, `account_label`, `credentials`) is what the
Integrations Hub UI reads (`useWorkspaceIntegrations` →
`/api/settings/integrations`). Neither OAuth callback writes it today, so
even in the imagined happy path the card would never flip to "Connected".
The build must upsert `workspace_integrations` on connect and clear it on
disconnect, in addition to `user_calendar_connections`.

---

## Revised build shape (what I'll do on approval)

1. **Migration** — `user_calendar_connections`: add `last_sync_at`, keep
   everything else in `credentials` JSONB; store token values via
   `encrypt()` as `access_token_encrypted` / `refresh_token_encrypted`
   (matches the Meta pattern), non-secret metadata (`expires_at`, `email`,
   `scope`, future channel/subscription ids) plaintext so the webhook
   `->>'…'` lookups keep working.
2. **`src/lib/calendar/connections.ts`** (new) — `storeCalendarConnection`,
   `getDecryptedCalendarCredentials`, `deleteCalendarConnection`,
   `listWorkspaceCalendarConnections`, `revokeProviderToken`.
3. **Google** — new dedicated routes `/api/auth/google-calendar/route.ts`
   (nonce + consent) + `/callback` (consume nonce, exchange, fetch
   userinfo email, `storeCalendarConnection`, upsert
   `workspace_integrations`, redirect to Integrations Hub with a result
   flag). Leaves `/api/auth/google/*` untouched.
4. **Outlook** — new `/api/auth/microsoft/route.ts` (nonce + consent) +
   rewrite `/api/auth/microsoft/callback/route.ts` (consume nonce,
   exchange, `/me` email, `storeCalendarConnection`, `workspace_integrations`).
5. **`calendarSync.ts`** — `refreshUserCalendarToken` decrypts / re-encrypts
   via `connections.ts`; add `status='connected'` bump + `last_sync_at` on
   success; keep `status='error'` on refresh failure.
6. **`googleMeet.ts`** — repoint to `user_calendar_connections` + reuse
   `refreshUserCalendarToken`; preserve `null` fallback.
7. **`scheduling.ts: getAvailableSlots`** — resolve host user id(s)
   (`round_robin_assignment.user_id`, else `workspaces.owner_id`), call
   `getExternalBusySlots` in a try/catch, subtract those intervals from
   available slots. Add `external_calendar_conflict` reason code to
   `diagnoseSlotUnavailable`.
8. **`ConnectProviderModal.tsx`** — route `google` → `/api/auth/google-calendar`,
   `outlook`/`microsoft` → `/api/auth/microsoft`; drop "coming soon" for
   Outlook.
9. **Disconnect** — extend `DELETE /api/settings/integrations` (or a
   dedicated calendar action): clear `workspace_integrations`, delete the
   caller's `user_calendar_connections` row for that provider, best-effort
   provider token revoke (`https://oauth2.googleapis.com/revoke`).
10. **Tests** — unit tests for `connections.ts` (encrypt round-trip,
    shape), for the `getAvailableSlots` external-busy subtraction (mocked
    `getExternalBusySlots`), and for token-refresh decrypt/re-encrypt.

## Deferred / flagged (not in this task)

- **GSC connect is also broken** (`/api/auth/google/callback` never writes
  `seo_projects.gsc_*`) — separate SEO-module bug.
- `platform_connections` `google_calendar` / `outlook_calendar` write
  paths + `appointments.ts` zoom `platform_connections` check → obsolete,
  left for the end-of-module cleanup pass.
- Per-user multi-host connection management UI (connecting 5 round-robin
  hosts' calendars from settings) — v1 manages the caller's own; round-
  robin external sync resolves per-assignment-member rows that exist.
- Google Calendar **watch channel** / Outlook **subscription** registration
  (the meet webhooks expect these `credentials` keys) — inbound push sync
  stays dormant; polling `getExternalBusySlots` at booking time is the v1
  mechanism.
