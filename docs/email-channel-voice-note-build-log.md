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
