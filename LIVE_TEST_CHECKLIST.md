# Guest / Anonymous Checkout — Live Test Checklist

Branch: `worktree-guest-checkout`

This feature adds a **public** checkout route so logged-out visitors from a course landing
page can enrol without first creating an account. The build is code-complete and type-checks
clean (no new `tsc` errors). The tests below (STEP 4 of the task) require a running server +
Stripe test keys and could not be executed in the build environment — run them here.

---

## What changed (for reviewers)

| File | Change |
|---|---|
| `src/app/checkout/[courseId]/page.tsx` | **NEW** public checkout page. Logged-in → previous authenticated behaviour verbatim. Logged-out → guest flow, no sign-in redirect. |
| `src/app/checkout/layout.tsx` | **NEW** minimal shell (no `requireAuth`) — deliberately not under `src/app/student/`. |
| `src/app/student/checkout/[courseId]/page.tsx` | Now a thin `redirect('/checkout/<id>')` so old deep links keep working. |
| `src/app/student/checkout/[courseId]/CheckoutClient.tsx` | Extended with an `isGuest` mode (name+email form for free; Stripe guest-mode button for paid; honeypot; "check your email" success screen). Authenticated markup unchanged. |
| `src/app/actions/guestCheckout.ts` | **NEW** public server actions: `guestFreeEnroll`, `createGuestCourseCheckoutSession`. Honeypot + IP/email rate limit. |
| `src/lib/lms/guestEnrollment.ts` | **NEW** shared primitives: `findOrCreateContactByEmail` (workspace-scoped upsert), `insertEnrollmentIfAbsent` (idempotent), `provisionAccountLink` (`auth.admin.generateLink`), `welcomeGuestStudent`, and **`handleGuestCheckoutSessionCompleted`** — the webhook-only paid enrolment path. |
| `src/lib/lms/onboardingEmail.ts` | `sendCourseOnboardingEmail` accepts `accountSetupUrl`; appends a "set up your account" block for guests. |
| `src/app/api/webhooks/stripe/route.ts` & `src/app/api/webhooks/payments/route.ts` | `checkout.session.completed` now also handles guest sessions (`courseId && workspaceId && !contactId`) via `handleGuestCheckoutSessionCompleted`. Signature verification (`stripe.webhooks.constructEvent`) is unchanged and still mandatory. |
| `src/lib/supabase/middleware.ts` | `/checkout` added to `isPublicPage`. |
| landing templates + `MarketplaceClient.tsx` | "Enrol" now routes to `/checkout/<id>`. |
| `src/app/api/lms/enrollments/route.ts` | **UNCHANGED** — still `requireLmsInstructor`. |

---

## Pre-req setup

```bash
cd .claude/worktrees/guest-checkout
cp ../../../.env.local .env.local     # or your usual env source
yarn install
yarn dev                              # http://localhost:3000
```

Stripe test-mode webhook (in a second terminal):

```bash
stripe login
# Forward to WHICHEVER route your Stripe dashboard has registered. If unsure, run both:
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# and/or
stripe listen --forward-to localhost:3000/api/webhooks/payments
```

Copy the `whsec_...` from `stripe listen` into `STRIPE_WEBHOOK_SECRET` and restart `yarn dev`.

You need:
- one **published** course with `pricing_model = 'free'`
- one **published** course with `pricing_model = 'one_time'`, `price > 0`, on a workspace with
  Stripe Connect connected (or the platform Stripe key set)
- a browser in a **private/incognito** window (genuinely logged out)

---

## Test 1 — Free course, logged out (happy path)

1. Incognito → open the course landing page → click **Enrol**.
2. Confirm you land on `/checkout/<courseId>` and see the **name + email** form (NOT a sign-in redirect).
3. Submit with a fresh email.
4. Expect: "You're Enrolled" screen.

**Verify in DB:**
```sql
select c.id, c.email, c.workspace_id, c.source
from contacts c where c.email = '<test-email>';
-- exactly ONE row, workspace_id = the course's workspace, source = 'guest_checkout'

select e.* from enrollments e
join contacts c on c.id = e.contact_id
where c.email = '<test-email>';
-- exactly ONE row, status='active', payment_status='free', access_type='full' (or 'preview' if hybrid)
```
5. Onboarding email: check the Resend dashboard / server logs for `lms.onboarding_email.sent`.
   If no workspace email provider is configured you should see `lms.onboarding_email.send_failed`
   with reason and the UI should say *"We couldn't send your welcome email…"* — that is the
   expected fail-soft behaviour, **not** a test failure. Record which case you hit.
