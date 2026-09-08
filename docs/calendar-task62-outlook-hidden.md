# Outlook "Connect" button — temporarily hidden (Task 62 follow-up)

Outlook/M365 calendar OAuth is fully built (`/api/auth/microsoft/*` + all
sync code, Task 62) but the Azure app registration +
`OUTLOOK_CLIENT_ID`/`OUTLOOK_CLIENT_SECRET` are deferred. Until then the
"Connect" button is shown as a dimmed **"Coming soon"** card so nobody
clicks into a broken flow.

## Choice: disabled "Coming soon", not fully hidden

`src/app/settings/integrations-hub/page.tsx` already has a first-class
`status: 'coming_soon'` state — `renderIntegrationCard()` renders a dimmed,
non-clickable card with a grey "Coming soon" badge, used today by Slack,
Make.com, Shopify, WooCommerce, Meta Ads, Google Ads, Mailchimp. Reusing
it means:
- the Email & Calendar section keeps three cards (Gmail, Google Calendar,
  Outlook) — no empty gap, nothing looks broken;
- it signals to users that Outlook is planned, not dropped;
- **re-enabling is a one-word change** — no new code, no rebuild logic.

## Verified / Fixed

Real screenshot (`/settings/integrations-hub`, logged in as the QA test
user, dev server) — the Email & Calendar section:

| Card | State |
|---|---|
| Gmail | **Connect** (red, active) — unchanged |
| Google Calendar | **Connect** (blue, active) — unchanged |
| Outlook & Microsoft 365 | dimmed card, grey **"Coming soon"** badge, **no Connect control** |

Playwright DOM assertion confirmed the Outlook card renders **zero
`button`/`a` connect controls** (`"controls": []`).

**Google regression check (real browser):**
- "Connect" on Google Calendar → opens the `Connect Google Calendar` modal (unchanged).
- "Continue to Google Calendar" → routes to `/api/auth/google-calendar` → redirects to `https://accounts.google.com/o/oauth2/v2/auth?client_id=…`.
- (It then lands on Google's `invalid_client` page **only because this env's `GOOGLE_CLIENT_ID` is the placeholder value** — a config gap, not a code regression; production has a real client id. The flow reaching Google's consent URL correctly is the thing being verified.)

- `tsc --noEmit` → clean.
- `next lint` on the changed file → clean (`✔ No ESLint warnings or errors`).
- `vitest run` → **45 files / 417 tests pass** (unchanged; this edit touches no tested code path).
- `next build` → succeeds (see build log).

Screenshot saved to `C:\Users\User\AppData\Local\Temp\ihub-emailcal.png` during verification.

## Deliberately Deferred — how to re-enable (one line)

**File:** `src/app/settings/integrations-hub/page.tsx`
**Line:** the `'Outlook & Microsoft 365'` entry in the Email & Calendar
integrations array (~line 156, directly under a comment block explaining
this).

```diff
-  desc: 'Sync your Outlook emails and calendar events automatically', status: 'coming_soon', category: 'email_calendar' },
+  desc: 'Sync your Outlook emails and calendar events automatically', status: 'available', category: 'email_calendar' },
```

Flip `status: 'coming_soon'` → `status: 'available'`. That's the entire
change — the card immediately becomes a live "Connect" button wired to
`/api/auth/microsoft` (via `ConnectProviderModal`'s existing
`p.includes('outlook')` branch). Prerequisites before flipping:
1. `OUTLOOK_CLIENT_ID` / `OUTLOOK_CLIENT_SECRET` set in the environment.
2. Redirect URI `https://www.leadsmind.io/api/auth/microsoft/callback`
   registered on the Azure app, with delegated Graph permissions
   `Calendars.Read`, `Calendars.ReadWrite`, `User.Read`, `offline_access`.

**Untouched (all Task 62 Outlook code stays intact):**
- `src/app/api/auth/microsoft/route.ts` (initiation)
- `src/app/api/auth/microsoft/callback/route.ts` (callback)
- `src/lib/calendar/connections.ts` — `provider: 'outlook'` paths
- `src/lib/calendar/calendarSync.ts` — Outlook Graph `getSchedule` / event push
- `src/components/settings/ConnectProviderModal.tsx` — the `outlook`/`microsoft` → `/api/auth/microsoft` routing (dormant while the card is `coming_soon`, since a `coming_soon` card never opens the modal)
