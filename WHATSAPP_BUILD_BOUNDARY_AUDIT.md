# WhatsApp Broadcast build-boundary audit (2026-10-03)

Read-only audit. No tracked file was modified, nothing was committed, stashed, checked out, reset, pushed or deleted. The only repo file created is this report. Probe SQL ran through the linked Supabase CLI as `SELECT` only (catalogue metadata and row counts, no row contents, no secrets). Temp files lived in the session scratchpad outside the repo.

**READ THIS FIRST — the client PRD was not found and was NOT read.** I searched the repo root, `docs/`, `~/Downloads`, `~/Documents` and `C:\tmp` by file name, and ran `pdftotext` on every PDF in Downloads and Documents looking for "WhatsAppPolicyService" and "Business Messaging". Nothing matched. Every PRD section number in this report (§13, §23, §24, §30, §31, §56, §68, §73-74, §90) is taken from your brief, not from the PRD text. Part E therefore marks anything that depends on PRD wording as NOT ASSESSED. Drop the PRD into the repo root and Part E needs one more pass.

Prior audits are referenced by row number: **WA-n.n** = `WHATSAPP_AUDIT.md`, **HUB-X** = `WHATSAPP_HUB_AUDIT.md` (C/D/F/I = its sections, so "HUB-F4" is its gap list item 4).

---

## A. Git and branch verdict (Part 1)

### A.1 State

