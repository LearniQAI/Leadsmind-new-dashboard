# Task 62 — Real Google Calendar & Outlook "Connect" — Build Report

Built per the approved dedicated-route plan (Blocker D). Token store =
**`user_calendar_connections`** (single source of truth, Step 1.3).
`/api/auth/google/*` was **not touched** — Search Console keeps it.

---

## What changed

### New files
| File | Purpose |
|---|---|
| `src/lib/calendar/connections.ts` | Owns the `user_calendar_connections` read/write shape for every consumer. `storeCalendarConnection`, `getCalendarConnection`, `getFreshCalendarAccessToken` (refresh + re-encrypt + persist, flips `status='error'` on failure — never a silent stale token), `deleteCalendarConnection` (best-effort Google `oauth2/revoke` first), `syncWorkspaceCalendarIntegrationRow` (recomputes the `workspace_integrations` UI status row from live per-user rows), `listWorkspaceCalendarConnections`. Token values encrypted at rest with `lib/encryption.ts` (AES-256-GCM) as `access_token_encrypted` / `refresh_token_encrypted`; non-secret metadata + the pre-existing webhook keys stay plaintext. |
| `src/app/api/auth/google-calendar/route.ts` | Dedicated Google Calendar consent initiation — CSRF nonce (`createOAuthStateNonce`), `access_type=offline`, `prompt=consent`, scopes `calendar.events calendar.readonly openid email`. |
| `src/app/api/auth/google-calendar/callback/route.ts` | Consumes the nonce, exchanges the code, resolves the account email, `storeCalendarConnection('google')`, redirects to `/settings/integrations-hub` with a result flag. |
| `src/app/api/auth/microsoft/route.ts` | **New** Outlook/M365 consent initiation (was missing entirely) — nonce, `offline_access Calendars.Read Calendars.ReadWrite User.Read`, Microsoft identity platform `/authorize`. |
| `supabase/migrations/20260909000000_calendar_oauth_connection_store.sql` | Partial index on `(user_id, provider) WHERE status='connected'` + a table comment. **Non-blocking** — the code does not depend on it; everything fits the existing columns + `credentials` JSONB. |
| `scripts/db-checks/task62-verify.ts` | Live DB verification (see Verified below). |
| `src/lib/calendar/connections.test.ts`, `src/app/actions/calendar/scheduling.externalBusy.test.ts` | Unit tests. |

### Modified files
| File | Change |
|---|---|
| `src/app/api/auth/microsoft/callback/route.ts` | Rewritten: consumes the nonce, writes `user_calendar_connections` (`provider='outlook'`) instead of the doomed `platform_connections 'outlook_calendar'`. Standardised on `OUTLOOK_CLIENT_ID/SECRET` (the old code referenced a non-existent `MICROSOFT_CLIENT_ID`). |
| `src/lib/calendar/googleMeet.ts` | Repointed from `platform_connections 'google_calendar'` → `user_calendar_connections` (acting user, `provider='google'`) via `getCalendarConnection` + `getFreshCalendarAccessToken`. **`null` fallback preserved exactly** — an `internal_meet` booking never hard-fails if Google is unavailable. |
| `src/lib/calendar/calendarSync.ts` | Old inline `refreshUserCalendarToken` (expected a plaintext credential shape that nothing wrote) replaced by a thin `getConnectionAccessToken` adapter over `connections.ts`. Both call sites (`getExternalBusySlots`, `syncBookingToExternal`) updated. |
| `src/app/actions/calendar/scheduling.ts` | **Blocker C fix.** `getAvailableSlots` (the LIVE engine) now resolves the host user (`round_robin_assignment` member → else `workspaces.owner_id`) and subtracts `getExternalBusySlots()` intervals from the offered slots — wrapped so a provider outage can never break slot loading. `diagnoseSlotUnavailable` gains an `external_calendar_conflict` reason code so a blocked slot says why, not "unavailable". |
| `src/components/settings/ConnectProviderModal.tsx` | "Google Calendar" → `/api/auth/google-calendar`; "Outlook & Microsoft 365" → `/api/auth/microsoft`. "Coming soon" no longer shown for Outlook. |
| `src/app/settings/integrations-hub/page.tsx` | Handles the `?calendar_connected=` / `?calendar_error=` round-trip with a toast + refetch; strips the params. Card connected-state comes from `workspace_integrations` (written by the callbacks via `syncWorkspaceCalendarIntegrationRow`). |
| `src/app/api/settings/integrations/route.ts` | `DELETE` for "Google Calendar" / "Outlook & Microsoft 365" now removes the caller's `user_calendar_connections` row (remote-revoke first) and lets `syncWorkspaceCalendarIntegrationRow` recompute the card — so the card stays "connected" if another workspace member still has a live connection. |

