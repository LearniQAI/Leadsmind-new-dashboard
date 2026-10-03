# WhatsApp in the Communications Hub: connect, chat and import audit (2026-10-02)

Audit only. No product code, config, env file or pre-existing row was changed. The only repo file created is this report. Probe scripts ran from the session scratchpad, outside the repo.

Prior audit `WHATSAPP_AUDIT.md` is referenced by row number as **WA-n.n** and is not repeated.

**Branch `wa-batch1` is NOT merged.** The branch HEAD (778dff66) sits on top of `master` (61a5b94a). The WhatsApp Batch 1 work exists only as **uncommitted working-tree changes** (12 modified files, plus untracked `whatsappSendGuard.ts`, `mockMode.ts`, `optOutKeywords.ts`, `payloadSummary.ts`, `src/lib/whatsapp/`). My live probes ran against that working tree.

| Prior row | Covered by wa-batch1 (uncommitted)? | Evidence |
|---|---|---|
| WA-1.2 mock connect | Yes | `mockMode.ts`, `connectPlatformManually` guard |
| WA-3.5/3.6 STOP bypass | Yes | `applyWhatsAppKeyword` in `webhooks/meta/route.ts` |
| WA-8.4 window / fake templates | Partly. The server window guard works (P9.outOfWindow blocked). The fake template UI is removed. Real template reply is still missing ("Template replies are coming soon") | `whatsappSendGuard.ts` |
| WA-8.5 opted-out agent send | Yes in code (not re-proven by me) | `whatsappSendGuard.ts` |
| WA-9.3 ReDoS | Yes (regex rules never evaluated) | `route.ts` |
| WA-10.2 template stub | Yes (removed) | `lms_actions.ts` diff |
| PII in webhook log | Yes (`summarizeMetaPayload`) | `route.ts:93` |
| Mock stock media in prod | Yes (gated on mock mode) | `route.ts` |
| Everything else in WA-3.1, 3.3, 7.1, 6.x | **No** | |

## A. Part 0: What Meta actually allows

Retrieved 2026-10-02 with WebFetch. WebFetch returns a summary produced by a small model, not the verbatim page. Treat the wording as a paraphrase and re-read the pages before any commitment.

Sources:
- S1 = developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users (the shorter path `/embedded-signup/onboarding-business-app-users` returned **404**)
- S2 = .../embedded-signup/overview
- S3 = .../cloud-api/reference/media
- S4 = .../cloud-api/guides/send-messages
- S5 = .../cloud-api/support/error-codes
- T1 = third-party vendor pages (chakrahq.com, timelines.ai, via web search). Not authoritative.

| Capability | Via Coexistence (Business app number) | Via dedicated Cloud API number | Not possible officially | Source |
|---|---|---|---|---|
| Import existing contacts | Yes. `smb_app_state_sync` webhook carries contacts (`action: add/remove`, name and phone). Doc says all contacts with a WhatsApp number | No. There is no pre-existing address book | | S1 |
| Import chat history | Yes. `history` webhook, messages within **180 days** of onboarding, 1:1 only. Delivered in `phase` 0, 1 or 2 with `chunk_order` and `progress` (0-100). The meaning of each phase was not captured in the fetched text | No history exists | Older than 180 days | S1 |
| Customer consent for history | Business grants it **on the phone** during onboarding. If declined, the error is code **2593109** "History sync is turned off by the business from the WhatsApp Business App" | n/a | | S1 |
| One-time window | Partner has **24 hours** to sync history, otherwise the customer must be offboarded and redo the flow | n/a | | S1 |
| Media in history | Media within **14 days** gets asset IDs. Older media has no identifiers | n/a | Media older than 14 days | S1 |
| Phone-sent messages (echoes) | Yes. `smb_message_echoes` webhook, payload `message_echoes[]` | No (the phone is not used) | | S1 |
| Continued two-way sync | Yes. Webhook topics `history`, `smb_app_state_sync`, `smb_message_echoes` must all be enabled | Cloud API only | Companion devices WhatsApp for Windows and WearOS cannot link, and their messages send no webhooks | S1 |
| Groups | | | **Not synced**; unsupported on Cloud API | S1 |
| Throughput | Fixed **20 messages per second** for numbers on both app and API | Scales with tier | | S1 |
| Required app version | WhatsApp Business app **2.24.17** or newer | n/a | Personal WhatsApp app numbers | S1 |
| Number age / usage | "Used at least 7 days" appears only in third-party pages (T1). It is **not** in the Meta text I retrieved. Unverified | n/a | | T1 |
| Inactivity disconnect | Companion device about 30 days inactive, primary device about 14 days inactive (T1 says open the app every 10-14 days) | n/a | | S1, T1 |
| Disconnect | Customer: app Settings > Account > Business Platform > Disconnect. Triggers `account_update` with `PARTNER_REMOVED`. `ACCOUNT_OFFBOARDED` on re-registration | Via API | | S1 |
| Country: +27 South Africa and +234 Nigeria | **CONFLICT, unverified.** The Meta text I retrieved lists no restrictions. Chakra (T1, retrieved 2026-10-02) says both countries were unsupported in early 2026 and were "added" in Apr-Jun 2026. A second search snippet says early-2026 sources called them unsupported, keyed on the Business app's number. No Meta primary source | Cloud API numbers are not country-gated this way | | S1, T1 |
| Embedded Signup | JS SDK plus Facebook Login for Business returns WABA ID, phone number ID and an exchangeable code. Server must: exchange the code, **register the number for Cloud API**, **subscribe the app to WABA webhooks**. Needs advanced access to `whatsapp_business_management` and `whatsapp_business_messaging` | Same | | S2 |
| Tech Provider / limits | Must be a Tech Provider or Solution Partner for Coexistence. Default **10 onboarded customers per 7 days**, raised to 200 after Business Verification, App Review and Access Verification. Tech Providers need customers to add a payment method | Same | | S1, S2 |
| Media retrieval | `GET /{media-id}` returns a URL that **expires after 5 minutes** and needs the Bearer token. Webhook media IDs are valid 7 days. Inbound max 100 MB. Audio 16 MB, image 5 MB, video 16 MB, document 100 MB, sticker 100/500 KB | Same | | S3 |
| 24-hour window | Free-form service messages only within 24 hours of the customer's last message. After that, templates only | Same | | S4 |
| Error codes | 131047 window closed (send template). 131026 undeliverable. 131050 user opted out of marketing (do not retry). 130429 throughput hit. 131056 pair rate limit. 131049 ecosystem engagement block. 131051 unsupported type. 131053 media upload failed. 133010 number not registered. 190 token expired | Same | | S5 |
| Feature type name for the Coexistence flow (`whatsapp_business_app_onboarding`) | **Not found** in the fetched text. Must be confirmed in the Embedded Signup configuration docs before building | | | S1 |

