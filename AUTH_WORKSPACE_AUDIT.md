# LeadsMind — Auth & Workspace Audit Report

Date: 2026-07-05
Audited by: Claude Code
Branch: `dashboard`

---

## Executive Summary

- **Root cause #1 (confirmed in migration SQL):** `supabase/migrations/20240101000001_fix_auth_workspace.sql:133-140` creates a `FOR ALL` RLS policy on `public.workspace_members` ("Workspace admins can manage memberships") whose `USING` clause queries `public.workspace_members` directly — a self-referencing policy. Postgres/PostgREST evaluates **all** permissive policies for a table for every command, so this recursive policy fires on every `SELECT`/`INSERT` against `workspace_members`, not just admin actions. This produces the classic `infinite recursion detected in policy for relation "workspace_members"` error → PostgREST 500. It has never been dropped or replaced in any of the 228 subsequent migrations.
- **This is the exact match for the reported symptom.** [basic-form.tsx:69-83](src/form/auth/SignIn/basic-form.tsx#L69-L83) queries `workspace_members` right after login, logs `console.error("[LoginForm] Error fetching workspaces:", wsError)`, and shows `"Unable to load your workspace. Please try again."` — this is verbatim what's failing in production.
- **Root cause #2 (confirmed in code):** [src/lib/supabase/client.ts:6-8 and 14-16](src/lib/supabase/client.ts#L6-L8) `throw new Error('[FATAL] Supabase env vars are not set')` at **module import time** if `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing. Next.js inlines `NEXT_PUBLIC_*` values at **build time**, not runtime — if the Vercel production build ran before the anon key was rotated/updated (per the "Sprint 1 key rotation" note), every client bundle that imports this module (login form, signup form, dashboard) throws immediately on load, before any UI can render.
- **No error boundary exists anywhere in `src/app`** (`error.tsx` / `global-error.tsx` are absent). A synchronous throw from either root cause above has nothing to catch it, so the browser renders the raw (unstyled, dark-body) HTML shell with no content — this is the "blank black screen."
- **Workspace auto-creation on signup DOES exist** — a DB trigger (`handle_new_user` / `on_auth_user_created`) in the very first migration — but the app doesn't trust it: signup, the dashboard page, and `getCurrentWorkspace()` in `lib/auth.ts` all independently re-implement "create a workspace if none exists," and the two client/server-side fallbacks both attempt an `INSERT` into `workspace_members`, which is itself broken by root cause #1.
- `src/app/dashboard/layout.tsx` imports `getCurrentProfile`, `getCurrentWorkspace`, `getUserRole`, `fetchBranding`, `DashboardProvider`, `BrandingProvider` — none of them are used in the function body. The real provider wiring lives in the root `src/app/layout.tsx`. Dead/misleading code, not a functional bug, but worth cleaning up.

---

## 1. Authentication Flow

### 1.1 Login form — [src/form/auth/SignIn/basic-form.tsx](src/form/auth/SignIn/basic-form.tsx)

```
Step 1: supabase.auth.signInWithPassword({ email, password })   [line 50-53]
Step 2: supabase.from("workspace_members")
          .select(`role, workspaces ( id, name, slug, logo_url, owner_id, plan_tier, created_at )`)
          .eq("user_id", authData.user.id)                      [line 69-77]
Step 3: if wsError -> console.error("[LoginForm] Error fetching workspaces:", wsError)
                      toast.error("Unable to load your workspace. Please try again.")
                      return                                    [line 79-83]
Step 4: if 0 workspaces -> redirect to /auth/signin-basic?error=no_workspace [line 111-115]
Step 5: if 1 workspace  -> setActiveWorkspace(id); redirect to /dashboard    [line 117-122]
Step 6: if >1 workspace -> show WorkspacePicker                             [line 123-127]
```

This is a **client-side** query using the anon/authenticated Supabase client (`createClient()` from `@/lib/supabase/client`), so it is fully subject to RLS. If the `workspace_members` policy set recurses, this call gets a `500` from PostgREST and lands exactly on the `wsError` branch — the toast and console message the user is seeing.

### 1.2 Auth callback route — [src/app/auth/callback/route.ts](src/app/auth/callback/route.ts)

- Exchanges `?code=` for a session via `supabase.auth.exchangeCodeForSession(code)` (line 37), or verifies `?token_hash=&type=` via `supabase.auth.verifyOtp` (line 64) for email confirmation / password reset links.
- On success: redirects to `${origin}${next}` (defaults to `/`, line 7-9).
- On failure (code/error, or no code/token_hash matched): redirects to `/auth/signin-basic?error=Verification failed` (line 75).
- Does not touch `workspace_members` at all — not implicated in the reported bug.

### 1.3 Middleware — [src/middleware.ts](src/middleware.ts) + [src/lib/supabase/middleware.ts](src/lib/supabase/middleware.ts)

- `src/middleware.ts` matches all routes except static assets (`config.matcher`, line 55-59), handles tracking-domain rewrites, then for platform hosts (`leadsmind.io`, `leadsmind.com`, `localhost`, etc.) calls `updateSession(request)`.
- `updateSession` (in `lib/supabase/middleware.ts`) builds a `createServerClient` from `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (line 68-70), calls `supabase.auth.getUser()` (line 114), enforces an 8-hour inactivity timeout via a `last_activity_at` cookie (line 116-142), and redirects:
  - Authenticated user on an `/auth/*` page → `/dashboard` (line 159-161)
  - Unauthenticated user on a non-public page → `/auth/portal/login` (if `/portal/*`) or `/auth/signin-basic` (line 163-169)
- Middleware never queries `workspace_members`/`workspaces` — it only checks session presence. It depends on `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (both must be correct in the Edge Runtime environment, i.e. set in Vercel, not just `.env.local`).

### 1.4 Workspace resolution — cookie + DB, not either/or

- `active_workspace_id` is an **httpOnly cookie**, set by the server action `setActiveWorkspace()` in [src/app/actions/auth.ts:112-122](src/app/actions/auth.ts#L112-L122) (30-day expiry, `path: '/'`, `sameSite: 'lax'`).
- It is read back in three separate places, each independently: [src/app/dashboard/page.tsx:20-21](src/app/dashboard/page.tsx#L20-L21), [src/lib/auth.ts:117-120,127](src/lib/auth.ts#L117-L120) (`getCurrentWorkspaceId`/`getCurrentWorkspace`), and mirrored client-side by [src/components/auth/WorkspaceSync.tsx](src/components/auth/WorkspaceSync.tsx) via `document.cookie`.
- If the cookie is missing, stale, or points at a workspace the user isn't a member of, `getCurrentWorkspace()` re-derives it by querying `workspace_members` for the user's first membership (line 144-155), and if **that** comes back empty, it auto-creates a workspace + membership row as a last resort (line 157-175) — see Section 3.

---

## 2. Root Cause of "Unable to load your workspace"

**File:** `supabase/migrations/20240101000001_fix_auth_workspace.sql`, lines 122-140.

```sql
-- Safe: uses a SECURITY DEFINER helper, does not recurse
CREATE POLICY "Workspace members visibility"
    ON public.workspace_members FOR SELECT
    USING (
        user_id = auth.uid() OR
        workspace_id IN (SELECT public.get_user_workspaces())
    );

-- BROKEN: this is a FOR ALL policy (covers SELECT/INSERT/UPDATE/DELETE),
-- and its USING clause queries workspace_members directly —
-- evaluating this policy requires re-evaluating RLS on workspace_members,
-- which re-evaluates this same policy, forever.
CREATE POLICY "Workspace admins can manage memberships"
    ON public.workspace_members FOR ALL
    USING (
        workspace_id IN (
            SELECT m.workspace_id FROM public.workspace_members m
            WHERE m.user_id = auth.uid() AND m.role = 'admin'
        )
    );
```

Postgres OR-combines all applicable **permissive** policies for a given command. Because the "visibility" SELECT policy and the "manage memberships" `FOR ALL` policy both apply to `SELECT` on `workspace_members`, Postgres must evaluate both — and evaluating the second one requires querying `workspace_members` again, which re-triggers RLS evaluation on the same table, infinitely. This raises `infinite recursion detected in policy for relation "workspace_members"`, which PostgREST surfaces as an HTTP 500.

Because this is `FOR ALL` (not just `FOR SELECT`), and has no separate `WITH CHECK` clause, Postgres also applies the same `USING` expression to `INSERT`/`UPDATE`/`DELETE` — so **writes** to `workspace_members` by non-service-role clients are equally broken (see Section 3, the `setupWorkspace`/`getCurrentWorkspace` fallback inserts).

**Confirmed still present:** grepping every migration file for this policy name and for "recursion" turns up only the original `CREATE POLICY` statement — it was never dropped, replaced, or superseded (checked all 228 files in `supabase/migrations/`).

**Exact failure path matching the reported bug:**
1. User submits credentials → [basic-form.tsx:50-53](src/form/auth/SignIn/basic-form.tsx#L50-L53) `signInWithPassword` succeeds.
2. [basic-form.tsx:69-77](src/form/auth/SignIn/basic-form.tsx#L69-L77) queries `workspace_members` as the now-authenticated user → RLS evaluates both policies → recursion → PostgREST 500.
3. `wsError` is truthy → [basic-form.tsx:79-83](src/form/auth/SignIn/basic-form.tsx#L79-L83) logs `[LoginForm] Error fetching workspaces:` and shows `"Unable to load your workspace. Please try again."` — this is the literal error text and console line reported in production.

The same query shape appears in [src/app/dashboard/page.tsx:23-32](src/app/dashboard/page.tsx#L23-L32) and in every helper in `lib/auth.ts` that touches `workspace_members` (`getCurrentWorkspace`, `getUserAccessInfo`, `getUserWorkspaces`), so this single policy bug is the common cause behind both the login-time and dashboard-time failures.

**Fix:** drop the recursive `FOR ALL` policy and replace it with one that also goes through the existing `SECURITY DEFINER` helper (or a second admin-only helper function), e.g.:

```sql
DROP POLICY IF EXISTS "Workspace admins can manage memberships" ON public.workspace_members;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;

CREATE POLICY "Workspace admins can manage memberships"
    ON public.workspace_members FOR ALL
    USING (public.is_workspace_admin(workspace_id))
    WITH CHECK (public.is_workspace_admin(workspace_id));
```

A `SECURITY DEFINER` function bypasses RLS *inside its own body*, so the nested lookup no longer re-triggers the calling policy.

---

## 3. New User Signup — Workspace Auto-Creation

**Does it exist? YES — and in triplicate.**

### 3.1 The DB trigger (authoritative, already correct)

`supabase/migrations/20240101000001_fix_auth_workspace.sql:145-202`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_full_name TEXT; v_first_name TEXT; v_last_name TEXT;
    v_workspace_name TEXT; v_workspace_id UUID; v_slug TEXT; v_base_slug TEXT; v_counter INT := 0;
BEGIN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    v_first_name := split_part(v_full_name, ' ', 1);
    v_last_name := COALESCE(NULLIF(substring(v_full_name from position(' ' in v_full_name) + 1), ''), '');

    INSERT INTO public.users (id, email, first_name, last_name, created_at)
    VALUES (NEW.id, NEW.email, v_first_name, v_last_name, now())
    ON CONFLICT (id) DO NOTHING;

    v_workspace_name := v_full_name || '''s Workspace';
    v_base_slug := lower(regexp_replace(v_full_name, '[^a-zA-Z0-9]', '-', 'g'));
    v_slug := v_base_slug;

    LOOP
        BEGIN
            INSERT INTO public.workspaces (name, slug, owner_id, plan)
            VALUES (v_workspace_name, v_slug, NEW.id, 'free')
            RETURNING id INTO v_workspace_id;
            EXIT;
        EXCEPTION WHEN unique_violation THEN
            v_counter := v_counter + 1;
            v_slug := v_base_slug || '-' || v_counter;
        END;
    END LOOP;

    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, NEW.id, 'admin')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

This fires `AFTER INSERT ON auth.users`, is `SECURITY DEFINER`, and runs as the function owner (Supabase's `postgres` role, which bypasses RLS). **This path is not affected by the recursive policy bug** and reliably creates a workspace + admin membership for every new `auth.users` row — including users created outside the app's signup form (e.g., via Supabase dashboard or a future OAuth flow).

### 3.2 Redundant client-triggered creation (signup form)

[src/form/auth/SignUp/basic-form.tsx:69-87](src/form/auth/SignUp/basic-form.tsx#L69-L87) calls the server action `setupWorkspace()` after `supabase.auth.signUp()` succeeds and a session is returned. [src/app/actions/auth.ts:23-110](src/app/actions/auth.ts#L23-L110) `setupWorkspace()`:
1. Upserts `public.users` (line 34-44)
2. Checks for an existing membership via `.from('workspace_members').select(...).eq('user_id', ...).single()` (line 51-56) — **this SELECT is subject to RLS and will hit the same recursion bug**, but since the trigger already ran synchronously during `auth.signUp()`, this lookup should normally find the trigger-created membership and short-circuit at line 58-61 (`if (existingMembership) return`). If RLS recursion errors it out instead, `existingMembership` is falsy and the code proceeds to create a *second* workspace (line 67-81) with a random-suffixed slug, and a *second* `workspace_members` insert (line 84-90) — which is itself broken by the same recursive `FOR ALL` policy (the insert error is only `console.warn`'d, not surfaced).

This means: because of a single RLS bug, a signing-up user can end up with **two workspaces** (one from the trigger, one from `setupWorkspace`), while the second workspace's membership row silently fails to insert.

### 3.3 Second redundant fallback (dashboard-time)

[src/lib/auth.ts:157-175](src/lib/auth.ts#L157-L175) inside `getCurrentWorkspace()` — if no workspace is found by any means when the dashboard loads, it inserts yet another workspace + membership. Same recursive-policy exposure on the `workspace_members` insert (line 170-172), and the insert's error return value isn't even captured.

**Conclusion:** auto-creation is implemented and the trigger itself is solid. The bug is not "missing auto-creation" — it's that two *additional*, redundant, RLS-exposed re-implementations of the same logic exist in application code, seemingly because the team didn't fully trust the trigger. Once the RLS recursion (Section 2) is fixed, the two redundant fallbacks in `setupWorkspace()` and `getCurrentWorkspace()` become genuinely safe no-ops (they already check for an existing membership first) — but they're still an unnecessary source of duplicate workspaces and should be simplified/removed once the trigger is verified reliable, or at least should stop silently swallowing insert errors.

---

## 4. Dashboard Load Issue ("blank black screen")

### 4.1 There is no `(dashboard)` route-group page — the real route is `src/app/dashboard/`

`src/app/(dashboard)/` only contains `quotes/*` pages; it is unrelated to the main dashboard. The actual `/dashboard` route lives at `src/app/dashboard/page.tsx`, wrapped by `src/app/dashboard/layout.tsx`, which is in turn wrapped by the root `src/app/layout.tsx`.

### 4.2 `src/app/dashboard/layout.tsx` — dead imports

```ts
import { getCurrentProfile, getCurrentWorkspace, getUserRole } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceSync } from '@/components/auth/WorkspaceSync';
import { redirect } from 'next/navigation';
import React from 'react';
import { fetchBranding } from '@/lib/branding';
import { DashboardProvider } from '@/components/layouts/DashboardProvider';
import { BrandingProvider } from '@/components/branding/BrandingProvider';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
 const supabase = await createServerClient();
 const { data: { user: authUser } } = await supabase.auth.getUser();
 if (!authUser) redirect('/auth/signin-basic');
 return <>{children}</>;
}
```

Only `createServerClient`/`redirect` are actually used — `getCurrentProfile`, `getCurrentWorkspace`, `getUserRole`, `fetchBranding`, `WorkspaceSync`, `DashboardProvider`, `BrandingProvider` are imported but never referenced. This isn't the cause of the blank screen (unused imports don't throw), but it's confusing: the real `DashboardProvider`/`BrandingProvider` wiring is in **root** `src/app/layout.tsx:85-99`, not here. Worth deleting the dead imports so the next engineer doesn't assume workspace context is set up per-dashboard-route.

### 4.3 `src/app/dashboard/page.tsx` — already has `force-dynamic`, already handles fetch errors

All five dashboard pages (`dashboard/page.tsx`, `crm-dashboard/page.tsx`, `hrm-dashboard/page.tsx`, `employee-dashboard/page.tsx`, `settings/account/page.tsx`) already declare `export const dynamic = 'force-dynamic'` (added in commit `04adaaa`) — this is **not** the missing piece anymore. `page.tsx:23-36` queries `workspace_members` (same shape as the login form) and on error redirects to `/auth/signin-basic?error=no_workspace` — handled, not a crash. Lines 84-93 then run 9 more Supabase queries + `AttributionEngine.getAttributionMetrics()` in a single `Promise.all`; none of those check their `.error` field, but none of them `throw` either (Supabase query builder resolves, it doesn't reject, on query errors) — reviewed `AttributionEngine.ts` in full, confirmed no unguarded throws.

### 4.4 The actual blank-screen mechanism: no error boundary + a module that throws on import

**`src/lib/supabase/client.ts`:**

```ts
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
 throw new Error('[FATAL] Supabase env vars are not set')      // <-- line 7, runs at import time
}

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('[FATAL] Supabase env vars are not set')    // <-- line 15, runs on every call
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
```

`NEXT_PUBLIC_*` variables are baked into the client JS bundle **at build time** by Next.js — not read from the server's runtime environment. If the Vercel production build that's currently deployed was built before `NEXT_PUBLIC_SUPABASE_ANON_KEY` was updated to the rotated key (or before it was set at all), the bundled value is `undefined`/stale, and **line 7 throws synchronously the moment this module is evaluated** — before React even mounts. Every page that imports this module client-side (the login form, the signup form, `WorkspacePicker`, anything under `use client` that calls `createClient()`) fails to load its JS at all.

Combined with the fact that **no `error.tsx` or `global-error.tsx` exists anywhere under `src/app`**, there is nothing to catch this and render a fallback UI — the browser is left with the raw HTML document (dark `body-area` background from `style/index.scss`, per `src/app/layout.tsx:80`) and no hydrated content: a blank, black page. This is consistent with the report ("blank black screen after login") independent of, and in addition to, the RLS recursion bug.

**Fix, in priority order:**
1. Confirm the Vercel Production env vars for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set to the current (rotated) values, then **trigger a fresh production deploy** (redeploy/rebuild — env var changes alone do not retroactively fix an already-built bundle for `NEXT_PUBLIC_*` values).
2. Add `src/app/error.tsx` and `src/app/global-error.tsx` so future failures show a recoverable error screen instead of a blank page.

---

## 5. Required Environment Variables

Full list of every `process.env.*` reference found under `src/` (86 distinct keys). Grouped and prioritized below.

### 5.1 Vercel Production (Project → Settings → Environment Variables)

| Variable | Purpose | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL, used client + server + middleware | **REQUIRED** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key — must be the **current rotated key** (Sprint 1) | **REQUIRED** |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client (`createAdminClient`), `forgotPassword`, `getEmailByUsername`, cron jobs | **REQUIRED** |
| `NEXT_PUBLIC_APP_URL` | Used as base URL in 40+ places for redirects, emails, OAuth callbacks; falls back to `http://localhost:3000` if unset | **REQUIRED** (must be `https://leadsmind.io`) |
| `CRON_SECRET` | Authenticates `/api/cron/*` routes | **REQUIRED** if cron jobs are enabled |
| `WEBHOOK_SIGNING_SECRET` | Verifies inbound webhook signatures | **REQUIRED** for webhook routes |
| `JWT_SECRET` / `JWT_SECRET_KEY` | Token signing (portal/student auth) | **REQUIRED** |
| `ENCRYPTION_KEY` / `KYC_ENCRYPTION_KEY` | Encrypting sensitive stored data | **REQUIRED** |
| `POPIA_CONSENT_SALT` | Compliance hashing | **REQUIRED** |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | All transactional email (`sendEmail`, welcome emails, notifySignIn, password reset) | **REQUIRED** — login/signup emails silently fail without it |
| `RESEND_WEBHOOK_SECRET` | Verifies Resend webhook callbacks | IMPORTANT |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_{RISE,SURGE,INFINITY,DYNASTY}_{MONTHLY,ANNUAL}_PRICE_ID` | Billing checkout + webhooks (Spark is free, no Stripe price) | IMPORTANT (billing breaks without it) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe.js | IMPORTANT |
| `PAYFAST_MERCHANT_ID` / `PAYFAST_MERCHANT_KEY` / `PAYFAST_PASSPHRASE` / `PAYFAST_URL` | ZA payment gateway | IMPORTANT for finance module |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` / `GOOGLE_MAPS_API_KEY` / `GOOGLE_PLACES_API_KEY` | Calendar/OAuth + lead-finder maps | IMPORTANT |
| `META_APP_ID` / `META_APP_SECRET` / `NEXT_PUBLIC_META_APP_ID` / `META_WEBHOOK_VERIFY_TOKEN` | Facebook/Instagram integration | IMPORTANT |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn social posting | IMPORTANT |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | TikTok social posting | IMPORTANT |
| `OUTLOOK_CLIENT_ID` / `OUTLOOK_CLIENT_SECRET` | Outlook email integration | IMPORTANT |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_API_KEY` / `TWILIO_API_SECRET` / `TWILIO_PHONE_NUMBER` | SMS/voice | IMPORTANT |
| `OPENAI_API_KEY` / `GEMINI_API_KEY` / `ASSEMBLYAI_API_KEY` | AI Studio, Lena chat, grammar/plagiarism checkers | IMPORTANT |
| `SERPER_API_KEY` / `DATAFORSEO_EMAIL` / `DATAFORSEO_PASSWORD` | SEO tooling | OPTIONAL |
| `AFTERSHIP_API_KEY` / `ESKOMSEPUSH_API_KEY` / `ESKOM_API_KEY` / `ESKOM_TOKEN` | Courier tracking / load-shedding data | OPTIONAL |
| `VERCEL_API_TOKEN` / `VERCEL_PROJECT_ID` / `VERCEL_TEAM_ID` | Custom-domain provisioning (`/api/domains`) | IMPORTANT if custom domains feature is used |
| `NEXT_PUBLIC_ENFORCE_PLAN_LIMITS` | Feature flag | OPTIONAL |
| `NEXT_PUBLIC_SENTRY_DSN` | Error tracking | OPTIONAL (but strongly recommended given the blank-screen bug class) |
| `NEXT_PUBLIC_DEFAULT_WORKSPACE_ID` | Fallback workspace id in some flows | OPTIONAL |
| `MOCK_DNS_VERIFICATION` | Test/dev toggle | OPTIONAL |

### 5.2 Local Development (`.env.local`)

Same table as above applies locally; `.env.example` in the repo root already documents every key with placeholder values, plus dev-only extras not needed in prod:

| Variable | Example Value | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://iejtgefkoiyrnyeedigr.supabase.co` | REQUIRED |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (current anon key) | REQUIRED |
| `SUPABASE_SERVICE_ROLE_KEY` | (service role key) | REQUIRED |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | REQUIRED |
| `NODE_ENV` | `development` | REQUIRED |
| `MOCK_DB` / `MOCK_DNS_VERIFICATION` | `false` | OPTIONAL (dev toggles) |
| `STAGING_URL` / `STAGING_USER` / `STAGING_PASSWORD` / `TEST_EMAIL` / `TEST_PHONE` | — | OPTIONAL (test-only, not read by `src/`, likely used by an external test suite) |
| Everything else in the Vercel table | placeholder values are fine unless actively testing that integration | IMPORTANT/OPTIONAL as above |

`.env.local` already exists locally with all 86+ keys present (confirmed key names, not values) — this is consistent with "works locally": the dev server always reads `.env.local` fresh on each run, so key rotations take effect immediately, whereas Vercel requires an explicit rebuild for `NEXT_PUBLIC_*` changes to propagate (see Section 8).

---

## 6. RLS Policy Issues

### 6.1 The recursive policy (see Section 2 for full detail)

`supabase/migrations/20240101000001_fix_auth_workspace.sql:133-140` — `"Workspace admins can manage memberships"` is `FOR ALL` and self-references `public.workspace_members` inside its own `USING` clause. **This is the self-referencing policy the team "fixed locally but wasn't sure was in migrations" — it is confirmed present, and confirmed never fixed in any of the 228 migration files.**

### 6.2 The rest of the workspace/workspace_members policy set is sound

- `"Workspace members visibility"` (SELECT) and `"Workspace visibility"` (on `workspaces`) both correctly route through `public.get_user_workspaces()`, a `SECURITY DEFINER SET search_path = public` SQL function that queries `workspace_members` internally — this pattern is the *correct* way to avoid recursion, which makes it clear the recursive policy in the same file was simply an oversight (the "admin" policy was written directly against the raw table instead of through the helper).
- A later migration, `20240101000152_fix_team_permissions.sql`, relaxed `public.users` visibility (to fix a "permission denied for table users" issue) and granted `SELECT` on `workspace_members`/`workspace_invitations`/`users` to the `authenticated` role — these grants are additive and don't touch the recursive policy.

### 6.3 Fix SQL

See the `DROP POLICY` / `is_workspace_admin()` function in Section 2. This should ship as its own migration (see Section 8 below for the exact filename/content).

---

## 7. Fixes Required — Priority Order

1. **Ship the RLS fix migration** (Section 2 / Section 8) that drops the recursive `"Workspace admins can manage memberships"` policy on `public.workspace_members` and replaces it with a `SECURITY DEFINER`-backed, non-recursive version. This alone should resolve the 500s on workspace fetch and the "Unable to load your workspace" error.
2. **Verify and redeploy Vercel Production env vars** — confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` hold the current rotated values, then trigger a fresh build (not just an env var save — `NEXT_PUBLIC_*` values are baked in at build time). This should resolve the blank/black screen and the 400 "invalid API key"-type errors.
3. **Add `src/app/error.tsx` and `src/app/global-error.tsx`** so any future unhandled exception renders a recoverable error UI instead of a blank page.
4. **Simplify the triple-redundant workspace auto-creation** — trust the `handle_new_user` trigger (it's `SECURITY DEFINER` and RLS-immune); make `setupWorkspace()` in `src/app/actions/auth.ts` and the fallback in `getCurrentWorkspace()` (`src/lib/auth.ts:157-175`) genuinely no-ops when a membership already exists (they should — this is more about removing dead-weight duplication and surfacing insert errors instead of silently swallowing them, so a *real* failure isn't masked again in the future).
5. **Clean up dead imports in `src/app/dashboard/layout.tsx`** (`getCurrentProfile`, `getCurrentWorkspace`, `getUserRole`, `fetchBranding`, `DashboardProvider`, `BrandingProvider`, `WorkspaceSync` are all unused there) so the workspace-context wiring is only defined once, in the root layout.
6. **Add Sentry (`NEXT_PUBLIC_SENTRY_DSN` is already wired for but unset)** or equivalent client-side error reporting — the blank-screen failure mode is invisible without it; the team is currently debugging via user-reported console screenshots.

---

## 8. Migration Files Needed

### `supabase/migrations/20260705000001_fix_workspace_members_recursive_policy.sql`

```sql
-- ================================================================
-- Fix: infinite recursion in RLS policy on public.workspace_members
-- The "Workspace admins can manage memberships" policy (FOR ALL) from
-- 20240101000001_fix_auth_workspace.sql queries workspace_members
-- directly inside its own USING clause, causing Postgres to recurse
-- into RLS evaluation on every SELECT/INSERT/UPDATE/DELETE against
-- the table. This is the root cause of "Unable to load your
-- workspace" / 500s on workspace_members queries.
-- ================================================================

CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "Workspace admins can manage memberships" ON public.workspace_members;

CREATE POLICY "Workspace admins can manage memberships"
    ON public.workspace_members FOR ALL
    USING (public.is_workspace_admin(workspace_id))
    WITH CHECK (public.is_workspace_admin(workspace_id));
```

This is idempotent (`DROP POLICY IF EXISTS`, `CREATE OR REPLACE FUNCTION`) and safe to run against production immediately.

No other new migration is required — workspace auto-creation already exists and is correct (Section 3); the remaining fixes (env vars, error boundaries, dead code, redundant fallbacks) are application-code and infrastructure changes, not schema changes.