6. The email (if sent) must contain a **set-up / magic login link** (`/auth/...`).

## Test 2 — Paid course, logged out, Stripe TEST mode

1. Incognito → paid course landing page → **Enrol** → `/checkout/<courseId>`.
2. Confirm you see **"Continue to Secure Stripe Checkout"** (no email field on our page; no PayFast tab).
3. Click it → you're on Stripe's hosted page. Enter email + card `4242 4242 4242 4242`.
4. Complete payment → you return to `/checkout/<courseId>?status=pending` showing **"Payment Received"**.
5. **Immediately** check the DB — before the webhook fires there should be **NO enrollment**.
   Then wait for `stripe listen` to show `checkout.session.completed` forwarded 200.
6. **Verify** enrollment now exists, `payment_status='paid'`, contact created/matched by the
   email entered **on Stripe** (not typed into LeadsMind), scoped to the course's workspace.
   Onboarding email sent (or fail-soft as in Test 1).

## Test 3 — THE CRITICAL BYPASS TEST (must pass)

Goal: prove that reaching the success URL without a real paid Stripe session creates nothing.

1. Pick a paid course + a brand-new email that has never enrolled.
2. In incognito, navigate **directly** to:
   ```
   http://localhost:3000/checkout/<paidCourseId>?status=pending
   ```
   (do NOT go through Stripe.)
3. Also try the legacy URL:
   ```
   http://localhost:3000/student/checkout/<paidCourseId>?status=pending
   ```
4. **Verify:** no `enrollments` row, no new `contacts` row, no auth user for that email.
   ```sql
   select * from enrollments where course_id = '<paidCourseId>'
     and contact_id in (select id from contacts where email = '<unused-email>');
   -- expect: 0 rows
   ```
5. Bonus: `curl -X POST` a fake `checkout.session.completed` to
   `/api/webhooks/stripe` and `/api/webhooks/payments` **without** a valid `stripe-signature`.
   Expect HTTP 400 and no DB writes.

> Why this passes by construction: the only code that creates a guest enrollment is
> `handleGuestCheckoutSessionCompleted`, called exclusively from the `checkout.session.completed`
> branch of the two webhook handlers, both of which reject the request at
> `stripe.webhooks.constructEvent(...)` if the signature is absent/invalid. The function itself
> then also returns early unless `session.payment_status` is `paid`/`no_payment_required`. The
> `?status=pending` page (`CheckoutClient`, guest branch) contains no write path at all.

## Test 4 — Duplicate-contact / double enrolment

1. Repeat Test 1 (free) **twice** with the **same** email + same course.
2. Second attempt should still show success ("already enrolled — check your email").
3. **Verify:** still exactly ONE `contacts` row and ONE `enrollments` row for that email+course.
4. Repeat for paid: trigger the same `checkout.session.completed` event twice via
   `stripe events resend <evt_id>` → still one enrollment.

## Test 5 — Authenticated regression (must be unchanged)

1. Log in as a normal student. From the marketplace, enrol in a **free** course → still works,
   redirects to `/student/courses/<id>`.
2. Log in, buy a **paid** course via Stripe test card → enrollment appears after webhook, exactly
   as before this branch.
3. Visit `/student/checkout/<id>` while logged in → redirects to `/checkout/<id>` and shows the
   normal authenticated checkout (Stripe + PayFast tabs, no name/email form).
4. Admin "Add student" (`POST /api/lms/enrollments`) → still requires instructor auth (401/403
   when called unauthenticated).

## Test 6 — Abuse controls

1. Fill the hidden honeypot (`input` inside the off-screen label) via devtools and submit the
   free form → response looks successful but **no** contact/enrollment created; server logs
   `guest_checkout.free.honeypot_tripped`.
2. Submit the free form 6+ times in under a minute from the same IP/email → 6th returns
   *"Too many attempts."* (429-style message).

---

## Two-bucket report to fill in after running

1. **Critical bypass test (Test 3):** PASS / FAIL — …
2. **Abuse-protection applied:** honeypot (matches public-form `lm_hp_field` pattern) + in-memory
   per-IP and per-email rate limit (`src/lib/security/rateLimit`, 5/60s free, 8/60s paid-session).
   Turnstile/hCaptcha still deferred (separate larger item).
3. **Real email delivery:** confirmed sent / blocked on missing workspace email-provider config
   (fail-soft, same finding as the earlier enrollment-email task) — …
