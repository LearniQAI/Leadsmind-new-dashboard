# Email Channel + Voice Note — Ground-Truth Audit (pre-build)

**Date:** 2026-09-04
**Scope:** Inbox architecture reuse, real email send/receive infrastructure, speech-to-text options, hosted-playback-page pattern, Outlook-safe template precedent.
**Verdict in one line:** Outbound "Email as a channel" **already exists today** (conversations, dispatch, and — after the just-shipped reliability work — idempotency/UI-state for free); voice-note-over-email **already exists today** as a shipped-but-simpler feature (`sendVoiceNoteEmail`) that this PRD upgrades rather than invents. The one genuinely new, non-trivial piece is **inbound email** — nothing in this codebase turns a received email into an inbox conversation for any workspace today.

---

## STEP 1 — Real current inbox architecture

### Channels, grouping, filtering
- **Channel tabs are derived, not hardcoded.** [ConversationsClient.tsx:150-159](../src/app/conversations/ConversationsClient.tsx#L150) builds `activeChannels` from `platform_connections.status==='connected'` **union** any platform already present on a `conversations` row, capped to `SUPPORTED_MESSAGING_CHANNELS = {facebook, instagram, whatsapp, email, sms}`. **`email` is already in that set** — the tab-derivation logic needs zero changes for Email to appear once an `email` conversation exists.
- **Grouping is contact-based, not subject-based, for every channel today.** `conversations` has `UNIQUE(workspace_id, platform, external_thread_id)` ([20240101000004](../supabase/migrations/20240101000004_phase3_messaging.sql)); `ConversationsClient`'s `consolidatedConversations` memo further merges multiple platform-conversations for the **same `contact_id`** into one list row (`contactMap`), so a contact with an Instagram thread and a WhatsApp thread shows as one entry with a platform switcher. Real, working outbound email already follows this exact model — see below.
- **All / Mine / Unassigned** is a pure client-side filter on `conversations.assigned_to` (`assigneeFilter === 'me' | 'unassigned'` against `currentUser.id`) — channel-agnostic, needs nothing new for Email.

### Message-delivery-reliability reuse — precisely, part by part
| Part | Channel-agnostic? | What email gets for free / needs new |
|---|---|---|
| **Part 1 — idempotency** (`client_message_uuid`, dedupe pre-check, widened `status` enum) | **Yes, fully.** The `client_message_uuid` insert + pre-check in `sendMessage()` ([messaging.ts:279-338](../src/app/actions/messaging.ts#L279)) runs **before** the platform branch — email sends already get double-submit protection today, unmodified. | Nothing to build. |
| **Part 2 — retry queue + timeout** (`dispatchOutboundMessage`, `MetaAdapter` timeout, `sendFailureClass`) | **No — Meta-only.** `dispatchOutboundMessage` explicitly branches `platform === 'facebook'\|'instagram'\|'whatsapp'`; anything else (including `email`) returns an immediate `errorType:'unsupported_platform'` permanent failure if routed through it. Email's actual send path (`sendEmail`/`sendVoiceNoteEmail` inside `messaging.ts`'s own `if (conv?.platform === 'email')` branch) is a **plain try/catch with no retry, no timeout, no dead-letter** — the same state the Instagram path was in before Part 2. | A parallel `classifySendFailure`-equivalent for Resend/SMTP error shapes (different from Graph error codes) and either an `email` branch inside `dispatchOutboundMessage` or a sibling `dispatchOutboundEmail` reusing the same `message_dispatch_queue` table/worker shape. **Real, separate work — not automatic.** |
| **Part 3 — UI state machine** (`MessageBubble`) | **Yes, fully.** The bubble is 100% status/metadata-driven with zero platform branching — an email message with `status:'failed'` and `metadata.error_message` renders the same red-outlined bubble + Retry button as an Instagram one, today, unmodified. | Nothing to build, **once** email failures populate `metadata.error_message`/`error_code` in the same shape (they currently populate `error_message` only — no `error_code`, since Resend errors were never mapped the way Graph errors were in Part 1). |
| **Part 4 — delivery-log dashboard + alert** | **No, by one constant.** `META_CHANNELS = ['facebook','instagram','whatsapp']` in [deliveryLog.ts](../src/lib/messaging/deliveryLog.ts) and the health-check cron explicitly exclude email. | Add `'email'` to that array (and to the alert cron's channel list) — trivial, **but only meaningful once Part 2's classification exists for email**, otherwise every email failure would look identical/unclassified in the log. |

**Conclusion for STEP 1's second question:** the reliability work is a real, but *partial*, foundation for email — the idempotency layer and the entire UI are free; the retry/backoff/classification/alerting layers are Meta-specific and need a comparable (structurally identical, content-different) parallel build for SMTP/Resend, exactly as the audit prompt anticipated.

### Conversation-grouping key vs. the PRD's "subject + participant"
- **The existing data model has no concept of "subject" anywhere** — not on `conversations`, not on `messages`. Every channel (including the two real existing email-conversation creators, see below) groups strictly **by contact**, one conversation row per `(workspace_id, platform, contact)`.
- Real precedent for email specifically: [`sendDocumentToContact()`](../src/app/actions/contentStudio.ts#L275) (Content Studio's "send this doc as an email" action) **already creates a `platform:'email'` conversation per contact** (not per subject) and dispatches through the same `sendMessage()` the Communications Hub uses.
- **Implementing the PRD's literal "grouped by subject + participant" is a real, new schema decision** — the current unique key can't express it without either (a) a new `email_thread_key` column (e.g. a hash of participant + normalized subject) used as `external_thread_id`, or (b) accepting the existing per-contact model (matches every other channel, simpler, but diverges from PRD 4.1's literal wording). This is a genuine build decision to make explicitly, not an oversight to silently paper over.

---

## STEP 2 — Real existing email-sending infrastructure (the important one)

### What already works
- **`sendEmail()`** ([src/lib/email.ts](../src/lib/email.ts), Resend-backed) + **`getWorkspaceEmailConfig()`** ([resolveConfig.ts](../src/lib/email/resolveConfig.ts), reading the `workspace_email_providers` table — encrypted API key, `from_email`, `from_name`) already send **arbitrary agent-composed** plain-text or HTML email, not just templated system mail:
  - `sendMessage()`'s `email` branch ([messaging.ts:370](../src/app/actions/messaging.ts#L370)) sends whatever text the agent typed in the inbox composer.
  - `sendDocumentToContact()` sends arbitrary Content-Studio-authored HTML/plain text to a contact.
  - `sendVoiceNoteEmail()` sends a fully composed branded HTML email today (see STEP 5).
- **Conclusion: "handles arbitrary agent-composed emails" is already true, not new.**
- **Reply-threading: does not exist.** No code anywhere sets `In-Reply-To` / `References` / a custom `Message-ID` on outbound mail, and inbound parsing (below) never reads them either. Every "reply" in the current model is just another `sendMessage()` call into the same **contact-scoped** conversation — not an RFC 5322 threaded reply a recipient's client would visually nest.

### Inbound email — the real, current state (plainly: mostly absent)
- **A real inbound-email webhook exists and is live**, but it solves a different, narrower problem: [`/api/webhooks/resend/inbound`](../src/app/api/webhooks/resend/inbound/route.ts) is svix-signature-verified, fetches the body via Resend's `/emails/receiving/:id` REST endpoint (documented as necessary because "the Resend Node SDK has spotty support" for that endpoint — a real, previously-hit issue), strips quoted replies/signatures, and dead-letters malformed events. **All of that machinery is directly reusable.**
- **But it is hardcoded to the Email→SMS bridge**: it parses the *target* address for the pattern `+<phone>@sms.leadsmind.io` and, on match, creates/updates a **`platform:'sms'`** conversation, then relays the content out over Twilio SMS. It **never** creates a `platform:'email'` conversation and has no concept of "which workspace owns this inbox," "which contact sent this," or "which existing email thread this replies to."
- **No code path anywhere creates a `platform:'email'` conversation from an inbound message.** The only two places `platform:'email'` conversations are created (`sendDocumentToContact`, and implicitly `sendMessage`'s email branch when it inserts the first message) are both **outbound-initiated**.
- **Plain statement per the audit prompt's own framing: this is a genuinely new, non-trivial integration, not a UI-only addition.** Real work required: (a) a per-workspace receiving address or alias scheme (today there is exactly one shared receiving domain, keyed by phone number, for one specific feature), (b) "to" address → workspace resolution and "from" address → contact-by-email resolution (the existing bridge resolves by phone only), (c) new conversation/message insertion logic modeled on `handleInstagramDMMessage`/`handleFacebookMessengerMessage` in `webhooks/meta/route.ts`, (d) a decision on reply-threading (STEP 1).

### Domain/DNS reality
- **`sender_domains`** ([20240101000133](../supabase/migrations/20240101000133_phase91_sprint1_email_domain.sql)) is **outbound-only** — `spf_status` / `dkim_status` / `dmarc_status` / `verified_at`, no MX or receiving fields at all.
- **`domain_configurations`** (the course-custom-domain system, [ADR-0003](../docs/Leadsmind/02-Architecture-Decisions/ADR-0003-custom-domain-course-serving.md)) is HTTP/Cloudflare-for-SaaS routing — deliberately kept separate from `sender_domains` per [ADR-0004](../docs/Leadsmind/02-Architecture-Decisions/ADR-0004-sender-domains-vs-custom-domains.md) (mail-auth vs. HTTP routing are genuinely different problems). **Neither table has any receiving/MX concept.**
- **The one real, live receiving domain is `sms.leadsmind.io`** (documented in [EMAIL_SMS_BRIDGE.md](../docs/EMAIL_SMS_BRIDGE.md): "Ensure MX records for your receiving domain/subdomain point to Resend's inbound servers"). This proves Resend inbound-parse **works in this project's real DNS setup today** — but it's a single fixed subdomain for one feature, not a per-workspace or general-purpose receiving address. Standing up general inbound email means either routing all workspaces through one shared receiving domain with address-based (`workspace-slug+lead@inbox.leadsmind.io`) resolution, or (much more work) per-workspace custom receiving domains — a real operational/DNS decision, not just code.

---

## STEP 3 — Speech-to-text (PRD's own open question)

### What's already real and paid for
- **AssemblyAI is the established, already-integrated speech-to-text provider** — [`processMeetingAudio()`](../src/lib/calendar/transcription.ts#L16) (calendar meeting-recap pipeline) calls `api.assemblyai.com/v2/transcript` with `ASSEMBLYAI_API_KEY`, speaker diarization, and an `en_za` locale tuned for South African accents, then summarizes with GPT-4o-mini. It gracefully falls back to a mock transcript when the key is absent (sandbox-safe).
- **This directly answers PRD §8's open question:** AssemblyAI, not OpenAI Whisper, is the natural reuse — it's already wired, already costed, and already tuned for this project's actual user base's accent, whereas OpenAI is used elsewhere for text/LLM tasks (question generation, summaries) but **not** for audio transcription anywhere in this codebase today.

### Do voice notes already get transcribed? — Yes, partially, by a different, weaker mechanism
- Chat-channel voice notes (`MessageInput.tsx`'s recorder, used for WhatsApp/Instagram/FB voice notes and — since it's the same composer — already reachable for an `email` conversation too) already run **live, client-side transcription via the browser's Web Speech API** (`SpeechRecognition`/`webkitSpeechRecognition`, [MessageInput.tsx:178-198](../src/components/conversations/MessageInput.tsx#L178)) while recording, storing the result in `transcript` state → `messages.transcript` / `messages.metadata.transcript`.
- This is **not** the same mechanism the PRD implies (a server-side job on a specific provider) and is meaningfully weaker: browser-dependent (Chrome-family only, no Safari support), best-effort, never reviewed/re-run server-side, and **not gated by the existing `deduct_ai_credit` AI-credit RPC** (nor is AssemblyAI's call in `processMeetingAudio` — an existing inconsistency worth flagging, not a pattern to copy uncritically).
- **Conclusion:** the PRD's transcription requirement is a **real upgrade of an existing, shipped, but lower-quality mechanism** — not a green-field integration. Recommend AssemblyAI for the email voice-note path (higher quality, matches the "review before send" requirement better since it's an async job with a clear completion point, unlike live Web Speech partial results).

---

## STEP 4 — Hosted playback page (PRD's own open question)

- **`src/app/certificates/verify/[id]/page.tsx`** is the exact reusable pattern: unauthenticated Next.js route, **service-role** Supabase read (bypassing RLS deliberately, since the caller has no session), looked up by an opaque `validation_id`, returning only the minimal fields meant to be public. This is a direct template for `/voice-note/[token]` or similar — **no new subdomain or separate app needed**; per ADR-0003/ADR-0004, the heavier "custom domain" machinery (Cloudflare-for-SaaS hostnames, SSL) exists for a different problem (workspace white-labeling) and is unnecessary overhead for same-origin platform content like this.
- **Unguessable-link pattern:** `course_certificates.validation_id` (an opaque, non-sequential id looked up directly) is the simplest proven precedent. [`src/lib/security/unsubscribeToken.ts`](../src/lib/security/unsubscribeToken.ts) (already reused by the shipments delivery-confirmation flow, per its own comment) shows a **signed-token** alternative for cases needing tamper-evidence without a DB round trip. For a playback link, the certificate-style "just look up an opaque id via the service-role client" pattern is sufficient and simpler — recommend it over minting a new signed-token scheme.
- **The actual player on that page should be `VoiceNotePlayer.tsx`** — a real, working, dark-themed `<audio>` player with play/pause/scrub/mute and a 33-bar decorative waveform, already used in the chat inbox and LMS. It is the correct live-playback component; nothing new needed there.

---

## STEP 5 — Outlook-safe HTML precedent + waveform visual reference

- **The codebase is inconsistent on Outlook-safety.** [`sendVoiceNoteEmail()`](../src/lib/voicenotes/voiceNoteEmail.ts) — the one template that matters most here — is **already** built table-based, inline-styled, Outlook-conservative HTML (nested `<table>`s, no flexbox/grid, inline `style=` attributes throughout). By contrast, the calendar meeting-recap email in `processMeetingAudio()` uses plain `<div>` layout with padding/border-radius — **not** Outlook-safe. **Use `sendVoiceNoteEmail`'s existing table convention as the base, not the calendar template.**
- **This PRD's voice-note-email feature is an upgrade of a real, already-shipped feature, not new work from zero.** `sendVoiceNoteEmail()` is already called today from `sendMessage()`'s `email` **and** `whatsapp` branches whenever `audioUrl` is present, and already does: workspace branding lookup (logo, brand color), sender avatar rendering (photo or initials), a table-based Outlook-safe shell, and a duration caption. What it does **not** yet do, that this PRD requires: a waveform graphic (today it's a single "▶ Listen to voice note" CTA button), transcript body text (today the email body has no transcript — only an optional italic caption if the caller passed `message`), dual top+bottom placement, and a hosted branded playback page (today the button links **directly to the raw `audioUrl`** file, not a playback micro-page).
- **Waveform visual reference:** `VoiceNotePlayer.tsx`'s `WAVEFORM_BARS` (33 fixed heights, decorative) is the established visual language for "this is a voice note" in this product; the email version should render the **same bar proportions** as static `<td>`/`<div>` elements (per the PRD's own `Outlook_Email_Mockup.html`, which already does exactly this with `.bar` divs) rather than inventing new proportions.

---

## STEP 6 — Consolidated answers

**Speech-to-text, hosted-page location, click-analytics timing (PRD §8):**
1. **AssemblyAI** — already integrated, already costed, already tuned for this user base; not Whisper.
2. **Folded into the existing app**, not a subdomain — clone `certificates/verify/[id]`'s public-route pattern.
3. **Click analytics can piggyback on the existing `email_tracking_logs` table** ([20240101000133](../supabase/migrations/20240101000133_phase91_sprint1_email_domain.sql), already ingesting Resend's `email.clicked` events with a `link_url` column) — top/bottom position can be encoded as a query param on each waveform link and read back from `link_url`. This makes top-vs-bottom click analytics **near-free from day one**, not a v2 add-on — recommend building it now rather than deferring.

**Is the new delivery-reliability infrastructure reusable for email?**
**Partially, by design, not automatically.** Part 1 (idempotency) and Part 3 (UI state machine) are channel-agnostic and already cover email with zero changes. Part 2 (retry queue, timeout, failure classification) and Part 4 (delivery dashboard, alerting) are Meta-specific and need a **parallel, structurally-identical build** for Resend/SMTP — same `message_dispatch_queue` table and worker shape, same `dispatchOutboundMessage`-style single-send-path discipline, but a different error-classification function (Resend/SMTP error codes, not Graph error codes) and a one-line addition to the Part 4 channel filters once that classification exists.

**Real, current state of inbound email:**
**This is confirmed as the single biggest true unknown, exactly as anticipated.** A real, production-proven inbound webhook mechanism exists (svix verification, Resend's receiving-API body fetch, dead-lettering) — but it is entirely dedicated to one unrelated feature (the Email↔SMS bridge, phone-address-keyed) and creates no email conversations. Zero code today turns a received email into a Communications Hub conversation for any workspace. This is a genuinely new integration requiring a receiving-address/domain decision, new from/to resolution logic, and new conversation-creation logic — not a UI-only addition.

### Complexity per rollout step, now that overlap is known

| PRD step | Classification | Notes |
|---|---|---|
| **1. Email as a channel (parity)** | **Small for outbound / Medium-Large for true inbound parity** | Outbound "parity" is already ~done: `platform:'email'` conversations, contact-based grouping, All/Mine/Unassigned, tab derivation, and Parts 1+3 of the reliability work all already apply. If "parity" means an agent can *also receive* email replies in the same inbox (what "inbox" implies), that's the inbound-email build from STEP 2 — genuinely new. |
| **2. Composer voice-note + transcription** | **Small–Medium** | Recording UI (record → preview → re-record → attach) already exists verbatim in `MessageInput.tsx`, reusable as-is for the email composer. Net-new: swap/upgrade to AssemblyAI, and add the PRD's required "review/edit transcript before send" step — today's chat voice notes auto-send with no review step at all. |
| **3. Waveform email template (Outlook-tested)** | **Small–Medium** | Extend `sendVoiceNoteEmail()`'s existing Outlook-safe table shell (don't build from scratch, don't copy the non-safe calendar template). Net-new: static waveform bars (matching `VoiceNotePlayer`'s proportions), dual top/bottom placement, transcript body injection, real click-tracking query params. Actual Outlook/Gmail/Apple-Mail rendering QA is manual verification, not code — nothing in-repo tests real email-client rendering. |
| **4. Hosted playback micro-page** | **Small** | Clone `certificates/verify/[id]`'s public-route + service-role-read + opaque-id pattern; render with the existing `VoiceNotePlayer` component. One new route, one new lookup table/column for the opaque link id. |
| **5. Ship to internal test group, verify across clients** | **Small (process, not code)** | Same nature as the messaging-reliability audit's equivalent step — manual QA effort, not build complexity. |

### Biggest risks to flag before building
1. **Inbound email is the load-bearing unknown.** A channel that can send but never receive replies is a broadcast tool, not an inbox — confirm with whoever owns the PRD whether Phase 1 can ship send-only (matching "Instagram ships first" style sequencing from the prior PRD) or whether inbound must land before this counts as done.
2. **Subject-vs-contact threading is an explicit decision, not a detail** — every existing channel groups by contact; shipping email the same way is consistent but contradicts PRD 4.1's literal wording. Decide and document before building, the same way the delivery-reliability work had to explicitly decide and document the Instagram-capped-status model.
3. **`sendVoiceNoteEmail` already exists in production** (reachable today from the chat inbox's WhatsApp/email voice-note flow) — changing its HTML shape is a live-feature edit, not a new component; verify no other caller depends on its current single-CTA-button shape before reworking it into the dual-waveform layout.
4. **AI-credit accounting is inconsistent today** (AssemblyAI/OpenAI calls in `processMeetingAudio` are not credit-gated) — decide explicitly whether new transcription calls should go through `deduct_ai_credit`, rather than silently inheriting the existing gap.

---

**Implementation:** Parts 1-3 were built on 2026-09-04 — see [`email-channel-voice-note-build-log.md`](email-channel-voice-note-build-log.md) for what shipped, corrections to this audit's own assumptions, remaining gaps, and required ops steps.
