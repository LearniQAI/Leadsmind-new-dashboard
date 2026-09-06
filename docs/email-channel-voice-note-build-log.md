# Email Channel + Voice Note — Build Log (Parts 1–3)

**Date:** 2026-09-04
**Companion to:** `docs/email-channel-voice-note-audit.md` (the pre-build ground-truth audit)
**PRD:** `PRD_Email_Channel_Voice_Note.md`

Real decisions made explicit before building (per the audit's own findings):
- **Conversation grouping: contact-based, not subject-based.** Matches every existing channel (Instagram/Messenger/WhatsApp), avoids a new schema key. Flagged to whoever owns the PRD as a deliberate override of its literal "grouped by subject + participant" wording — the same kind of explicit divergence as the messaging-reliability work's Instagram-status-cap decision. Subject-based threading remains a real, separate, unbuilt schema addition if later required.
- **AI-credit gating:** the new transcription call is gated through the real  `deduct_ai_credit` RPC. The pre-existing gap (`processMeetingAudio`'s AssemblyAI/OpenAI calls are not credit-gated) is deliberately left alone — a separate, optional follow-up.
- **Inbound email shipped as part of this work**, not deferred.

---

## Part 1 — Inbound email receiving

- **Receiving-address scheme:** `{workspace-slug}@INBOUND_EMAIL_DOMAIN` (env-overridable, default `inbox.leadsmind.io`) — reuses `workspaces.slug` (already globally unique), **no new column or table**. Mirrors the proven, real, live `+<phone>@sms.leadsmind.io` scheme.
- **[`src/app/api/webhooks/resend/inbound/route.ts`](../src/app/api/webhooks/resend/inbound/route.ts)** gained a new branch, checked **first**: if the recipient address matches a workspace's alias, resolve workspace → find-or-create contact by sender email → find-or-create a `platform:'email'` conversation (contact-based, matching `sendDocumentToContact()`'s existing shape exactly) → insert the message. The existing `+phone@sms.leadsmind.io` bridge is reached, **unmodified**, only when no workspace alias matches — its shared body-fetch/quote-strip logic was extracted (not rewritten) into [`src/lib/email/inboundEmailProcessing.ts`](../src/lib/email/inboundEmailProcessing.ts) so both paths use one implementation.
- Realtime is free — the new INSERT rides the existing `conversations-hub:${workspaceId}` Supabase Realtime publication.
- **Reply-To wiring:** `sendMessage()`'s email branch and `sendVoiceNoteEmail()` now set `Reply-To: {slug}@INBOUND_EMAIL_DOMAIN` via `sendEmail()`'s pre-existing `config.headers` param (zero changes to `sendEmail()` itself) so a recipient's reply actually reaches the new inbound path instead of the workspace's `from_email`.
- **Real, separate DNS/ops step still required and NOT done here:** MX records for `INBOUND_EMAIL_DOMAIN` must point at Resend's inbound servers, exactly like the existing `sms.leadsmind.io` setup (documented in `docs/EMAIL_SMS_BRIDGE.md`). The existing Resend `email.received` webhook subscription covers both paths — no second subscription needed.
- Tests: `inboundAddress.test.ts` (12), `inboundEmailProcessing.test.ts` (7).

## Part 2 — Real transcription + review-before-send

- **[`src/lib/voicenotes/transcribeAudio.ts`](../src/lib/voicenotes/transcribeAudio.ts):** reuses AssemblyAI (the provider already integrated for the calendar meeting-recap pipeline, same `en_za` locale, same sandbox-safe mock fallback) — but, unlike that caller, **actually polls** `/v2/transcript/{id}` to completion (~25s ceiling). The source pattern only reads the initial async-submission response, which never carries `text`, so in practice it always falls through to its mock; that's fine for a fire-and-forget recap email, not for a feature whose entire point is an agent reviewing a real transcript.
- **[`src/app/actions/voiceTranscription.ts`](../src/app/actions/voiceTranscription.ts):** `transcribeVoiceNoteForEmail()` — credit-gated via `consumeAICredit`/`deduct_ai_credit`. Never blocks the send: a credit-limit error or an AssemblyAI failure both soft-degrade to the existing client-side Web Speech `clientTranscript` with a visible warning (`source:'client_fallback'`).
- **[`MessageInput.tsx`](../src/components/conversations/MessageInput.tsx)** gained a genuinely new review-before-send panel (editable transcript textarea + audio preview + Send/Discard) that fires **only** when `selectedPlatform === 'email'`. Every other channel's auto-send-on-stop voice-note flow is unchanged — the email branch returns before reaching that code.
- Tests: `transcribeAudio.test.ts` (5, fake-timer-driven poll/timeout), `voiceTranscription.test.ts` (6).

## Part 3 — Waveform template + hosted playback page + click analytics

- **`messages.voice_playback_token`** (new migration, `20260904000200_voice_playback_token.sql`) — a dedicated opaque UUID column + partial unique index, generated fresh per voice-note-email send. Deliberately **not** the message's own primary key, matching `course_certificates.validation_id`'s discipline that a real PK should never double as a public sharing token.
- **[`src/app/voice-note/[token]/page.tsx`](../src/app/voice-note/[token]/page.tsx)** — cloned from `certificates/verify/[id]`'s pattern: unauthenticated route, service-role read, opaque-token lookup, exposing only `audio_url`/`audio_duration`/`sent_at` and a small `voice_playback_snapshot` (sender name, workspace name, brand color) captured at send time — never a live join into contacts/workspaces from the public route. Renders the real, existing [`VoiceNotePlayer`](../src/components/common/VoiceNotePlayer.tsx) (dark theme).
- **[`sendVoiceNoteEmail()`](../src/lib/voicenotes/voiceNoteEmail.ts) rewritten** (its Outlook-safe table shell kept, not rebuilt): two waveform blocks (top above / bottom below the message body, matching `VoiceNotePlayer`'s real bar proportions), the real Part-2 reviewed transcript as genuine body text (HTML-escaped), each waveform linking to `/voice-note/{token}?pos=top` or `?pos=bottom` (not the raw audio file). **Confirmed and corrected an imprecise audit claim:** `sendVoiceNoteEmail()` is called **only** from `sendMessage()`'s `email` branch — WhatsApp voice notes use the separate, MetaAdapter-based `sendVoiceNoteWhatsApp()` and are untouched by this change; there was never a shared-caller regression risk to test for.
- **Diverged deliberately from the PRD's literal "PNG/SVG-flattened-to-PNG" waveform requirement:** the waveform is a table of solid-colour `<td>` cells (matching the reference `Outlook_Email_Mockup.html`'s own actual CSS/div-bar approach, which itself isn't a flattened image either), not a server-rendered image. This renders identically with images blocked — there is no image to block — and avoids standing up a real image-generation/hosting pipeline, which would be materially larger scope than this pass.
- **Click analytics — corrected a second audit claim.** The audit proposed piggybacking on `email_tracking_logs`; that table's `campaign_id` is `NOT NULL` and FK'd to `email_campaigns`, and a voice-note email is a transactional send with no campaign — writing there would violate the constraint. Instead, [`src/lib/voicenotes/voiceClickTracking.ts`](../src/lib/voicenotes/voiceClickTracking.ts)'s `recordVoiceNoteClick()` hooks into the **same** already-live `/api/webhooks/email/deliverability` endpoint (same signature verification, same Resend click-event shape) and records `{position, at}` directly onto `messages.metadata.voice_clicks` / `voice_click_count`, short-circuiting before the campaign-required validation path. Top vs. bottom position comes from the `pos` query param, which Resend's click-tracking reports back verbatim on `data.click.url` — no per-link Resend tags needed.
- Tests: `voiceNoteEmail.test.ts` (5), `voiceClickTracking.test.ts` (4), `voice-note/[token]/page.test.tsx` (2).

---

## Corrections this build made to the original audit

1. **`sendVoiceNoteEmail` is not a shared WhatsApp/email caller** — only the email branch calls it. No WhatsApp regression surface existed.
2. **`email_tracking_logs` cannot hold voice-note click events** as originally proposed (NOT NULL FK to `email_campaigns`) — clicks are recorded on `messages.metadata` instead, via the same webhook.
3. **The "reuse AssemblyAI's existing pattern" instruction, read literally, would have shipped a non-functional transcription feature** — the source pattern (`processMeetingAudio`) never actually polls to completion. This build adds real polling; the source caller is left as-is (out of scope).

## Remaining gaps / not done

1. **Real DNS/MX step not done** (can't be, from here) — `INBOUND_EMAIL_DOMAIN` needs real MX records before any inbound email arrives.
2. **No live email sent or received in this environment** — no `RESEND_API_KEY`/`ASSEMBLYAI_API_KEY`/real DNS available here. Everything is unit-tested against mocked Supabase/fetch/Resend, or code-traced, consistent with this project's existing norm of not integration-testing webhook routes.
3. **No real Outlook/Gmail/Apple Mail rendering verification performed** — this project has no automated email-client-rendering test; a manual pass (Litmus-style or real client screenshots) is still required before shipping.
4. **Part 2/4 of the message-delivery-reliability work (retry queue, delivery dashboard) were NOT extended to email** — out of scope for this PRD's 3 parts; email sends still have no automatic retry/timeout/dead-letter or delivery-log visibility. Flagged in the original audit as a real, separate follow-up.
5. **Contact resolution on inbound is exact-email-match only** — no fuzzy matching, no cross-channel identity merge.
6. **No inbound HTML/attachment handling** — text only, matching the existing SMS bridge's scope.
7. **Voice note click analytics has no viewing UI** — the data lands on `messages.metadata`; nothing renders a top-vs-bottom report yet (not requested by these 3 parts).
8. **AssemblyAI's real transcription quality/latency is unverified** — no live API key available to test against.

## Test / check status at build time

`npx tsc --noEmit` → clean · `npx vitest run` → 318 passing (32 files), +39 across all three parts · `next lint` clean on every touched/new file.

---

## 2026-09-05 — Post-launch gap found and closed: "Compose new email"

**Gap:** every path built across Parts 1–3 assumed a `platform:'email'` conversation
already existed — created either by an inbound reply (Part 1) or by Content
Studio's `sendDocumentToContact()`. There was no way for an agent to start a
brand-new email conversation from the Communications Hub itself by typing a
fresh recipient address (the Gmail "Compose" pattern). This is also why the
Email tab never appeared in a workspace with zero prior email conversations —
`activeChannels` only lists a channel once a real conversation exists for it.

**Audit before building confirmed:**
- **No existing channel has a "start fresh with a stranger" entry point.**
  Instagram/Messenger/WhatsApp conversations are created exclusively by an
  inbound webhook event — there is no UI anywhere in the Communications Hub to
  originate a new outbound-first conversation with someone who has no prior
  message history. This gap is not email-specific in origin; email is simply
  the first channel where a "compose to a stranger" action makes product
  sense (per the standing decision: no equivalent button is added for the
  other three, since cold-messaging isn't how they work).
- **Real subject-field decision (Step 0):** added a genuine, dedicated
  `messages.subject` column (`20260905000000_messages_subject.sql`) — purely
  for display/email-header purposes. This is explicitly **separate** from the
  conversation-grouping decision made in Part 1, which stays contact-based.
  Storing a real per-message subject does not reintroduce subject-based
  threading; a reply in the same contact-scoped conversation simply carries
  no subject (falls back to a sensible default: `New message from
  {workspace name}`) unless the agent (or the original sender, for inbound)
  supplied one.
- **Contact/conversation find-or-create was duplicated inline** in Part 1's
  `handleInboundWorkspaceEmail()`. Extracted into a shared, client-agnostic
  module — `src/lib/email/contactConversation.ts`
  (`findOrCreateContactByEmail`, `findOrCreateEmailConversation`) — used by
  **both** the inbound webhook (admin client) and the new Compose action (RLS
  client), so there is exactly one implementation of "resolve or create the
  contact-based email thread," not two.

**Built:**
- **`src/app/actions/composeEmail.ts`** — `startEmailConversation({toEmail,
  toName?})`: validates the address, calls the shared find-or-create
  functions, returns `{conversationId, contactId, isNewConversation}`. Does
  **not** send a message — the conversation is then driven through the
  existing `sendMessage()` path exactly like any other conversation.
- **`src/components/conversations/ComposeEmailModal.tsx`** — a real modal
  (built on the existing Radix `Dialog` kit already used elsewhere in this
  app) collecting `To` + `Subject`. On submit, starts the conversation and
  hands control back to `ConversationsClient`, which switches to the new
  thread — the actual message body, and the **exact same Part 2 voice-note
  record → transcribe → review → send flow**, is composed through the
  existing `ConversationThread`/`MessageInput` UI, unmodified.
- **Entry point:** a "New email" pencil-icon button in
  `ConversationList.tsx`'s search bar, rendered **only when the Email channel
  tab is active** (`filter === 'email'`) — matching the standing decision that
  this is an email-specific action, not a hub-wide one.
- **Subject threading:** `ConversationsClient` stashes `{conversationId,
  subject}` in `pendingComposeSubject` state; `handleSend()` applies it to
  exactly the first send into that conversation, then clears it.
  `sendMessage()` gained an optional 6th `subject` parameter (stored on the
  message row and used as the real `Subject:` line for both the plain-text
  and voice-note email send paths, replacing their previously hardcoded
  subjects) — `MessageInput.tsx` and `ConversationThread.tsx` needed **zero**
  changes.
- **`voiceNoteEmail.ts` / `inboundEmailProcessing.ts`** updated to read/write
  the new dedicated `messages.subject` column instead of the ad hoc
  `metadata.subject` the inbound path used before (nothing read that key —
  confirmed via search before removing it).

**Tests:** `contactConversation.test.ts` (7 — existing-contact reuse, email
normalization, default name, DB-error surfacing for both contact and
conversation creation) + `composeEmail.test.ts` (5 — valid/invalid address,
error propagation, reuse-vs-create). 330 total tests green (32→34 files,
+12), `tsc` clean, `next lint` clean on every touched file.

**Not done / caveats (consistent with every other part of this build):**
1. **No live click-through test** — no running app/browser here to actually
   click "New email," submit the modal, and watch the conversation appear.
   Verified by code trace + unit tests on the two new server-side pieces.
2. **The brief "Select a thread" blip** after starting a conversation (until
   `router.refresh()` lands the new row from the server) is a known, accepted
   UX cost — consistent with how every other send in this app already
   round-trips through a full refresh rather than a fully optimistic local
   insert.
3. **No de-duplication UI** if an agent composes to an address that already
   has an open conversation — it silently reuses the existing thread (correct
   behavior, verified by test), but nothing tells the agent "you already have
   a conversation with this person" before they submit.
4. **Subject is not used for any reply threading** (`In-Reply-To`/
   `References`) — per the standing decision from Part 1's audit, real
   RFC 5322 threading was never in scope for this build.

---

## 2026-09-05 — Post-launch gap found and closed: channel tabs hidden until first connection/conversation

**Gap:** channel tabs in the Communications Hub were derived — a platform only
appeared once it had a live `platform_connections` row **or** at least one
existing conversation. This is what made the "Compose new email" gap (above)
worse than it needed to be: an agent in a fresh workspace couldn't even find
the Email tab to discover Compose, since no email conversation existed yet to
make the tab appear. Per your decision, fixed uniformly for **every** channel
(Instagram, Messenger, WhatsApp, Email, SMS), not as an Email-only special
case — every channel should always be visible so an agent can see what's
available and what still needs connecting.

**Audit before building confirmed:**
- The exact derivation was `activeChannels` in `ConversationsClient.tsx`:
  `platform_connections.status==='connected'` **union** any platform already
  present on an existing `conversations` row, capped to
  `SUPPORTED_MESSAGING_CHANNELS`.
- The real, existing "connect" flow for Instagram/Messenger/WhatsApp is
  `getMetaAuthUrl(platform)` → redirect — already used by the re-auth banner's
  `handleReconnect()`, now reused verbatim for this fix rather than building a
  second connect action.
- **SMS has no `platform_connections` row at all** — it's never written by
  `connectPlatformManually`/`saveMetaConnections` (only facebook/instagram/
  whatsapp are). Its real, existing connection signal is
  `workspaces.twilio_number` (the same field the `sms-dispatch` cron worker
  already reads to send).
- **Email needs no external connection** — just the workspace's existing send
  configuration — so it has no "disconnected" state at all; its empty state is
  the Compose prompt already built, not a connect prompt.

**Built:**
- `activeChannels` is now a fixed, always-rendered list (`ALL_CHANNELS` in
  `ConversationsClient.tsx`) instead of a derived set.
- A real `channelStatus` map (`connected`/`disconnected` per platform) drives
  which empty state a channel shows when it has zero conversations:
  - **Instagram/Messenger/WhatsApp, disconnected:** "{Channel} isn't connected
    yet" + a real "Connect {Channel}" button wired to the exact same
    `getMetaAuthUrl()`/redirect flow the re-auth banner uses.
  - **Instagram/Messenger/WhatsApp, connected, zero conversations:** a plain
    "No conversations yet" empty state — no connect prompt for a channel
    that's already working.
  - **Email:** the existing "No email conversations yet" + "New email" Compose
    prompt (unchanged from the Compose build) — never a connect prompt.
  - **SMS, not configured:** "SMS isn't configured yet" + a real link to
    `/settings` (SMS has no OAuth step, so no "Connect" button — added a
    synthetic, non-fabricated `sms` connection-status row via
    `src/lib/messaging/smsConnectionStatus.ts`, derived from the real
    `workspaces.twilio_number` column, in `getConnectedPlatforms()`).
  - **SMS, configured, zero conversations:** plain "No conversations yet".
  - **"All" tab / an active search query:** unchanged generic empty states.
- A real conversation list for a channel still renders its actual
  conversations exactly as before — the empty-state logic only replaces what
  used to render when the list was empty, and does not touch the
  conversation-rendering branch at all.

**Tests:** `smsConnectionStatus.test.ts` (4 — disconnected/connected
synthesis, no-op when a real row exists, no mutation) +
`ConversationList.test.tsx` (9 — all 5 tabs always render; email shows
Compose not Connect; disconnected OAuth channel shows Connect; connected OAuth
channel with zero conversations shows plain empty state, not Connect; SMS
not-configured links to Settings; SMS configured shows plain empty state; the
"all" tab keeps its original empty state; a search query always wins over any
channel-specific state; **regression check** — a channel with real
conversation history still renders its list, not any empty state). 343 total
tests green (36 files, +13), `tsc` clean, `next lint` clean.

**Not done / caveats:**
1. **No live click-through test** — no running browser here to actually load
   a fresh workspace and confirm all 5 tabs render with the right empty
   states, or click "Connect Instagram" through to the real OAuth redirect.
   Verified by code trace + the render-based unit tests above.
2. **Per-channel empty-state icons use `getPlatformMeta(...).Icon`**, which
   are brand marks/`<img>` elements sized via their own CSS classes, not the
   `size`/`strokeWidth` props `DashEmptyState` normally passes to a lucide
   icon — those props are silently ignored (confirmed harmless, not a
   crash), but the exact visual sizing inside the empty-state circle was not
   visually verified in a browser.
3. **SMS's "Connect" path is a generic `/settings` link**, not a deep link to
   the specific Twilio configuration tab — this project has no URL-addressable
   settings-tab convention to link to more precisely.

---

## 2026-09-05 — UI bug fix + redesign: Compose modal backdrop bleed-through

**Bug (reported with a screenshot):** the "New email" modal's panel was
visibly translucent — the blurred page behind it (workspace owner name/avatar)
showed straight through the top of the dialog, overlapping the "New email"
title.

**Root cause confirmed:** `ComposeEmailModal` used the shared
`DialogContent` from `src/components/ui/dialog.tsx` with no background
override. That shared component's default class includes `bg-background`, a
Tailwind/shadcn CSS variable — and this app's `globals.css` defines
`--background: var(--n900)`, a dark, non-opaque theme token from the original
admin-dashboard template, never intended for a light Instagram-style surface
like the Communications Hub. Confirmed this is a known, already-worked-around
issue: every other real consumer of this same shared dialog
(`DealModal.tsx`, `TagsClient.tsx`, `CreateTaskModal.tsx`, and 20+ others)
already overrides the background explicitly (`bg-white` or a specific dark
color) in its own `className` — `ComposeEmailModal` was the one place that
had been missed. Fixed at the point of use (`bg-white` + explicit `z-[1001]`,
matching the established per-consumer convention), not in the shared
primitive — changing the shared default would have risked visual regressions
across the 20+ other real screens that depend on its current behavior, which
this pass had no way to visually verify.

**Redesign (asked for alongside the fix):** rebuilt the modal's visual
language to match the Communications Hub's own aesthetic more deliberately
(instead of generic default Dialog styling):
- Icon-in-circle header (brand-blue `Mail` icon, matching `platformMeta`'s
  email color) + title + a one-line subtitle explaining Compose needs no
  connection.
- Both fields got a leading icon (`Mail` / `PenLine`), larger `rounded-2xl`
  inputs, and a proper focus state (ring + border + background lightening).
- Inline validation — an invalid address now shows a real error message under
  the field instead of only a toast, and clears as soon as the agent edits it.
- A proper two-button footer (ghost "Cancel" + a black pill "Start
  conversation" with a loading spinner while submitting and a disabled/greyed
  state until a value is typed), replacing the single lone button.
- The existing helper note ("You'll write the message... in the thread once
  it's created") got an icon and its own subtly bordered card instead of
  being a bare paragraph.

**Tests:** `ComposeEmailModal.test.tsx` (4, new — **the first Radix-Dialog
render test in this codebase**: uses a per-file `// @vitest-environment
jsdom` override + `@testing-library/react`'s `render`/`fireEvent`, since
Radix's Dialog portals into `document.body` and the project's default vitest
environment is `node`; `jsdom` was already present as a transitive dependency
and RTL was already wired in `src/test/setup.ts`, just unused elsewhere).
Covers: the panel actually has `bg-white` and never `bg-background` (locks in
the fix so this can't silently regress), the header/fields/buttons all
render, inline validation blocks an invalid submit without calling
`onStarted`, and the dialog renders nothing when closed. 347 total tests
green (37 files, +4), `tsc` clean, `next lint` clean.

**Not done / caveats:**
1. **No live browser screenshot taken** to visually confirm the fixed modal
   against the original bug report — verified by a real jsdom-rendered DOM
   assertion on the actual CSS class (`bg-white`, not `bg-background`), which
   is a genuine assertion on the fix, not a screenshot comparison.
2. **The shared `dialog.tsx` primitive itself was left unchanged** — the
   dark `bg-background` default still exists for any *future* consumer who
   forgets to override it. Worth a follow-up to change the shared default
   itself (or add a lint rule) so this class of bug can't recur elsewhere;
   not done here since it would touch 20+ real screens without a way to
   visually verify each one in this environment.

---

## 2026-09-06 — Two production bugs from a live manual test (Reply-To bounce + placeholder transcript)

A live manual test (Hub → real Gmail → native Reply) surfaced two separate,
confirmed bugs. Both got a **code fix**, but neither can be reported as fully
fixed from this environment — there is no browser, deployed app, mail account,
or deploy capability here to re-run the live send/reply test the prompt
(correctly) requires.

### Bug A — replies bounce to `noreply@leadsmind.io`

**Root cause (code), confirmed:** `sendEmail()` (`src/lib/email.ts`) never
passed a Reply-To to Resend at all. The Hub email path
(`messaging.ts` email branch + `sendVoiceNoteEmail`) set it as
`config.headers['Reply-To']` — but **Resend ignores a `Reply-To` key inside
the generic `headers` object**; its SDK only maps a dedicated top-level
`replyTo` field to the RFC `Reply-To:` header (verified in
`node_modules/resend/dist/index.mjs`: `reply_to: email.replyTo`). So no
Reply-To header was ever emitted, and Gmail's native Reply went to the
`From` no-reply address → `550 5.1.1 User unknown`.

**Fixed (code):**
- `sendEmail()` gained a first-class `replyTo?: string | string[]` param that
  maps to Resend's `replyTo`. A `Reply-To` in `config.headers` is no longer
  the mechanism anywhere.
- `messaging.ts` email branch and `sendVoiceNoteEmail()` now pass `replyTo`
  through that param (was `config.headers`). A `messaging.email.dispatch` log
  line now records the exact Reply-To used, so a live test's logs confirm it.
- Tests: `email.test.ts` (+2 — `replyTo` reaches Resend's field; omitted when
  absent), `voiceNoteEmail.test.ts` (updated — asserts `replyTo` param, not
  `config.headers`).

**NOT fixed — required ops step, cannot be done from here:** even with a
correct `Reply-To: {slug}@inbox.leadsmind.io`, that domain does **not receive
mail in production**. Per this same build log (Part 1 section), MX records for
`INBOUND_EMAIL_DOMAIN` (`inbox.leadsmind.io`) pointing at Resend's inbound
servers, plus a Resend inbound subscription for that domain routed to
`/api/webhooks/resend/inbound`, were flagged as required and **never done**.
The prompt's premise that "DNS/MX ... was confirmed live before" does not
match this record. Until that ops step is completed, the code fix only
changes the bounce address from `noreply@leadsmind.io` to
`{slug}@inbox.leadsmind.io` — the reply still bounces. The inbound webhook
*route* code is ready and already handles this address shape.

**Sibling-send audit (Bug A, prompt Step 1.5):** ~60 `sendEmail()` call sites.
All the transactional ones (magic links, reminders, KYC, payroll, affiliate,
certificate/access-link, courier, etc.) set no Reply-To — which is correct
and intentional for no-reply mail. The only two-way senders are the Hub email
channel (fixed) and the `send_email` automation action /
`EmailAutomationService` (workspace → contact automated emails) — those also
send no Reply-To. **Deliberately deferred**: whether an automation email
should thread replies back into a conversation is a separate product question
and a different code path from the reported bug; left for its own prompt.

### Bug B — placeholder transcript shipped as real message content

**Root cause, confirmed:** with `ASSEMBLYAI_API_KEY` unset,
`transcribeAudioWithAssemblyAI()` returned `{ success: true, usedMock: true,
transcript: "This is a placeholder transcript — ASSEMBLYAI_API_KEY is not
configured in this environment." }`. `transcribeVoiceNoteForEmail()` passed
that straight through with no warning; `MessageInput`'s review panel showed it
as normal editable text; on send it became the real message body + email
content. The "sandbox-safe mock" was meant for local/CI, but in a real
deployment with a missing key it shipped debug text to a real contact.

**Fixed (code):**
- `transcribeAudioWithAssemblyAI()`: missing key → `{ success: false, error }`
  (no placeholder). `usedMock` removed from the type entirely.
- `transcribeVoiceNoteForEmail()`: any AssemblyAI failure / missing key →
  **hard block** `{ error: "Transcription failed — the voice note was not
  sent…" }`. The one remaining soft-degrade is **AI-credits-exhausted** →
  the genuine on-device Web Speech transcript + an explicit warning banner
  (real content the agent reviews, an expected limit, not a
  misconfiguration).
- `MessageInput.tsx`: on `{ error }` it now shows the error toast and **does
  not send** — the recording is discarded, the agent re-records or types.
  (Previously it fell back to auto-sending "Voice note" / the rough on-device
  text.)
- Tests: `transcribeAudio.test.ts` (updated — no-key now asserts
  `{ success: false }`, no network call), `voiceTranscription.test.ts`
  (updated — failure path asserts hard block with no transcript;
  credits-exhausted path unchanged).

### Verification status

`tsc` clean. Full `vitest` suite green (see session). **Neither bug is
reported "fixed"** — the prompt requires a real live send/reply +
missing-key voice-note test in the same session, which this environment
cannot perform. What's verified: the code paths, by unit tests and trace.
What's outstanding: the live test, and (Bug A) the `inbox.leadsmind.io`
MX/Resend-inbound ops step without which replies keep bouncing regardless of
the code fix.

---

## 2026-09-06 — 3-4s delay before a sent message appears (all 5 channels)

**Reported:** ~3-4s between clicking Send and the bubble appearing, observed on
Email, to be fixed across WhatsApp / Instagram / Email / SMS / Messenger.

### Audit — real per-channel behaviour (code inspection)

**All 5 channels share ONE send path**, so the bug and the fix are uniform:
`MessageInput` → `ConversationThread.onSendMessage` → `ConversationsClient.handleSend`
→ `sendMessage()` server action.

- **No channel does optimistic rendering.** `handleSend` `await`s the *entire*
  `sendMessage()` server action — which includes the real provider call: a
  Graph API `POST` (10s AbortController timeout) for Instagram/Messenger/
  WhatsApp; Resend for Email; the Resend→Twilio bridge for SMS — and only
  *then* calls `router.refresh()` (a full RSC refetch of `getConversations()`).
  The sent bubble first appears when that refresh lands. Delay ≈ provider-call
  latency + refetch latency, structurally identical on every channel.
- **`client_message_uuid` IS generated for every channel** — `MessageInput`'s
  shared `getComposeUuid()` (`crypto.randomUUID()`) runs for text, template
  (WhatsApp) and voice-note sends alike; the server stores it in
  `messages.metadata.client_message_uuid`, and `metadata` is returned by
  `getConversations()`. So a reconciliation key already exists for all 5.
- **Message Delivery Reliability Part 3 did NOT fix this for anyone.** Its
  "targeted realtime patch replacing blunt router.refresh()" only replaced the
  refresh for message *UPDATE*s (status transitions on an already-visible
  bubble). Its own code comment says *"INSERTs / new conversations still
  refresh."* There was never an optimistic-INSERT path for any channel.

So: no channel was correct; the fix is one shared mechanism used by all 5.

### Fix

New pure module `src/lib/messaging/optimisticMessages.ts` +
`ConversationsClient.tsx`:
- `handleSend` now appends a local `'sending'` bubble **synchronously on
  submit**, before the round trip, carrying the `client_message_uuid`. The
  composer is no longer held disabled through the whole send (MessageInput's
  own 1200ms guard + fresh-uuid-per-send + Part 1's server-side dedupe already
  prevent doubles).
- The consolidation memo injects still-pending optimistic bubbles into their
  target conversation, **deduped by `client_message_uuid`** against the real
  server rows — so once `router.refresh()` (or the realtime `INSERT` →
  debounced refresh) brings the real row, the optimistic twin is filtered out.
  No duplicate on refresh or on a late realtime event, on any channel.
- A `useEffect` prunes optimistic entries from state once reconciled, plus a
  120s TTL safety net.
- `router.refresh()` is now also called on send *failure* (was missing) so the
  real `failed` row — with its error metadata + retry button (Part 3 UI) —
  replaces the optimistic bubble.
- Retry path unchanged: `handleRetryMessage` reuses the failed row's existing
  uuid, so `collectRealClientUuids` already contains it and the optimistic
  merge is a no-op for retries (they keep using Part 3's `liveMessagePatches`
  status flip).

Tests: `optimisticMessages.test.ts` (13 — bubble shape, uuid collection,
merge-into-target-only, dedup-against-real-row, no-op cases, prune on
reconcile / TTL / recent-keep). `tsc` clean, `next lint` clean, full suite
green.

### NOT verified — live per-channel timed test

The prompt requires a real, timed, devtools-observed send on each of the 5
channels (plus forced-failure and duplicate-after-refresh checks). **This
environment has no browser, deployed app, provider credentials, or deploy** —
so **no channel is reported "fixed."** What's done: the shared audit (all 5
channels, one path, none optimistic — code-confirmed) and the shared fix
(unit-tested + traced). Each channel still needs its own live timed check:
render latency, `sending → sent/delivered` transition, forced failure + retry,
and no-duplicate-after-refresh / after a realtime INSERT.
