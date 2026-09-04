# Message Delivery Reliability — Build Log (Parts 1–4)

**Date:** 2026-09-04
**Companion to:** `docs/message-delivery-reliability-audit.md` (the pre-build ground-truth audit)
**PRD:** `PRD_Message_Delivery_Reliability.md`

Built generically across all three Meta channels (they share `MetaAdapter`), UI
validated against **WhatsApp / FB Messenger first** (both have a real
`message_deliveries` webhook already wired), **Instagram capped at
`SENDING → SENT → READ`** — Instagram has no delivery-confirmation webhook, so it
never reaches `DELIVERED`. This deliberately reverses the PRD's "Instagram ships
first" framing — flag to whoever owns the PRD.

**Two migrations, neither applied to a database yet — deploy them before the code:**
`20260904000000_message_delivery_reliability.sql`,
`20260904000100_message_dispatch_queue.sql`.

---

## Part 1 — idempotency, widened schema, latent-bug fixes

- **`messages.client_message_uuid`** (UUID) + partial unique index
  (`unique_client_message_uuid`) — mirrors the `bridge_metadata` idempotency
  indexes in `20240101000160`. The browser mints it once per compose buffer
  ([`MessageInput`](../src/components/conversations/MessageInput.tsx),
  `getComposeUuid()` + a 1200 ms `guardedFire()` double-fire guard) and threads
  it through `ConversationsClient` → `sendMessage()`.
- **`sendMessage()` dedupe** ([messaging.ts](../src/app/actions/messaging.ts)):
  pre-check on `(conversation_id, client_message_uuid)`; a `23505` unique
  violation is caught and treated as an idempotent no-op; a prior **failed** row
  is *reactivated in place* (`sending`) so the one-tap retry re-dispatches the
  same row instead of stacking a duplicate bubble.
- **`status` CHECK widened** to `queued | sending | sent | retrying | delivered |
  read | failed`. The "no `DELIVERED` for Instagram" rule can't be a table CHECK
  (would need `conversations.platform`), so it's enforced in code via
  [`src/lib/meta/deliveryStatus.ts`](../src/lib/meta/deliveryStatus.ts)
  (`CHANNELS_WITH_DELIVERY_RECEIPT`, `statusesReadReceiptAdvancesFrom`).
- **`MetaAdapter` preserves the real Graph error** — returns structured
  `MetaSendResult` (`errorCode` / `errorSubcode` / `errorType` / `fbtraceId` /
  `httpStatus`); `sendMessage()` stores it on the failed row (merged, not
  overwriting `transcript`/`audio_url`) instead of a generic string.
