# WhatsApp Anti-Spam / Consent Engine audit (2026-10-03)

Read-only. Nothing was modified, committed, stashed, checked out or deleted; branch `wa-b1a-audience` throughout. The only file created is this report. Database access was `SELECT` against catalogue metadata (`pg_policies`, `pg_constraint`, `pg_proc`, `information_schema`, `pg_class`) and row **counts** only. No row contents were read, no token was decrypted, the 2 real WhatsApp connections were not touched.

Inputs read: `WHATSAPP_ANTISPAM_PRD.html` (**present**, "ANTI-SPAM-nnn" below), `WHATSAPP_PRD.html` (main PRD, "PRD-main"), `WHATSAPP_BUILD_BOUNDARY_AUDIT.md` ("BB-x", referenced, not repeated).

**The invariant under audit:** no verified WhatsApp marketing consent = no WhatsApp marketing message; eligibility derived by the backend from a consent record plus suppression; no user, import, API or tag write can create eligibility; no bypass.

## Headline

**Today the system has no consent record at all, so the invariant cannot hold.** What stands in for consent is `contacts.opted_in`, which defaults to `true`. Live counts: **93 contacts, 93 with `opted_in = true`, 2 with any `consent_timestamp`, 29 with a phone, 23 sourced from "Lead Finder" (scraped)**. Every one of those contacts is broadcastable through the B1a "All contacts (not opted out)" audience. The B1a attestation checkbox is a client-supplied boolean.

---

## A. Contact write paths (Part 1)

Method: a scripted scan of every `from('contacts')` call followed by `insert/update/upsert/delete` across `src`, `libs`, `server`, `workers`, `scripts`, plus live `pg_proc` inspection of SQL functions. **77 insert/update/upsert call sites in 45 files** (+2 deletes), excluding test scripts. "Could mark opted in today" = the row is created or updated such that `opted_in = true` (the column default) with no consent evidence, i.e. it is broadcastable by B1a.

| Path | file:line | Consent/phone columns it sets | Can it make a contact broadcastable today? |
|---|---|---|---|
| CRM manual create (`createContact` -> `ContactService`) | `actions/contacts.ts:92`, `modules/crm/service/ContactService.ts:137-151`, `ContactRepository.ts:89` | phone; optionally `consent_timestamp`, `consent_ip` (raw `x-forwarded-for`, `contacts.ts:97`), `consent_form_id`, `processing_purpose_scope`. Does not set `opted_in` | **Yes** (default `true`) |
| CRM CSV / pasted / grid import | `components/crm/ImportContactsModal/index.tsx:83-95` calls `createContact` per row | phone; stamps `consent_timestamp = now` on every row from a generic POPIA checkbox | **Yes**, and it writes a "consent" timestamp that is not WhatsApp consent |
| CRM edit | `actions/contacts.ts` `updateContact`, `ContactRepository.ts:101` | any column passed (`payload` is unfiltered) | Yes (can flip `opted_in`) |
| API v1 contacts POST/PATCH | `api/v1/contacts/route.ts:65-90`, `[id]/route.ts:42` | phone, tags, source. PATCH has an allow-list excluding consent columns | **Yes** (default `true`) |
| API v1 leads upsert | `api/v1/leads/route.ts:30` | phone, source | **Yes** |
| Public form submit | `api/public/forms/[id]/submit/route.ts:397-476` | phone, **`consent_timestamp/ip/form_id`, `processing_purpose_scope`, stamped on every submission regardless of any checkbox**, overwriting previous values (`:398-401`) | **Yes** |
| Website-builder form (server action + route) | `actions/builder.ts:434-455`, `api/builder/submit/route.ts` | phone, source | **Yes** (public, no rate limit, no captcha) |
| Public blog newsletter | `actions/publicBlog.ts:203` | source (`blog_newsletter`) | **Yes** (public, no limiter) |
| Lead Finder "To CRM" | `actions/lead-finder.ts:284` | **scraped phone**, tags incl. `Lead Finder` | **Yes. This is exactly the "scraped numbers" case.** 23 live contacts have this source |
| Calendar public booking | `actions/calendar/public.ts:61,271` (upsert) | phone | Yes |
| Calendar staff booking | `actions/calendar.ts:230-235` | email/phone | Yes |
| Funnel order / checkout / PayFast | `actions/funnelOrders.ts:102`, `api/webhooks/payfast/route.ts:124`, `actions/guestCheckout.ts` | source | Yes |
| LMS enrol / guest enrol | `lms/guestEnrollment.ts:72`, `actions/lms.ts:493,501`, `studentEnrollments.ts:49` | source | Yes |
| Webinar registration | `actions/webinarRegistrations.ts:67` | source | Yes |
| Support tickets | `api/support/tickets/route.ts:81` | source | Yes |
| Inbound email -> contact | `lib/email/contactConversation.ts:41` | source | Yes |
| **Meta webhook (WhatsApp/FB/IG)** | `webhooks/meta/route.ts:493,650,831` (inserts); `:293,316` (consent flags) | WhatsApp insert sets phone + `source:'whatsapp'`, no consent columns | **Yes** (a stranger who messages in becomes an `opted_in=true` contact) |
| **Meta webhook FB/IG keyword path** | `webhooks/meta/route.ts:313-327` | on text `start`/`subscribe` from FB/IG sets `opted_in=true, opted_out=false, sms_opt_out=false` | **Yes, and it clears SMS/WhatsApp opt-out flags from a Messenger/Instagram DM** |
| Hub consent toggle | `actions/messaging.ts:835-848` (`updateContactConsent`) | `opted_in`, `opted_out`, `opt_out_date` from client args, no evidence | **Yes** (any member) |
| Opt-out / opt-in helpers | `lib/smsOptOut.ts:83` (STOP), `:102` (START clears) | all four flags + `sms_suppression_list` | START sets `opted_in=true` |
| POPIA erasure | `actions/popia.ts:109-122` | nulls consent columns, anonymises | no |
| Portal consent | `actions/portal.ts:650` | **`consent_timestamp` for portal access** (`processing_purpose_scope: 'portal_access'`); `(portal)/portal/layout.tsx:41` gates the portal on that column | the same column means "accepted portal terms" |
| Automations and workflows | `lib/automation/actions_registry.ts:200,297,582,718`, `lms_actions.ts:304`, `CRMActionHandler.ts:119,227,269`, `WorkflowEngine.ts:324,333` | `CRMActionHandler.ts:269` and `actions_registry.ts:297` write **arbitrary configured fields** (`update(updates)` / `[field]: value`) | **Yes**: an automation "update contact field" step can write `opted_in` |
| AI / scoring | `intelligence/LeadScoringEngine.ts:178`, `actions/aiRecommendations.ts` (tags) | tags/score | tags only |
| KYC, portal profile, student settings | `api/crm/contacts/kyc`, `kyc/experian/trueid`, `portal.ts`, `studentSettings.ts` | identity fields | no |
| Workers / scripts | `libs/workers/src/automation-executor.ts:308,313`, `crons/reengagement-loop.ts:122`, `server/services/kycRiskEngine.ts:186`, `workers/rescreen-aml.ts:147`, `scripts/backfill-profile-sync.js:165`, `api/admin/meta/backfill-profile-sync` | profile/KYC | no |
| SQL functions (live `pg_proc`) | `add_single_tag`, `bulk_add_tag`, `bulk_remove_tag`, `global_rename_tag`, `update_contact_last_activity`, `fn_handle_no_show_recovery`, `fn_integ_handle_*_outcome`, `fn_trigger_adaptive_path` (non-SECURITY DEFINER, executable by anon and authenticated, RLS applies); `add_contact_tag_atomic`, `increment_contact_lead_score` (SECURITY DEFINER, not executable by clients); `record_sms_soft_fail`, `reset_sms_soft_fail_streak` (service) | tags, score, `sms_invalid` | no consent columns |
| **Direct PostgREST by any member** | RLS "Workspace access for contacts" (ALL, `check_workspace_access`) | every column | **Yes** |
| **Direct PostgREST by anyone with the anon key** | RLS "Public form submissions" INSERT, roles `public`, `WITH CHECK workspace_has_pages(workspace_id)` | every column; the check only requires the workspace to own a page | **Yes: unauthenticated contact insert into any workspace that has a page** |