---

## Verified / Fixed (provable without a browser)

### Live DB verification — `npx tsx scripts/db-checks/task62-verify.ts` → **14/14 passed**

Runs against the real linked Supabase project with a throwaway auth user +
its auto-provisioned workspace + a seeded booking calendar. Only the outbound
provider HTTP (Google's `oauth2/token` + `calendar/v3/freeBusy`) is faked —
that boundary is the manual-QA handoff. Everything else is real: real rows,
real `getExternalBusySlots`, real `getAvailableSlots`.

| Check | Result |
|---|---|
| `storeCalendarConnection` creates a `user_calendar_connections` row | ✅ |
| access token stored **encrypted** — plaintext token absent from the row JSON | ✅ |
| non-secret `email` stored plaintext for the UI label | ✅ |
| `workspace_integrations` "Google Calendar" flips `connected=true` (label = account email) | ✅ |
| graceful degradation: an expired/invalid token does **not** break slot loading (8 slots still returned) | ✅ |
| a failed token refresh flips the connection to `status='error'` — **not a silent no-op** | ✅ |
| **a busy block on the connected calendar removes exactly the overlapping 10:00 slot** (8 → 7); 09:00 and 11:00 stay | ✅ **the core downstream proof** |
| disconnect deletes the `user_calendar_connections` row | ✅ |
| disconnect flips `workspace_integrations` back to `connected=false` | ✅ |
| after disconnect the 10:00 slot is available again | ✅ |

### Unit tests — `vitest run` → **full suite 45 files / 417 tests green**, incl. 13 new

- `connections.test.ts` (7): encrypt/decrypt round-trip; refresh-token retained when the provider doesn't re-issue one; webhook-only rows tolerated; `getFreshCalendarAccessToken` returns an unexpired token unchanged; refreshes + re-encrypts + persists within the 5-min window; **throws + marks `status='error'`** on a missing refresh token and on a provider `invalid_grant`.
- `scheduling.externalBusy.test.ts` (3): the external busy block removes exactly the overlapping slot and keeps the rest; full set returned when there's no connection; a provider exception never breaks slot loading.

### Static

- `tsc --noEmit` — clean.
- `next lint` on every changed file — clean (`no-console` disabled only in the CLI verify script).
- `next build` — see the end of this doc / build log.

### `createGoogleMeetLink` regression

- Before this task it **always returned `null`** (it read `platform_connections 'google_calendar'`, a row that can never exist — that table's `platform` CHECK rejects the value), so every caller already fell back to `/meet/[id]`.
- After: reads the acting user's `user_calendar_connections` row; if none / refresh fails / API errors → still returns `null` → same `/meet/[id]` fallback. The internal-meet path is strictly more capable, never less. No behavioural regression is possible.

---

## Deliberately Deferred / needs your manual QA

### 🔷 Manual OAuth QA checklist (run these, report back)

Prereq: `GOOGLE_CLIENT_ID/SECRET` present (they are); the new redirect URI
`https://www.leadsmind.io/api/auth/google-calendar/callback` registered (done);
for Outlook, `OUTLOOK_CLIENT_ID/SECRET` set in the environment **and** the
redirect URI `https://www.leadsmind.io/api/auth/microsoft/callback` registered
in the Azure app (+ delegated Graph permissions `Calendars.Read`,
`Calendars.ReadWrite`, `User.Read`, `offline_access`).

**Google**
1. Settings → Integrations Hub → **Connect** on "Google Calendar" → "Continue to Google Calendar" → real Google consent screen. Approve.
2. Land back on Integrations Hub with a green success toast; the card shows **Connected** with your Google account email as the label.
3. DB check: `select provider, status, credentials->>'email' from user_calendar_connections where provider='google';` → one `connected` row, your email, `access_token_encrypted` present (starts `gcm1:`).
4. Put a real event on your Google Calendar for, say, tomorrow 14:00–15:00. Open your booking page (`/book/<slug>` for a calendar whose host is you / the workspace owner). Confirm the 14:00 slot is **gone**, adjacent slots present.
5. Remove that Google event → refresh the booking page → the 14:00 slot is back.
6. Book an `internal_meet` appointment as the connected user → confirm `meeting_link` is a real `https://meet.google.com/xxx-...` (a genuine room you can open), not `/meet/<id>`.
7. Integrations Hub → **Disconnect** "Google Calendar" → card flips to not-connected; `user_calendar_connections` row gone; booking page slots no longer reflect your Google calendar.
8. Token-refresh: leave the connection ~1h (past `expires_in`), then load a booking page → still works (silent refresh); `updated_at` on the row advanced.
9. Revoke access from [myaccount.google.com](https://myaccount.google.com/permissions) while connected → load a booking page → the connection flips to `status='error'` (not a crash, not a silent skip); the card should prompt to reconnect.
10. Cancel the consent screen (don't approve) → land back with a "connection was cancelled" toast, nothing stored.

**Outlook / Microsoft 365** — repeat 1–10 with the "Outlook & Microsoft 365" card, a real Outlook/M365 calendar event, and `provider='outlook'` rows. (Microsoft rotates refresh tokens — check the row's `refresh_token_encrypted` changes after a refresh; that's expected.)

**Cross-check**
11. Confirm **Search Console still connects** (Settings → SEO tab → Connect GSC) — this task must not have touched it. (Note: GSC connect has its own pre-existing bug, tracked separately — you're only checking Task 62 didn't make it *worse*.)

### Flagged obsolete — NOT removed (per the end-of-module cleanup agreement)

- **`platform_connections 'google_calendar'` / `'outlook_calendar'` write paths** — the old `/api/auth/google/callback` calendar branch is now dead (that callback is GSC-shared and its calendar write always failed the `platform` CHECK anyway). Nothing writes these values any more.
- **`appointments.ts` zoom branch** reads `platform_connections 'zoom'` — also a value that table's CHECK rejects; unreachable. (Task 70 territory.)
- **2 stale fixture rows** in `user_calendar_connections` (workspace `abdff454…`, `google_channel_id`-only, from the July webhook tests) — the new code will flip them to `status='error'` if that workspace loads a booking page (they have no tokens). Harmless; delete in the cleanup pass.
- The migration's index is nice-to-have; apply it whenever the migration flow runs (code doesn't need it).

### Explicitly out of scope (unchanged)

- Google Calendar **watch channels** / Outlook **subscriptions** for inbound push — the `/api/meet/webhooks/{google,outlook}` routes still expect `credentials.google_channel_id` etc. which nothing registers. v1 mechanism is polling `getExternalBusySlots` at booking time. (Task 66/67 territory.)
- Per-calendar host binding: `booking_calendars` has no owner column, so external busy for personal/collective calendars resolves to the **workspace owner**. Multi-host round-robin resolves to the first `round_robin_assignment` member. A richer "which host, exactly" model + a per-user "connect my calendar" management UI for every team member is a follow-up.
- The pre-existing `zonedTimeToUtc` server-TZ latent bug (flagged in `docs/calendar.md`) is untouched — production runs UTC so it's correct there.
