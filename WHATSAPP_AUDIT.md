# WhatsApp Broadcast audit — 2026-10-02

Audit only. No product code, config, env file or pre-existing row was modified. The one file created in the repo is this report. Probe scripts lived in the session scratchpad outside the repo.

**Read this first: there are two unrelated WhatsApp channels in this product.**

| Channel | Used by | Provider |
|---|---|---|
| **Meta WhatsApp Cloud API** (`platform_connections.platform='whatsapp'`) | Marketing > WhatsApp Broadcasts, the keyword chatbot, the Communications Hub WhatsApp inbox, calendar reminders | Meta Graph API via `MetaAdapter` |
| **Twilio WhatsApp** (`workspaces.twilio_number`, `whatsapp:` prefix through `sendSMS`) | Automation steps `send_whatsapp`, `send_whatsapp_template`, `send_whatsapp_voice`, LMS welcome WhatsApp, reputation requests, KYC consent, portal OTP, support tickets, PayFast | Twilio |

The WhatsApp Broadcast feature never touches Twilio. The Twilio WhatsApp sandbox therefore cannot exercise it (see Part 4 / section E).

---

## A. Feature map

**Broadcasts (Meta)**
- UI: `/whatsapp-broadcasts` ([page.tsx](src/app/whatsapp-broadcasts/page.tsx), [WhatsappBroadcastsClient.tsx](src/app/whatsapp-broadcasts/WhatsappBroadcastsClient.tsx)). Nav: [dashboard-nav.ts:45](src/data/dashboard-nav.ts#L45), Marketing > "WhatsApp Broadcasts" (plural).
- Actions: [whatsapp_broadcast.ts](src/app/actions/whatsapp_broadcast.ts) — `createWhatsAppBroadcastCampaign` (:200), `cancel…` (:282), `delete…` (:321), `listApprovedWhatsAppTemplates` (:71, a live Graph call `GET /{waba_id}/message_templates`).
- Tables: `whatsapp_broadcast_campaigns`, `whatsapp_dispatch_queue` (RLS on, no user policy, admin-only), `sms_suppression_list`, `contacts`, `conversations`.
- RPCs: `acquire_whatsapp_jobs` (service_role only), `refresh_whatsapp_campaign_totals` (service_role only; migration `20260921000014`).
- Worker: [whatsapp-dispatch/route.ts](src/app/api/cron/workers/whatsapp-dispatch/route.ts), cron `*/5 * * * *` ([vercel.json:45](vercel.json#L45)), `Bearer CRON_SECRET`.
- External call: `MetaAdapter.sendWhatsApp` / `sendWhatsAppTemplate` -> `POST graph.facebook.com/v18.0/{phone_number_id}/messages` ([MetaAdapter.ts:249](src/lib/meta/MetaAdapter.ts#L249), [:337](src/lib/meta/MetaAdapter.ts#L337)).

**Connect (Meta)**
- OAuth: `getMetaAuthUrl` -> `/api/auth/meta/callback` -> Inngest `metaDiscovery.discoverWhatsApp` ([metaDiscovery.ts:120](src/lib/inngest/functions/metaDiscovery.ts#L120)) -> `platform_connections`. WABA webhook subscription: `subscribeWabaToMetaWebhook`.
- Wizard: `saveMetaConnections` ([messaging.ts:1046](src/app/actions/messaging.ts#L1046)) with a live Cloud-API status check. Manual token: `connectPlatformManually` ([messaging.ts:124](src/app/actions/messaging.ts#L124)). Disconnect: `disconnectPlatform` (:208).
- UI: [ConnectPlatformsModal.tsx](src/components/dashboard/ConnectPlatformsModal.tsx).
- Dead duplicate: [components/meta/ConnectPlatformsModal.tsx](src/components/meta/ConnectPlatformsModal.tsx) + [WhatsAppStep.tsx](src/components/meta/steps/WhatsAppStep.tsx) has hard-coded fake accounts. A grep found no importer of the modal, so it is dead code.

**Inbound / status / chatbot (Meta)**
- [api/webhooks/meta/route.ts](src/app/api/webhooks/meta/route.ts): `X-Hub-Signature-256` check (:19), status loop (:210), `handleWhatsAppMessage` (:710), STOP/START `processInboundComplianceAndWindow` (:252), keyword bot `maybeSendWhatsAppAutomatedReply` (:915).
- Chatbot rules: [whatsapp_bot_rules.ts](src/app/actions/whatsapp_bot_rules.ts), table `whatsapp_bot_rules`.

**Hub**
- Inbox: [ConversationsClient.tsx](src/app/conversations/ConversationsClient.tsx), [ConversationThread.tsx](src/components/conversations/ConversationThread.tsx), [MessageInput.tsx](src/components/conversations/MessageInput.tsx).
- Send: `sendMessage` ([messaging.ts:282](src/app/actions/messaging.ts#L282)) -> `dispatchOutboundMessage` -> `MetaAdapter.sendWhatsApp` (free text only).

**Twilio WhatsApp (automations etc.)**
- Registry: [actions_registry.ts:246-286, :440+](src/lib/automation/actions_registry.ts), [lms_actions.ts](src/lib/automation/lms_actions.ts), [CRMActionHandler.ts](src/lib/automations/CRMActionHandler.ts). All go through `sendSMS` ([sms.ts:52](src/lib/sms.ts#L52)).
- Inbound: [webhooks/twilio/inbound](src/app/api/webhooks/twilio/inbound/route.ts). It creates `platform:'sms'` conversations, even for `whatsapp:` senders.
- Connect UI: Settings > Phone ([PhoneTab.tsx](src/app/settings/components/tabs/PhoneTab.tsx)), SID, token and number only.

**Opt-out**: [smsOptOut.ts](src/lib/smsOptOut.ts) (`recordSmsOptOut`, `getSmsOptOutReason`) is the unified implementation. Migration `20260823000002_unify_sms_whatsapp_opt_out.sql`.

---

## B. User journey table

| # | Step | UI? | Backend real? | Status | Evidence | Gap |
|---|---|---|---|---|---|---|
| 1.1 | Connect via Meta sign-in (OAuth + WABA discovery) | Yes | Yes | PARTIAL | Code: callback + metaDiscovery; live DB: 2 real connections, `status=connected`. Prior audit: the numbers were not Cloud-API-ready. | Live OAuth not re-run (DEFERRED). Customers' real numbers must be Cloud-API-registered; the product only says so in an error toast. |
| 1.2 | Connect with a manually typed token | Yes | Yes | **BROKEN** | T1: `connectPlatformManually('whatsapp', {phoneNumberId:'mock_…', …'mock_token'})` returned `success` and saved `status=connected`, display number "+1 (555) 019-2834" ([messaging.ts:83-88](src/app/actions/messaging.ts#L83-L88), no env gate). | Anyone can create a "connected" fake line. Every broadcast then reports "sent" with `mock_wa_*` ids and nothing leaves ([MetaAdapter.ts:259](src/lib/meta/MetaAdapter.ts#L259)). |
| 1.3 | Credential storage | n/a | Yes | WORKS | Tokens stored as `*_encrypted`; AES-256-GCM ([encryption.ts:3-6](src/lib/encryption.ts#L3-L6)). Live row keys: `access_token_encrypted`, `waba_id`, `phone_number_id`… | Tokens are sent in the URL query string on several Graph calls ([messaging.ts:99,1141](src/app/actions/messaging.ts#L99)). |
| 1.4 | "Test connection" / health | Partial | Partial | PARTIAL | `saveMetaConnections` checks `platform_type`/`status` live ([messaging.ts:1138-1155](src/app/actions/messaging.ts#L1138-L1155)). Manual path validates only the id/token. | No re-test after save, and no expiry or number-status monitoring. |
| 1.5 | Disconnect / reconnect | Yes | Yes | WORKS | [messaging.ts:208](src/app/actions/messaging.ts#L208) deletes the row. RLS limits it to admin/owner (policy "workspace admins can manage platform_connections"). | Not run live (code and RLS read only). In-flight queue rows then fail "WhatsApp connection not configured". |
| 1.6 | Twilio WhatsApp connect (automation path) | Yes (Settings > Phone) | Yes | PARTIAL | [PhoneTab.tsx](src/app/settings/components/tabs/PhoneTab.tsx): SID, token, number. | Nothing checks the number is a WhatsApp-enabled sender. Live: 1 workspace has a Twilio number. |
| 2 | Sender setup guidance (number provisioning, display name, business verification, sandbox vs production) | No | n/a | **MISSING** | Grep for guidance text found none beyond the error string at [messaging.ts:1148](src/app/actions/messaging.ts#L1148). | Customers get no in-product instructions. See section F. |
| 3.1 | Opt-in capture | No (for WhatsApp) | No | **MISSING** | `contacts.opted_in` defaults `true`; audience gate checks only `opted_out`/`sms_opt_out`/suppression, never `opted_in` ([whatsapp_broadcast.ts:193](src/app/actions/whatsapp_broadcast.ts#L193)). T2: all fixtures had `opted_in=true` and were eligible. | Every contact with a phone is broadcastable. No channel-specific consent. |
| 3.2 | Consent evidence | Partial | Partial | PARTIAL | Forms write `consent_timestamp/ip/form_id` ([forms submit:398,437](src/app/api/public/forms/[id]/submit/route.ts#L398)); imports/manual/WhatsApp-created contacts write none. `updateContactConsent` writes no timestamp or source. | The IP is the raw `x-forwarded-for` header, which can be a list or spoofed. |
| 3.3 | Phone normalisation | n/a | Yes | PARTIAL | T2: `082 555 0101` -> `+27825550101` OK; **Nigerian `0803 123 4567` -> `phone_e164=null`**. [phone.ts:12-30](src/lib/phone.ts#L12-L30) handles SA only without a `+`. | A NG-local contact is silently dropped from audiences ("check opt-outs and missing phone numbers"). |
| 3.4 | Invalid / duplicate handling | n/a | Partial | PARTIAL | Missing-phone and null-E.164 contacts are skipped (T2: queued only B, F, A). Queue `UNIQUE(campaign_id, contact_id)` + `ignoreDuplicates`. | The skipped count is not shown; two contacts with the same number both receive. |
| 3.5 | STOP via the Meta webhook | n/a | Partial | PARTIAL | T4: `STOP` matched a locally-formatted contact via `phone_e164` and set `opted_out`/`sms_opt_out`. But `suppressionRows=0`; `STOPALL`, `Stop.`, `CANCEL`, `QUIT`, "please stop messaging me" all did nothing. A STOP from a non-contact created a new contact and no suppression row. | Keyword list is exactly `stop/unsubscribe/remove` ([route.ts:263](src/app/api/webhooks/meta/route.ts#L263)); it bypasses `recordSmsOptOut`, so there is no durable list and no workflow cancellation. |
| 3.6 | Unified with SMS | n/a | Partial | PARTIAL | Twilio inbound uses `recordSmsOptOut` and handles `whatsapp:` senders ([twilio/inbound:62-89](src/app/api/webhooks/twilio/inbound/route.ts#L62-L89)). Meta path does not (3.5). Flags are shared, the durable list is not. | Re-importing a contact who sent Meta-STOP re-subscribes them. |
| 4.1 | Audience create/edit | Partial | Yes | PARTIAL | UI offers saved segments only ([Client.tsx:169](src/app/whatsapp-broadcasts/WhatsappBroadcastsClient.tsx#L169)). The action also accepts rules/tags (T2 used rules). No static list, no import, no edit of a campaign. | A segment is required; an empty-segment workspace cannot start. |
| 4.2 | Opt-out exclusion at build time | n/a | Yes | WORKS | T2: opted-out contact excluded (`excludedOptOut=1`). T5 after STOP on A: `A_in_queue=false`, `excludedOptOut=2`. | Count appears only in the success toast. |
| 4.3 | Size limits | n/a | n/a | MISSING | No cap in the action or worker. Chunking only (100/500). | Any workspace can enqueue its entire contact base. |
| 5.1 | 24h window vs template (broadcast) | Yes | Yes | WORKS | T3 out of window -> template path (`was_template=true`, 3 template calls). T5 in-window F -> free text; out-of-window B with no template -> `skipped_no_template`, counted in `total_skipped_no_template`. | Worker uses `conversations.last_customer_message_at` only. |
| 5.2 | Template creation / submission / approval sync | No | n/a | **MISSING** | Read-only picker; "templates are submitted outside this app" ([whatsapp_broadcast.ts:64-67](src/app/actions/whatsapp_broadcast.ts#L64-L67)). | Customers must use Meta's WhatsApp Manager. |
| 5.3 | Template variables / media / buttons | Partial | Partial | PARTIAL | Body `{{n}}` params only ([MetaAdapter.ts:357](src/lib/meta/MetaAdapter.ts#L357)); header, media and buttons unsupported. Merge tokens only `{{contact.x}}`, and the worker selects only first/last/phone ([route.ts:71-74](src/app/api/cron/workers/whatsapp-dispatch/route.ts#L71-L74)). | Media/button templates fail at Meta; empty params sent when a field is blank. The picker keys by name only (multi-language collision). |
| 5.4 | Template picker for a real connection | Yes | Yes | PARTIAL | `waba_id` key bug is **fixed** ([whatsappCredentials.ts](src/lib/meta/whatsappCredentials.ts)). Live Graph call not run (DEFERRED). With a `mock_` connection the picker shows two fake templates (T1) that Meta would reject. | Pinned to Graph v18.0. |
| 6.1 | Send now / schedule | Yes | Yes | WORKS | T2/T3 (mock): create -> worker `processed 3, sent 3`, campaign `completed`. Schedule uses `datetime-local` -> ISO. | No timezone label in the UI. A past or invalid date returns the generic "Failed to create" (T2: invalid date). |
| 6.2 | Throttling / sender tier limits | n/a | No | **MISSING** | Worker sends serially, 50 per run, 5-minute cron; no tier or rate awareness. | 130429 is classed recoverable only in the Hub path; the worker uses a regex. |
| 6.3 | Retries / backoff / dead letter | n/a | Partial | PARTIAL | [route.ts:161-179](src/app/api/cron/workers/whatsapp-dispatch/route.ts#L161-L179): `/invalid\|auth\|…/` regex hard-fail, else 15/60/240-minute backoff, 3 attempts. No dead-letter table for broadcasts. | Not `classifySendFailure`; 131047/131026 handling relies on message text. |
| 6.4 | Idempotency / double dispatch | n/a | Partial | PARTIAL | **T7: 4 concurrent workers over 120 recipients: 120 sends, 120 distinct phones, max 1 per phone** (SKIP LOCKED holds). **T8: a row left `processing` >5 min is reclaimed and sent again** (1 re-send, no send marker on the table; SMS has `send_started_at`, WhatsApp does not). **T7 also left 4 of 120 rows in `processing` after the workers returned though all 120 sends were made**, and the campaign stayed `scheduled`. | A crash or a failed status write after Meta accepts the message means a duplicate send 5 minutes later (Meta offers no idempotency key). Cause of the 4 stuck rows not isolated. |
| 6.5 | Cancel / pause | Yes (cancel only) | Partial | PARTIAL | T9: cancel -> queue rows `failed:"Cancelled by user"`, and `refresh_…totals` then reports `failed:1` for a cancelled row. No pause. Worker never re-reads the campaign status. | Rows already acquired still send; cancelled rows inflate `total_failed`. |
| 7.1 | Status callbacks into the broadcast | n/a | Yes | **BROKEN** | T6: `delivered/read/failed` webhooks returned 200 but the queue row stayed `sent`/`error_log null`. 0 `messages` rows exist for the broadcast wamid. The handler updates only `messages` ([route.ts:210-232](src/app/api/webhooks/meta/route.ts#L210-L232)), and the worker writes none. | Delivered/read/failed after hand-off never reach the campaign. 131050 (marketing opt-out) is never acted on. |
| 7.2 | Webhook signature validation | n/a | Yes | WORKS | T4: missing header -> 403; wrong secret -> 403; valid HMAC -> 200. Fails closed if `META_APP_SECRET` is unset (throws). | Local `.env.local` `META_APP_SECRET` is a placeholder, so this was tested with a test secret, not production's. |
| 7.3 | Per-recipient report | No | Table has data | **MISSING** | UI shows campaign-level counts only. | `error_log` per row is never shown to the user. |
| 7.4 | Broadcast analytics | Partial | Partial | PARTIAL | sent/failed/opt-out/no-template are real counters (T3, T5, T7). delivered/read/replied/opt-out-after do not exist. | "sent" = accepted by Meta (or by the mock). |
| 8.1 | Inbound webhook / contact match / thread | n/a | Yes | WORKS | T4: intl `27825550101` matched contact stored as `082 555 0101` (no duplicate contact); one `whatsapp` conversation `external_thread_id=+27825550101`; replay of the same wamid stored once (unique index `messages_workspace_external_id_key`). | Contact matches use `.limit(1)`: duplicate-number contacts pick arbitrarily. |
| 8.2 | Hub inbox display | Yes | Yes | PARTIAL | Rows verified at DB level (T4). The UI was not browser-tested (DEFERRED). | — |
| 8.3 | Agent reply, in window | Yes | Yes | WORKS | T10 `sendMessage` -> `MetaAdapter.sendWhatsApp` once (mock). | Free text only. |
| 8.4 | Agent reply outside window | Yes | **No** | **BROKEN** | UI offers 3 hard-coded fake templates ([MessageInput.tsx:22-40](src/components/conversations/MessageInput.tsx#L22-L40)), expands them into plain text and sends as a free-text message ([:327-345](src/components/conversations/MessageInput.tsx#L327-L345)). T10: with the window backdated 72h `sendMessage` still calls the text API (no server-side window check). | Meta rejects it (131047); the agent sees "failed". |
| 8.5 | Agent reply to an opted-out contact | Yes | No gate | BROKEN | T10: contact A (opted out by STOP) still received an agent send; `sendMessage` has no opt-out check. | Agent can message someone who sent STOP. |
| 8.6 | Inbound media | n/a | Code only | PARTIAL | [route.ts:828-880](src/app/api/webhooks/meta/route.ts#L828-L880) fetches media via the Graph API; not run (needs live Meta). | DEFERRED. |
| 8.7 | Unmatched number | n/a | Yes | WORKS | T4: STOP from an unknown number created a contact `WhatsApp User`, `source=whatsapp`. | Creates junk contacts and no suppression row (3.5). |
| 9.1 | Keyword chatbot | Yes | Yes | WORKS | T11: rule "contains pricing" -> `whatsapp_bot` outbound message created. Skips opted-out contacts ([route.ts:921-928](src/app/api/webhooks/meta/route.ts#L921-L928)). | — |
| 9.2 | Flow builder / fallback / handoff / broadcast continuity | No | No | **MISSING** | Header comment says "deliberately simple keyword -> canned response" ([whatsapp_bot_rules.ts:3-9](src/app/actions/whatsapp_bot_rules.ts#L3-L9)). | No fallback reply, no human handoff, no state. |
| 9.3 | Regex rule safety | Yes | n/a | BROKEN | T11: `^(a+)+$` accepted; one inbound message blocked the webhook handler **6.5 s (24 chars) / 8.2 s (26 chars)**. | Any workspace member can stall the shared webhook (ReDoS). |
| 10.1 | Automation step "Send WhatsApp message" | Yes | Yes | PARTIAL | Uses the Twilio channel, not the Meta one ([actions_registry.ts:246-286](src/lib/automation/actions_registry.ts#L246-L286)). Opt-out enforced by `sendSMS` (default purpose `marketing`). | Needs a Twilio WhatsApp sender, and the broadcast's Meta connection is ignored. `+${phone}` is not normalised. |
| 10.2 | Automation step "Send WhatsApp template" | Yes | **Stub** | **STUB** | Sends the literal text `Template: <name> [Lang: en] Components: [...]` as a free-text Twilio message ([lms_actions.ts:327-348](src/lib/automation/lms_actions.ts#L327-L348)); offered in [actionConfigSchema.ts:96](src/lib/automation/actionConfigSchema.ts#L96). | A customer would receive that gibberish. |
| 10.3 | Inbound-WhatsApp trigger / tag from reply | No | No | **MISSING** | Grep for inbound-message trigger events: none. The Meta webhook emits no automation event. | — |
| 11.1 | Billing / plan / credit gating | No | No | **MISSING** | No credit, plan, quota or trial reference in [whatsapp_broadcast.ts](src/app/actions/whatsapp_broadcast.ts) or the worker; same for Bulk SMS ([bulk_sms.ts](src/app/actions/bulk_sms.ts) grep: none). | A trial workspace can queue unlimited sends. |
| 11.2 | Cost visibility | No | No | **MISSING** | No pricing UI. | — |
| 12.1 | Tenant scoping and RLS | n/a | Yes | WORKS | Campaign/rule tables: `check_workspace_access` (member of the workspace) plus RESTRICTIVE `module_access` policy; queue: RLS on, no policy; both RPCs `service_role` only (live `proacl`). T11 as workspace B: cancel -> "Campaign not found", update A's rule -> error, A's campaign still exists, list shows 0 of A's, direct REST read of A's `platform_connections`/queue -> 0 rows. | `deleteWhatsAppBroadcastCampaign` and `toggle…` return `success:true` for a foreign id while changing nothing (T11). `updateWhatsAppBotRule` leaks the raw PostgREST text "Cannot coerce the result to a single JSON object". |
| 12.2 | Webhook workspace resolution | n/a | Yes | WORKS | Resolves by `phone_number_id`; unique partial index added ([migration 20260930000021](supabase/migrations/20260930000021_whatsapp_phone_number_unique.sql)). Unknown ids go to `webhook_dead_letters` (live: 1 pre-existing facebook row). | — |

**Counts (46 rows): WORKS 12, PARTIAL 18, STUB 1, BROKEN 5, MISSING 10.**

WORKS = 1.3, 1.5, 4.2, 5.1, 6.1, 7.2, 8.1, 8.3, 8.7, 9.1, 12.1, 12.2. BROKEN = 1.2, 7.1, 8.4, 8.5, 9.3. STUB = 10.2. MISSING = 2, 3.1, 4.3, 5.2, 6.2, 7.3, 9.2, 10.3, 11.1, 11.2.

---

## C. Gap list (ranked)

**Critical**
1. **No WhatsApp opt-in gate; consent defaults to true.** Affects every customer and every recipient. It violates Meta's policy and POPIA/GDPR, and risks the WABA being banned. Minimum fix: require an explicit WhatsApp opt-in flag with timestamp and source, and exclude everyone else from audiences. Effort **M**.
2. **Agent replies ignore opt-out and the 24h window on the server.** (T10.) An agent can message a STOPped contact, and the "template" path sends free text that Meta rejects. Minimum fix: server-side opt-out and window checks in `sendMessage`, plus real template send via `sendWhatsAppTemplate`. Effort **M**.

**High**
3. **Delivery/read/failed receipts never reach broadcasts.** (T6.) The numbers shown are "accepted by Meta" only; failures after hand-off are invisible. Fix: have the worker write a `messages` row (or look up the queue by `whatsapp_message_id`) and surface per-recipient status. Effort **M**.
4. **Duplicate-send risk on worker crash/reclaim.** (T8, plus 4 rows stuck in T7.) Fix: a `send_started_at` marker, and never re-send a row that has one without confirming via the webhook or messages table. Effort **S-M**.
5. **Meta STOP bypasses the unified opt-out.** (T4: no suppression row, narrow keywords, no workflow cancellation.) Fix: route through `recordSmsOptOut` with a widened keyword list matching Twilio's. Effort **S**.
6. **Fake "connected" line via `mock_` values.** (T1.) Fix: gate the mock branches on `NODE_ENV !== 'production'`. Effort **S**.
7. **`send_whatsapp_template` automation sends literal debug text.** Fix: remove it from the UI schema or implement a Twilio Content-API send. Effort **S** (remove) / **M** (implement).
8. **ReDoS via user-supplied bot regexes.** (T11: 6-8 s webhook stall.) Fix: drop regex mode or use a safe-regex library or timeout. Effort **S**.
9. **No plan/credit gating, send caps or rate limiting.** Effort **M**.

**Medium**
10. Cancel semantics: cancelled rows counted as failed, in-flight rows still send, no pause (T9). **S**.
11. NG/non-SA local numbers silently dropped (T2). **S-M**.
12. Template tooling missing (create, status sync, media, buttons, named params); picker pinned to v18.0. **L**.
13. No per-recipient report; no delivered/read analytics. **M**.
14. The Twilio-WhatsApp and Meta-WhatsApp channels are unreconciled: Twilio inbound lands as `sms` conversations; automations ignore the Meta connection. **L**.
15. Foreign-id `delete`/`toggle` return `success:true`; raw PostgREST error text leaked by rule create/update. **S**.
16. No inbound-WhatsApp automation trigger. **M**.

**Low**
17. Dead modal with hard-coded accounts ([components/meta/steps/WhatsAppStep.tsx](src/components/meta/steps/WhatsAppStep.tsx)). **S**.
18. Dead-letter table only has one pre-existing unresolved row. **S**.
19. No in-product guidance for sender setup. **S** (copy; see F).

---

## D. Security findings

- **Webhook signature (Meta):** present, HMAC-SHA256 over the raw body with `timingSafeEqual`, and it fails closed (T4). The GET verify uses `META_WEBHOOK_VERIFY_TOKEN`. Twilio inbound uses the per-workspace token, with the URL rebuilt from `NEXT_PUBLIC_APP_URL`; the unit-tested vector table covers wrong token/account.
- **Cron auth:** `Bearer CRON_SECRET` (T3: 401 with a wrong or missing header). It throws if the secret is unset.
- **SECURITY DEFINER / grants:** both WhatsApp RPCs are service_role only (live `proacl`), and the queue has RLS with no policy. `check_workspace_access` is SECURITY DEFINER and executable by anon, but returns false without a session. All tables have default broad `anon/authenticated` table grants and rely on RLS.
- **TOCTOU:** the opt-out check happens at enqueue and again in the worker (good), but the worker loads contacts in one batch and sends later in the loop. An opt-out arriving during the batch is missed (small window).
- **Counters:** `refresh_whatsapp_campaign_totals` locks the row (atomic). T7 showed totals match the queue.
- **PII in logs:** `logger.info({ payload }, 'webhook.meta.received')` logs every inbound payload with phone numbers and message text ([route.ts:88](src/app/api/webhooks/meta/route.ts#L88)). Message bodies are stored indefinitely with no retention policy.
- **Consent evidence:** see 3.2. The IP is spoofable via `x-forwarded-for`.
- **Fake success:** `mock_` credentials (1.2), mock templates (5.4), and `MetaAdapter` returning success when a token is missing ([MetaAdapter.ts:259](src/lib/meta/MetaAdapter.ts#L259)). A connection row with no token also reports "sent".
- **Swallowed/odd errors:** a past or invalid schedule date returns a generic error; `deleteWhatsAppBroadcastCampaign` has no module guard (RLS covers it).
- **Abuse:** no rate limit and no plan gate (gap 9); the whole contact base can be queued.
- **ReDoS:** see 9.3.
- **Cloudflare/Vercel dependencies:**
  - `vercel.json` cron `*/5 * * * *` must be re-created as a Cloudflare Cron Trigger.
  - The worker has no `maxDuration` export (default); 50 serial Graph calls per run need Workers subrequest/CPU limits checked.
  - Client IP uses `x-forwarded-for`/`x-real-ip` in 23 files; Cloudflare supplies `CF-Connecting-IP`.
  - Webhook URLs are rebuilt from `NEXT_PUBLIC_APP_URL` (Twilio signature).
  - `runtime='nodejs'` and Node `crypto`.
  - `pg`-free (Supabase REST), so no connection-pool issue.
- **Sibling-pattern greps:** `mock_` credential branches exist in `MetaAdapter` for facebook/instagram/whatsapp/templates, and in `validateMetaPlatformCredentials`, `fetchMetaWhatsAppAccounts`, `fetchWhatsAppPhoneNumbers`. `new RegExp(` on stored user values occurs only in the bot rule matcher (route.ts:945) and in rule validation.

---

## E. Verified working vs deliberately deferred

**VERIFIED WORKING (runtime evidence, test workspace, mock connection, nothing sent to anyone):**
- Create campaign -> audience resolve -> queue -> real cron handler -> statuses/totals (T2, T3, T5, T7).
- 24h-window branching and `skipped_no_template` counters (T3, T5).
- Opt-out exclusion at enqueue (T2, T5).
- Cron auth 401 (T3).
- Meta webhook signature 403/200 (T4); inbound contact match, thread, replay dedupe (T4).
- Concurrent dispatch: 4 workers, 120 recipients, no recipient sent twice (T7).
- Keyword chatbot reply (T11).
- Cross-tenant isolation on cancel/list/direct REST (T11).
- Live DB state: RLS, policies, RPC ACLs, unique indexes.

**DELIBERATELY DEFERRED**
- **(a) Real OAuth/token connect:** needs a customer's Meta login. The two live connections belong to real workspaces and were not touched; I did not decrypt customer tokens.
- **(b) Real single send to a phone, (c) real broadcast with callbacks, (d) real reply, (e) real STOP, (g) real out-of-window rejection by Meta:** DEFERRED. Reasons:
  1. The Broadcast feature sends only through the Meta Cloud API, never Twilio, so the Twilio WhatsApp sandbox cannot carry it.
  2. The Twilio account is a **Trial with 0 verified caller IDs** (read-only API check), so there is no verified owner number to send to.
  3. The prior audit recorded that the only connected numbers were a Meta test number (PENDING) and an ON_PREMISE/DISCONNECTED number, so neither can send. The owner did not supply another verified Meta test number.
  Nothing was sent to any real contact or number. The mock evidence above substitutes for the *application* logic only, not for Meta/Twilio behaviour.
- **(f) Double dispatch:** done, but only against the mock sender (T7). Real Meta behaviour is untested.
- Browser/UI visual checks of the Hub and broadcast pages.
- Production `META_APP_SECRET` signature (the local value is a placeholder, so a test secret was used).

---

## F. What customers must do outside LeadsMind (only what is supported today)

1. Create a **Meta Business account** at business.facebook.com and complete **business verification**.
2. In Meta **WhatsApp Manager**, create a WhatsApp Business Account and add a phone number that is **not already in use on the WhatsApp app**.
3. Make sure the number is **registered for the Cloud API** (status *Connected*, platform *Cloud API*). LeadsMind refuses numbers that are not ([messaging.ts:1146-1153](src/app/actions/messaging.ts#L1146-L1153)).
4. Set a **display name** and wait for Meta's approval.
5. In Meta's template manager, **create message templates** and wait until they show **Approved** (LeadsMind cannot create or edit them).
6. In LeadsMind, open **Settings > Integrations** and use **Connect with Meta**, choosing your WhatsApp Business Account and number. Do not use the manual token form unless you have a real system-user token.
7. Make sure your contacts have **given you permission** to be messaged on WhatsApp. LeadsMind does not record WhatsApp consent for you; you must hold the evidence.
8. Create a **Segment** (Marketing > Segments). Contacts need phone numbers in international (+) format or South African local format.
9. Go to **Marketing > WhatsApp Broadcasts**, choose *New*, give it a name, and pick the segment. Add an **approved template** (needed for anyone who has not messaged you in the last 24 hours) and optionally free text (only used for people who messaged within 24 hours).
10. Send now or schedule. Messages go out within about 5 minutes. The page shows counts of sent, failed, opted out and skipped. It does not yet show delivered or read.
11. Tell customers to reply **STOP** to opt out (only the exact words STOP, UNSUBSCRIBE and REMOVE work today).

---

## G. Searched and found nothing

- WhatsApp credit/plan/quota/trial gating: none (whatsapp_broadcast.ts, the worker, bulk_sms.ts).
- Inbound-WhatsApp automation trigger events: none.
- Template create/submit/sync code: none (read-only list only).
- Per-recipient broadcast report UI: none.
- A WhatsApp send-start/idempotency marker column: none (`send_started_at` exists on SMS only).
- Rate-limit/throttle code in the worker: none.
- Pause/resume of a broadcast: none.
- A WhatsApp flow builder, fallback reply or human handoff: none.
- Importers of the duplicate [components/meta/ConnectPlatformsModal.tsx](src/components/meta/ConnectPlatformsModal.tsx): none.
- A `maxDuration` export on the dispatch route: none.
- Twilio WhatsApp sandbox/`join` handling anywhere in `src`: none (only the `whatsapp:` prefix).

---

## H. Test data created and cleanup proof

Created (all in the live DB, run id `3860482b`, fake `@example.com` identities and fake `+1555…` numbers; **no real phone or email was contacted**):
- 2 auth users `wa-3860482b-a-owner@example.com` / `…-b-owner@example.com` and their 2 auto-created workspaces (`94f667c3-…`, `26b4b6e2-…`).
- 1 mock WhatsApp `platform_connections` row (`phone_number_id=mock_pn_3860482b`), about 140 contacts (6 named fixtures, 6 STOP-variant probes, 1 unknown-number STOP contact, 120 bulk, 1 crash fixture), 1 WhatsApp conversation plus inbound/outbound/bot messages, 5 campaigns with their queue rows, 2 bot rules (one `evil` regex, deleted in-test), 1 suppression-list probe (none created).
- The scratchpad has a `node_modules` junction to the repo's `node_modules`; it lives outside the repo and nothing else was written there.

The first run's own teardown did not finish (its process was interrupted, leaving workspace B and 2 users behind). A second cleanup run used the repo's `liveCleanup.deleteTestWorkspaces`. Re-query after cleanup:

```
users remaining (email like wa-3860482b-%) : 0
workspaces remaining (both ids)            : 0
whatsapp_broadcast_campaigns remaining     : 0
whatsapp_dispatch_queue rows (whole table) : 0
mock_pn_% platform_connections             : 0
contacts like wa-3860482b-%                : 0
whatsapp_bot_rules (whole table)           : 0
webhook_dead_letters provider=meta         : 1  (pre-existing facebook row from 2026-09-13, untouched)
```

Pre-run baselines for the pre-existing rows: 0 campaigns, 0 queue rows, 0 bot rules, 2 real WhatsApp connections (workspaces `0377e4d6…`, `b83f0966…`). These were not modified.
