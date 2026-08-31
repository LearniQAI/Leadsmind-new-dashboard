---
type: module
---

# Communications Hub

## Purpose

Inbound + outbound messaging across channels: the unified Conversations inbox,
WhatsApp / Messenger / Instagram DMs via the Meta webhook, SMS + voice via
Twilio, transactional email via Resend, and (Milestone 3) a real phone system
with IVR. Contacts and conversations are workspace-scoped; some inbound paths
are system-initiated with no logged-in user.

## Key Files

- Inbox: `src/app/conversations` (`ConversationsClient.tsx`, `page.tsx`),
  `src/app/whatsapp-broadcasts`, `src/app/sms`.
- Meta: `src/app/api/webhooks/meta/route.ts` (Messenger / Instagram / WhatsApp),
  `src/app/api/meta/connections`, `src/app/api/admin/meta/backfill-profile-sync`,
  `src/lib/meta/` (`MetaAdapter.ts`, `whatsappWindow.ts`, `config.ts`,
  `subscribeWebhook.ts`).
- Twilio: `src/app/api/webhooks/twilio/inbound/route.ts`, `src/lib/sms.ts`,
  `src/lib/twilio/resolveWorkspaceTwilioCredentials.ts`.
- Email: `src/app/api/webhooks/{email,resend}`, `src/lib/email/`, `src/lib/email.ts`,
  `docs/EMAIL_SMS_BRIDGE.md`.
- Dead letters: `src/app/api/admin/dead-letters`.
- Server actions: `messaging.ts`, `whatsapp_broadcast.ts`, `whatsapp_bot_rules.ts`,
  `bulk_sms.ts`.

## API Routes / DB Tables

- Routes: `src/app/api/webhooks/{meta,twilio,email,resend,support}`,
  `src/app/api/meta/connections`, `src/app/api/admin/meta/backfill-profile-sync`,
  `src/app/api/admin/dead-letters`, `src/app/api/cron/reminders`,
  `src/app/api/lena/*` (assistant chat).
- Tables: `conversations`, `messages`
  (`20260903000011_conversations_messages_realtime.sql`), `contacts`,
  `platform_connections`, `webhook_dead_letters`, WhatsApp opt-out
  (`20260823000002_unify_sms_whatsapp_opt_out.sql`), `quick_replies`
  (`20260721000003_fix_quick_replies_rls.sql`).

## Known Issues

- **Meta webhook failures for Messenger + Instagram DMs** — primary
  [[Milestone-4]] fix. In `webhooks/meta/route.ts` the handler branches on
  `payload.object` (`page` → `handleFacebookMessengerMessage`, `instagram` →
  `handleInstagramDMMessage`, else WhatsApp `changes`), loops `entry[].messaging[]`,
  and skips `is_echo` / `delivery` / `read` events. A Page/IG/WABA ID with no
  matching `platform_connections` row means the inbound message is silently
  dropped after Meta delivered it (we still ack 200 so Meta doesn't disable the
  subscription); the drop is now recorded in `webhook_dead_letters`
  (`recordConnectionNotFound`) instead of only ephemeral logs. Fix = reconnect
  the account / repair the stale `platform_connections` row.
- **Placeholder contact names:** Messenger/IG contacts are inserted as
  `"{Platform} User {id}"` first, then profile-synced; `isPlaceholderName()` /
  `profile_synced_at` drive re-sync. `backfill-profile-sync` route retro-fills
  contacts still on a placeholder. Falls back to placeholder if the Graph
  profile fetch fails.
- **Inbound signature verification** added in [[Milestone-1]]: Twilio (task 8)
  and Meta `X-Hub-Signature-256` (task 9, `isValidMetaSignature`, constant-time).
- Meta media resolution falls back to sandbox mock asset URLs when
  `recipientPhoneId` starts with `mock_` or no system-user token is stored
  (`route.ts:825`).
- Google Meet webhook (`src/app/api/meet/webhooks/google/route.ts:56`) notes a
  channelId-guessing injection risk for fake events.
- Unified inbox internal depth was not independently verified in the README
  audit — "route exists" only.
- Phone system + IVR do not exist yet — [[Milestone-3]] tasks 72–74; the
  "Phone & IVR" marketing page currently overstates what's built.

## Related Tasks

[[Milestone-1]] (Twilio + Meta/WhatsApp inbound webhook signature verification) ·
[[Milestone-3]] (real phone system, IVR builder, SMS/WhatsApp appointment
reminders) · [[Milestone-4]] (Meta webhook Messenger/Instagram DM fixes,
unified social comment inbox — see [[Social-OAuth-Integrations]])