## B. Feature map (UI route to action/API to table/RPC to external call)

| Flow | UI | Action / route | Tables / RPC | External |
|---|---|---|---|---|
| Open inbox | `/conversations` ([page.tsx](src/app/conversations/page.tsx)) | `getConversations` ([messaging.ts:255](src/app/actions/messaging.ts#L255)), `getConnectedPlatforms` (:197) | `conversations` + nested `contacts`, `messages`; RPC `conversation_unread_counts` | none |
| Realtime | [ConversationsClient.tsx:328-352](src/app/conversations/ConversationsClient.tsx#L328) | channel `conversations-hub:<ws>`, `postgres_changes` filtered `workspace_id=eq.` | publication `supabase_realtime`: `conversations`, `messages` | Supabase Realtime |
| Send | `MessageInput.tsx` | `sendMessage` ([messaging.ts:294](src/app/actions/messaging.ts#L294)) then `dispatchOutboundMessage` | `messages` (idempotent via `client_message_uuid`), `platform_connections`, `message_dispatch_queue` | `POST graph.facebook.com/v18.0/{pn}/messages` ([MetaAdapter.ts:281](src/lib/meta/MetaAdapter.ts#L281)) |
| Retry | cron `message-dispatch` every minute ([vercel.json:49](vercel.json#L49)) | `dispatchOutboundMessage` | `message_dispatch_queue` | Graph |
| Inbound / status | none | [webhooks/meta/route.ts](src/app/api/webhooks/meta/route.ts): `handleWhatsAppMessage` (:758), status loop (:219) | `platform_connections` lookup by `credentials->>phone_number_id`, `contacts`, `conversations`, `messages`, `webhook_dead_letters` | Graph media fetch (:902) |
| Connect | Settings > Integrations, [ConnectPlatformsModal.tsx](src/components/dashboard/ConnectPlatformsModal.tsx) | `getMetaAuthUrl`, `/api/auth/meta/callback`, Inngest [metaDiscovery.ts:120](src/lib/inngest/functions/metaDiscovery.ts#L120), or wizard `saveMetaConnections` ([messaging.ts:1064](src/app/actions/messaging.ts#L1064)) | `platform_connections` (unique `(workspace_id, platform)`) | Graph `me/accounts`, `phone_numbers`, `subscribed_apps` |
| Disconnect | same modal | `disconnectPlatform` ([messaging.ts:220](src/app/actions/messaging.ts#L220)) | DELETE row | none |
| Assign / status / tags / notes | `ContactInfoPanel`, list | `updateConversationAssignment` (:715), `updateConversationStatus` (:733), `updateConversationTags` (:751), `sendInternalNote` (:682) | `conversations`, `messages(direction=note)` | none |
| Unread | list | `getUnreadCounts`, `markConversationsRead` ([conversationReads.ts](src/app/actions/conversationReads.ts)) | `conversation_reads` (own-user RLS) | none |
| Quick replies | `MessageInput` | `getQuickReplies` (:769) | quick replies table | none |

**Channel abstraction.** There is no single channel interface. `sendMessage` branches per channel inline: `email` (:~480), `sms` (:525, sent through an email bridge address `<phone>@sms.leadsmind.io`), and `['facebook','instagram','whatsapp']` (:549). Inside that branch, WhatsApp voice notes go through `sendVoiceNoteWhatsApp`. Text goes through `dispatchOutboundMessage`, which branches on `isMeta()`/`email` ([dispatchOutboundMessage.ts:67](src/lib/messaging/dispatchOutboundMessage.ts#L67)). Inbound has four unrelated handlers: `handleFacebookMessengerMessage`, `handleInstagramDMMessage`, `handleWhatsAppMessage`, plus Twilio/Resend/Gmail webhooks. The UI branches on `selectedPlatform === 'whatsapp'` in several files (`ConversationThread.tsx:77,183`, `MessageInput.tsx:303,365`). Shared pieces are channel-agnostic: unread, assignment, tags, notes, realtime, the failed-bubble UI.

## C. Parity matrix

Cell = status and evidence. "read" = code and policy reading only. "live" = I ran it (probe IDs P/R, see section J). The Instagram, Facebook, Email and SMS columns are read-level only, because the scope was WhatsApp.

| # | Capability | Instagram | Facebook | Email | SMS | WhatsApp |
|---|---|---|---|---|---|---|
| 0 | Channel visible in the inbox | WORKS ConversationsClient:21 | WORKS | WORKS | WORKS | **BROKEN** hidden by `HIDDEN_CHANNELS` ([ConversationsClient.tsx:28](src/app/conversations/ConversationsClient.tsx#L28)); filtered at :116 |
| 1 | Inbound text | WORKS route.ts:585+ read | WORKS route.ts:420+ read | WORKS resend/inbound, gmail sync read | PARTIAL twilio/inbound:195-260, bridge design | WORKS live P1 |
| 2 | Inbound media | PARTIAL first attachment only, CDN URL kept (route.ts:707) | PARTIAL same (:550-554) | PARTIAL no attachment code in resend/inbound read | MISSING no `NumMedia` handling in twilio/inbound | **BROKEN** in production. Live P4: media types stored as `[Media received]` with a media id. The fetch (route.ts:902) reads only `system_user_access_token_encrypted`, but both real connections store only `access_token_encrypted` (DB key list). The stored URL is a 5-minute Graph URL needing a Bearer header ([MessageBubble.tsx:126](src/components/conversations/MessageBubble.tsx#L126) renders it raw) |
| 3 | Outbound text | WORKS read | WORKS read | WORKS read | PARTIAL email bridge (messaging.ts:525) | WORKS live P9.inWindow (mock) |
| 4 | Outbound media | MISSING | MISSING | PARTIAL voice note only | MISSING | PARTIAL voice note only (`sendVoiceNoteWhatsApp`); no image/document send |
| 5 | Replies / quoted | MISSING | MISSING | WORKS `in_reply_to` columns | MISSING | MISSING inbound `context` dropped (P4 replyContext stored only text); send has no `context.message_id` |
| 6 | Reactions | MISSING (`message_reactions` not subscribed, subscribeWebhook.ts:43) | MISSING | MISSING | MISSING | **BROKEN** inbound reaction becomes a "[Media received]" bubble (P4) |
| 7 | Message status in thread | PARTIAL read-only by design (deliveryStatus.ts) | WORKS delivered+read | PARTIAL | PARTIAL twilio/sms-status | PARTIAL live P5: statuses applied but **regress** (read, then delivered, then sent all accepted); `failed` overwrote metadata and dropped `transcript`/`client_message_uuid`; error code lost |
| 8 | Failed-send UI and retry | WORKS MessageBubble.tsx:72-116 | WORKS | WORKS | PARTIAL | PARTIAL generic retry works; no friendly mapping of Meta codes (see Part 5) |
| 9 | Unread counts | WORKS RPC | WORKS | WORKS | WORKS | WORKS RPC channel-agnostic (hidden in UI) |
| 10 | Assignment | WORKS | WORKS | WORKS | WORKS | WORKS (see I-2 for foreign-id fake success) |
| 11 | Internal notes | WORKS | WORKS | WORKS | WORKS | WORKS |
| 12 | Tags | WORKS | WORKS | WORKS | WORKS | WORKS |
| 13 | Search | PARTIAL client-side, name/title only (ConversationsClient:427-430) | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| 14 | Filter by channel | WORKS | WORKS | WORKS | WORKS | **BROKEN** hidden |
| 15 | Contact auto-match / create | WORKS read | WORKS read | WORKS | WORKS | PARTIAL SA numbers OK; **non-SA duplicates** live P3; **race duplicates** live P2 |
| 16 | Duplicate-contact handling | MISSING | MISSING | WORKS unique `(workspace_id,email)` | PARTIAL `limit(1)` | **BROKEN** live P2 (3 contacts from one number) and R2 (arbitrary pick among same-number contacts) |
| 17 | Merge contacts | MISSING | MISSING | MISSING | MISSING | MISSING (grep: no merge) |
| 18 | Quick replies / templates | WORKS | WORKS | WORKS | WORKS | PARTIAL quick replies work; real template reply MISSING |
| 19 | AI reply suggestions / LENA in Hub | MISSING | MISSING | MISSING | MISSING | MISSING (no AI code in conversations components) |
| 20 | Opt-out enforcement on agent send | MISSING | MISSING | PARTIAL | PARTIAL | PARTIAL guard exists but uncommitted; I proved only the window branch live |
| 21 | Realtime | WORKS | WORKS | WORKS | WORKS | WORKS live P10: 1.9 s; tenant B did not receive A's row |
| 22 | Push / email notifications | WORKS trigger read | WORKS | WORKS | WORKS | WORKS trigger is channel-agnostic (not live-tested for WA) |
| 23 | Permissions / roles | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL module gate; any permitted member sees every conversation; connection rows are admin/owner-only (policy read) |
| 24 | Close / reopen / archive | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL no archive; an inbound message does not reopen |
| 25 | Export / delete (GDPR/POPIA) | MISSING | MISSING | MISSING | MISSING | MISSING |
| 26 | Inbox pagination / scale | BROKEN | BROKEN | BROKEN | BROKEN | **BROKEN** live P11: `getConversations` returned 1000 of 1160 conversations, no pagination |

## D. Connect journey

| # | Step | UI exists | Backend real | Status | Evidence | Gap |
|---|---|---|---|---|---|---|
| 1 | Entry point to connect | Yes, Settings > Integrations | Yes | PARTIAL | ConnectPlatformsModal.tsx | The Hub itself hides WhatsApp, and nothing in the inbox says "connect WhatsApp" |
| 2 | Embedded Signup (JS SDK, `config_id`) | No | No | MISSING | grep for `FB.login`, `config_id`, `WA_EMBEDDED_SIGNUP`, `embedded` found nothing | Core of the goal |
| 3 | Coexistence onboarding (Business app number) | No | No | MISSING | grep `coexist`, `smb_`, `history_context` found nothing | |
| 4 | OAuth code exchange (Facebook login) | Yes | Yes | PARTIAL | callback/route.ts:111-125 long-lived exchange (about 60 days) | Page-based login, not WABA-based |
| 5 | WABA discovery | Yes | Yes | PARTIAL | metaDiscovery.ts:120-148 | Finds only the Page-linked or first owned WABA |
| 6 | Number choice / multiple numbers | Wizard picker | Partial | MISSING (multi) | `platform_connections` unique `(workspace_id, platform)`; metaDiscovery.ts:149 takes `data[0]` | One number per workspace; discovery silently takes the first |
| 7 | Number registration (PIN / 2FA) | No | No | MISSING | grep `/register` found nothing | Required by S2 |
| 8 | Cloud API health gate | Error toast | Wizard path only | PARTIAL | messaging.ts:1138-1155 vs discovery path with **no** check (metaDiscovery.ts:154-170) | Discovery saves `connected` after only a webhook-subscribe check. This is the failure the wizard comment warns about. Whether a Coexistence number passes `platform_type == CLOUD_API` is unknown (DEFERRED) |
| 9 | Webhook subscription | Silent | Yes | PARTIAL | `subscribeWabaToMetaWebhook`; fields come from app-level config (subscribeWebhook.ts:96) | Nothing ensures `history`, `smb_message_echoes`, `smb_app_state_sync`, `account_update` are enabled. The handler ignores them anyway (P7) |
| 10 | Token type and storage | n/a | Yes | PARTIAL | Discovery stores `access_token_encrypted`; the wizard stores `system_user_access_token_encrypted`. Live: both real rows have only `access_token_encrypted` | Two shapes; the media reader handles only one |
| 11 | Token expiry / refresh / alarm | No | No | MISSING | No `debug_token`, `expires` handling for Meta WhatsApp | A 60-day user token silently dies; the lines go `connected` until a send fails |
| 12 | Quality rating, messaging tier, display-name status | No | No | MISSING | grep `quality_rating`, `messaging_limit`, `name_status` found nothing | |
| 13 | Disconnect | Yes | Partial | PARTIAL | messaging.ts:220 deletes the row only | No webhook unsubscribe, no token revoke, queue rows left, conversations kept. Inbound afterwards goes to dead letters |
| 14 | Country availability (+27, +234) | No | No | MISSING | Nothing config-driven. `normalizePhone` assumes SA (phone.ts) | |
| 15 | Requirements guidance (Business app, version, 7+ days) | No | n/a | MISSING | Only an error string at messaging.ts:1148 | |
| 16 | Mock connect blocked in production | n/a | Yes | PARTIAL | wa-batch1, uncommitted | Not deployed |
| 17 | Same pattern as Instagram/Facebook | Yes | Yes | PARTIAL | One OAuth callback plus Inngest discovery, same for IG/FB/WA | Reusable, but WA needs a different front door (Embedded Signup) |
| 18 | WhatsApp shows in the Hub after connect | No | n/a | BROKEN | ConversationsClient.tsx:28 | One-line gate, but the inbound path below must be fixed first |
| 19 | Inbound routing by `phone_number_id` | n/a | Yes | WORKS | Unique partial index `platform_connections_whatsapp_phone_number_unique`; P1; unknown ids go to `webhook_dead_letters` (live, see L) | |
| 20 | Webhook signature | n/a | Yes | WORKS | P1: no header gives 403 | |
| 21 | Outbound send | Yes | Yes | WORKS | P9 (mock only) | Real Meta behaviour DEFERRED |

## E. Import feasibility

| Item | Possible? | How | Exists in code? | Gap |
|---|---|---|---|---|
| Contacts from the phone's address book | Yes, Coexistence only | `smb_app_state_sync` `state_sync[]`, plus initial sync | **No.** The webhook returns 200 and ignores it (P7: delta 0 contacts) | Handler; E.164 dedupe; `source='whatsapp_import'`; **no marketing opt-in** |
| Contacts on a dedicated Cloud API number | No | Only people who message in | n/a | Product must not promise it |
| Chat history | Yes, last 180 days, 1:1 only, only if the customer consents on the phone | `history` webhook, chunks with `phase`, `chunk_order`, `progress` | **No** (P7: delta 0 messages) | Handler, job table, resume, progress UI |
| Idempotent import | Needs a unique key | `messages(workspace_id, external_id)` unique index exists but is **partial** | **PostgREST upsert cannot target it.** P7 dbPrimitive: error "no unique or exclusion constraint matching the ON CONFLICT specification" | Use an RPC with `INSERT ... ON CONFLICT (workspace_id, external_id) WHERE external_id IS NOT NULL DO NOTHING` |
| Phone-sent messages (echoes) | Yes | `smb_message_echoes` | **No** (P7) | Handler; store as outbound `source='app_echo'`; dedupe against Hub sends by wamid |
| Media in history | Only last 14 days | Fetch by media id with the token inside the 5-minute URL life | No | Download to a private bucket at once |
| Groups | No | | | Tell the customer |
| Personal WhatsApp app numbers | No | | | Tell the customer |
| Customer declines history | Error 2593109 | | No | Show "contacts only, no history" |
| Collisions with CRM contacts | n/a | Match on `phone_e164` | Matching is broken for non-SA (P3) | Fix before import |
| 24h window after import | n/a | Window must come from the last **inbound provider timestamp** | Not safe: `last_customer_message_at` is set to `now()` (route.ts:343) and `sent_at` ignores the provider timestamp (P6) | Import would open every old thread's 24h window |
| Over-promising risk | | Full history, personal numbers, groups, anything older than 180 days, media older than 14 days | | Copy and expectations |

## F. Gap list

**Critical**
1. **Customers cannot connect or see their own number.** WhatsApp is hidden in the Hub (ConversationsClient.tsx:28, deliberately), and no Embedded Signup or Coexistence flow exists (D2, D3, D7). Affects every customer, and is the stated goal. Minimum fix: build Embedded Signup with registration and subscription, then un-hide. Effort **L**.
2. **History, echo and state-sync webhooks are silently dropped.** The handler only reads `field === 'messages'` ([route.ts:212](src/app/api/webhooks/meta/route.ts#L212)). P7 returned 200 and stored nothing. A customer would see an empty inbox and think the import "worked". Minimum fix: handlers and an import job. Effort **L**.
3. **Inbound media never resolves for real connections.** The reader (route.ts:902) uses `system_user_access_token_encrypted`; both live connections have only `access_token_encrypted`. Even if it resolved, it stores a 5-minute Meta URL that the browser cannot load without a Bearer token. Minimum fix: read either key, download inside the request, store in a private workspace bucket, serve signed URLs. Effort **M**.

**High**
4. **Duplicate contacts.** Non-SA numbers (P3: NG and UK each produced a second contact), and concurrent deliveries of the same message (P2: 3 contacts, one HTTP 500). Cause: `normalizePhone` returns null for any non-SA number without `+` (phone.ts:19-20), and Meta sends `wa_id` without `+`. The `phone` fallback is an exact string match. Minimum fix: prefix `+` for `wa_id`; use a single SQL ingest RPC with advisory lock or upsert. Effort **M**.
5. **Webhook handler is sequential and slow.** P11: 40 messages in one payload took 115 s (2.9 s each from this laptop to the remote DB, with roughly 11 sequential queries per message). Meta will time out and retry; each retry hits the race in finding 4. A history chunk is impossible this way. Minimum fix: durable inbox table plus worker, 200 immediately. Effort **M-L**.
6. **Inbox cannot scale.** `getConversations` has no limit or paging, nests all messages, and silently truncates at 1000 conversations (P11: 1000 of 1160). Effort **M**.
7. **Lossy and unordered messages.** Eight inbound types become `[Media received]` (P4). Statuses regress (P5), and `failed` wipes metadata and the error code. The provider timestamp is ignored for `sent_at` and `last_customer_message_at` (P6), so a late old message sorts last and import would reopen windows. Effort **M**.
8. **Cross-tenant write.** See I-1. Effort **S**.

**Medium**
9. Discovery connect path has no Cloud API health check (D8), no token expiry monitoring (D11), no quality/tier monitoring (D12). **M**.
10. Disconnect leaves the webhook subscription and token alive (D13). **S**.
11. Credentials are serialised to the browser (I-3). **S**.
12. Imported and webhook-created contacts default to `opted_in = true` with no consent timestamp (R3: `opted_in:true`, `consent_timestamp:null`). Imports must not inherit this. **S**.
13. One number per workspace. **M**.
14. No friendly error mapping for 131047, 131026, 131050, 130429 (Part 5). **S**.
15. Graph pinned to v18.0 in 7+12+1 places in MetaAdapter, messaging.ts and the webhook, while `subscribeWebhook.ts` uses v25.0. **S**.

**Low**
16. Search is client-side and name-only; no merge; no archive; no GDPR export/erase; no AI suggestions. **M each**.
17. Status update by `external_id` is not workspace-scoped (route.ts:219+); wamids are globally unique, so impact is low. **S**.

## G. What must be built (batches in dependency order)

SQL below is **proposed only and was not applied**.

**Batch 0: safety and correctness before any import** (no Meta prerequisites; effort M)
- Scope: one SQL ingest function `wa_ingest_message(...)` that upserts contact (by `phone_e164`), conversation and message atomically; treat `wa_id` as E.164; monotonic status with `status_rank` and keep-existing metadata merge; store `provider_timestamp`; handle all inbound types; read both token key names; workspace-consistency check on `sendMessage`; paginate `getConversations`.
```sql
alter table messages add column provider_timestamp timestamptz, add column source text; -- hub|inbound|app_echo|history
alter table conversations add column last_inbound_provider_at timestamptz;
create or replace function wa_ingest_message(p_ws uuid, p_phone text, p_name text, p_ext text, p_dir text, p_body text, p_type text, p_meta jsonb, p_ts timestamptz, p_source text)
returns uuid language plpgsql security definer set search_path=public as $$ ... insert ... on conflict (workspace_id, external_id) where external_id is not null do nothing ... $$;
revoke all on function wa_ingest_message from public, anon, authenticated; grant execute to service_role;
alter table messages add constraint messages_conv_ws_fk foreign key (conversation_id, workspace_id) references conversations (id, workspace_id); -- needs unique (id, workspace_id) on conversations
```
- Risks: backfilling the composite FK; the RPC replaces about 150 lines of handler.
- Acceptance: replay x3 concurrent gives 1 contact, 1 conversation, 1 message and no 500; NG/UK numbers match an existing contact; late old message sorts by provider time; read then delivered does not regress.

**Batch 1: durable webhook inbox** (M-L). Table `meta_webhook_events(id, received_at, payload, status, attempts, error)`. Handler only verifies, inserts and returns 200. A worker (cron, or Cloudflare Queue later) processes with `FOR UPDATE SKIP LOCKED`. Acceptance: 1000-message payload returns 200 in under 1 s; worker drains idempotently.

**Batch 2: media pipeline** (M). Private bucket `whatsapp-media/{workspace_id}/{yyyy}/{wamid}`; download on receipt, validate MIME and size against S3 limits, store `storage_path`, serve signed URLs; retention policy. Acceptance: image, voice note and PDF render for a real connection.

**Batch 3: Embedded Signup and Coexistence connect** (L)
- New table (replaces the one-per-workspace limit):
```sql
create table whatsapp_numbers (id uuid pk, workspace_id uuid not null references workspaces on delete cascade, waba_id text, phone_number_id text unique, display_phone text, onboarding_type text, -- cloud|coexistence
  token_encrypted text, token_expires_at timestamptz, registered_at timestamptz, quality_rating text, messaging_tier text, name_status text, country_code text, status text, history_status text, created_at timestamptz default now());
```
- Scope: JS SDK, `config_id`, session logging, code exchange, register, subscribe fields (`messages`, `history`, `smb_app_state_sync`, `smb_message_echoes`, `account_update`, `message_template_status_update`), config-driven country gate, requirement copy.
- External prerequisites: Meta **Tech Provider** status, **Business Verification**, **App Review/advanced access** for the two WhatsApp permissions, **Access Verification**, a test WhatsApp Business app number (+27 and +234), webhook URL reachable, payment method setup. Default onboarding cap is 10 customers per 7 days until verified.
- Acceptance: a real Business-app number onboards, the webhook is subscribed to all fields, and a message round-trips.

**Batch 4: contacts, history and echo import** (L)
```sql
create table whatsapp_import_jobs (id uuid pk, workspace_id uuid, number_id uuid, status text, phase int, chunks_received int, progress int, messages_imported int, contacts_imported int, error text, started_at timestamptz, finished_at timestamptz);
alter table contacts add column whatsapp_opt_in text default 'unknown', add column whatsapp_opt_in_at timestamptz, add column whatsapp_opt_in_source text;
```
- Imported contacts: `source='whatsapp_import'`, `whatsapp_opt_in='unknown'`, excluded from marketing. Imported messages: `source='history'`, `historical_import=true` (the column already exists), no notifications, no unread, `last_customer_message_at` taken from the provider timestamp. Echoes: outbound, `source='app_echo'`, deduped against Hub sends by wamid.
- Acceptance: the same history payload twice gives zero duplicates; declined consent (2593109) shows "contacts only"; no imported contact receives a marketing broadcast.

**Batch 5: real template reply from the Hub, error mapping, status UI** (M). **Batch 6: monitoring**: token expiry alarm, quality/tier, `account_update` (`PARTNER_REMOVED`), offboarding that unsubscribes (S). **Batch 7: scale and compliance**: full-text search, retention, GDPR export/erase (L).

## H. Decisions I need from you (with recommendations)

1. **Coexistence or a dedicated number?** Recommend supporting both. Lead with Coexistence, because the goal is "keep my number and my chats". Keep the dedicated-number path as the fallback. Reason: the +27/+234 support is unverified (conflicting sources), so a country gate must be config-driven and a real +27 and +234 test must happen before launch.
2. **Import scope.** Recommend contacts plus 180-day history of 1:1 chats. Media is only the last 14 days, and expectations must say so.
3. **Imported contacts and marketing.** Recommend `whatsapp_opt_in='unknown'`, with no broadcasts until the contact opts in or messages in. This matches the principle in WA-3.1 (consent defaults to true).
4. **Retention** of message bodies and media. Recommend 24 months, with erase on request.
5. **One number or many per workspace.** Recommend many (new `whatsapp_numbers` table).
6. **Tech Provider timeline.** Nothing in Batch 3 can be tested for real without it. Decide whether to start the application now.
7. **Un-hide WhatsApp in the Hub?** Recommend not before Batch 0 and Batch 2 ship, because it would expose duplicate contacts, broken media and unbounded loading.

## I. Security findings

1. **Cross-tenant write (Medium-High).** Live P9: workspace B called `sendMessage` with workspace A's conversation id. It returned `success: true` and created a `messages` row with `workspace_id = B` and `conversation_id = A's`. The policy only checks `check_workspace_access(workspace_id)`, nothing ties the message to the conversation's workspace. The row is invisible to A, so there is no read leak, but it is cross-tenant data pollution and the caller sees a fake "delivered". The guard in `whatsappSendGuard.ts` filters by workspace and then returns "allowed" when the conversation is not found. Fix: a composite FK and a not-found error.
2. **Fake success on foreign ids (Low).** Live P9: B's `updateConversationAssignment`, `updateConversationTags` and `updateConversationStatus` on A's conversation returned `success: true` while A's row was unchanged (tags `[]`, status `open`). The same pattern as WA-12.1.
3. **Encrypted tokens sent to the browser (Medium).** `getConnectedPlatforms` selects `credentials` ([messaging.ts:204](src/app/actions/messaging.ts#L204)). `page.tsx:24` passes that array to a client component. Live P9 shows the keys include `access_token_encrypted`. Only admins/owners get rows (RLS), and the key is server-side, so this exposes ciphertext only. Select only `platform,status,last_sync_at`.
4. **RLS (OK, with notes).** `conversations` and `messages` use `check_workspace_access(workspace_id)` with role `public` (not `USING(true)`, and false without a session), plus a restrictive `module_access` policy. `platform_connections` is admin/owner only. `conversation_reads` is own-user only. Live: B's direct REST reads of A's connections and messages returned 0 rows. Realtime isolation held (P10). Any permitted member sees all conversations; there is no per-agent scoping.
5. **Webhook signature (OK).** P1: missing header gives 403.
6. **Duplicate-delivery race.** Handler step 7 inserts the message without checking the error ([route.ts:932](src/app/api/webhooks/meta/route.ts#L932)). P2 gave one HTTP 500 and three contacts from three simultaneous deliveries of one message.
7. **Status updates are not workspace-scoped** (`.eq('external_id', extId)` only, route.ts:219+). Low risk.
8. **Role limits unproven.** R1: a `member` with default module permissions saw 0 conversations and `sendMessage` failed. That is the permission gate working, not a connection test. Whether a permitted non-admin can send (the connection row is admin-only) is **not proven**; it needs a permitted member to test.
9. **PII.** Webhook logging is redacted in the working tree (uncommitted). Message bodies have no retention. Imported contacts would carry no consent evidence.
10. **Dead letters.** Unknown `phone_number_id` writes to `webhook_dead_letters` (live: 2 rows from my two runs, removed).

## J. Verified working vs deferred

**Verified live** (throwaway workspaces, mock connection, no network send, no real number):
- P1 signature 403 without header; inbound text creates 1 contact, 1 conversation, 1 message; sequential replay stored once.
- P10 Realtime delivers a new inbound message to an open inbox in about 1.9 s; the other tenant received nothing.
- P9 out-of-window send is blocked by the server guard; in-window send succeeds (mock).
- P9 B cannot read A's connections or messages through REST.
- Failures found: P2 (race), P3 (non-SA duplicates), P4 (lossy types), P5 (status regression, metadata wipe), P6 (ordering/timestamps), P7 (history/echo/state-sync ignored), P11 (115 s for 40 messages; 1000-row truncation), R2 (arbitrary duplicate pick), R3 (consent default).

**Deferred, with reasons**
- Simulated history import "twice, no duplicates": **cannot be shown**, because no handler exists. P7 proves the payloads are ignored. I did not fake an importer.
- Real Embedded Signup, Coexistence onboarding, number registration, real history/echo/state-sync delivery, real media download, real template send, tier/quality, and real +27/+234 behaviour: need a real Meta Business-app number and a Tech Provider app.
- Whether a Coexistence number reports `platform_type = CLOUD_API`.
- Browser/visual checks of the Hub.
- Production `META_APP_SECRET` (a test secret was used).
- Wa-batch1's own live suite (`scripts/db-checks/whatsapp-batch1.live.test.ts`) was not re-run by me.
- Timing: the 2.9 s per message is measured from a dev laptop against the remote DB; production latency will be lower. The structural number (about 11 sequential round-trips per message) is the finding.

## K. Searched and found nothing

- `FB.login`, `config_id`, `WA_EMBEDDED_SIGNUP`, `embedded signup`, `coexist`, `whatsapp_business_app_onboarding`: no hits in `src`, `supabase`, `scripts`.
- `smb_app_state_sync`, `smb_message_echoes`, `message_echoes`, `state_sync`, `history_context`: none.
- Number registration (`/register`, PIN): none in connect code.
- `debug_token`, token expiry handling, `quality_rating`, `messaging_limit`, `name_status` for WhatsApp: none.
- Contact merge function: none.
- AI suggestion or LENA code in `src/components/conversations` and `src/app/conversations`: none.
- Conversation export or erase actions: none found in `actions/messaging.ts`, `conversationReads.ts`, or `contacts.ts` (the other files returned by a broad grep were unrelated hits).
- `NumMedia`/MMS handling in `twilio/inbound`: none. Attachment handling in `resend/inbound`: none.
- `waitUntil`/`after(` and `x-forwarded-for` in the Meta webhook, `src/lib/messaging` and `messaging.ts`: none. `maxDuration` on the Meta webhook route: none.
- WhatsApp outbound image/document send: none (voice note only).
- Not searched deeply: Gmail attachment handling, Twilio `sms-status`, Resend/Gmail threading. Those cells are marked read-level.

## L. Test data created and cleanup proof

Run IDs: runs `wh-91ccd75f` (first probe run, plus one earlier identical run whose output was swallowed), a second `wh-` run, and `whm-` (role probe). All identities were `@example.com`, all numbers fake (`+2782555…`, `+1555…`), and the connection was `mock_pn_<run>` with a placeholder ciphertext, never decrypted. Nothing was sent to any real number.

Created: 2 workspaces per run with auth users, 1 mock WhatsApp connection, about 60 contacts, about 1200 conversations (1100 bulk), about 80 messages, plus 2 `webhook_dead_letters` rows.

My teardown for the first two runs failed to delete the dead letters (wrong column name in my delete). I found the leftovers by query and deleted exactly those 2 rows, matched on my unique marker.

Re-query after cleanup:
```
auth users like wh-%@example.com     : 0
workspaces named wh-%                : 0
platform_connections mock_pn_%       : 0
CLEANUP_PROOF (final probe run)      : workspaces=0 contacts=0 conversations=0 messages=0 mockConnections=0 authUsers=0
webhook_dead_letters rows with unknown_pn_ : 0  (2 deleted, returned ids c73b091f..., a7ebee5a...)
webhook_dead_letters total           : 123 (125 before; 1 provider='meta' row is the pre-existing facebook one)
```
Pre-existing rows touched: none. The 2 real WhatsApp connections were only read for key names and status, never decrypted. Production WhatsApp data: 0 conversations, 0 messages, 0 WhatsApp-sourced contacts.
