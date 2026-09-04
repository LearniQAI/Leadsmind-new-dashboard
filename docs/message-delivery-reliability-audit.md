# Message Delivery Reliability — Ground-Truth Audit (pre-build)

**Date:** 2026-09-04
**Scope:** Instagram DM send path, real-time push infra, Meta API/webhook reality, reusable retry/alerting patterns.
**Verdict in one line:** ~70% of this PRD is a *small extension of infrastructure that already exists and is live*. The one genuine blocker is that **Instagram Messaging has no delivery-confirmation webhook at all** — the PRD's "primary" confirmation path (5.2.1) is not achievable for Instagram and must be redesigned around *read receipts + timeout*, not *delivery receipts*.

---

## STEP 1 — Real current Instagram DM send path

### The actual code path
`ConversationsClient.handleSend()` → server action `sendMessage()` in [src/app/actions/messaging.ts:244](../src/app/actions/messaging.ts#L244) → `new MetaAdapter(creds).sendInstagram()` in [src/lib/meta/MetaAdapter.ts:62](../src/lib/meta/MetaAdapter.ts#L62).

`sendMessage()` sequence today:
1. `requireWorkspaceAccess()` (app-layer membership check).
2. **Insert** `messages` row with `status: 'sending'`, `direction: 'outbound'` — before any API call.
3. `UPDATE conversations.last_message_at`.
4. Load conversation → branch on `conv.platform`. For `instagram`: load `platform_connections.credentials`, `adapter.sendInstagram(external_thread_id, content)`.
5. `sendInstagram()` does a **single** `POST https://graph.facebook.com/v18.0/me/messages` with `{recipient:{id}, message:{text}}`, `Authorization: Bearer <decrypted page token>`. Returns `{success, externalId: data.message_id}` or `{success:false, error}`.
6. On success → `UPDATE messages SET status='sent', external_id=<message_id>`.
7. On failure → `messageFailed=true`; later `UPDATE messages SET status='failed', metadata.error_message=<generic string>` and returns `{error}`.

> Note: FB Messenger (`sendFacebook`) hits the **identical** endpoint/body. WhatsApp (`sendWhatsApp`) is a different API (Cloud API, `/{phone_number_id}/messages`).

### Message-record schema (real)
From [supabase/migrations/20240101000004_phase3_messaging.sql](../supabase/migrations/20240101000004_phase3_messaging.sql) + later alters:

| Column | Reality |
|---|---|
| `status` | `TEXT DEFAULT 'sent'` **`CHECK (status IN ('sending','sent','delivered','read','failed'))`** — no `queued`, no `retrying`. Adding those states = a `CHECK` constraint migration. |
| `external_id` | `TEXT`, **`UNIQUE` constraint** (`messages_external_id_key`, migration `20240101000143`). This is the provider's `message_id`, only known *after* Meta responds. |
| `metadata` | `JSONB DEFAULT '{}'` — already the dumping ground for `error_message`, `provider_message_id`, media info, `automated_reply`. |
| client UUID / idempotency key | **Does not exist.** No column, no code. |
| `sent_at`, `created_at` | `TIMESTAMPTZ DEFAULT now()`. No `updated_at` on `messages` (only `conversations`/`platform_connections` have the trigger). |

### Idempotency — the honest answer
- **There is no client-generated UUID and no idempotency mechanism on outbound send.** Two rapid clicks, or any manual "resend", produce two independent `messages` rows and two independent Graph API `POST`s. Meta's Send API itself has no idempotency-key parameter, so a retry after a slow-but-successful send **will double-deliver**.
- The `external_id UNIQUE` constraint only dedupes *inbound* webhook processing (same provider `mid` seen twice) and prevents storing the same provider message row twice. It does nothing for outbound double-send because `external_id` is null until the response comes back.

### Existing retry / error handling on this path
- **In the interactive inbox send path: none.** `sendInstagram()` is one `fetch` in a `try/catch`; `sendMessage()` marks `failed` and returns. No re-attempt, no backoff, no queue, no timeout (relies on the platform default `fetch` timeout).
- Retry logic *does* exist elsewhere (see STEP 4) but on **separate tables and separate cron workers**, not this path.

### Is the send path shared across channels?
Partly:
- **Shared:** `MetaAdapter` class + the `sendMessage()` orchestration in `messaging.ts` (schema, status writes, workspace check, activity logging) are common to `facebook`, `instagram`, `whatsapp`, plus `email`/`sms` branches.
- **Per-channel:** each has its own adapter method. IG and FB Messenger are near-duplicate (`/me/messages`); WhatsApp is structurally different.
- **Conclusion:** Instagram DM sending is **not independent code** — anything built here (status states, idempotency column, retry) naturally covers FB Messenger for free and is a clean pattern to port to WhatsApp (which already has partial delivery/failed status via its webhook — see STEP 3).

---

## STEP 2 — Real-time push infrastructure (the important one)

### The real mechanism
**Supabase Realtime `postgres_changes`** (Postgres logical replication → Supabase Realtime server → browser WS via `@supabase/supabase-js`). Not Pusher, not socket.io, not a custom WS layer.

Wired in [src/app/conversations/ConversationsClient.tsx:182-239](../src/app/conversations/ConversationsClient.tsx#L182):
- Channel name: `` `conversations-hub:${workspaceId}` `` (workspace-scoped).
- Three bindings, all filtered `workspace_id=eq.<active workspace>`:
  - `INSERT` on `messages` → desktop `Notification` for inbound + debounced `router.refresh()`
  - `UPDATE` on `messages` → debounced `router.refresh()`
  - `*` on `conversations` → debounced `router.refresh()`
- Debounce: single `router.refresh()` 300ms after the last event (comment explicitly says: *"`sendMessage` writes several status updates ('sending' -> 'sent' -> 'delivered') in quick succession and we don't want a refresh storm"*).

Enabled by [supabase/migrations/20260903000011_conversations_messages_realtime.sql](../supabase/migrations/20260903000011_conversations_messages_realtime.sql): `REPLICA IDENTITY FULL` + `ALTER PUBLICATION supabase_realtime ADD TABLE messages, conversations`. Migration header documents the prior "real-time message delivery delay" bug (subscription existed in client since the unified migration but tables were never in the publication) — this is the fix that made it live. **This is the 0.6–1.1s-latency, workspace-isolation-verified path referenced in build history.**

### Does the Social Inbox already use it?
Terminology trap: there are **two different "inboxes"**.
- **Conversations Hub** (`src/app/conversations/`) = the DM inbox where outbound IG/FB/WA messages are sent. **Already on Supabase Realtime**, including a live `UPDATE messages` → refresh binding.
- **Social Inbox** (`src/app/social/inbox/SocialInboxClient.tsx`) = a *comments* inbox (FB/IG/YouTube post comments), **not DMs**. It has **no realtime** — it re-fetches on filter change only. Irrelevant to this PRD.

There is also a **second, unrelated realtime stack**: `RealtimeEventBridge` ([src/lib/realtime/RealtimeEventBridge.ts](../src/lib/realtime/RealtimeEventBridge.ts)) uses Supabase **broadcast** channels (`form_sync:${formId}`) — for Forms collaboration/presence only. Messaging does **not** use it. Do not build on it for this feature; use the `postgres_changes` path the Conversations Hub already uses.

### Can a "message status changed" event ride the existing channel?
**Yes, with zero new infrastructure.** A status change *is already* an `UPDATE messages` row change, and the Conversations Hub is *already subscribed* to `UPDATE messages` and already re-renders on it. Today `sendMessage()`'s `status='sending' → 'sent'` writes, and the Meta webhook's `→ 'delivered'` write, **already propagate to the open inbox in near-real-time.**

What's missing is **granularity and richness**, not transport:
- It's a full `router.refresh()` (server re-render), not a targeted bubble patch. Fine for correctness; if you want a spinner→check micro-animation you'd add a client-side row-patch handler on the same existing subscription payload (`payload.new`), which the code currently ignores in favour of the blunt refresh.
- New states (`queued`, `retrying`) need the `CHECK` constraint widened (STEP 1) — but the *push* of those states is free.
- The top-of-inbox "reconnect Instagram" banner (PRD 5.4) has no live signal today; `platform_connections.status`/`credentials.health_status` exist but aren't subscribed. Adding `platform_connections` to the same channel is a 3-line change + one line in the publication migration.

**PRD Section 5.4 = small extension of existing, live infrastructure.** Not a new build.

---

## STEP 3 — Meta / Instagram API access & webhook reality

### App Review / permission status — **not documented, must be confirmed out-of-band**
There is **no doc in this repo** recording the current Meta App Review / Business Verification state. What the code *asserts* (not the same as verified):
- `getMetaAuthUrl()` ([messaging.ts:39](../src/app/actions/messaging.ts#L39)) and [src/lib/meta/config.ts](../src/lib/meta/config.ts) both request `instagram_manage_messages` (among ~16 scopes).
- [MetaAdapter.ts:146](../src/lib/meta/MetaAdapter.ts#L146) comment claims the app *"already has [`instagram_manage_messages`] since it's receiving live IG DM webhooks."*
- `messaging.ts` comments describe Task 93/94 scopes being *"confirmed missing by live-testing real Graph API calls"* then added — i.e. the team validates scope state empirically, not from a status page.

**Action for engineering before building:** open the Meta App Dashboard → App Review → confirm `instagram_manage_messages` is at **Advanced Access** (not Standard/Sandbox) and Business Verification is complete. If it's still Standard/sandbox, production delivery/read webhooks for real (non-tester) users won't fire regardless of code.

### Does Instagram Messaging support a delivery-confirmation webhook?
**No.** Verified against current Meta docs (Sept 2026):

Instagram Messaging supported webhook fields: **`messages`, `messaging_postbacks`, `messaging_seen`, `message_reactions`, `messaging_referral`, `standby`**. There is **no `message_deliveries` / `delivery` event for Instagram.** `message_deliveries` is **Messenger-only**. Instagram gives you a *read* receipt (`messaging_seen`) but never a *delivered* receipt.

Implication for PRD 5.2:
- **PRD 5.2.1 "Primary: event-driven delivery confirmation" is not achievable for Instagram.** The only synchronous positive signal is the `message_id` in the send response (= "Meta accepted it"), which the PRD itself says is *not* sufficient to call `DELIVERED`.
- Realistic model for Instagram:
  - `SENDING` → **`SENT`** on `200 + message_id` (Meta accepted).
  - → **`READ`** if/when `messaging_seen` arrives (strong proof it was delivered *and* seen).
  - No true `DELIVERED` state for IG. Either collapse `DELIVERED` into `SENT` for IG, or treat `SENT` held for >X seconds with no error as "assumed delivered" (Meta does not surface async delivery failures for IG after a 200 anyway).
  - `messaging_seen` for IG is the closest thing to PRD's confirmation signal — **but the current webhook route's IG branch checks `messagingEvent.read` + `.eq('status','delivered')`**, so IG read receipts currently no-op (status never reaches `delivered` for IG). This is an existing latent bug to fix as part of this work.
- **Polling** is the only other option and is heavy (no per-message delivery field to poll; you'd poll the conversation for the message echo). Recommend **not** polling; rely on `messaging_seen` + timeout.

> WhatsApp is the opposite — its webhook **does** deliver real `sent`/`delivered`/`read`/`failed` status objects (with error codes), already handled at [webhooks/meta/route.ts:199-219](../src/app/api/webhooks/meta/route.ts#L199). FB Messenger has real `message_deliveries` + `message_reads`, already handled at [route.ts:100-133](../src/app/api/webhooks/meta/route.ts#L100). Instagram is the weak channel, which is ironic given the PRD ships Instagram first.

### Can existing webhook infra receive delivery events? (where they exist)
**Already does.** No new endpoint/subscription needed:
- Single endpoint `POST /api/webhooks/meta` ([route.ts](../src/app/api/webhooks/meta/route.ts)) with HMAC-SHA256 signature verification, branches on `payload.object` (`page` / `instagram` / `whatsapp_business_account`).
- Per-Page subscription helper [src/lib/meta/subscribeWebhook.ts](../src/lib/meta/subscribeWebhook.ts) already sets `subscribed_fields=messages,messaging_postbacks,message_deliveries,message_reads` (pinned to Graph `v25.0` after a live-verified incident) and re-GETs to confirm attachment. IG rides the same Page subscription.
- `message_deliveries` / `message_reads` handlers for `page` and `instagram` objects **already exist** and update `messages.status` keyed on `external_id`. For IG those fields simply never fire (per above) — so the code is harmless but dead for IG.
- **The only real gap:** add `messaging_seen` handling for the `instagram` branch (currently only a generic `messagingEvent.read` check that assumes a `delivered` precondition).

---

## STEP 4 — Reusable retry / alerting patterns (do not reinvent)

### Exponential-backoff retry — a real, established pattern exists (DB-queue style)
The **canonical pattern in this codebase is a DB-backed dispatch queue drained by a Vercel cron worker**, not an in-process retry. Three live instances, all structurally identical:

| Worker | Queue table | Backoff | Hard-fail classifier |
|---|---|---|---|
| [api/cron/workers/whatsapp-dispatch](../src/app/api/cron/workers/whatsapp-dispatch/route.ts) | `whatsapp_dispatch_queue` (`retry_count`, `scheduled_for`, `locked_by`) | `Math.pow(4, nextRetryCount) * 15` min, max 3 | regex `/invalid|auth|unsubscribed|blacklist|template/i` → straight to `failed` |
| `api/cron/workers/sms-dispatch` | `sms_dispatch_queue` | same shape | same shape |
| `api/cron/workers/campaign-dispatch` | campaign queue | same shape | same shape |

- Row-locking via `rpc('acquire_whatsapp_jobs', {...})` (atomic batch claim), cron cadence `*/5 * * * *` in [vercel.json](../vercel.json).
- This *exact* hard-fail-vs-transient split is what PRD 5.3 asks for.

Also present but **not** the right fit here:
- `src/lib/optimization/RetryQueue.ts` — in-memory recursive `setTimeout` backoff (`500 * 2^n`), DLQ is a plain array. Not persistent, resets on cold start. Fine for a within-request best-effort retry, wrong for "retry after 45s" (serverless function won't be alive).
- `EmailAutomationService` — inline `for` loop with `maxAttempts` + backoff, synchronous within one request.

**Recommendation for PRD 5.3:** clone the `whatsapp_dispatch_queue` + cron-worker pattern as an `message_send_queue` (or add `retry_count`/`scheduled_for`/`next_attempt_at` columns straight onto `messages` and add a `message-send-dispatch` cron). Reuse `acquire_*_jobs` RPC shape and the regex hard-fail classifier. Backoff `5s/15s/45s` from the PRD is *faster* than the existing `*/5min` cron granularity — either accept ~5min retry latency (cron) or run the first retry inline and only the 2nd/3rd via cron.

### Dead-letter infra — already exists
`webhook_dead_letters` table + `src/app/api/admin/dead-letters` (+ `DeadLetterPanel.tsx`, replay route). The Meta webhook already writes routing-gap failures there (`recordConnectionNotFound`). A `FAILED` send with retries exhausted is a natural new `provider: 'meta_send'` dead-letter row — queryable admin surface for PRD 5.5 comes almost free.

### Admin alerting — partial, no ops-grade mechanism
- **No** Slack/PagerDuty/email ops-alert utility for platform failures. `EnvironmentHealthChecker` only warns at boot.
- There **is** a user-configurable **"Notify Slack" automation action** (`src/lib/automation/actions_registry.ts`) that does a real `POST` to a workspace's Slack webhook URL. That's a per-workspace automation primitive, not a platform ops channel — but it's the only existing "post to Slack" code. PRD 5.5's failure-rate alert would need either (a) a new lightweight ops webhook env var + a check in the send-dispatch cron, or (b) emit a synthetic automation event the workspace can wire to its own Slack action.
- `logger` (`src/shared/logger`, pino-style structured) is used consistently with dotted event keys (`messaging.meta_adapter.dispatch.failed` etc.) — a log-based alert (Vercel log drain / Datadog monitor) on `*.dispatch.failed` rate is the lowest-effort path and needs **no code**.

---

## STEP 5 — Consolidated answers & complexity

### PRD Section 7 open questions — answered

**Q1 — Delivery webhooks or polling for Instagram?**
Neither in the PRD's intended sense. **Instagram has no delivery webhook** (`message_deliveries` is Messenger-only). It has `messaging_seen` (read). Design the IG state machine as `SENDING → SENT (on 200+message_id) → READ (on messaging_seen)`, with a timeout-driven `RETRYING`/`FAILED` for the case where the send call itself never returns 200. Do **not** poll. FB Messenger and WhatsApp *do* have real delivery webhooks and are already handled — if you want a channel with a true `DELIVERED` state to demo, it's not the one the PRD ships first.

**Q2 — Timeout threshold before `RETRYING`?**
No measured Graph API latency data in-repo. The existing analogous knob is the WhatsApp/SMS cron cadence (5 min) — far too coarse for interactive send. Recommend: treat the `fetch` to `/me/messages` with an explicit **10s `AbortController` timeout**; on timeout or 5xx/429 → `RETRYING`. 8–10s from the PRD is a fine starting point; make it an env var.

**Q3 — Show retries to the agent in real time?**
Given IG has no `DELIVERED` signal, over-showing status will *increase* "did it send?" anxiety, not reduce it. Recommend: show `SENDING` → `SENT` (single check) silently; only surface `RETRYING`/`FAILED` visually. Internally log every transition (5.5).

### Real-time push: reuse / extend / build?
**Reuse + tiny extension.** Supabase Realtime `postgres_changes` on `messages` is live in the Conversations Hub *today* and already re-renders on `UPDATE messages`. Extensions needed: (1) widen `messages.status` `CHECK`; (2) optionally add a client-side row-patch handler on the *existing* subscription for smooth per-bubble transitions instead of `router.refresh()`; (3) add `platform_connections` to the channel + publication for the re-auth banner. **No new real-time transport, no Pusher, no new WS layer.**

### Message schema / idempotency: what exists?
- `status` field: **yes**, `CHECK`-constrained to `sending|sent|delivered|read|failed`. Needs `queued`/`retrying` added via migration.
- Idempotency / client UUID: **no, nothing.** Every send/resend is an independent Graph call with no idempotency key. This is the single biggest correctness gap for the PRD's retry feature — add a `client_message_uuid` column (unique per conversation) generated in the browser, checked before the Graph call, so a retry of a slow-success doesn't double-deliver.
- `external_id UNIQUE`: exists, dedupes inbound only.
- Failure reason: already stored in `metadata.error_message` (but currently a generic hardcoded string — needs to carry the real Graph `error.code`/`error.message`, which `MetaAdapter` already captures in `e.message` and throws away at the `messaging.ts` layer).

### Complexity per rollout step

| PRD step | Classification | Notes |
|---|---|---|
| **1. State machine + UI states (IG only)** | **Small–Medium extension** | Migration: widen `status` CHECK + add `client_message_uuid`, `retry_count`, `next_attempt_at`. `sendMessage()` already inserts `sending` and updates status — add `queued`/`retrying` writes + surface real `error.code`. UI: `MessageBubble` already renders per-status icons (note: it checks `status==='pending'` but DB uses `'sending'` — pre-existing dead branch to fix); add amber `retrying` + red `failed`+retry-button treatment. Realtime already delivers the updates. **No `DELIVERED` state for IG** — spec must accept that. |
| **2. Auto-retry + timeout** | **Medium (new, but pattern exists)** | Add `AbortController` 10s timeout to `sendInstagram`/`sendFacebook`. Classify errors (reuse whatsapp-dispatch regex). First retry inline; 2nd/3rd via a new `message-send-dispatch` cron cloning `whatsapp-dispatch` (queue table or columns on `messages` + `acquire_*_jobs` RPC). Idempotency via `client_message_uuid` check. Backoff 5/15/45s conflicts with 5-min cron granularity — decide inline-vs-cron per attempt. |
| **3. Admin delivery-log dashboard** | **Small–Medium** | Every transition already loggable; add a `message_delivery_events` table (or read from `messages` + `metadata`) and an admin page. `webhook_dead_letters` + `DeadLetterPanel` give a working precedent to copy. Filterable-by-account/date/status = standard table. |
| **4. Monitor failure rate 1–2 wks** | **Small (ops, near-zero code)** | Log-drain monitor on `messaging.*.dispatch.failed` rate, or a threshold check in the new cron that hits an ops webhook env var. Optionally reuse the "Notify Slack" automation action. |
| **5. Port to WhatsApp / FB Messenger** | **Small for FB, Trivial-to-Small for WhatsApp** | FB Messenger uses the identical adapter/endpoint and **already has real `message_deliveries`/`message_reads` handlers** — mostly free. WhatsApp **already writes `sent`/`delivered`/`read`/`failed` + error messages from its webhook** ([route.ts:199](../src/app/api/webhooks/meta/route.ts#L199)); it mainly needs the shared retry/idempotency layer and UI states applied. Both are a *better* fit for the PRD's full state machine than Instagram. |

### Biggest risks to flag before building
1. **The PRD's Instagram-first framing fights the platform:** IG is the *only* one of the three channels with no delivery receipt. FB Messenger / WhatsApp already have richer, already-wired status signals. Consider shipping the state machine on **all three at once** (marginal extra cost) or leading with WhatsApp for a real `DELIVERED`.
2. **Double-send on retry** is real today (no idempotency). `client_message_uuid` must land in step 1, not step 2.
3. **App Review / Advanced Access for `instagram_manage_messages` is unverified in-repo** — confirm before assuming production `messaging_seen` events arrive for non-tester users.
4. **Latent bugs to fix in passing:** IG `read`/`messaging_seen` handler no-ops (`.eq('status','delivered')` precondition never met for IG); `MessageBubble` `status==='pending'` branch is dead (DB emits `'sending'`); `messaging.ts` discards the real Graph `error.code`/`message` in favour of a generic `'Failed to dispatch message'`.

---

## Sources (Meta docs, external)
- [Instagram Messaging Webhooks — Meta for Developers](https://developers.facebook.com/docs/messenger-platform/instagram/features/webhook) — supported fields: `messages`, `messaging_postbacks`, `messaging_seen`, `message_reactions`, `messaging_referral`, `standby`; no delivery event.
- [Send messages — Messenger Platform](https://developers.facebook.com/documentation/business-messaging/messenger-platform/send-messages)
- [Instagram messaging — `message_deliveries` is Messenger-only; Instagram uses `messaging_seen`](https://developers.sinch.com/docs/conversation/channel-support/instagram/message-support) (third-party summary corroborating Meta docs)