### A.2 Writers of the specific columns

| Column / table | Writers |
|---|---|
| `contacts.opted_in` | DB default `true`; `smsOptOut.ts:83,102`; `webhooks/meta/route.ts:293,316`; `messaging.ts:843`; any member via PostgREST |
| `contacts.opted_out` | same set |
| `contacts.sms_opt_out` | `smsOptOut.ts:83,102`; `webhooks/meta/route.ts:293,316`; SQL `record_sms_soft_fail`; (the Hub toggle does not clear it, so it cannot clear a STOP) |
| `contacts.consent_timestamp / consent_ip / consent_form_id` | `contacts.ts` via `ContactService.ts:146-150`; CSV import (`index.tsx:92`); public form submit (`:397-439`); portal consent (`portal.ts:650`); erasure (`popia.ts:118,151`); any member via PostgREST. **Five meanings, one column** |
| `sms_suppression_list` | `smsOptOut.ts:69` (upsert), `:96` (delete on START); SQL `record_sms_soft_fail`. Clients can only `SELECT` (one RLS policy), so rows are service-role-only. Live: **0 rows** |

**Conclusion A:** the only existing durable, non-forgeable opt-out is `sms_suppression_list` (service-role-only writes). `contacts` consent/opt-in columns are writable by any member, any import and any automation step, so they cannot be a source of eligibility.

---

## B. Tag and status writers, and RLS (Part 2)

### B.1 Writers

**36 tag-table write sites in 12 files**, plus the contact `tags[]` array and 8 SQL functions:

| Writer | file:line |
|---|---|
| Tag Manager (service + repo) | `modules/tags/repository/TagRepository.ts:175,220,238,249,256` (tags), `:283,299,325,342` (assignments) |
| System/auto tagging | `modules/tags/autoTagging/applySystemTag.ts:38,104,111`, cron auto-tag-sweep via the same module |
| Contact-tag sync (array <-> relational) | `modules/tags/sync/syncContactTags.ts:15,23,82,95,131,157,165` |
| AI tag suggestions | `actions/aiRecommendations.ts:49,57,60,81`, cron `ai-tag-suggestions` |
| Tag insights | `actions/tagInsights.ts:41,52` |
| Tag expiry | `api/cron/workers/tag-expiry/route.ts:46,50,64` |
| Automation `add_tag` | `actions_registry.ts:129` (`add_contact_tag_atomic`), `CRMActionHandler.ts:227`, `actions/automation.ts:112-114` |
| Public form tag-on-submit | `api/public/forms/[id]/submit/route.ts:495` (admin client) |
| API v1 | `api/v1/tags/route.ts:44`, `[id]/route.ts:40,62`; contacts POST/PATCH write `tags` and sync |
| Bulk RPCs | `ContactRepository.ts:141,153` (`bulk_add_tag`, `bulk_remove_tag`) |
| Contact-tag array writers | `messaging.ts:758`, `lead-finder.ts:280`, `cipcLookup.ts:109`, `popia.ts:117` |
| Imports | CSV import passes `tags` through `createContact` |

### B.2 Is there a system-tag concept?

Yes, partially. `tags.tag_type` has a CHECK of `manual, ai_smart, automation, temporary, system, relationship`; live counts: **system 32, manual 32, ai_smart 2**. There is no reserved-name rule and no flag stopping a member from using a system-looking name.

### B.3 RLS and grants (live `pg_policies`, `role_table_grants`)

Every public table, including all below, is **granted ALL (SELECT/INSERT/UPDATE/DELETE/TRUNCATE) to both `anon` and `authenticated`**, so RLS is the only gate. RLS is enabled on all of them, none is `FORCE`d.

| Table | Policy | Cmd | Roles | Plain member can write directly? |
|---|---|---|---|---|
| `contacts` | Workspace access for contacts | ALL | public | **Yes**, any column |
| `contacts` | Public form submissions | INSERT | public (**anon**) | **Yes (anonymous)**, workspace needs only one page |
| `tags` | Workspace members can create manual or accepted-ai tags | INSERT | public | Yes, but `tag_type` limited to `manual`/`ai_smart` and `created_by = auth.uid()` |
| `tags` | Workspace members can update tags | UPDATE | public | **Yes**, creator or admin; **no WITH CHECK**, so a creator can set `tag_type = 'system'` (allowed by the CHECK constraint) |
| `tags` | Workspace members can delete tags | DELETE | public | creator or admin |
| `tag_assignments` | Workspace members can create tag assignments | INSERT | public | **Yes**, any non-private tag onto any contact in the workspace |
| `tag_assignments` | Workspace members can remove tag assignments | DELETE | public | Yes |
| `sms_suppression_list` | Workspace members read SMS suppression | SELECT only | public | **No** (service-role writes only) |
| `workspace_audit_logs` | Workspace isolation for workspace_audit_logs | ALL | public | **Yes: any member can insert, update and delete audit rows.** The table has 0 rows |
| `global_suppression_list` (email) | admin insert / member select | INSERT/SELECT | authenticated | admins can insert |
| `forms`, `form_submissions` | member ALL; "Public Form Select" for published forms | ALL/SELECT | public | Yes (members) |
| `platform_connections` | admin/owner only | ALL | public | admin/owner |
| module restrictive policies | `module_access` on contacts, tags, tag_assignments, forms | ALL | authenticated | only narrows by module |