- **Latent bugs fixed:** `MessageBubble` `status==='pending'` now matches the real
  `'sending'`; the Instagram `messaging_seen` handler in
  [webhooks/meta/route.ts](../src/app/api/webhooks/meta/route.ts) advances
  `sent → read` (it required the unreachable `delivered` first, so IG read
  receipts silently no-op'd).
- Tests: `deliveryStatus.test.ts`, `MetaAdapter.test.ts`.

## Part 2 — automatic retry queue + send timeout

- **`message_dispatch_queue`** + **`acquire_message_jobs`** RPC
  (`20260904000100…`) — same `FOR UPDATE SKIP LOCKED` / 5-min-stale-lock shape as
  `whatsapp_dispatch_queue` / `acquire_whatsapp_jobs`. `UNIQUE (message_id)` =
  one retry track per message. Admin-client-only, no user RLS policy.
- **One shared send path:**
  [`dispatchOutboundMessage()`](../src/lib/messaging/dispatchOutboundMessage.ts)
  performs exactly one provider send + the resulting transition (sent /
  retrying + enqueue / failed + dead-letter). Called by `sendMessage()` (attempt
  1, inline) and the worker
  ([`/api/cron/workers/message-dispatch`](../src/app/api/cron/workers/message-dispatch/route.ts),
  cron `* * * * *`).
- **10 s AbortController timeout** on the send call — `new MetaAdapter(creds,
  { timeoutMs })` → `doFetch()`; an abort surfaces as `errorType: 'timeout'`
  (recoverable). Env `MESSAGE_SEND_TIMEOUT_MS` (default 10000).
- **Recoverable vs permanent**
  ([`sendFailureClass.ts`](../src/lib/meta/sendFailureClass.ts)): 429 / 5xx /
  transport / timeout / Graph rate-limit codes → retry; expired token (190),
  permission (10 / 200), recipient unreachable (551 / 1545041), WhatsApp
  re-engagement / template (131047 / 132xxx) → straight to FAILED, **no retries
  burned**; unknown → recoverable (capped). Final failure → a
  `webhook_dead_letters` row (`provider: 'message_send'`).
- **Backoff:** the PRD's 5 s / 15 s / 45 s is **below Vercel Cron's 1-minute
  floor**, so it's unachievable without a separate always-on consumer. Attempt 1
  is inline; retries are cron-driven at **60 s / 300 s / 900 s** (env
  `MESSAGE_SEND_RETRY_BACKOFF_SECONDS`), `MESSAGE_SEND_MAX_ATTEMPTS = 4` (1
  inline + 3 retries). Worker cron runs every minute so the first retry lands in
  ~1–2 min.
- **Retry idempotency:** the helper skips re-sending if `messages.external_id` is
  already set (a prior attempt reached the provider; Meta has no idempotency
  key).
- `sendMessage()` returns `{ retrying: true }` (not an error);
  `ConversationsClient` shows a low-key toast.
- Tests: `sendFailureClass.test.ts`, `dispatchOutboundMessage.test.ts`,
  `MetaAdapter` timeout tests.

## Part 3 — UI state machine

- **[`MessageBubble`](../src/components/conversations/MessageBubble.tsx) status
  visuals:** in-flight (`queued`/`sending`) = lighter brand tint + persistent
  "Sending…" spinner (not hover-gated — the PRD user story);
  `sent`/`delivered`/`read` = solid brand, quiet hover ticks (one check / two
  checks); `retrying` = calm amber "Retrying (attempt N)…" line, **not red, no
  button**; `failed` = red-outlined white bubble, original text kept visible,
  reason + one-tap **Retry**. Instagram tops out at one check on `sent`, jumps to
  two on `read` — the status value carries the cap, no per-platform branch.
- **Targeted re-render:** `ConversationsClient` keeps a `liveMessagePatches` map;
  realtime `messages` UPDATE merges `{status, metadata, external_id}` by id in
  the consolidation memo (`withPatch`, identity preserved for untouched rows) —
  **no more full-page `router.refresh()` on a status change**. INSERT / new
  conversations still refresh; patches clear when a fresh server render lands.
- **One-tap Retry** optimistically flips the bubble to `sending`, then calls the
  same `handleSend` with the stored `client_message_uuid` (Part 1 reactivates the
  failed row — same text, no retype, no duplicate).
- **Re-auth banner (PRD 5.4):** one top-of-inbox banner when a channel's
  connection is in `error` **or** a visible failed outbound message carries
  `error_type: 'OAuthException'` / an auth `error_code` (10/102/190/200).
  "Reconnect" → `getMetaAuthUrl(platform)` → redirect.
- `getConversations()` messages select gained `id, external_id` (needed for the
  patch key + retry).
- Tests: `MessageBubble.test.tsx`.

## Part 4 — delivery-log dashboard + failure-rate alert

- **Admin page** `/admin/message-delivery`
  ([page](../src/app/admin/message-delivery/page.tsx),
  [panel](../src/components/admin/MessageDeliveryPanel.tsx)) — filter by date
  range / channel / status; summary strip (settled / in-flight / failed /
  failure-rate %, "hot" above 10 %); table of every outbound Meta send with
  status, attempts, and the real failure reason + Graph code. **Reads `messages`
  + `messages.metadata`** (the Parts 1–2 data) via
  [`getMessageDeliveryLog`](../src/app/admin/message-delivery/actions.ts) —
  **no separate event ledger**. Shaping/summary logic is pure and tested
  ([`deliveryLog.ts`](../src/lib/messaging/deliveryLog.ts)). Admin/owner role
  gated, workspace-scoped by the `messages` RLS policy.
- **Failure-rate alert (PRD 5.5)**
  [`/api/cron/workers/message-delivery-health`](../src/app/api/cron/workers/message-delivery-health/route.ts),
  cron `*/15 * * * *`: per `(workspace, channel)`, if the outbound failure rate
  over the last 15 min exceeds 10 % (with a ≥5 volume floor and a 60-min
  per-group cooldown) it emits (a) a `messaging.delivery_health.alert`
  structured log line — the hook an external log-drain monitor keys on with zero
  extra infra; (b) a `webhook_dead_letters` row
  (`provider: 'message_delivery_alert'`, also the cooldown source, visible in the
  dead-letter panel); (c) a Slack ping **iff `SLACK_OPS_WEBHOOK_URL` is set** —
  the same plain Incoming-Webhook `POST { text }` mechanism as `notify_slack` in
  `actions_registry.ts`, not a new channel. All tunables in
  [`retryConfig.ts`](../src/lib/messaging/retryConfig.ts);
  `shouldAlertOnFailureRate` is pure + tested.
- Tests: `deliveryLog.test.ts`, `retryConfig.test.ts`.

---

## Success-metric coverage (PRD §6)

| PRD metric | How it's now measurable |
|---|---|
| % reaching a settled state without manual intervention | `settled / total` in the delivery-log summary (per window / channel) |
| Median Send→settled time | `sent_at` → the realtime `sent`/`delivered`/`read` UPDATE timestamps exist; **not yet aggregated into a stat** (see gaps) |
| Less dev time on "did it send?" | The delivery log replaces the screen-recording workaround |
| Zero silent failures | Every `failed` message shows `metadata.error_message` + Graph code and gets a `webhook_dead_letters` row; a one-tap retry path always exists |

## Remaining gaps / not done

1. **Migrations unapplied.** `…000000` and `…000100` must land before the code
   deploys (the code writes `client_message_uuid`, statuses `queued`/`retrying`,
   and `message_dispatch_queue`).
2. **No live Meta / browser / running-Supabase test.** Everything is unit-tested
   (classification, timeout→retry, the dispatch state machine, dedupe, the log
   summary math, the alert predicate, the bubble states via
   `renderToStaticMarkup`) + code-traced. The cron routes, the RPC, PostgREST
   embed filters, the realtime patch flow, and the re-auth banner are not
   exercised end-to-end here.
3. **App Review / Advanced Access for `instagram_manage_messages` still
   unverified in-repo** — confirm in the Meta App Dashboard before trusting
   production `messaging_seen` for non-tester users.
4. **First retry lands in ~1–2 min, not ~5 s** (Vercel Cron floor). Tunable via
   `MESSAGE_SEND_RETRY_BACKOFF_SECONDS`.
5. **Failure-rate alert is ops-global** (`SLACK_OPS_WEBHOOK_URL`), not
   per-workspace — there is no workspace-level Slack webhook setting to read;
   `notify_slack`'s URL lives in workflow node config only.
6. **Median-delivery-time is not aggregated** into a displayed stat — the
   timestamps exist but nothing computes the median yet.
7. **WhatsApp voice notes are not routed through the retry queue** (text sends
   only — the PRD's scope).
8. **Pre-Part-1 failed messages have no `client_message_uuid`** → their one-tap
   retry creates a fresh row rather than reactivating in place.
9. **`webhook_dead_letters` "Replay" is inert** for `message_send` /
   `message_delivery_alert` rows (diagnostic only, like the existing `meta`
   rows); "Resolve" works.
10. **UI colours/spacing not design-reviewed.**

## New env vars

| Var | Default | Purpose |
|---|---|---|
| `MESSAGE_SEND_TIMEOUT_MS` | `10000` | AbortController timeout on one provider send |
| `MESSAGE_SEND_MAX_ATTEMPTS` | `4` | 1 inline + 3 retries |
| `MESSAGE_SEND_RETRY_BACKOFF_SECONDS` | `60,300,900` | backoff (seconds) between retries |
| `MESSAGE_DELIVERY_ALERT_WINDOW_MIN` | `15` | failure-rate rolling window |
| `MESSAGE_DELIVERY_ALERT_THRESHOLD` | `0.1` | failure fraction that trips the alert |
| `MESSAGE_DELIVERY_ALERT_MIN_VOLUME` | `5` | volume floor before a rate is meaningful |
| `MESSAGE_DELIVERY_ALERT_COOLDOWN_MIN` | `60` | per-(workspace,channel) repeat-alert cooldown |
| `SLACK_OPS_WEBHOOK_URL` | *(unset)* | if set, delivery alerts also POST here |

## Test / check status at build time

`npx tsc --noEmit` → clean · `npx vitest run` → 279 passing (25 files) ·
`next lint` clean on all touched files.
Run the **full** `vitest run` to verify — a filtered `vitest run <paths>`
invocation can spuriously fail in `src/test/setup.ts` (RTL cleanup / "failed to
find the current suite", a known vitest+setupFiles quirk).