| Item | Evidence |
|---|---|
| Current branch | `wa-batch1` at `d08ea2e0` "fix(whatsapp): batch 1 safety hotfixes" (zain ul hassan, 2026-10-02) |
| Tracked changes | None. `git status --short --untracked-files=all` shows only 3 untracked files: `VERCEL_DEPENDENCY_AUDIT.md`, `WHATSAPP_AUDIT.md`, `WHATSAPP_HUB_AUDIT.md`. This report becomes the 4th. |
| **HUB audit is stale on this point** | HUB header says Batch 1 "exists only as uncommitted working-tree changes (12 modified files)". It is now committed: `d08ea2e0` touches 26 files, +1140/-640, including `whatsappSendGuard.ts`, `mockMode.ts`, `optOutKeywords.ts`, `payloadSummary.ts`, `src/lib/whatsapp/*` and `scripts/db-checks/whatsapp-batch1.live.test.ts`. |
| `wa-batch1` upstream | **None.** `git for-each-ref` shows no upstream and there is no `origin/wa-batch1`. The commit exists only on this machine. |
| `wa-batch1` vs master | Not merged. vs `origin/master` (`9b206176`, PR #213 merge, 2026-09-30): 31 ahead, 0 behind, so `origin/master` is an ancestor. vs local `master` (`61a5b94a`, 2026-09-14): 181 ahead, local master is 150 behind origin. |
| What the 31 commits are | 29 are `saas-onboarding-flow` commits that are on `origin/saas-onboarding-flow` (`76fda84d`) but **not merged to master**; then `778dff66` (builder blank-site fix, **unpushed, not WhatsApp**); then `d08ea2e0` (WhatsApp). `git log origin/saas-onboarding-flow..HEAD` = exactly those 2. |
| `hub-hotfix` | **Does not exist.** No local branch, no remote branch, `git log --all --grep=hub-hotfix` empty, no reflog mention. The Hub work in git is commits on the same lineage: `742939ea` "communication hub redesign" (2026-09-29), `4c973d4f` "de-linking wa" (2026-09-29), `88969226` "email communication" (2026-09-26). |
| Stash / worktrees | One old stash (`sprint1`, unrelated). One worktree `.claude/worktrees/guest-checkout` (unrelated, remote gone). |
| Other open refs touching these files | Three unmerged commits on stale `sprint_2` (Muhammad Zain, 2026-07-01: `63397760`, `2123e443`, `e00cab6c`), remote gone. Nothing newer. |

### A.2 Per-file history (last 5 commits per file, with author and date)

Full output for 51 WhatsApp/Hub/Segment files was produced (`git log -5 --format='%h %an %ad %s' HEAD -- <file>`). Every one of the last 5 commits on every file in the Broadcast, Hub, connection and shared sets is dated 2026-06-01 or later. All recent ones are authored by the same account under spelling variants. Key rows (full per-file last-touch is in the Part C table, column "Last touch"):

| File | Last 5 (hash date author-variant) | Commits since 09-01 / since 09-25 |
|---|---|---|
| `src/app/api/webhooks/meta/route.ts` | `d08ea2e0` 10-02, `4c973d4f` 09-29, `ca4afcc1` 09-04, `2d4282e3` 08-23, `2924ac27` 08-17 | 3 / 2 |
| `src/app/actions/messaging.ts` (51 commits ever) | `d08ea2e0` 10-02, `ef3d51ee` 10-02, `06e378df` 09-29, `4c973d4f` 09-29, `88969226` 09-26 | **13 / 6** |
| `src/lib/meta/MetaAdapter.ts` | `d08ea2e0` 10-02, `e769302d` 09-04, `ca4afcc1` 09-04, `2924ac27` 08-17, `ca0dd521` 08-08 | 3 / 1 |
| `src/app/conversations/ConversationsClient.tsx` | `4c973d4f` 09-29, `742939ea` 09-29, `88969226` 09-26, `474e4d3e` 09-06, `cddd85d7` 09-05 | 8 / 3 |
| `src/app/api/auth/meta/callback/route.ts` (28 commits ever) | `9e94039f` 10-02, `ef3d51ee` 10-02, `06e378df` 09-29, `424ead7b` 09-24, `e0fb6b13` 08-16 | 4 / 3 |
| `src/lib/inngest/functions/metaDiscovery.ts` | `ef3d51ee` 10-02 (file created then) | 1 / 1 |
| `src/app/actions/whatsapp_broadcast.ts` | `d08ea2e0` 10-02, `26991eb2` 09-24, `424ead7b` 09-24, `475baf24` 09-22, `cec8b0ea` 09-21 | 5 / 1 |
| `src/app/whatsapp-broadcasts/WhatsappBroadcastsClient.tsx` | `d08ea2e0` 10-02, `ca0dd521` 08-08 | 1 / 1 |
| `src/app/api/cron/workers/whatsapp-dispatch/route.ts` | `475baf24` 09-22, `2d4282e3` 08-23, `ca0dd521` 08-08 | 1 / 0 |
| `vercel.json` (29 commits ever) | `14a40595` 09-30, `88969226` 09-26, `947ff7bb` 09-22, `b68894fc` 09-22, `72b30111` 09-19 | 12 / 2 |
| `src/data/dashboard-nav.ts` | `4cd383ef` 09-30, `acf2e58c` 09-26, `674fe60b` 09-24, `ac0a7db6` 09-17, `8529b870` 09-14 | 11 / 2 |
| `src/lib/intelligence/SegmentationCompiler.ts` (Segment neighbour) | `2d6a6e8b` 09-27, `7b1e2eae` 09-21, `3da2c883` 09-21, `cec8b0ea` 09-21, `4604b4c0` 09-21 | 5 / 1 |

### A.3 Concurrent-activity flags

- **Authors.** Commits since 2026-08-01 on all `--all` refs: `zain ul hassan` 364, `Zain Ul Hassan` 143, `Michael Ojedokun` 44, `Michael Adewale` 30, `copilot-swe-agent[bot]` 2. On the Meta/messaging paths since 2026-06-01: `zain ul hassan` 32, `Birthday Portal` 19. I cannot tell from git whether these are one person; I did not assume.
- **Other humans touching these files since 2026-08-01:** three commits by Michael Ojedokun on 2026-08-15 (`ac7094cc` pre-meeting reminders, merge `373abe32`, fix `46304505`), all three touch `vercel.json`; the merge `373abe32` also touched `dashboard-nav.ts` and `lib/meta/config.ts`. **No concurrent activity on WhatsApp/Hub code today.**
- **The real concurrency is future, not historical.** The files with the highest churn are exactly the ones both tracks will need: `messaging.ts` (13 commits in 33 days), `vercel.json` (12), `dashboard-nav.ts` (11), `ConversationsClient.tsx` (8).
- **Flagged for concurrent-edit danger once two tracks run:** `webhooks/meta/route.ts`, `messaging.ts`, `MetaAdapter.ts`, `vercel.json`, `dashboard-nav.ts`, `WhatsappBroadcastsClient.tsx` (holds Broadcast and Hub UI in one file).

### A.4 Verdict

**Safe to start Broadcast work: YES, with four housekeeping items (none is a code commit).**

The tracked working tree is clean, so there is no uncommitted WhatsApp code to lose or to collide with, and no one else is editing these files in git. Housekeeping before cutting a Broadcast branch:

1. **Push or merge `wa-batch1`.** It is the only copy of Batch 1 and has no remote. It also drags 29 unmerged `saas-onboarding-flow` commits and the unpushed builder commit `778dff66`. Decide whether the PR is `saas-onboarding-flow` then `wa-batch1` or one combined PR. (I did not push; that is your call.)
2. **Branch Broadcast and Hub work from `d08ea2e0`, never from local `master`** (150 commits behind origin, 2026-09-14).
3. **Commit the audit reports** (`WHATSAPP_AUDIT.md`, `WHATSAPP_HUB_AUDIT.md`, this file, `VERCEL_DEPENDENCY_AUDIT.md`) as a docs-only commit so they are not floating untracked.
4. **Tell the Hub side the `hub-hotfix` name does not exist** if anyone expected it; whatever that work is, it has not been committed anywhere in this clone.

**What must be committed first: nothing in product code.** Only the reports (item 3). The Batch 1 safety work is already committed.

---

## B. Broadcast screen reality (Part 2)

Route `/whatsapp-broadcasts`, nav entry `src/data/dashboard-nav.ts:45` (id 117, Marketing section, gated by the `marketing` module via the nav, no per-route override).

### B.1 What the page loads

[page.tsx:18-22](src/app/whatsapp-broadcasts/page.tsx#L18-L22) runs three server calls in parallel: `listWhatsAppBroadcastCampaigns` ([whatsapp_broadcast.ts:47](src/app/actions/whatsapp_broadcast.ts#L47)), `listWhatsAppBotRules` ([whatsapp_bot_rules.ts](src/app/actions/whatsapp_bot_rules.ts)) and **`listSegments`** ([segments.ts:57](src/app/actions/segments.ts#L57)). It does **not** query the WhatsApp connection at all. `listSegments` computes a live member count per segment (`segmentCounts`, [segments.ts:19-40](src/app/actions/segments.ts#L19-L40), one `countSegment` call each) just to fill a dropdown.

### B.2 How "connected WhatsApp Business account" is determined

There is no page-level check. The page renders identically with or without a connection. Existence is tested only inside two actions:

- `createWhatsAppBroadcastCampaign` ([:223-229](src/app/actions/whatsapp_broadcast.ts#L223-L229)): `platform_connections` row where `workspace_id = ws AND platform = 'whatsapp'`, `select('id')`. It ignores `status`, token presence, `mock_` values and Cloud API health.
- `listApprovedWhatsAppTemplates` ([:78-90](src/app/actions/whatsapp_broadcast.ts#L78-L90)): same row, reads `credentials` (`waba_id` via `readWhatsAppCredentials`; token from `system_user_access_token_encrypted || access_token_encrypted`, the reverse order of `MetaAdapter`).

Table: `platform_connections(id, workspace_id, platform, credentials jsonb, status, last_sync_at, …)`, `UNIQUE (workspace_id, platform)` (verified in the live DB), `status` CHECK = connected/disconnected/error/pending. Live now: **2 WhatsApp rows, both `connected`.**

| State | Page | New Campaign button | Template picker | Create action |
|---|---|---|---|---|
| No connection | Renders normally | Enabled iff ≥1 segment ([Client:223](src/app/whatsapp-broadcasts/WhatsappBroadcastsClient.tsx#L223)) | Inline error "Connect a WhatsApp Business account first" ([action:86](src/app/actions/whatsapp_broadcast.ts#L86), shown [Client:319](src/app/whatsapp-broadcasts/WhatsappBroadcastsClient.tsx#L319)) | Same text as a toast ([:229](src/app/actions/whatsapp_broadcast.ts#L229)) |
| Mock connection (`mock_…` ids) | Renders normally | Same | Production: error `MOCK_CREDENTIALS_REJECTED` ([:94-98](src/app/actions/whatsapp_broadcast.ts#L94-L98)). Only with `META_MOCK_MODE=true` AND non-production: 2 sample templates + amber note ([:100-107](src/app/actions/whatsapp_broadcast.ts#L100-L107), [Client:320](src/app/whatsapp-broadcasts/WhatsappBroadcastsClient.tsx#L320)) | **Allowed** (row exists). Worker: `credentialGate` ([MetaAdapter.ts:44-53](src/lib/meta/MetaAdapter.ts#L44-L53)) reports success only in mock mode; in production every row fails with `MOCK_CREDENTIALS_REJECTED` |
| Expired token | Renders normally; nothing detects it | Same | Graph error text via `userSafeMessage` shown inline ([:125-127](src/app/actions/whatsapp_broadcast.ts#L125-L127)) | **Succeeds.** Worker classifies by message regex `/invalid\|auth\|unsubscribed\|blacklist\|template/i` ([route.ts:162](src/app/api/cron/workers/whatsapp-dispatch/route.ts#L162)), not by error code 190, so the outcome depends on Meta's wording (hard-fail vs 3 retries at 15/60/240 min). Not tested live (DEFERRED) |
| Non-ready number (not `CLOUD_API`/`CONNECTED`) | Renders normally | Same | Works if the token works | **Succeeds.** `isCloudApiHealthy` ([cloudApiHealth.ts:9](src/lib/messaging/cloudApiHealth.ts#L9)) is called only in the connect wizard ([messaging.ts:1056, :1170](src/app/actions/messaging.ts#L1170)); nothing re-checks at create or send |

### B.3 The "You need at least one Segment" gate (Addendum)

**It is UI-only. The server action does not require a segment.**

| What | Where |
|---|---|
| Notice text "You need at least one Segment before you can target a WhatsApp broadcast" | [WhatsappBroadcastsClient.tsx:228-232](src/app/whatsapp-broadcasts/WhatsappBroadcastsClient.tsx#L228-L232), rendered when `segments.length === 0` |
| New Campaign button disabled | [:223](src/app/whatsapp-broadcasts/WhatsappBroadcastsClient.tsx#L223) `disabled={segments.length === 0}` |
| Empty-state button disabled | [:240](src/app/whatsapp-broadcasts/WhatsappBroadcastsClient.tsx#L240) `onAction={segments.length > 0 ? openCreate : undefined}` |
| Client-side validation | [:169](src/app/whatsapp-broadcasts/WhatsappBroadcastsClient.tsx#L169) `if (!formSegmentId) toast.error('Select an audience segment')` |
| Only audience control in the form | [:296-305](src/app/whatsapp-broadcasts/WhatsappBroadcastsClient.tsx#L296-L305) segment `<Select>`; payload always sends `segmentId` ([:179](src/app/whatsapp-broadcasts/WhatsappBroadcastsClient.tsx#L179)), never `ruleGroup` or `tags` |
| Server check | [whatsapp_broadcast.ts:217-219](src/app/actions/whatsapp_broadcast.ts#L217-L219): accepts `segmentId` **or** `ruleGroup` **or** non-empty `tags`; errors only if all three are absent |
| Production impact today | Both connected workspaces have **0 segments** (live query: 2 WhatsApp workspaces, 0 segments each; 1 segment exists in the whole database). Neither can open the New Campaign form. |

**What the action accepts as an audience today** ([:133-207](src/app/actions/whatsapp_broadcast.ts#L133-L207)):

| Input | Handling |
|---|---|
| `segmentId` | `loadSegmentRuleGroup` ([resolveSegment.ts:24](src/lib/segments/resolveSegment.ts#L24)) reads `segments.rule_group` live, fail-closed on delete/invalid ([:149-151](src/app/actions/whatsapp_broadcast.ts#L149-L151)) |
| `ruleGroup` | `validateRuleGroup` then `SegmentationCompiler.executeSegment` ([:145-159](src/app/actions/whatsapp_broadcast.ts#L145-L159)) |
| `tags[]` | `resolveContactIdsWithAllTags` ([tagAudience.ts](src/lib/tagAudience.ts)), a contact must carry ALL tags ([:163-166](src/app/actions/whatsapp_broadcast.ts#L163-L166)) |
| rule + tags | Intersection ([:169-173](src/app/actions/whatsapp_broadcast.ts#L169-L173)) |
| Anything else (all contacts, CSV, pasted numbers, static list, consent-based, "replied recently") | **Not accepted** |

**How the audience becomes recipients:** matched ids -> `contacts` rows in chunks of 100 ([:180-187](src/app/actions/whatsapp_broadcast.ts#L180-L187)) -> `sms_suppression_list` phone lookup ([:191-198](src/app/actions/whatsapp_broadcast.ts#L191-L198)) -> drop rows with no `phone` or no `phone_e164` ([:201](src/app/actions/whatsapp_broadcast.ts#L201), silently, never counted) -> drop `opted_out || sms_opt_out || suppressed` and count them ([:202-204](src/app/actions/whatsapp_broadcast.ts#L202-L204)) -> `contactIds` + `excludedOptOut` only. Rows are then upserted into `whatsapp_dispatch_queue` in chunks of 500 with `UNIQUE(campaign_id, contact_id)` ([:262-282](src/app/actions/whatsapp_broadcast.ts#L262-L282)); a failed chunk deletes the whole campaign (:278-279).

**Can a Segment filter by WhatsApp consent, phone presence, tags, last reply?** Allowed rule fields ([ruleValidation.ts:18-32](src/lib/segments/ruleValidation.ts#L18-L32)): `first_name, last_name, email, phone` (text: equals/not_equals/contains), `source, timezone, tags` (equals), `invoice_status, outstanding_zar_limit, lms_course_id, lms_course_status, email_open_count, email_click_count`.

| Capability | Segment can? |
|---|---|
| WhatsApp consent / opt-in | **No** (no such field; also no such column on `contacts`) |
| Phone present | **No** (only `phone contains/equals <text>`; no is-set operator) |
| Tags | Yes (`tags equals`), single tag per rule; the action's own `tags[]` path is the AND-of-all path |
| Last WhatsApp reply / window open | **No** (`conversations.last_customer_message_at` is not a field) |

**Who can create a Segment:** any workspace member who passes `requireWorkspaceAccess` ([segments.ts:85](src/app/actions/segments.ts#L85)), then RLS: `segments` is a `{marketing}` module table ([20260929000002:~146](supabase/migrations/20260929000002_module_permission_enforcement.sql)).

**PRD §23 audiences:** CSV upload, manual contacts, static list: **none possible today.** The queue's `contact_id` is `NOT NULL REFERENCES contacts` ([migration:64](supabase/migrations/20260808000004_whatsapp_broadcast_and_bot.sql#L64)), so a number that is not already a CRM contact cannot be queued at all.

### B.4 Automated Replies tab: real vs stub

| Part | Verdict | Evidence |
|---|---|---|
| Rule CRUD (name, match, reply, priority, toggle, delete) | **Real** | [Client:381-565](src/app/whatsapp-broadcasts/WhatsappBroadcastsClient.tsx#L381), table `whatsapp_bot_rules` (0 rows live) |
| `contains` / `exact` matching on inbound text | **Real** | `maybeSendWhatsAppAutomatedReply` ([webhooks/meta/route.ts:972](src/app/api/webhooks/meta/route.ts#L972)); skips opted-out contacts; WA-9.1 |
| `regex` rules | **Disabled by design** | Batch 1: never evaluated, UI shows "Regex rules are no longer supported" ([Client:464-468](src/app/whatsapp-broadcasts/WhatsappBroadcastsClient.tsx#L464)) |
| Template replies | **Partial** | Backend calls `sendWhatsAppTemplate` ([route.ts:1012](src/app/api/webhooks/meta/route.ts#L1012)); UI takes only a free-typed template name, no param mapping (the table has `reply_template_params`, the UI never sets it) |
| Flow builder, fallback, human hand-off, state | **Missing** | WA-9.2 |
| Tab permission | **Mismatch** | Page gated by `marketing`; table gated by `{communication}` ([20260929000002:312](supabase/migrations/20260929000002_module_permission_enforcement.sql)) and the actions have no `requireModuleAccess` ([grep](src/app/actions/whatsapp_bot_rules.ts)), so a Marketing-only member sees the tab and every call fails on RLS |

### B.5 Everything the page touches

| Kind | Items |
|---|---|
| Server actions | `listWhatsAppBroadcastCampaigns`, `createWhatsAppBroadcastCampaign`, `cancelWhatsAppBroadcastCampaign`, `deleteWhatsAppBroadcastCampaign`, `listApprovedWhatsAppTemplates` (all `whatsapp_broadcast.ts`); `listWhatsAppBotRules`, `createWhatsAppBotRule`, `updateWhatsAppBotRule`, `deleteWhatsAppBotRule`, `toggleWhatsAppBotRule` (`whatsapp_bot_rules.ts`); `listSegments` (Segment-owned) |
| Module guards | `requireModuleAccess('marketing')` on create ([:210](src/app/actions/whatsapp_broadcast.ts#L210)) and cancel ([:294](src/app/actions/whatsapp_broadcast.ts#L294)) only; list, delete and template picker rely on RLS alone |
| API routes / crons | `GET /api/cron/workers/whatsapp-dispatch` (`*/5 * * * *`, [vercel.json:45](vercel.json#L45), `Bearer CRON_SECRET`). No broadcast-specific API route |
| External calls | `GET graph.facebook.com/v18.0/{waba}/message_templates` (token in the URL query, [:111-113](src/app/actions/whatsapp_broadcast.ts#L111-L113)); worker -> `MetaAdapter.sendWhatsApp` / `sendWhatsAppTemplate` (`POST …/v18.0/{pn}/messages`, [MetaAdapter.ts:281, :370](src/lib/meta/MetaAdapter.ts#L281)) |
| Tables | `whatsapp_broadcast_campaigns`, `whatsapp_dispatch_queue` (RLS on, **no user policy**, admin-client only), `whatsapp_bot_rules`, `platform_connections`, `contacts`, `conversations` (worker reads `last_customer_message_at`), `sms_suppression_list`, `segments`, `tag_assignments`/`tags` (via tag/segment helpers) |
| RPCs | `acquire_whatsapp_jobs`, `refresh_whatsapp_campaign_totals` (both service_role only) |
| Campaign states actually used | `scheduled` (set at create), `completed`/`failed` (set by worker), `cancelled` (set by cancel). **`draft` and `sending` are never written by any code** (grep of `'sending'` finds only reads at [action:306, :345] and [route.ts:210]) |
| Live data | 0 campaigns, 0 queue rows, 0 bot rules, 2 `connected` WhatsApp connections, 0 WhatsApp conversations |

---

## C. Ownership map (Part 3)

Classes: **B** Broadcast only, **H** Hub/Inbox only, **C** Connection foundation, **S** Shared runtime, **A** Automation. Segment/Tag code is a separate read-only class **SEG** (listed in C.3, never edited by Broadcast). One class per row. "Since 09-01" = commits touching the file since 2026-09-01 on `HEAD`.

### C.1 Files (93 WhatsApp-related tracked files)

| File | Class | Last touch (hash, author, date) | Since 09-01 | Note |
|---|---|---|---|---|
| `src/app/whatsapp-broadcasts/page.tsx` | B | ca0dd521 zain ul hassan 2026-08-08 | 0 | Page. Calls listSegments (SEGMENT neighbour), campaigns list, bot rules list |
| `src/app/whatsapp-broadcasts/WhatsappBroadcastsClient.tsx` | B | d08ea2e0 zain ul hassan 2026-10-02 | 1 | One file holds BroadcastsView (:121) AND RepliesView (:381, the H-side bot-rule UI) |
| `src/app/actions/whatsapp_broadcast.ts` | B | d08ea2e0 zain ul hassan 2026-10-02 | 5 | create/cancel/delete/list campaigns, template picker (Graph GET), resolveAudience (:133) |
| `src/app/api/cron/workers/whatsapp-dispatch/route.ts` | B | 475baf24 zain ul hassan 2026-09-22 | 1 | Dispatch worker, 50 rows/run |
| `src/lib/whatsapp/schedule.ts` | B | d08ea2e0 zain ul hassan 2026-10-02 | 1 | resolveScheduledFor |
| `src/lib/whatsapp/batch1.test.ts` | B | d08ea2e0 zain ul hassan 2026-10-02 | 1 | Unit tests (schedule + bot rule validation) |
| `src/app/actions/segmentAudienceSmsWa.test.ts` | B | 42b45b15 zain ul hassan 2026-09-24 | 3 | Unit test of SMS + WA audience resolution (imports createWhatsAppBroadcastCampaign) |
| `scripts/db-checks/whatsapp-templates.live.test.ts` | B | 424ead7b zain ul hassan 2026-09-24 | 1 | Live check of template picker |
| `supabase/migrations/20260808000004_whatsapp_broadcast_and_bot.sql` | B | ca0dd521 zain ul hassan 2026-08-08 | 0 | Creates campaigns, queue, acquire_whatsapp_jobs (and the H-side whatsapp_bot_rules) |
| `supabase/migrations/20260921000014_campaign_totals_and_send_marker.sql` | B | 475baf24 zain ul hassan 2026-09-22 | 1 | refresh_whatsapp_campaign_totals (same file also changes SMS) |
| `supabase/migrations/20260920000001_reclaim_stale_processing_jobs.sql` | B | d8b423d7 zain ul hassan 2026-09-20 | 1 | Replaces acquire_whatsapp_jobs (same file also changes SMS and email queues) |
| `src/app/conversations/page.tsx` | H | 88969226 zain ul hassan 2026-09-26 | 1 | Hub page |
| `src/app/conversations/ConversationsClient.tsx` | H | 4c973d4f zain ul hassan 2026-09-29 | 8 | HIDDEN_CHANNELS hides WhatsApp (:28) |
| `src/components/conversations/MessageInput.tsx` | H | d08ea2e0 zain ul hassan 2026-10-02 | 4 | Composer, 24h-window banner |
| `src/components/conversations/ConversationThread.tsx` | H | e769302d zain ul hassan 2026-09-04 | 2 | Thread, window calc (:70-82) |
| `src/components/conversations/ConversationList.tsx` | H | 742939ea zain ul hassan 2026-09-29 | 3 | List |
| `src/components/conversations/MessageBubble.tsx` | H | e769302d zain ul hassan 2026-09-04 | 2 | Bubble, failed/retry UI |
| `src/components/conversations/ContactInfoPanel.tsx` | H | 2924ac27 zain ul hassan 2026-08-17 | 0 | Opt-in toggle calls updateContactConsent |
| `src/components/conversations/platformMeta.tsx` | H | 2924ac27 zain ul hassan 2026-08-17 | 0 | Channel labels/icons |
| `src/components/conversations/MessageToast.tsx` | H | 88969226 zain ul hassan 2026-09-26 | 1 | Inbound toast |
| `src/app/actions/conversationReads.ts` | H | 88969226 zain ul hassan 2026-09-26 | 1 | Unread |
| `src/lib/conversations/unreadStore.ts` | H | 4c973d4f zain ul hassan 2026-09-29 | 2 | Unread store |
| `src/lib/messaging/dispatchOutboundMessage.ts` | H | f8fd197e zain ul hassan 2026-09-26 | 2 | Hub send + retry; calls MetaAdapter.sendWhatsApp (:131) |
| `src/lib/messaging/retryConfig.ts` | H | 90e7be07 zain ul hassan 2026-09-04 | 2 | Retry/alert thresholds |
| `src/lib/messaging/deliveryLog.ts` | H | 90e7be07 zain ul hassan 2026-09-04 | 1 | Delivery log |
| `src/lib/messaging/optimisticMessages.ts` | H | 474e4d3e zain ul hassan 2026-09-06 | 1 | Optimistic UI messages |
| `src/app/api/cron/workers/message-dispatch/route.ts` | H | f8fd197e zain ul hassan 2026-09-26 | 2 | Hub retry cron (1/min) |
| `src/app/api/cron/workers/message-delivery-health/route.ts` | H | 90e7be07 zain ul hassan 2026-09-04 | 1 | Failure-rate alert over the messages table only |
| `src/app/admin/message-delivery/page.tsx` | H | 90e7be07 zain ul hassan 2026-09-04 | 1 | Admin panel |
| `src/components/admin/MessageDeliveryPanel.tsx` | H | 90e7be07 zain ul hassan 2026-09-04 | 1 | Admin panel |
| `src/app/actions/whatsapp_bot_rules.ts` | H | d08ea2e0 zain ul hassan 2026-10-02 | 1 | Inbound keyword auto-reply CRUD (UI lives on the broadcast page) |
| `src/lib/whatsapp/botRuleValidation.ts` | H | d08ea2e0 zain ul hassan 2026-10-02 | 1 | Rule validation |
| `src/types/messaging.types.ts` | H | f1ae21de Birthday Portal 2026-05-11 | 0 | Types |
| `src/lib/validations/messaging.schema.ts` | H | f1ae21de Birthday Portal 2026-05-11 | 0 | Zod schemas |
| `supabase/migrations/20260903000011_conversations_messages_realtime.sql` | H | 56b9bece zain ul hassan 2026-08-28 | 0 | Realtime publication |
| `supabase/migrations/20260904000100_message_dispatch_queue.sql` | H | e769302d zain ul hassan 2026-09-04 | 1 | Hub queue |
| `supabase/migrations/20240101000202_meta_conversations_finalization.sql` | H | a84e3bcf Muhammad Zain 2026-07-03 | 0 | Hub columns |
| `src/app/api/auth/meta/callback/route.ts` | C | 9e94039f zain ul hassan 2026-10-02 | 4 | OAuth callback, enqueues discovery |
| `src/lib/inngest/functions/metaDiscovery.ts` | C | ef3d51ee zain ul hassan 2026-10-02 | 1 | discoverWhatsApp (:120) writes platform_connections |
| `src/lib/meta/subscribeWebhook.ts` | C | ef3d51ee zain ul hassan 2026-10-02 | 2 | WABA webhook subscription |
| `src/lib/meta/config.ts` | C | 4b929143 zain ul hassan 2026-08-15 | 0 | Meta OAuth config |
| `src/lib/meta/whatsappCredentials.ts` | C | 424ead7b zain ul hassan 2026-09-24 | 1 | readWhatsAppCredentials |
| `src/lib/meta/mockMode.ts` | C | d08ea2e0 zain ul hassan 2026-10-02 | 1 | Mock gate |
| `src/lib/messaging/cloudApiHealth.ts` | C | 06e378df zain ul hassan 2026-09-29 | 1 | isCloudApiHealthy |
| `src/app/api/meta/connections/route.ts` | C | 424ead7b zain ul hassan 2026-09-24 | 1 | Connections API |
| `src/app/api/admin/meta/backfill-webhook-subscriptions/route.ts` | C | 2d4282e3 zain ul hassan 2026-08-23 | 0 | Admin backfill |
| `src/app/api/admin/meta/backfill-profile-sync/route.ts` | C | 2d4282e3 zain ul hassan 2026-08-23 | 0 | Admin backfill |
| `src/components/dashboard/ConnectPlatformsModal.tsx` | C | 4c973d4f zain ul hassan 2026-09-29 | 2 | Connect UI |
| `src/components/settings/IntegrationsList.tsx` | C | 424ead7b zain ul hassan 2026-09-24 | 2 | Settings integrations (waConn :120) |
| `src/components/meta/IntegrationsList.tsx` | C | 6b6fa341 zain ul hassan 2026-09-12 | 1 | Meta integrations list |
| `supabase/migrations/20260930000021_whatsapp_phone_number_unique.sql` | C | 4c973d4f zain ul hassan 2026-09-29 | 1 | Unique phone_number_id index |
| `supabase/migrations/20260725000005_tighten_connections_rls.sql` | C | d9a27b66 zain ul hassan 2026-07-25 | 0 | platform_connections RLS |
| `supabase/migrations/20240101000151_fix_platform_constraints.sql` | C | a84e3bcf Muhammad Zain 2026-07-03 | 0 | platform CHECK |
| `src/app/api/webhooks/meta/route.ts` | S | d08ea2e0 zain ul hassan 2026-10-02 | 3 | 1041 lines: Facebook + Instagram + WhatsApp inbound, statuses, STOP, bot reply |
| `src/lib/meta/MetaAdapter.ts` | S | d08ea2e0 zain ul hassan 2026-10-02 | 3 | All Meta senders (sendWhatsApp :262, sendWhatsAppTemplate :348) |
| `src/lib/messaging/whatsappSendGuard.ts` | S | d08ea2e0 zain ul hassan 2026-10-02 | 1 | checkWhatsAppSendAllowed; only caller is messaging.ts:320 |
| `src/lib/smsOptOut.ts` | S | d619cfde zain ul hassan 2026-09-22 | 2 | getSmsOptOutReason / recordSmsOptOut / clearSmsOptOut |
| `src/lib/optOutKeywords.ts` | S | d08ea2e0 zain ul hassan 2026-10-02 | 1 | STOP/START keyword sets |
| `src/lib/phone.ts` | S | 7ef15811 zain ul hassan 2026-09-21 | 1 | normalizePhone (SA default) |
| `src/lib/phone.vectors.ts` | S | 7ef15811 zain ul hassan 2026-09-21 | 1 | Shared TS/SQL test vectors |
| `src/lib/meta/whatsappWindow.ts` | S | ca0dd521 zain ul hassan 2026-08-08 | 0 | isWithinWhatsAppSessionWindow |
| `src/lib/meta/deliveryStatus.ts` | S | ca4afcc1 zain ul hassan 2026-09-04 | 1 | Status ordering helper (read receipts) |
| `src/lib/meta/sendFailureClass.ts` | S | e769302d zain ul hassan 2026-09-04 | 1 | Failure classification (Hub path only) |
| `src/lib/meta/payloadSummary.ts` | S | d08ea2e0 zain ul hassan 2026-10-02 | 1 | Redacted webhook log summary |
| `src/lib/sms.ts` | S | d08ea2e0 zain ul hassan 2026-10-02 | 4 | sendSMS opt-out gate (Twilio SMS and whatsapp: prefix) |
| `src/app/actions/messaging.ts` | S | d08ea2e0 zain ul hassan 2026-10-02 | 13 | 1263 lines: connect (C) + Hub send/threads (H) + updateContactConsent (:835) |
| `src/lib/voicenotes/voiceNoteWhatsApp.ts` | S | 0fd9f6d8 Birthday Portal 2026-06-23 | 0 | Voice-note WhatsApp sender (Hub sendMessage :577 and automation :450) |
| `scripts/db-checks/whatsapp-batch1.live.test.ts` | S | d08ea2e0 zain ul hassan 2026-10-02 | 1 | Live suite across webhook, Hub guard, broadcast |
| `supabase/migrations/20240101000004_phase3_messaging.sql` | S | d44af943 zain ul hassan 2026-07-02 | 0 | Creates conversations, messages |
| `supabase/migrations/20260921000012_sms_opt_out_durable.sql` | S | 7ef15811 zain ul hassan 2026-09-21 | 1 | sms_suppression_list, phone_e164, normalize_phone_e164 |
| `supabase/migrations/20260823000002_unify_sms_whatsapp_opt_out.sql` | S | 2d4282e3 zain ul hassan 2026-08-23 | 0 | Unified opt-out backfill |
| `supabase/migrations/20260922000001_sms_invalid_number_flagging.sql` | S | d619cfde zain ul hassan 2026-09-22 | 1 | sms_invalid flags |
| `src/lib/automation/actions_registry.ts` | A | 2d6a6e8b zain ul hassan 2026-09-27 | 6 | send_whatsapp (:247) Twilio; send_whatsapp_voice (:450) |
| `src/lib/automation/lms_actions.ts` | A | d08ea2e0 zain ul hassan 2026-10-02 | 3 | send_whatsapp_template now throws (:318) |
| `src/lib/automation/actionConfigSchema.ts` | A | d08ea2e0 zain ul hassan 2026-10-02 | 1 | Step schema; template step hidden (:99) |
| `src/lib/automations/CRMActionHandler.ts` | A | 7ef15811 zain ul hassan 2026-09-21 | 3 | CRM automation actions |
| `src/lib/automations/WorkflowEngine.ts` | A | df434156 zain ul hassan 2026-09-30 | 4 | send_whatsapp (:398), hard-bounce fallback (:302-359) |
| `src/lib/automations/EmailAutomationService.ts` | A | 2d6a6e8b zain ul hassan 2026-09-27 | 6 | WhatsApp fallback mentions |
| `src/lib/automation/cancelOptOutExecutions.ts` | A | d619cfde zain ul hassan 2026-09-22 | 2 | Cancels runs on STOP |
| `src/lib/automation/executor.ts` | A | 7ef15811 zain ul hassan 2026-09-21 | 4 | Executor |
| `src/lib/calendar/whatsappReminder.ts` | A | cec209a5 zain ul hassan 2026-10-01 | 2 | Meta appointment reminder (own inline opt-out/window check :61) |
| `src/app/api/cron/reminders/route.ts` | A | cec209a5 zain ul hassan 2026-10-01 | 4 | Reminder cron |
| `src/app/api/reputation/send-request/route.ts` | A | d08ea2e0 zain ul hassan 2026-10-02 | 3 | Review request via MetaAdapter.sendWhatsApp (:149) |
| `src/app/actions/reputation_actions.ts` | A | 7ef15811 zain ul hassan 2026-09-21 | 2 | Reputation sends |
| `src/app/api/webhooks/twilio/inbound/route.ts` | A | 475baf24 zain ul hassan 2026-09-22 | 2 | Twilio inbound (creates sms conversations) |
| `src/app/settings/components/tabs/PhoneTab.tsx` | A | 475baf24 zain ul hassan 2026-09-22 | 4 | Twilio connect UI |
| `src/app/api/kyc/consent/request/route.ts` | A | 7ef15811 zain ul hassan 2026-09-21 | 1 | Twilio whatsapp: consent link |
| `src/app/api/auth/portal/otp/route.ts` | A | 7ef15811 zain ul hassan 2026-09-21 | 2 | Portal OTP over Twilio whatsapp: |
| `src/app/api/auth/portal/magic-link/route.ts` | A | 7ef15811 zain ul hassan 2026-09-21 | 3 | Portal link over Twilio whatsapp: |
| `src/app/api/support/tickets/route.ts` | A | 7ef15811 zain ul hassan 2026-09-21 | 1 | Ticket notices over Twilio whatsapp: |
| `src/app/api/webhooks/payfast/route.ts` | A | 7ef15811 zain ul hassan 2026-09-21 | 2 | Payment notices over Twilio whatsapp: |
| `src/app/api/payfast/webhook/route.ts` | A | 8d2393bb zain ul hassan 2026-09-17 | 4 | Payment notices over Twilio whatsapp: |
| `supabase/migrations/20260913010000_workspace_phone_numbers.sql` | A | ad2c27c0 zain ul hassan 2026-09-13 | 1 | workspace_phone_numbers (Twilio) |

Counts (93 files): **B 11, H 26, C 16, S 19, A 21.** Segment/Tag neighbours are not counted (see C.3).

### C.2 Non-file artifacts

| Artifact | Kind | Class | Note |
|---|---|---|---|
| `whatsapp_broadcast_campaigns`, `whatsapp_dispatch_queue` | table | B | queue has RLS on and no user policy (admin client only); no unique index on `whatsapp_message_id` |
| `whatsapp_bot_rules` | table | H | RLS `{communication}` (migration 20260929000002:312) |
| `platform_connections` | table | C | `UNIQUE(workspace_id, platform)`; RLS admin/owner only |
| `contacts`, `conversations`, `messages`, `sms_suppression_list`, `webhook_dead_letters` | table | S | `contacts.opted_in` default `true`; `phone_e164` is a generated column (`normalize_phone_e164(phone)`); `messages.status` CHECK = queued/sending/sent/retrying/delivered/read/failed; `messages.direction` CHECK = inbound/outbound only |
| `message_dispatch_queue`, `conversation_reads`, `quick_replies` | table | H | |
| `workspace_audit_logs` | table | S | exists, **0 rows ever**; no WhatsApp writer |
| `workspaces.twilio_*`, `workspace_phone_numbers` | table/cols | A | Twilio path |
| `acquire_whatsapp_jobs`, `refresh_whatsapp_campaign_totals` | RPC | B | service_role only. Acquire orders globally by `scheduled_for` (no per-workspace partition) and re-acquires `processing` rows after 5 min |
| `conversation_unread_counts` | RPC | H | |
| `normalize_phone_e164`, `check_workspace_access`, `module_denied_workspaces` | SQL fn | S | |
| cron `/api/cron/workers/whatsapp-dispatch` (`*/5`, vercel.json:45) | cron | B | no `maxDuration` export |
| crons `message-dispatch` (:49), `message-delivery-health` (:57) | cron | H | health reads `messages` only |
| cron `/api/cron/reminders` (:101) | cron | A | |
| Inngest `metaDiscovery` (`discoverWhatsApp`) | function | C | no Inngest function exists for broadcast dispatch |
| `/api/webhooks/meta` | route | S | `/api/webhooks/twilio/inbound` is A |
| Storage buckets | bucket | n/a | none found for WhatsApp |
| Env names | env | C: `META_APP_ID`, `NEXT_PUBLIC_META_APP_ID`, `META_MOCK_MODE`; S: `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `ENCRYPTION_KEY`; B/H: `CRON_SECRET`; A: `WHATSAPP_APPOINTMENT_REMINDER_TEMPLATE`, `WHATSAPP_APPOINTMENT_REMINDER_LANG`; H: `SLACK_OPS_WEBHOOK_URL` (optional) |
| Nav | nav | B: `dashboard-nav.ts:45`, `sidebar-hover-content.ts:132` | Hub entry is H |
| Automation steps | step | A | `send_whatsapp` (Twilio, `actions_registry.ts:247`, `WorkflowEngine.ts:398`); `send_whatsapp_template` hidden and now throws (`lms_actions.ts:318`); `send_whatsapp_voice` (`actions_registry.ts:450`, backend not traced); hard-bounce fallback over Twilio `whatsapp:` (`WorkflowEngine.ts:302-359`) |

### C.3 Segment/Tag neighbours (SEGMENT = forbidden to edit)

**Broadcast imports or calls (all read-only):**

| Call | Where Broadcast uses it | Class |
|---|---|---|
| `listSegments` (`src/app/actions/segments.ts:57`) | `page.tsx:8,21` | SEGMENT |
| `SegmentationCompiler.executeSegment`, type `RuleGroup` | `whatsapp_broadcast.ts:21,157` | SEGMENT |
| `validateRuleGroup` (`lib/segments/ruleValidation.ts`) | `:22,146` | SEGMENT |
| `loadSegmentRuleGroup` (`lib/segments/resolveSegment.ts:24`, reads `segments`) | `:23,150` | SEGMENT |
| `resolveContactIdsWithAllTags` (`lib/tagAudience.ts`) | `:24,165` | TAG (shared with SMS/email, not a Segment file) |
| FK `whatsapp_broadcast_campaigns.segment_id -> segments(id) ON DELETE SET NULL` | migration `:27` | SEGMENT table |

**Segment-owned paths (do not touch):** `src/app/actions/segments.ts`, `src/app/segments/*`, `src/lib/segments/*`, `src/lib/intelligence/SegmentationCompiler*`, `src/components/crm/SegmentRuleBuilder*`, `src/app/actions/segmentAudienceSmsWa.test.ts` (test, B-adjacent), migrations `20260730000002`, `20260808000002`, `20260921000001/2/4/6`.

**Reverse coupling (Segment code reads WhatsApp):** `lib/segments/dependents.ts:38-42` selects `whatsapp_broadcast_campaigns(id,name,status,segment_id)` filtered to `draft/scheduled/sending`; `lib/segments/reach.ts:9,21-29` and `segments.ts:28` compute a "WhatsApp reach" that is just the SMS gate; `SegmentsClient.tsx:181` displays it. **Contract:** Broadcast must keep those columns and treat `draft/scheduled/sending` as the "live" set, or the Segment delete warning silently stops covering WhatsApp. A new `paused` state is invisible to it until a Segment-owner one-line change.

### C.4 Conflict detail for every C and S item

| Item | B-side consumers | H-side consumers | Exact functions/tables | Last-touch | Risk and reason |
|---|---|---|---|---|---|
| `webhooks/meta/route.ts` (S) | none today; needs statuses, `template_status_update`, reply attribution | `handleWhatsAppMessage :758`, `maybeSendWhatsAppAutomatedReply :972`, `processInboundComplianceAndWindow :258`, status loop `:219-239` | `platform_connections`, `contacts`, `conversations`, `messages`, `webhook_dead_letters`, `whatsapp_bot_rules`, `sms_suppression_list` | d08ea2e0 10-02, 16 commits ever | **High.** 1041 lines, 3 channels; only `field === 'messages'` handled (`:212`), so every new field edits the same function; no unit tests (directory holds only `route.ts`); Hub Batch 0/1 rewrites it |
| `actions/messaging.ts` (S) | none | `getConversations :255`, `sendMessage :294` (guard `:320`), notes, assignment, quick replies, `updateContactConsent :835` | `conversations`, `messages`, `contacts`, `message_dispatch_queue` | d08ea2e0, ef3d51ee 10-02 | **High.** 1263 lines mixing connect (C: `getMetaAuthUrl :22`, `connectPlatformManually :133`, `disconnectPlatform :220`, `saveMetaConnections :1064`) with Hub; 13 commits in 33 days |
| `MetaAdapter.ts` (S) | worker `sendWhatsApp`/`sendWhatsAppTemplate`; needs template components | `dispatchOutboundMessage :131`, voice note | Graph `v18.0` hard-coded at `:110,161,210,245,281,306,370` | d08ea2e0 10-02 | **High.** One class for every channel; Broadcast needs header/button params, Hub needs media/context/reactions |
| `whatsappSendGuard.ts` (S) | none (worker has an inline copy `route.ts:98-155`) | `messaging.ts:320` only | `conversations`, `contacts`, `getSmsOptOutReason` | d08ea2e0 | **Med.** Becomes the policy function; additive wrapper avoids edits |
| `smsOptOut.ts` + `optOutKeywords.ts` (S) | worker `:119`; `resolveAudience` reads `sms_suppression_list` directly `:191-198` | guard `:41`; webhook `applyWhatsAppKeyword :739` | `getSmsOptOutReason`, `recordSmsOptOut`, `clearSmsOptOut`; `sms_suppression_list`, contact flags | d619cfde 09-22 / d08ea2e0 | **Med.** Also serves Twilio SMS (`sms.ts:66`, Bulk SMS), so a semantic change hits a third product |
| `phone.ts` + SQL `normalize_phone_e164` + `phone.vectors.ts` (S) | worker `:133`; audience `phone_e164` | webhook `:798` | TS and SQL must stay byte-equal (shared vectors) | 7ef15811 09-21 | **Med.** Tiny but both tracks need non-SA support; must change TS+SQL+vectors in one commit by one owner |
| `whatsappWindow.ts`, `deliveryStatus.ts`, `sendFailureClass.ts`, `payloadSummary.ts` (S) | worker (window); should adopt failure class | thread, guard, webhook | pure helpers | 09-04 / 10-02 | **Low** |
| `sms.ts` (S) | none | none | `sendSMS` gate, Twilio `whatsapp:` | d08ea2e0 | **Med** (A path funnels through it) |
| `voiceNoteWhatsApp.ts` (S) | none | `messaging.ts:577` | `MetaAdapter.sendWhatsApp` | 0fd9f6d8 06-23 | **Low** |
| `contacts` table (S) | audience, worker | webhook creates contacts (`:830-838`, no consent set, DB default `opted_in=true`), `ContactInfoPanel` toggle | consent columns absent | n/a | **High.** Every module writes it; adding consent columns and default semantics touches Forms, CSV import, webhook, Hub toggle |
| `conversations`/`messages` (S) | worker reads `conversations.last_customer_message_at` (`:79-84`) | everything; realtime publication | | | **Low if Broadcast is read-only, High if it writes** (realtime flood, notification trigger per project memory, health cron counts `messages`) |
| `platform_connections` + connect cluster (C): `auth/meta/callback/route.ts`, `metaDiscovery.ts`, `subscribeWebhook.ts`, `ConnectPlatformsModal.tsx`, `IntegrationsList.tsx` | create check `:223`, picker `:78`, worker `:64-68` | `sendMessage`, `getConnectedPlatforms` (ships `credentials` JSON to the browser, HUB-I3), webhook lookup `:764` | two token key shapes: `access_token_encrypted` (OAuth/discovery) vs `system_user_access_token_encrypted` (wizard); readers disagree (`MetaAdapter` vs picker vs HUB-C2 media reader) | callback 4 commits since 09-01; modal 2; discovery 1 | **High.** Embedded Signup (HUB Batch 3) rewrites these; callback also serves IG/FB/YouTube/LinkedIn |
| `whatsappCredentials.ts`, `mockMode.ts`, `cloudApiHealth.ts` (C) | picker, create | connect | pure helpers | 09-24 / 10-02 / 09-29 | **Low** |
| `vercel.json` / `dashboard-nav.ts` (shared infra) | cron + nav entry | cron + nav | | 12 / 11 commits since 09-01 | **Med.** Add entries in their own commits |

**Top 5 conflict files:** `webhooks/meta/route.ts`, `actions/messaging.ts`, `lib/meta/MetaAdapter.ts`, the `contacts` consent/opt-out cluster (`smsOptOut.ts` + `phone.ts` + the table), the connect cluster (`ConnectPlatformsModal.tsx` / `metaDiscovery.ts` / `auth/meta/callback/route.ts`).

---

## D. Shared contracts (Part 4)

| # | Concern | Current state | Owner | Other side may assume | Smallest additive change |
|---|---|---|---|---|---|
| 1 | Connection resolver | Each caller queries `platform_connections` and reads credentials JSON itself; two token key shapes; one number per workspace | Foundation (F2) | `resolveWhatsAppConnection(db, workspaceId, {numberId?})` returns `{numberId, phoneNumberId, wabaId, token(), status, mock}`; never read `credentials` directly | New `src/lib/whatsapp/connection.ts` wrapping today's row (zero behaviour change); callers migrate one by one; later swap to `whatsapp_numbers` invisibly |
| 2 | Embedded Signup, registration, subscription | Missing (HUB-D2, D7). Subscription exists (`subscribeWebhook.ts`) | Foundation (F6), built by one person, not by either track | A connection row appears with `status='connected'`; the resolver hides how | New files for the SDK flow, `/register`, field subscription; mock flow returns fake `{waba_id, phone_number_id, code}`. Live DEFERRED (Tech Provider) |
| 3 | Webhook split | One file, behaviour in module-level functions | Foundation (F1) | Handlers receive parsed `change.value` and a context `{workspaceId, phoneNumberId}` | See D.1 |
| 4 | Status fan-out | Updates `messages` only (`:219-239`), no rank, no workspace scope | Foundation owns the fan-out, each side owns its sink | One status event updates every sink; replays are no-ops | See D.2 |
| 5 | Send policy | 4 divergent copies: Hub guard, worker inline, reminder inline (`whatsappReminder.ts:61`), none for bot/reputation/voice | Foundation (F4) | `evaluateWhatsAppSend(...)` returns allow/mode or a typed block code | See D.3 |
| 6 | Opt-out and suppression | Unified list + flags; SMS STOP also blocks WhatsApp (migration 20260823000002); Meta STOP now via `recordSmsOptOut` (batch 1); FB/IG still write flags directly (`route.ts:289-320`); Hub toggle writes `opted_in` with no evidence (`messaging.ts:835`) | Foundation (`smsOptOut.ts`) | Only `getSmsOptOutReason`/`recordSmsOptOut`/`clearSmsOptOut` decide; never write flags directly | Add optional `channel` column later; route `updateContactConsent` through these helpers |
| 7 | Phone normalization and dedup | SA default only; `wa_id` has no `+`; no `libphonenumber`; no unique index on `(workspace_id, phone_e164)` (live: 0 duplicate groups in 93 contacts, 5 contacts with a phone but null E.164) | Foundation (F3) | `normalizePhone(raw, {defaultCountry})` and SQL overload give the same answer | Add the parameter and SQL overload in one commit with new vectors; do not add a unique index until Decision 6 |
| 8 | Consent fields | None for WhatsApp; webhook and import contacts inherit `opted_in=true` | Foundation (F3) migration, writers per side | `whatsapp_opt_in_status` in `unknown/granted/revoked`; `unknown` never receives marketing | Additive columns, existing rows backfilled `unknown`; webhook insert and CSV import set `unknown` explicitly |
| 9 | Shared table changes | See D.4 | per table | | one migration at a time |
| 10 | Broadcast sends vs Hub | Broadcast writes no `messages`/`conversations` | Broadcast (read-only toward Hub) | Hub sees a broadcast only when the recipient replies | See D.5 |
| 11 | Usage metering | None | Foundation owns table + sink; Broadcast owns plan gating | Hub emits wamids as usual | See D.6 |
| 12 | Twilio vs Meta | Automations use Twilio (`actions_registry.ts:247`); Twilio inbound creates `sms` conversations | Automation step after F4 and B3, not Broadcast | Broadcast never touches automation steps | New step `send_whatsapp_meta` through the policy function; retire Twilio step later |
| 13 | Broadcast audience resolver | `resolveAudience` is private to the action (`:133`), segment-centric | Broadcast | One function returns recipients plus an exclusion breakdown | See D.7 |

### D.1 Webhook layout (no behaviour change)

```
src/app/api/webhooks/meta/route.ts            thin: GET verify, signature, parse, summarize, call dispatch (<=120 lines)
src/lib/meta/webhook/dispatch.ts              object + field -> handler table
src/lib/meta/webhook/shared.ts                isValidMetaSignature, recordConnectionNotFound, processInboundComplianceAndWindow
src/lib/meta/webhook/facebook.ts, instagram.ts  moved verbatim
src/lib/meta/webhook/whatsapp/messages.ts     Hub: handleWhatsAppMessage, applyWhatsAppKeyword, bot reply trigger
src/lib/meta/webhook/whatsapp/statuses.ts     Foundation: fans out to sinks
src/lib/meta/webhook/whatsapp/templateStatus.ts   Broadcast (new, `message_template_status_update`)
src/lib/meta/webhook/whatsapp/accountUpdate.ts    Connection (new, `account_update`)
```
Feasible: the handlers are already module-level functions sharing only the `supabase` client constant (`route.ts:17`). Do it as its own commit, replay a golden payload set through `scripts/db-checks/whatsapp-batch1.live.test.ts` before and after, and land it before either track edits the route.

### D.2 One status event, two sinks (design only)

`statuses.ts` calls an ordered sink list `[hubSink, broadcastSink, usageSink]`, each in its own file and each monotonic and idempotent on its own, so nobody edits another side's SQL.
- Rank: `queued 0, sending 1, sent 2, delivered 3, read 4`. `failed` is accepted only from rank <= 2; `delivered/read` after `failed` is ignored and logged.
- `wa_apply_status_to_messages(wamid, status, ts, err_code, err_msg)`: `UPDATE messages SET status=…, metadata = metadata || jsonb_build_object(...) WHERE external_id = wamid AND rank(new) > rank(status)` (merge, never overwrite, fixes HUB-C7).
- `wa_apply_status_to_queue(...)`: same rule on new `whatsapp_dispatch_queue.delivery_status` (do **not** reuse `status`, which the worker and `refresh_whatsapp_campaign_totals` use for workflow state), then call `refresh_whatsapp_campaign_totals`.
- Race: Meta can deliver a status before the worker records `whatsapp_message_id`. Append every event to `whatsapp_status_events(wamid, status, ts, payload, UNIQUE(wamid, status))` and have the worker's end-of-batch step reconcile unmatched events. Needs a partial index on `whatsapp_dispatch_queue(whatsapp_message_id)`.

### D.3 Send policy

`src/lib/whatsapp/policy.ts`: `evaluateWhatsAppSend(db, {workspaceId, contactId|phone, intent: 'service'|'marketing'|'utility'|'authentication', conversationId?, template?})` -> `{allow:true, mode:'free_text'|'template'}` or `{allow:false, code}` with codes `opted_out, invalid_number, no_consent, window_closed_no_template, template_not_approved, connection_unhealthy, quota_exceeded, tier_cap`. Fail closed on lookup errors (as today, `whatsappSendGuard.ts:42-46`). It reuses `getSmsOptOutReason` and `isWithinWhatsAppSessionWindow`; `checkWhatsAppSendAllowed` becomes a thin wrapper so the Hub needs no edit; the worker, reminder, reputation and bot reply adopt it one at a time.

### D.4 Shared tables, owners and order

| Table | Who may migrate | Change |
|---|---|---|
| `contacts` | Foundation only | consent columns (F3) |
| `sms_suppression_list` | Foundation only | optional `channel` |
| `platform_connections` / future `whatsapp_numbers` | Foundation only | F6 |
| `messages`, `conversations` | Hub only | Hub Batch 0 columns (`provider_timestamp`, `source` incl. `'broadcast'` reserved) |
| `whatsapp_status_events`, usage table | Foundation | F5 |
| `whatsapp_broadcast_campaigns`, `whatsapp_dispatch_queue`, templates, lists | Broadcast only | B-batches |

Order: **one migration at a time, apply, verify with a read-only query, then the next.** Latest migration today is `20261002000001`. Sequence: F3 contacts -> F5 events -> B1 -> B3 -> B5a/B6 -> B8. Use `IF NOT EXISTS`; none applied by this audit.

### D.5 Broadcast sends and the Hub

Recommend **no** `messages`/`conversations` rows for outbound broadcasts. Reasons: realtime publication floods the inbox; the unread/notification trigger fires on `messages` inserts (from project memory, not re-verified here); `message-delivery-health` counts `messages` outbound (`route.ts` select) and would be distorted; a conversation row is required per row. The queue stays the source of truth. A reply to a broadcast arrives through the normal inbound path (which opens the 24h window); attribution uses the inbound `context.id` matched to `whatsapp_dispatch_queue.whatsapp_message_id` through a one-line hook in the Hub's `messages.ts` that calls a Broadcast-owned function.

### D.6 Usage metering

New `whatsapp_usage_events(workspace_id, number_id, wamid UNIQUE, category, billable, pricing_model, source, campaign_id, delivered_at)`, written by `usageSink` on `delivered`. Whether the status webhook carries a `pricing` object is **unverified** (docs not fetched). The existing `credit_ledger` is booking credits and `ai_usage_credits` is AI; neither fits. Free service-message allowance (1,000 per number per month from 2026-10-01) is a monthly view over this table.

### D.7 Independent audience resolver

Location: `src/lib/whatsapp/audience/resolveBroadcastAudience.ts` (new directory, no path contains "segment").

```ts
type AudienceSource =
 | { type: 'all_contacts' }                               // renamed 'all_opted_in' once consent lands
 | { type: 'tags'; tags: string[]; mode: 'all' | 'any' }
 | { type: 'contact_fields'; filters: FieldFilter[] }     // own small filter over contacts columns
 | { type: 'csv'; rows: { phone: string; name?: string; vars?: Record<string,string> }[]; importId: string }
 | { type: 'manual'; numbers: string[] }
 | { type: 'saved_audience'; segmentId: string };         // OPTIONAL
// returns { recipients: {contactId|null, phoneE164, name, vars, source}[],
//           exclusions: { no_consent, opted_out, invalid_number, missing_phone, duplicate, suppressed },
//           counts, snapshotHash }
```
Contract: server-only, workspace-scoped, no writes, fail closed. The Segment option calls exactly the read-only functions the action calls today (`loadSegmentRuleGroup`, `validateRuleGroup`, `SegmentationCompiler.executeSegment`); Segment code never calls the resolver. Tags reuse `resolveContactIdsWithAllTags`. Dedup key is `phoneE164`. Needs `whatsapp_dispatch_queue.contact_id` made nullable plus `phone_e164`, `recipient_name`, `variables` (B1 SQL below), because CSV and pasted numbers are not contacts.

---

## E. PRD assignment (Part 5)

PRD text not available. Section numbers are from the brief; other rows are by topic. "Owner" per class letters; Neither = not a build item.

| PRD § / topic | Owner | Status | Evidence |
|---|---|---|---|
| §13 CSV import and import report | B (audience) + S (contacts) | **Partial** | CRM CSV import exists (`ImportContactsModal/index.tsx`, `CSVUploadTab.tsx`): per-row `createContact` loop, result is one toast "Sync success: N. Failures: M" (`index.tsx:~105`), no per-row report; consent is a generic POPIA checkbox stamped `consentTimestamp: now` (`:92`), not WhatsApp opt-in. No WhatsApp CSV audience |
| §23 audiences (CSV, manual, static list) | B | **Missing** (segment/rule/tag only) | B.3; queue `contact_id NOT NULL` |
| §24 exclusion breakdown | B | **Partial** | only `excludedOptOut` counted and persisted (`total_skipped_opt_out`); missing/invalid phone silently dropped (`:201`); no consent/duplicate counts |
| §30 timezone storage | B | **Missing** | `scheduled_at timestamptz`; UI `datetime-local` parsed in the browser's zone (`Client:180`); no `timezone` column, no label (WA-6.1); `contacts.timezone` exists, unused |
| §31 campaign states | B | **Partial** | DB CHECK: draft, scheduled, sending, completed, failed, cancelled; code writes only scheduled/completed/failed/cancelled; no paused/queued; `completed` even with failures unless zero sent (`route.ts:208`); cancel marks rows `failed` (`action:311-315`) and the totals RPC cannot tell them apart |
| §56 audience snapshot | B | **Partial** | queue rows freeze the recipient ids, but the audience definition is not stored (`segment_id` only, `rule_group` only for ad-hoc), no counts/hash; deleting a contact cascades the queue row away |
| §68 audit events | S + B | **Missing** | `workspace_audit_logs` exists, **0 rows**; writer `WorkspaceAuditEngine.ts:17`; callers `governance-workspace.ts`, `settings.ts`, `complianceStr.ts`; none emits a WhatsApp event; `form_audit_logs` is form-only |
| §73-74 WhatsAppPolicyService | S | **Partial** | four divergent copies (D row 5); no single service |
| §90 one sending system | A | **Missing** | Twilio vs Meta, WA-10.1, HUB gap 14 |
| Six PRD roles vs real model | S | **NOT ASSESSED** (PRD roles unknown) | App has `workspace_members.role` CHECK = admin, member, client, viewer, hr, payroll, compliance, plus owner semantics and 11 module keys (`modules.ts`). Broadcast gate is module `marketing` on create/cancel only (`action:210,294`); list/delete/picker rely on RLS; connection management admin/owner via RLS; no per-action roles (approver, template manager, analyst) |
| Contact WhatsApp panel/button on CRM contact | B/H | **Missing** | grep: no WhatsApp reference under `src/app/contacts` or `src/components/crm` except a consent-link channel picker (`ComplianceTab.tsx:713`) |
| Nav routes vs PRD routes | B | **Partial / PRD routes not assessed** | only `/whatsapp-broadcasts` (`dashboard-nav.ts:45`); no templates, audiences, analytics or settings routes; Hub hides WhatsApp (`ConversationsClient.tsx:28`) |
| Usage/metering tables | S | **Missing** | no messaging usage table; `credit_ledger` (booking) and `ai_usage_credits` (AI) are unrelated |
| Correlation IDs in logs | S | **Missing in WhatsApp paths** | helper exists (`src/shared/logger/requestId.ts`) but grep finds no use in webhook, worker, actions |
| Health and alerts | H + C | **Partial** | `message-delivery-health` watches `messages` only, so broadcasts are invisible; no token-expiry, quality or tier monitor (HUB-D11, D12) |
| Template management | B | **Missing** | WA-5.2; only `GET message_templates` (`action:112`) |
| Consent / opt-in | S | **Missing** | WA-3.1; `opted_in` default true |
| STOP handling | S | **Done in code, live DEFERRED** | `applyWhatsAppKeyword :739` via `recordSmsOptOut` (batch 1, supersedes WA-3.5/3.6) |
| Send engine: throttle, retries, double-send, cancel | B | **Partial/Missing** | WA-6.2 to 6.5; marker only on SMS (`20260921000014:83`) |
| Delivery/read/failed into campaigns | B + S | **Missing** | WA-7.1 |
| Analytics, per-recipient report | B | **Partial / Missing** | WA-7.3, 7.4 |
| Billing / plan gating | B | **Missing** | WA-11.1, 11.2 |
| Embedded Signup, registration | C | **Missing** | HUB-D2, D7 |
| Inbound, media, thread, unread (inbox) | H | not Broadcast scope | HUB rows C1-C26 |
| Tenant isolation / RLS | S | **Done** | WA-12.1, 12.2 |

---

## F. Proposed Broadcast batches (Part 6)

All SQL below is **proposed and NOT applied**. Effort S/M/L. "Hub risk" = chance of merge conflict with Hub work.

### Foundation steps (not Broadcast-owned, listed for ordering)

| Step | What | Owner |
|---|---|---|
| F0 | Push/merge `wa-batch1`; commit reports (A.4) | you |
| F1 | Webhook split (D.1) | one person, likely the Hub dev |
| F2 | Connection resolver wrapper (D row 1) | same |
| F3 | Consent columns + phone normalization + `updateContactConsent` rerouted | same |
| F4 | `policy.ts` | same |
| F5 | Status sinks + `whatsapp_status_events` + usage table | same |
| F6 | Embedded Signup + `whatsapp_numbers` (HUB Batch 3). **Foundation-owned.** Live DEFERRED until Tech Provider approval; build in mock mode | same, not either track |

### B1 Audience builder (decoupled from Segments)

- **Scope:** resolver (D.7); audience UI with types All contacts / Tags / Contact fields / Upload CSV / Paste numbers / Saved segment (shown only if any exist); dry-run preview with exclusion breakdown; persist `audience_snapshot`; Segment becomes optional.
- **UI change that removes the Segment requirement:** in `WhatsappBroadcastsClient.tsx` delete `disabled={segments.length === 0}` (`:223`), the notice (`:228-232`), the gated empty-state action (`:240`) and the `!formSegmentId` check (`:169`); replace the select (`:296-305`) with the audience-type control. `page.tsx` drops the eager `listSegments()` call (it computes a live count per segment); the dropdown loads lazily through a Broadcast-owned action that selects `id,name` from `segments` (read-only). Server action keeps accepting `segmentId`/`ruleGroup`/`tags` for backward compatibility (`segmentAudienceSmsWa.test.ts` keeps passing).
- **TOUCH:** `src/app/actions/whatsapp_broadcast.ts`, `src/app/whatsapp-broadcasts/*` (split `BroadcastsView.tsx` / `RepliesView.tsx` out of the client file), new `src/lib/whatsapp/audience/*`, `src/app/api/cron/workers/whatsapp-dispatch/route.ts` (read recipient phone/vars from the queue), new B migrations.
- **FORBIDDEN:** every Segment path in C.3, plus `webhooks/meta/route.ts`, `messaging.ts`, `MetaAdapter.ts`, `smsOptOut.ts`, `phone.ts`, all Hub files.
- **SQL:**
```sql
alter table public.whatsapp_broadcast_campaigns
  add column if not exists audience_type text,
  add column if not exists audience_definition jsonb,
  add column if not exists audience_snapshot jsonb,  -- {resolvedAt, counts, exclusions{...}, hash}
  add column if not exists timezone text;
alter table public.whatsapp_dispatch_queue
  alter column contact_id drop not null,
  add column if not exists phone_e164 text,
  add column if not exists recipient_name text,
  add column if not exists variables jsonb,
  add column if not exists recipient_source text;
create unique index if not exists whatsapp_queue_campaign_phone_key
  on public.whatsapp_dispatch_queue (campaign_id, phone_e164) where phone_e164 is not null;
create table public.whatsapp_audience_lists (id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces on delete cascade, name text not null, created_by uuid, created_at timestamptz default now());
create table public.whatsapp_audience_list_members (list_id uuid references public.whatsapp_audience_lists on delete cascade, phone_e164 text not null, name text, variables jsonb, consent_status text not null default 'unknown', consent_source text, consent_evidence jsonb, primary key (list_id, phone_e164));
```
- **Honesty note:** before F3, "All contacts" can only exclude opted-out/suppressed numbers, which reproduces WA-3.1. Label it "All contacts (not opted out)" and require an attestation checkbox until B2.
- **Prerequisites:** none external. **Mock acceptance:** a workspace with 0 segments creates and sends a campaign with each audience type under `META_MOCK_MODE=true` (real session, per the repo's live-test rule); exclusion counts match fixtures; a failed queue chunk still rolls back. **Live:** DEFERRED. **Diff gate:** `git diff --name-only <base>..HEAD | grep -i segment` is empty and `git diff <base>..HEAD -- src/lib/segments src/app/segments src/app/actions/segments.ts src/lib/intelligence src/components/crm/SegmentRuleBuilder*` is empty.
- **Hub risk: Low** (no shared file). **Effort: M-L.**

### B2 Consent model (needs F3)
Filter on `whatsapp_opt_in_status='granted'`; CSV/list attestation stored as evidence; renames "All contacts" to "All opted-in". SQL (Foundation owns it): `alter table contacts add column whatsapp_opt_in_status text not null default 'unknown' check (whatsapp_opt_in_status in ('unknown','granted','revoked')), add column whatsapp_opt_in_at timestamptz, add column whatsapp_opt_in_source text, add column whatsapp_opt_in_evidence jsonb;`. TOUCH: resolver, B1 UI. FORBIDDEN: webhook, `messaging.ts`. Mock: unknown contacts excluded and counted. Hub risk **Low**. **S-M.** Cost note: day-one audiences shrink to zero for existing contacts (Decision 6).

### B3 Template management
Scope: create/submit via Message Templates API, status sync by cron plus `templateStatus.ts` handler, versions, `{{n}}` and named-variable mapping UI, header media upload, buttons, language picker, picker keyed by name+language (WA-5.3).
```sql
create table public.whatsapp_templates (id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces on delete cascade, waba_id text, meta_template_id text, name text not null, language text not null, category text, status text, quality text, components jsonb, variable_map jsonb, version int not null default 1, rejected_reason text, last_synced_at timestamptz, created_by uuid, created_at timestamptz default now(), unique (workspace_id, name, language, version));
```
TOUCH: new `src/lib/whatsapp/templates/*`, new `src/lib/meta/whatsappTemplateClient.ts` (sibling of `MetaAdapter`, not an edit), picker action, `webhook/whatsapp/templateStatus.ts` (after F1). FORBIDDEN: `MetaAdapter.ts` edits, `webhooks/meta/route.ts`. Prerequisites: Tech Provider/management permission, approved WABA, payment method. Mock: canned APPROVED/REJECTED responses; live DEFERRED. Hub risk **Med** (needs F1 first; `MetaAdapter` template-component send is one additive commit by the foundation owner). **L.**

### B4 Campaign wizard and compliance step
Stepper (audience -> content -> schedule with timezone -> compliance -> review). Compliance step stores `compliance_ack jsonb {userId, ts, textVersion}`: consent attestation, opt-out instruction present, marketing-template category, quiet hours, per-contact frequency cap. Writes audit events through `WorkspaceAuditEngine`. TOUCH: `src/app/whatsapp-broadcasts/*`, `whatsapp_broadcast.ts`. Hub risk **Low.** **M.**

### B5a Send engine hardening, B-only part
Send marker (`send_started_at`, `attempt_id`, set by a conditional UPDATE before the Graph call, mirroring SMS `20260921000014:83`); a `processing` row with a marker and no wamid becomes `unknown_outcome`, never re-sent (Meta has no idempotency key; reclaim today re-sends after 5 min, `20260920000001`); set `sending` at first acquire; `paused`/resume; cancel writes `cancelled` rows and the totals RPC counts them separately; acquire joins campaign status so cancelled/paused rows are never picked up; per-workspace round-robin in `acquire_whatsapp_jobs` (today `ORDER BY scheduled_for` is global); error-code classification using `sendFailureClass` instead of the regex (`route.ts:162`); `maxDuration` export; concurrency inside a run.
```sql
alter table public.whatsapp_dispatch_queue add column if not exists send_started_at timestamptz, add column if not exists attempt_id uuid, add column if not exists error_code text;
alter table public.whatsapp_broadcast_campaigns drop constraint if exists whatsapp_broadcast_campaigns_status_check;
-- re-add including 'paused' (constraint name to be confirmed against the live DB first)
```
Contract flag: `paused` is invisible to `dependents.ts` until the Segment owner adds it. TOUCH: worker, `whatsapp_broadcast.ts`, B migrations. FORBIDDEN: `MetaAdapter.ts`, `smsOptOut.ts`. Hub risk **Low.** **M.** Mock: 4 concurrent workers, forced crash after marker, assert no duplicate send and `unknown_outcome` rows.

**Throughput math (current):** 50 rows x 12 runs/hour = 600/hour = 14,400/day for **all tenants combined**. 1,000 recipients ~1.7 h; 10,000 ~16.7 h; 100,000 ~6.9 days. Unverified-portfolio cap (~250 business-initiated/24h) is never the binding limit; tier 100K/day needs ~1.2 msg/s sustained, roughly 8x today's lane. The worker is serial and has no `maxDuration`. Cloudflare cron/subrequest limits are DEFERRED (to verify before the migration; no new Vercel dependency added).

### B5b Tier-aware throttling and dead letters (needs F2, F5)
Read `messaging_limit_tier` and `quality_rating` per number, enforce a rolling-24h business-initiated cap from the usage table, 130429 backoff, `dead` status after max attempts with `error_code`, an admin list. Hub risk **Low-Med.** **M.**

### B6 Delivery receipts into campaigns (needs F5)
`delivery_status`, `delivered_at`, `read_at`, `failed_at` on the queue; extend `refresh_whatsapp_campaign_totals` with delivered/read counters (a B-owned RPC, separate from the SMS one); act on 131050 by recording a marketing opt-out. TOUCH: queue migration, `broadcastSink`. FORBIDDEN: the Hub sink. Hub risk **Low.** **M.**

### B7 Analytics and per-recipient report
Page `/whatsapp-broadcasts/[id]`; the queue has no user policy, so reads go through a module-guarded server action with the admin client (or add an RLS select policy plus the restrictive `module_access` policy). Funnel: audience, excluded (by reason), sent, delivered, read, failed (by code), replied (via `context.id`), opted-out-after. Hub risk **Low.** **M.**

### B8 Usage metering and plan gating (needs F5)
Estimate before enqueue and gate in the worker against plan allowance; show estimated Meta cost (the customer pays Meta directly, so this is an estimate). Decision 9. Hub risk **Low.** **M.**

### B9 Roles, audit, observability hygiene
`requireModuleAccess` on list/delete/picker; emit `workspace_audit_logs` events for the PRD §68 list; `requestId` in the worker and actions; broadcast failure rate into the health cron through a separate query (not by editing the Hub query). Hub risk **Low.** **S-M.**

### Recommended order

1. **F0** immediately; **B1** can start the same day (touches no foundation file).
2. In parallel, one person does **F1 -> F2 -> F3 -> F4 -> F5**. Hub work must not edit `handleWhatsAppMessage` before F1 lands, and the Hub's Batch 0 `wa_ingest_message` should land inside `whatsapp/messages.ts`.
3. **B5a** right after B1 (B-only files), then **B2** (after F3), **B3** (after F1+F2), **B5b/B6/B8** (after F4/F5), **B4, B7, B9** last. **F6** is foundation-owned and can run any time; it is the only step that needs Meta approval to be proven live.

---

## G. Decisions you must make (Part 7)

| # | Decision | Recommendation | Cost of choosing wrong |
|---|---|---|---|
| 1 | Who owns the webhook route | Foundation owner = the Hub developer (about 70% of the handlers are Hub) | three tracks editing a 1041-line file; silent production webhook regressions |
| 2 | Split the webhook first | Yes, behaviour-preserving, with golden-payload replay | about a day of delay against weeks of conflicts |
| 3 | Do broadcast sends appear in the Hub | No outbound rows; show replies only (D.5) | later reversal needs a queue backfill; realtime flood, health-cron distortion |
| 4 | One number or many per workspace | Contract takes an optional `numberId` now; ship one number; table in F6 | campaigns keyed only by workspace need a column plus backfill later (cheap now, costly later) |
| 5 | Unified vs per-channel opt-out | Keep unified for V1 (stricter, current behaviour); add `channel` later | splitting later risks re-subscribing people who sent STOP |
| 6 | Existing contacts' consent | Backfill `unknown`; no marketing until granted | grandfathering exposes you to WA-3.1 and POPIA; strict means empty audiences on day one |
| 7 | CSV/pasted numbers: contacts or ephemeral recipients | Ephemeral (queue-level), with optional "save as contacts" later | creating contacts pollutes the CRM and inherits `opted_in=true`; ephemeral adds worker/report complexity |
| 8 | **Keep a saved Segment selectable as an audience option** | **Yes, optional, read-only.** | Dropping it: users lose reuse of rules they built; `segment_id` becomes dead and the Segments delete-warning (`dependents.ts:38`) never covers WhatsApp; `segmentAudienceSmsWa.test.ts` and 3 live scripts break. Data impact today is tiny (1 segment in the whole DB) but the product impact is not |
| 9 | Plan gating metric and who pays | Message-count allowance per plan; Meta bills the customer directly | wrong metric forces a metering rewrite |
| 10 | `paused` state needs a Segment-owner change | Ask the Segment owner for the one-line `LIVE_BROADCAST_STATUSES` update | paused campaigns not warned on segment delete |
| 11 | Template creation in-app vs link-out | In-app (B3), live gated on Tech Provider | link-out keeps the WA-5.2 gap |
| 12 | Graph version | One constant, move off v18 (pinned in 7 `MetaAdapter` sites; `subscribeWebhook.ts` uses v25) | mixed versions break template and receipt fields unpredictably |
| 13 | PRD | Put it in the repo root | Part E stays partly NOT ASSESSED |

---

## H. VERIFIED vs NOT ASSESSED / DEFERRED

**Verified (evidence):**
- Git: branch, status, ancestry, ahead/behind counts, unpushed commits, no `hub-hotfix`, per-file history (Part A).
- Code reads with file:line for the page, client, action, worker, webhook, guard, opt-out, phone, adapter, segment helpers (Parts B-D).
- Read-only live DB queries: 2 WhatsApp connections (both `connected`); 0 campaigns, 0 queue rows, 0 bot rules, 0 WhatsApp conversations; 1 segment in the whole database and 0 for each WhatsApp workspace; `workspace_audit_logs` 0 rows; `contacts.opted_in` default `true`; `phone_e164` generated; 93 contacts, 5 with a phone but null E.164, 0 duplicate-phone groups; RLS policy list for the four WhatsApp tables; `messages.status` and `direction` CHECKs; `platform_connections` constraints; `workspace_members.role` CHECK; no unique index on `whatsapp_message_id`.
- Greps: no `x-forwarded-for`, `waitUntil` or `VERCEL_` in the WhatsApp/Meta/messaging paths, so Broadcast adds none; no `libphonenumber`; no template tables; no usage tables.
- File-class counts come from the Part C table (93 files).

**NOT ASSESSED or DEFERRED:**
- **The PRD** (not on disk); roles, routes and every PRD-wording-dependent row.
- Anything needing real Meta: Embedded Signup v4, registration, template create/sync, real sends, receipts, tier/quality, pricing object in status webhooks (unverified), Cloud API throughput. Reason: Tech Provider approval pending.
- Cloudflare Workers limits (cron granularity, subrequests).
- Browser/visual checks, and I ran no unit or live test suite (live suites write data; this audit is read-only).
- Claims taken from project memory and not re-read: the `messages` INSERT notification trigger, Hub realtime behaviour.
- HUB-section claims (media token key, webhook timing) are cited, not re-run.

---

## I. Searched and found nothing

- The client PRD file (repo root, `docs/`, Downloads, Documents, `C:\tmp`, PDF text for "WhatsAppPolicyService" and "Business Messaging").
- A `hub-hotfix` branch, ref, commit message or reflog entry.
- Any WhatsApp audit-log event, or any row in `workspace_audit_logs`.
- Message-template create/submit/sync code or tables; `whatsapp_numbers` or any per-number table.
- Messaging usage/metering tables.
- A WhatsApp button or panel on the CRM contact.
- `libphonenumber` or a CSV-parse dependency in `package.json`.
- Correlation or request-id use in the webhook, worker or actions.
- An Inngest function for broadcast dispatch; a `maxDuration` export on the WhatsApp worker.
- A storage bucket for WhatsApp media.
- Any code writing campaign status `draft` or `sending`.
- A `send_started_at` marker on `whatsapp_dispatch_queue`.
- A caller of `checkWhatsAppSendAllowed` other than `messaging.ts:320`.
- Any other feature (Bulk SMS, email campaigns) that depends on the WhatsApp screen's Segment requirement: `listSegments` is called by `campaigns/page.tsx`, `campaigns/[id]/builder/page.tsx`, `segments/page.tsx`, `sms/page.tsx` and the WhatsApp page; SMS has its own gate in `SmsClient.tsx:101,166,181` and its own `resolveAudience` (`bulk_sms.ts:63`); email campaigns do not gate on segment count. The only importers of `createWhatsAppBroadcastCampaign` are the client, `segmentAudienceSmsWa.test.ts` and three live scripts. **Removing the requirement from the WhatsApp screen affects none of them**; the one reverse dependency is `dependents.ts:38` reading `segment_id`, which tolerates null.