Triggers on these tables (`on_tag_change`, `on_tag_assignment_change`, `tr_check_kyc_compliance_lock`, `on_new_contact_notification`, `update_*_updated_at`) enforce nothing about consent or reserved tags.

### B.4 Conclusion: can a protected status be enforced?

- **Only at DB level, yes.** Application code cannot protect it, because members and anon can reach PostgREST directly and 45 files write contacts.
- **Existing tables that cannot be trusted:** `contacts` (columns writable by members and anon), `tags`, `tag_assignments` (members can create/assign/retype), `workspace_audit_logs` (members can rewrite), `form_submissions` and `forms` (members can edit), and `contacts.consent_*` (five meanings).
- **Existing table that can be trusted as a suppression source:** `sms_suppression_list` (no write policy; service-role only), subject to its channel-agnostic semantics.
- **Feasible design:** new tables with `REVOKE ALL FROM anon, authenticated` (this project's default grants must be revoked explicitly) and **no write policies**, written only by service-role code and SECURITY DEFINER functions with `EXECUTE` revoked from clients. A tag or label may mirror the status for display, but is never read for a decision.

---

## C. Existing consent and form system (Part 3)

| Piece | Reality (file:line) | Reuse? |
|---|---|---|
| Form builder | `app/forms/builder/[id]/*` (BuilderCanvas, BuilderSidebar, FormBuilderReducer); field types in `types/forms.types.ts:6` (text, textarea, email, phone, number, date, dropdown, checkbox, radio, file, hidden, page_break). No "consent" field kind | builder UI reusable, consent semantics new |
| Versions | `form_versions` table exists (migration 96) with `snapshot`, `version_number`; **0 rows live**; `forms.published_version` column exists. The submit route reads the **live** `forms.fields/config` (`submit/route.ts:166-171`), not a pinned snapshot | table reusable; versions are not populated or pinned |
| Public submit | `api/public/forms/[id]/submit/route.ts` (683 lines): `forms` lookup by id + workspace + `status='published'` (`:166`), honeypot `lm_hp_field` (`:193`), 5/min in-memory limiter keyed by `x-forwarded-for:formId` (`:43-70,108`), 5-second in-memory duplicate-payload guard (`:204-211`), server-side validation (`:230`), idempotency by `client_submission_id` (`:130-155`), submission via RPC (`:566`) | pieces reusable |
| Partial submissions | `api/public/forms/[id]/partial/route.ts`: owner-cookie, hashed token, no rate limit | n/a for opt-in |
| Consent checkbox | A generic `checkbox` field; **no consent semantics**: the contact write stamps `consent_timestamp/ip/form_id` on **every** submission (`:397-401, 436-440`) whether or not any box was ticked | **new** |
| Consent text | **Not stored anywhere.** `form_submissions` columns: `data, source_url, ip_address, user_agent, attribution, ...`. No form version, no consent text, no terms/privacy version | **new** |
| Terms/privacy | none on forms | new |
| Source URL | `form_submissions.source_url` from the `Referer` header (`:171`), spoofable | reusable with caveat |
| IP | **Untrusted**: `req.headers.get('x-forwarded-for') || 'x-real-ip'` taken whole (`:108`), a client-controllable list; stored as `contacts.consent_ip` and `form_submissions.ip_address`. 24 files read `x-forwarded-for` | needs a helper |
| Duplicates / previous opt-out | email-keyed upsert (`:452`); **no phone dedup; no check of `opted_out`/suppression; an existing contact's consent columns are overwritten (`:397-401`)** | new |
| History overwrite | **Yes**: `consent_timestamp/ip/form_id` are overwritten on every later submission; no event log | new |
| Success/redirect | `forms.success_message`, `redirect_url` | reusable |
| Embed | `app/embed/form.js/route.ts` SDK + `/public/forms/[id]?embed=1` iframe; CORS `*` (`public/forms/_lib/cors.ts:6`) | reusable |
| Other consent systems | KYC (`kyc_consent`, `kyc_consent_records`, member-writable RLS, finance module); POPIA portal consent (`portal.ts:650`, gates portal access); email unsubscribe (`api/public/unsubscribe`, `lib/email/suppression.ts`, `global_suppression_list`); erasure suppression (`popia.ts:96`) | none are WhatsApp marketing consent |

**Must be new:** consent event store, consent text/version snapshots, opt-in form entity or pinned form version, previous-opt-out handling, trustworthy IP/source capture, phone-based dedup.

---

## D. Website-builder element plan (Part 4)

- **Registry:** `src/lib/builder/resolver.ts` (`RESOLVER`, imports every `user/*` element, `:14` imports `Form`). `BuilderEditor.tsx:20` and `PublishedPageRenderer.tsx:187-192` both mount `<Editor resolver={RESOLVER}><Frame data=...>`, so adding an element to `RESOLVER` makes it render in the editor and on published pages.
- **Element pattern** (from `user/Form.tsx`, 316 lines): component + `Form.craft = {...}` (`:287`, props defaults, `related.settings` = `FormSettings`) + settings panel file. `ElementProperties.tsx:63` picks `node.related.settings`.
- **Files a "WhatsApp Marketing Opt-In" element would touch:**
  1. `src/components/builder/user/WhatsAppOptIn.tsx` (new element + `craft` config)
  2. `src/components/builder/user/WhatsAppOptInSettings.tsx` (new)
  3. `src/lib/builder/resolver.ts` (register)
  4. `src/components/builder/Sidebar.tsx` (palette item next to "Lead Form", line ~491)
  5. `src/lib/builder/spacing.ts` only if it is a self-spaced block
  6. new public route `src/app/api/public/whatsapp-optin/[formId]/submit/route.ts` and its form entity
- **Server-posted forms in the published renderer:** the existing `Form` posts via the server action `handlePageFormSubmission` (`Form.tsx:3`, `actions/builder.ts:397`) and `api/builder/submit`. The published renderer is a **client Craft `Frame`**, so a new element can `fetch()` a public JSON route. The existing route has no CORS or Turnstile. A server action cannot be called from an external origin, so the new element must use a dedicated public endpoint.
- **External embedding today:** yes for the *forms* feature (`/embed/form.js`, iframe, `EmbedModal.tsx`); not for builder pages. Public form routes send `Access-Control-Allow-Origin: *` with no allowed-origins list. A caller supplies `workspace_id` in the body, but the route checks it matches the form (`submit:164-168`).
- **Domain verification for form hosts:** none (grep `allowed_origins`, `allowedOrigins`, `authorized_domains`: nothing). Custom-domain verification exists only for hosting sites (`lib/domains/verify.ts`, `workspaces.custom_domain`).
- **Sanitisation:** builder content is JSON rendered by React (no raw HTML for this element); the new endpoint must validate and normalise server-side (it must not trust the client's consent-text copy).

---

## E. Bot protection and rate limiting (Part 5)

| Public POST surface | Protection today |
|---|---|
| `/api/public/forms/[id]/submit` | honeypot; in-memory 5/min per `xff:form` (per instance, `:43-70`); in-memory 5 s duplicate guard; no captcha; CORS `*` |
| `/api/public/forms/[id]/partial`, `/events`, `/prefill`, `/analytics/track`, `/unsubscribe` | none found (partial uses an owner cookie) |
| `/api/public/forms/[id]/recovery-link` | limiter (`checkRateLimit`) |
| `/api/builder/submit` and server action `handlePageFormSubmission` | **none** (public contact write) |
| `subscribeToNewsletter` (`publicBlog.ts:176`) | **none**; relies on the anon contacts-insert RLS policy |
| `/api/auth/portal/{otp,otp-verify,magic-link,password-login}`, `/api/auth/student/login` | in-memory limiter |
| `/api/support/tickets`, `/support/public-attachments` | in-memory limiter |
| Calendar public booking | limiter in `calendar/scheduling.ts` |
| `/api/lena/chat` (public) | **durable** DB limiter: `lena_rate_limit_events(workspace_id, ip_hash, fingerprint_hash, created_at)` |
| `/api/webhooks/*` | signature checks (Meta HMAC, Twilio token); Ozow route not assessed |

- **CAPTCHA / Turnstile / hCaptcha / reCAPTCHA:** no code, no env name (grep over `src` and `.env.example`).
- **CSRF:** public JSON routes rely on CORS-less same-site cookies only; no tokens.
- **Limiters:** `src/lib/rateLimit.ts` (in-memory sliding window; its own header says per-instance), `src/lib/security/rateLimit.ts` (in-memory fixed window), plus a private copy inside the submit route. All reset on cold start and multiply by warm instances.
- **IP extraction:** inline `x-forwarded-for` / `x-real-ip` at 24 files; no helper.
- **Durable counter precedent:** `lena_rate_limit_events` and the test-send events table (`20260920000002`). A vendor-free design: one `public_rate_limit_events` table plus an atomic SECURITY DEFINER RPC `rl_hit(key text, limit int, window interval)` (insert, count in window, return allowed), service-role only, with a pruning job. Keys use a hashed client identifier from a single `getClientIdentity(headers)` helper (so a Cloudflare header can be swapped in later by editing one file, with no new `x-forwarded-for` call sites).
- **Cloudflare migration:** Turnstile fits naturally (token verified server-side with a secret, one `verifyHumanToken()` helper); Cloudflare's rate-limiting rules can sit in front, but the DB limiter should stay as the in-app backstop. No `waitUntil` or `VERCEL_*` dependency is needed by this design.

---

## F. Outbound WhatsApp sends: marketing vs service (Part 6)

Class: **M** marketing, **U** utility/service, **A** authentication. "Gate?" = should the PRD invariant gate it. Path means the actual code route.

| Send path | Transport | file:line | Class | Gate? | Current checks | Bypass risk |
|---|---|---|---|---|---|---|
| Broadcast worker | Meta template/free text | `cron/workers/whatsapp-dispatch/route.ts:98-155` | M | **Yes** | opt-out flags + suppression list, window | audience can be "All contacts" (B1a) |
| Hub agent reply | Meta text | `messaging.ts:320` guard, `dispatchOutboundMessage.ts:131` | U (in window) | No (service) | opt-out, window | an agent can type marketing content in-window |
| Hub voice note | Meta | `messaging.ts:577`, `voiceNoteWhatsApp.ts:52` | U | Mostly no | none beyond Hub | same |
| Bot auto-reply | Meta | `webhooks/meta/route.ts:972,1012,1019` | U (reply) | No | skips opted-out | template-type reply could be promotional |
| Appointment reminders | Meta | `calendar/whatsappReminder.ts:61-80`, `cron/reminders` | U | No | inline opt-out + window | low |
| **Reputation / review requests** | **Meta free text** | `api/reputation/send-request/route.ts:149-153` | **M (solicitation)** | **Yes** | **none: no opt-out, no window, no consent check, calls `MetaAdapter` directly** | **High: a bulk send outside the broadcast route** |
| Reputation (Twilio) | Twilio `whatsapp:` | `reputation_actions.ts:355-378` | M | Yes | `sendSMS` default marketing: flags + suppression | medium |
| Automation `send_whatsapp` | Twilio | `actions_registry.ts:274-280` | M (or U by content) | **Yes** | `sendSMS` flags + suppression | **High: any workflow step** |
| Automation `send_whatsapp_voice` | Twilio | `actions_registry.ts:485-486` | M | Yes | same | High |
| `send_whatsapp_template` step | none (throws) | `lms_actions.ts:318` | n/a | n/a | disabled | none |
| LMS welcome | Twilio | `lms_actions.ts:79-84` | U | Probably no | flags | medium |
| CRM action handler / email-automation fallback | Twilio | `CRMActionHandler.ts:334-377`, `EmailAutomationService.ts:143-148` | M | **Yes** | flags + suppression | High |
| **Workflow hard-bounce fallback** | Twilio | `WorkflowEngine.ts:359-362` (also `:423-428`) | **M** (a marketing email re-sent on WhatsApp) | **Yes** | flags + suppression; it **switches the contact's `primary_channel` to `whatsapp`** (`:326`) | **High: converts an email failure into a WhatsApp marketing send** |
| KYC consent link | Twilio, `transactional` | `kyc/consent/request/route.ts:112-125` | U | No | none by design | low |
| Portal OTP / magic link | Twilio, `transactional` | `auth/portal/otp:69`, `magic-link:87` | A | No | none by design | low |
| Support ticket notices | Twilio, `transactional` | `support/tickets/route.ts:184-199` | U | No | none by design | low |
| PayFast notices | Twilio, `transactional` | `webhooks/payfast/route.ts:238-244` | U | No | none by design | low |

**Which paths a locked eligibility filter must cover so it cannot be bypassed:** the broadcast worker and campaign create; reputation (Meta and Twilio); the automation steps `send_whatsapp`, `send_whatsapp_voice`, CRM action handler, email-automation fallback; the workflow hard-bounce fallback; and, for a defence-in-depth rule, any send whose `purpose` is not `transactional`. The Hub, reminders and transactional sends should be classified, not gated. The Twilio path counts: PRD-main §90 wants one sending system and the invariant must not depend on which provider an automation picked.

---

## G. Enforcement points and TOCTOU (Part 7)

**Category at send time:** not known. `whatsapp_broadcast_campaigns` stores `template_name`, `template_language`, `template_body_params`, **not category**; the worker selects only those (`route.ts:58-61`). `listApprovedWhatsAppTemplates` returns `category` only to the UI (`whatsapp_broadcast.ts` picker). A template can also be re-categorised by Meta after sync. Category must be stored with the template snapshot at campaign creation and refreshed at dispatch.

| # | Enforcement point | Today | Needs |
|---|---|---|---|
| 1 | Audience build | resolver (`resolveBroadcastAudience.ts`) uses flags + `sms_suppression_list` (B1a rule: any contact on the number opted out) | read only the eligible base from the eligibility function |
| 2 | Campaign create | `createWhatsAppBroadcastCampaign` (`whatsapp_broadcast.ts`) re-resolves, requires the client's `consentAttested` | server-derived eligibility; reject if tenant not ACTIVE; store snapshot |
| 3 | Schedule | `resolveScheduledFor` only validates the date; a scheduled campaign is not re-validated | re-validate at activation |
| 4 | Queue insert | admin upsert in chunks of 500 (`:~262-282`) | insert only ids returned by the eligibility function |
| 5 | Dispatch, just before Graph | worker `route.ts:98-155`: batch-loads contacts once (`:70-74`), per row re-checks `opted_out/sms_opt_out` (`:110`) and `getSmsOptOutReason` (`:117-128`, fails closed with a 15-minute retry) | call the same eligibility function per batch; check kill switches and template category |
| 6 | Automation executor | `sendSMS` gate (`sms.ts:59-66`), flags + suppression only | call the policy function for every non-transactional WhatsApp send |

**TOCTOU windows:**
- Consent revoked between queueing and dispatch: today covered only by the per-row flag/suppression re-check; with a consent table the dispatch re-check must read consent status, not a cached list. The worker loads contacts for the whole 50-row batch before the loop (`:70-74`), so a STOP landing during the batch is missed (about seconds).
- A campaign scheduled days ahead keeps its queue rows; nothing re-validates eligibility, tenant status or global kill switch between create and send.
- Reclaimed `processing` rows (5 minutes) are re-evaluated by the same worker, so the extended check also covers retries.
- Contact phone changed after consent: consent must be bound to the number (match on `phone_e164` at dispatch).

---

## H. Kill switches, terms, tenant status, audit (Part 8)

| Capability | Exists? | Evidence |
|---|---|---|
| Workspace suspension / status | **No** | `workspaces` columns: id, name, slug, owner_id, plan, plan_tier, twilio_*, custom_domain, ... no status column |
| Feature flags | Global only | `form_feature_flags(flag_key, is_enabled)`, 4 rows; SELECT open to authenticated (`using true`); no writer policy (service role); read via `lib/launch/FeatureFlagManager.ts` (client-side, in-memory cache) and `lib/lms/audio/advancedAuthoring*.ts` |
| Per-workspace feature disable | **No** (module permission per member exists, `module_access`) | `modules.ts` |
| Platform operator | **Yes**, env allowlist | `lib/auth/platformOperator.ts`: `PLATFORM_OPERATOR_USER_IDS`, `requirePlatformOperator()`; used by `api/admin/dead-letters/replay`, `api/admin/meta/backfill-*`. Unset allowlist denies everyone |
| Admin screens | tenant-scoped only | `app/admin/message-delivery` checks workspace role `admin/owner` (not operator); `admin/compliance`, `admin/dead-letters` exist |
| Terms acceptance | **None** | no table; grep for `terms_accepted`, `tos_accept`, `terms_version`: nothing |
| Audit log | table exists, **unusable as evidence** | `workspace_audit_logs(id, workspace_id, actor_id, action, resource_type, resource_id, details, created_at)`; **0 rows live**; writer `WorkspaceAuditEngine.logAction` (`lib/governance/WorkspaceAuditEngine.ts:6`) has only 2 call sites (`ApprovalFlowEngine.ts:29,55`); RLS ALL for any member, so rows can be forged, edited or deleted |

**Where a global kill switch should be checked:** inside the eligibility function (database side, so every caller honours it), reading a service-role-only settings row; and defensively at the top of the dispatch worker. `form_feature_flags` can hold the global flag (service-role writes, no schema change), but the **tenant** state needs a new table. The operator screen can be guarded by `requirePlatformOperator()`; no Trust and Safety screen exists.

---

## I. Invariant and MVP gap table (Part 9)

### I.1 The 12 invariants

| ID | Status | Evidence | Minimal change |
|---|---|---|---|
| ANTI-SPAM-001 valid active consent | **Missing** | no consent record; worker gates on opt-out only (`route.ts:110-128`); `opted_in` default true, never read (WA-3.1); B1a attestation is client-supplied | consent + eligibility tables, eligibility fn, worker and create call it |
| 002 imports cannot create eligibility | **Missing** | imports/CSV/Lead Finder/API all create broadcastable contacts (A table); B1a "All contacts" sends to them | eligibility only from the consent engine; remove "All contacts" |
| 003 no manual assignment | **Missing** | any member can write `contacts` and `tags` directly; Hub toggle (`messaging.ts:835`); automation field-update step | service-role-only tables, reserved-tag guard |
| 004 mandatory eligibility filter | **Missing** | audience sources are tags/filters/segment/all (B1a); no locked base | resolver starts from the eligible base |
| 005 suppressed cannot receive | **Partial** | `sms_suppression_list` + flags enforced in resolver and worker; not enforced for reputation (Meta), bot, automations on Meta; members can clear contact flags | eligibility fn includes suppression; trigger-based revoke |
| 006 revoked removes eligibility | **Partial** | Meta STOP records suppression (`webhooks/meta/route.ts:739`, `smsOptOut.ts:69`); no consent to revoke; FB/IG "subscribe" re-opts in (`:313-327`) | revoke triggers on suppression/flags |
| 007 consent belongs to a tenant | **Partial** | contacts and suppression are workspace-scoped; no consent entity | `workspace_id` on every new row |
| 008 not shared between businesses | **Partial** | structurally per-workspace, no cross-tenant mechanism, but nothing records it | tenant-bound consent rows, no cross-tenant joins |
| 009 client values cannot override | **Missing** | `consentAttested` and `opted_in` come from the client | derive on the server only |
| 010 no bypass | **Missing** | reputation direct Meta send, automations (Twilio), hard-bounce fallback, anon contact insert (A, F) | policy fn on every non-transactional send |
| 011 consent events auditable | **Missing** | `consent_timestamp` overwritten per submission (`submit:398`), no text/version, no event log | append-only consent events |
| 012 campaign actions auditable | **Partial** | B1a stores `compliance_ack` + audience snapshot on the campaign row; cancel/delete/schedule are not logged; audit table untrusted and unused | service-role-only audit table |

**Count: Done 0, Partial 5, Missing 7.**

### I.2 MVP "Must Have"

| Bullet | Status | Evidence / minimal change |
|---|---|---|
| WhatsApp Business account connection | Partial | OAuth/manual connect exists; Embedded Signup missing (HUB-D2) |
| Opt-in form | Missing | no entity or element |
| WhatsApp icon and business identity | Missing | `BrandIcons` has an icon; no form |
| Consent and Terms checkboxes | Missing | generic checkbox only |
| Privacy Policy link | Missing | |
| Form versioning and consent evidence | Partial | `form_versions` table, 0 rows, not pinned; no evidence stored |
| Protected eligibility status | Missing | |
| Protected system tag | Partial | `tags.tag_type='system'` exists (32 rows) but members can create or retype tags |
| CSV-to-marketing block | Missing | CSV rows become broadcastable |
| Manual eligibility block | Missing | |
| Suppression list | Partial | `sms_suppression_list`, 0 rows, SMS-named |
| Opt-out workflow | Partial | Meta STOP via `recordSmsOptOut` (7 keywords, `optOutKeywords.ts:6`) |
| Locked campaign eligibility filter | Missing | |
| Backend pre-send validation | Partial | opt-out and phone only |
| Tenant isolation | Partial | RLS workspace-scoped (WA-12.1) but anon contacts insert policy and member-writable audit table |
| RBAC | Partial | `marketing` module gate on create/cancel; no compliance role |
| Audit logs | Missing | table empty and forgeable |
| Anti-bot / rate limiting | Partial | honeypot + per-instance limiter; no captcha; durable precedent exists |
| Template validation | Partial | picker lists approved templates only; no category, no re-check at dispatch |

---

## J. Proposed batches AS0..NEXT (Part 10)

All SQL is **proposed, not applied**. Default grants in this project give `anon`/`authenticated` ALL on every new public table, so each new table below starts with `REVOKE ALL ON ... FROM anon, authenticated` and has RLS enabled with **no write policy**. One migration at a time, each verified with an `information_schema`/`pg_policies` query before the next.

### Design answers first

**(a) Existing `opted_in = true` default.** Never read it as consent. Day one: no eligibility rows exist for any contact, so every audience is empty until people consent through an approved flow. (Live: 93 of 93 would be excluded, including 23 scraped Lead Finder contacts.) Optionally later: a compliance-reviewed "legacy consent import" that writes consent records with `source='legacy_import'` and status `PENDING_VERIFICATION`, never `ELIGIBLE`.

**(b) Suppression mapping.** Keep `sms_suppression_list` as is for SMS. Create `whatsapp_suppressions` (reasons from the PRD list). The eligibility function treats a number as suppressed if it appears in **either** table, or if any contact on that number has an opt-out flag (the B1a rule). A trigger on `sms_suppression_list` INSERT/UPDATE (and on `contacts.opted_out/sms_opt_out` set to true) calls a SECURITY DEFINER function that revokes active WhatsApp consent and eligibility. Meta STOP already reaches `recordSmsOptOut`, so **no edit to the Hub-owned webhook is needed**.

**(c) B1a audience sources.** Tags, contact filter and saved segment become *narrowing* filters: the resolver first obtains the eligible contact-id set from the eligibility function, then intersects it with the tag/filter/segment result. "All contacts" becomes "All eligible contacts".

**(d) The one backend function.** `public.wa_marketing_eligible(p_workspace uuid, p_contact_ids uuid[] default null)` (SECURITY DEFINER, `EXECUTE` revoked from anon/authenticated, granted to service_role) returns eligible `(contact_id, phone_e164, consent_id)` rows only when all hold: an `ACTIVE`, unrevoked consent for this workspace and this exact `phone_e164`; eligibility status `ELIGIBLE`; not suppressed (new table, `sms_suppression_list`, any contact flag on the number); tenant marketing status ACTIVE and not RESTRICTED/SUSPENDED/TERMINATED; global kill switch off; terms accepted. A thin TS wrapper `src/lib/whatsapp/eligibility.ts` is the **only** caller path used by the worker, campaign create, schedule activation, queue insert, the automation policy and reputation sends. Because it is a DB function, kill switches, tenant status and suppression need no per-caller code.

### AS0: consent engine (foundation, DB first). Effort L, Hub conflict Low
- **Migrations, in order:** M1 `whatsapp_consent_records` (immutable rows) and `whatsapp_consent_events` (append-only); M2 `whatsapp_marketing_eligibility`, `whatsapp_suppressions`, revoke triggers, `wa_marketing_eligible`; M3 `whatsapp_tenant_status`, `whatsapp_terms_versions`, `whatsapp_terms_acceptances`; M4 reserved-tag guard triggers and an append-only `whatsapp_audit_events` (service-role writes; `workspace_audit_logs` stays untrusted).
```sql
create table public.whatsapp_consent_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  contact_id uuid references public.contacts on delete set null,
  phone_e164 text not null,
  consent_type text not null default 'MARKETING_WHATSAPP',
  status text not null check (status in ('PENDING_VERIFICATION','ACTIVE','REVOKED')),
  source_type text not null,             -- 'whatsapp_optin_form' | 'legacy_import' | ...
  source_id uuid, source_url text,
  form_version_id uuid, consent_text text not null, consent_text_version text not null,
  terms_version text, privacy_version text,
  consented_at timestamptz not null, timezone text,
  ip_hash text, user_agent text,
  revoked_at timestamptz, revoke_reason text,
  created_at timestamptz not null default now()
);
create table public.whatsapp_consent_events (id uuid primary key default gen_random_uuid(), consent_id uuid not null references public.whatsapp_consent_records on delete cascade, workspace_id uuid not null, event text not null, actor text, detail jsonb, created_at timestamptz not null default now());
create table public.whatsapp_marketing_eligibility (workspace_id uuid not null, contact_id uuid not null, phone_e164 text not null, consent_id uuid not null references public.whatsapp_consent_records, status text not null check (status in ('NOT_ELIGIBLE','PENDING_VERIFICATION','ELIGIBLE','OPTED_OUT','REVOKED','BLOCKED')), eligible_at timestamptz, revoked_at timestamptz, updated_at timestamptz default now(), primary key (workspace_id, contact_id));
create table public.whatsapp_suppressions (id uuid primary key default gen_random_uuid(), workspace_id uuid not null, phone_e164 text not null, contact_id uuid, reason text not null check (reason in ('USER_OPTED_OUT','USER_BLOCKED_BUSINESS','USER_REPORTED_BUSINESS','CONSENT_REVOKED','ADMIN_BLOCK','POLICY_BLOCK','INVALID_NUMBER')), source text, suppressed_at timestamptz default now(), unique (workspace_id, phone_e164, reason));
-- every new table:
alter table ... enable row level security;
revoke all on ... from anon, authenticated;   -- reads for the UI via SECURITY DEFINER RPCs scoped by check_workspace_access
```
- **UI reads:** member-callable RPCs returning counts and masked rows (`wa_consent_summary(workspace)`), never raw table access.
- **Protected status:** truth is the eligibility table. A display tag `WHATSAPP_MARKETING_ELIGIBLE` may be mirrored by a trigger (service role), with a `BEFORE INSERT/UPDATE` guard on `tags` and `tag_assignments` rejecting that reserved name unless `current_user` is the service role. The tag is **never read** for decisions.
- **TOUCH:** new migrations, new `src/lib/whatsapp/consent/*`, `src/lib/whatsapp/eligibility.ts`. **FORBIDDEN:** `webhooks/meta/route.ts`, `messaging.ts`, `MetaAdapter.ts`, all Segment files, Hub UI, `smsOptOut.ts`.
- **Tests:** mock: SQL-level tests with a member JWT proving `INSERT/UPDATE/DELETE` on all new tables is denied, contacts/tags writes cannot create eligibility, phone change voids eligibility, STOP trigger revokes. Live: throwaway workspaces with cleanup proof. Hub risk Low (DB-only; triggers sit on `sms_suppression_list` and `contacts`, which the Hub does not edit in code).

### AS1: campaign enforcement. Effort M, Broadcast-owned, Hub conflict Low
- Resolver switches to the eligible base (d); create, schedule activation, queue insert and the worker call `wa_marketing_eligible`; store template category with the campaign at creation and re-read at dispatch; reject a send when the tenant is not ACTIVE or the global switch is on.
- **TOUCH:** `lib/whatsapp/audience/*`, `actions/whatsapp_broadcast.ts`, the dispatch worker route (Broadcast-owned), tests. **FORBIDDEN:** Segment files, webhook, `messaging.ts`, `MetaAdapter.ts`, `smsOptOut.ts`.
- **Tests:** a contact with only `opted_in=true` is excluded; revoke between queue and dispatch skips the row (extend the live worker test); kill switch stops a scheduled campaign; no code path accepts a client `consentAttested`.

### AS2: opt-in form, public endpoint, builder element. Effort L, Hub conflict Low
- **Entity decision:** a separate `whatsapp_optin_forms` + immutable `whatsapp_optin_form_versions` (consent text, terms/privacy version, business name) rather than reusing `forms`, because versions must be immutable and pinned per submission, and the existing submit route overwrites consent columns. Reuse from the existing system: the CORS helper, honeypot idea, admin-client pattern, `client_submission_id` idempotency, builder shell.
- **Endpoint:** `POST /api/public/whatsapp-optin/[formId]/submit`: validate the form version -> human check (Turnstile via one `verifyHumanToken()` helper) -> durable limiter -> normalise phone -> require both checkboxes server-side -> find/create contact (no consent fields written to `contacts`) -> create consent record + event + eligibility (service-role RPC) -> return. A previously opted-out number returns "already unsubscribed, contact the business" and never flips back; an active consent returns "already subscribed".
- **Prerequisite:** AS6-style `public_rate_limit_events` table + `rl_hit` RPC and `getClientIdentity(headers)`.
- **Builder element:** files in section D.
- **TOUCH:** new routes/lib, `resolver.ts`, `Sidebar.tsx`, new element files. **FORBIDDEN:** `Form.tsx` behaviour, existing public forms submit route, Segment files, webhook.
- **Tests:** mock: ticked/unticked, replay, honeypot, duplicate phone, opted-out number, rate limit; live: direct PostgREST `INSERT` into consent tables denied for member and anon.

### AS3: terms, kill switches, minimal Trust and Safety. Effort M, Hub conflict Low
- Terms: `whatsapp_terms_versions`, `whatsapp_terms_acceptances(workspace_id, user_id, version, accepted_at, ip_hash)` written by a service-role action; the 4 PRD statements as 4 required boxes.
- Tenant switch: `whatsapp_tenant_status(workspace_id, state, marketing_enabled, changed_by, reason)`; a customer "Disable marketing" action and an operator action guarded by `requirePlatformOperator()` (env allowlist already exists).
- Global switch: a `form_feature_flags` row (`whatsapp_marketing_global_enabled`), read by `wa_marketing_eligible` (so it needs no TS cache or `waitUntil`).
- Minimal operator screen: list tenants with opt-out/failure counts, set state. Audit every change to `whatsapp_audit_events`.
- Migrations M3/M4 above carry the tables, so AS3 is mostly code.

### AS4: remove B1a "All contacts" and attestation. Effort S-M, Broadcast-owned, Hub conflict Low
- After AS1: drop the "All contacts (not opted out)" option and the attestation checkbox and `consentAttested` input; relabel as "All eligible contacts" with a locked, non-removable chip; keep tags/filter/saved segment as narrowing; keep the B1a columns (no drop), `compliance_ack` stops being written (terms acceptance replaces it). The Hub's opt-in toggle in `ContactInfoPanel` (writes `opted_in`) becomes misleading for WhatsApp and should be removed or relabelled by the Hub track (coordinate).
- **TOUCH:** `AudiencePicker.tsx`, `BroadcastsView.tsx`, action, tests. **FORBIDDEN:** Segment files, Hub components.

### AS5: close the bypass paths. Effort M, Automation-owned, Hub conflict Low-Med
- Route `send_whatsapp`, `send_whatsapp_voice`, `CRMActionHandler` and `EmailAutomationService` WhatsApp sends, the hard-bounce fallback (and stop it switching `primary_channel`), LMS welcome, and reputation (Meta and Twilio) through the policy function; classify each as marketing or utility. Remove the `update contact field` ability to write consent/opt-in columns (allow-list in `CRMActionHandler.ts:269` and `actions_registry.ts:297`).
- **TOUCH:** those automation files and `reputation/send-request/route.ts`. **FORBIDDEN:** webhook, `messaging.ts`, `MetaAdapter.ts`.

### AS6: durable limiter and Turnstile helper. Effort S-M, Low (new files)
`public_rate_limit_events` + `rl_hit` RPC (service role), `getClientIdentity(headers)`, `verifyHumanToken()`; adopt first on the new opt-in endpoint; later on `/api/builder/submit`, `handlePageFormSubmission`, `subscribeToNewsletter`.

### Security fixes surfaced (separate small batch, optional AS-SEC)
Tighten the anon `contacts` INSERT policy (`subscribeToNewsletter` uses an anon-session client and depends on it, so it must move to the admin client first); add `WITH CHECK` to `tags` UPDATE; make `workspace_audit_logs` append-only for members.

### Order
**AS0 (M1 -> M4) -> AS6 -> AS1 -> AS3 (code) -> AS2 -> AS4 -> AS5**, with AS-SEC any time after AS0. AS1 can start once M2 is applied. Hub track: AS0 and AS1 touch no Hub-owned code; AS4 and AS5 need the Hub to drop its opt-in toggle and to leave `webhooks/meta/route.ts` STOP handling as is (the trigger design depends on it continuing to call `recordSmsOptOut`).

---

## K. Decisions you must make (Part 11)

| # | Decision | Recommendation | Cost of choosing wrong |
|---|---|---|---|
| 1 | Verification of consent (form-only, no OTP) | Form-only for MVP as the PRD says, status `ACTIVE` immediately but record that it is unverified; double opt-in in Phase 2 | someone can submit another person's number; mitigated by durable limiter, Turnstile, a first-message opt-out line, and `PENDING_VERIFICATION` support in the schema from day one |
| 2 | Invitation-link flow to existing contacts | Build it (a per-contact signed link to the opt-in form) after AS2, since it is the only compliant route for existing CRM contacts | without it, day-one audiences stay empty and customers will pressure you to bypass |
| 3 | Per-number vs per-tenant consent | Per tenant, bound to the contact's `phone_e164`; add a nullable `whatsapp_number_id` now | moving to per-sender later needs a backfill (the PRD says "specific business", not number) |
| 4 | Reuse `forms` vs a separate entity | Separate opt-in entity with immutable versions; reuse helpers | reusing `forms` inherits mutable live fields, overwritten consent columns and member-writable rows |
| 5 | Turnstile vs alternatives | Turnstile behind one helper (fits the Cloudflare migration); keep the DB limiter as backstop | a vendor-coupled call site spread over routes is costly to replace |
| 6 | Existing contacts on day one | All start not eligible (empty audiences); optional reviewed legacy import as `PENDING_VERIFICATION` | grandfathering the 93 `opted_in` rows (23 scraped) defeats the invariant and exposes you to POPIA and Meta action |
| 7 | Retention of consent evidence | Keep consent records and events for the life of the relationship plus a statutory period (confirm with counsel), hash IPs, never delete on revoke; erasure anonymises personal fields but keeps the event | deleting loses your defence; keeping raw IPs adds POPIA exposure |
| 8 | SMS STOP also revoking WhatsApp (unified suppression) | Keep unified (stricter); channel column later | splitting risks re-subscribing someone who said STOP |
| 9 | What a customer's own START reply does | Treat START as a **new consent event** only if the number has a prior ACTIVE consent that was revoked by STOP; otherwise ignore | a START that silently re-enables would let a stray message create eligibility |
| 10 | Hub "opted in" toggle | Remove or make read-only for WhatsApp | the toggle suggests an override that does not exist |
| 11 | Tighten the anon contacts INSERT policy | Yes, after moving the newsletter action to the admin client | leaving it lets anyone write contacts into any workspace with a page |
| 12 | Classify every automation send as marketing or utility | Default marketing unless a developer marks it utility | a default of utility reopens the bypass |

---

## L. VERIFIED vs NOT ASSESSED / DEFERRED

**Verified (evidence):** the full contact write-path scan (77 sites, 45 files); live RLS policies, grants and constraints for contacts, tags, tag_assignments, suppression, audit, forms, platform_connections; live counts (93 contacts, all `opted_in`, 2 with consent timestamps, 29 with phones, 23 Lead Finder, 0 suppression rows, 0 audit rows, 0 `form_versions`, 4 forms, 7 submissions, 32 system tags); SQL function inventory with client execute rights; submit-route behaviour (consent columns stamped and overwritten, in-memory limiter, honeypot, CORS `*`); builder registry and renderer path; outbound send inventory from code; platform-operator allowlist; audit writer and its 2 call sites.

**NOT ASSESSED / DEFERRED:**
- **Runtime behaviour:** no endpoint was called, nothing was sent; the anon `contacts` INSERT exposure is proven from policy and grants, not by an actual anon insert (that would write a row).
- **Legal wording:** consent text, terms and POPIA fit need counsel (the PRD says so).
- **Meta behaviour** (template category re-classification, opt-out signals such as block/report webhooks): DEFERRED, needs real Meta access.
- **Cloudflare** rate-limit/Turnstile binding specifics and Workers limits: not verified.
- **Server actions invoked from custom domains:** whether a builder-page server action works across a custom-domain origin was not tested.
- `api/webhooks/ozow` and a handful of public POST routes not read in detail (heuristic scan only; routes using `createClient` helpers are not proven public).
- `WHATSAPP_PRD.html` sections beyond the consent/campaign parts were read but not matched row by row (BB-E covers that).

---

## M. Searched and found nothing

- CAPTCHA, Turnstile, hCaptcha, reCAPTCHA: no code and no env names in `src`, `.env.example`.
- A durable generic rate-limit table or RPC for public forms (only `lena_rate_limit_events` and the test-send events table).
- A shared `getClientIp` helper (24 files read `x-forwarded-for` inline).
- Workspace status, suspension or plan-lock column on `workspaces`.
- Terms-acceptance storage (`terms_accepted`, `tos_accept`, `terms_version`).
- Per-workspace feature flags (only global `form_feature_flags`).
- A consent text, form version, terms or privacy version stored with any submission.
- Allowed-origins or domain verification for form hosts.
- Any `whatsapp_consent*`, `whatsapp_marketing_eligibility`, `whatsapp_suppression*`, `whatsapp_terms*` or `whatsapp_audit*` table.
- A reserved-name rule or trigger protecting system tags.
- Any writer of `sms_suppression_list` other than `smsOptOut.ts` and `record_sms_soft_fail`.
- Any caller of `checkWhatsAppSendAllowed` other than the Hub (`messaging.ts:320`), and any consent/eligibility check in the reputation Meta send.
- Any operator-guarded Trust and Safety screen (the operator guard exists but only 3 maintenance routes use it).
