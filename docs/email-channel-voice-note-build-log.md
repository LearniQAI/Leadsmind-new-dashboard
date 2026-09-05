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
