# Project-Wide Action-Layer Security Triage

Detection-only pass. No fixes applied in this document — every finding below is exactly as found, for prioritization and batching in follow-up prompts (the same way `quotes.ts`/`finance.ts` were fixed after their own triage).

**Method note on RLS backstops**: `createServerClient()` uses the anon key + the caller's session cookie, so Postgres RLS actually applies. `createAdminClient()` uses the service-role key and **bypasses RLS entirely** — any function using it has zero DB-level backstop no matter what policy exists. Where "RLS backstop: Y" is cited below, it means a real `CREATE POLICY` was found restricting the table to `workspace_members` (or equivalent) AND the function uses the non-admin client — so a stranger with no membership anywhere is blocked in practice, even though the app-layer code itself performs no check. This does not excuse the app-layer gap (a user who is a legitimate member of *some* workspace, or any caller if the policy turns out permissive, is not blocked), but it materially changes real-world exploitability and should inform fix priority.

## Summary

- Total files matching the pattern: **33** (re-confirmed via `grep -rl 'workspaceId: string|workspace_id: string|workspaceId?: string' src/app/actions` — identical to the prior pass's count, no drift)
- Total exported functions checked: **~274** (see per-file counts below; two files — `tasks.ts`, `shipments.ts` — had a 1-function discrepancy between the agent's stated header count and its own enumerated findings, flagged inline where it occurs rather than silently reconciled)
- (a) Safe: **46**
- (b) Weak (caller-trusted workspaceId, no membership check, but auth required): **73**
- (c) Critical (no real auth check at all, or a non-rejecting check): **116**
- (d) Confirmed safe by design: **39**

`quotes.ts` (7 functions) and `finance.ts` (21 functions) are **not** re-included in the tables below — both were already fully triaged and fixed in the prior CRM audit pass (all 28 functions now land in (a) or (d)) and are counted in the Summary totals above for completeness, not re-litigated here.

**Headline finding**: two whole subsystems are almost entirely unauthenticated at the app layer, not just "weak":
- Every `calendar/*` action file (`appointments.ts`, `core.ts`, `calendars.ts`, plus the standalone `calendar.ts`) shares a copy-pasted `executeAction()` wrapper that **never calls `supabase.auth.getUser()`** — it only checks a cookie is non-empty. `pipelines.ts`, built the same way conceptually, *does* call `getUser()`, which is why it lands in (b) instead of (c) despite the same missing-membership-check root cause.
- `messaging.ts` (23 functions, almost entirely conversational/messaging + Meta OAuth) has **zero** functions with any auth check.
- `builder.ts` imports `requireAuth` and never calls it (dead import) — its sibling files `builderAI.ts`/`builderDeploy.ts` do call an auth check in the same wrapper shape, so this is a copy-paste-drift bug, not an intentional design difference.

---

## Critical (c) — Fix Immediately, Regardless of Batch Order

| File | Function | What it exposes/allows | RLS backstop | Called from |
|---|---|---|---|---|
| `calendar/scheduling.ts` | `getRoundRobinAssignee(calendarId, workspaceId)` | Reads staff assignment via **admin client** (RLS bypassed) for a raw `workspaceId` param, zero auth check | N (admin client) | `calendar/appointments.ts:createAppointment`, `calendar/public.ts` |
| `calendar/scheduling.ts` | `updateRoundRobinStats(calendarId, userId)` | Writes booking-count stats via admin client, zero auth check | N (admin client) | `calendar/appointments.ts:createAppointment`, `calendar/public.ts` |
| `calendar/appointments.ts` | `getAppointments` | Reads `appointments` + `contacts` PII, no auth check (wrapper never calls `getUser()`) | Y (`appointments` workspace policy) | not directly wired to a page in this pass — verify |
| `calendar/appointments.ts` | `createAppointment` | Inserts `appointments`; fetches target `booking_calendars` row with **no workspace check**, can attach appointment to another workspace's calendar | N — `"Public insert access for appointments" WITH CHECK (true)` is fully open | `src/components/calendar/modals/BookingModal.tsx` |
| `calendar/appointments.ts` | `updateAppointment` | Updates `appointments`, no auth check | Y | calendar UI |
| `calendar/appointments.ts` | `deleteAppointment` | Deletes `appointments` (destructive), no auth check | Y | calendar UI |
| `calendar/appointments.ts` | `getAppointmentById(id)` | **No workspace filter in the query at all**; returns contact PII | Y (SELECT restricted, no public override) | `src/app/meet/[id]/page.tsx` (live) |
| `calendar/appointments.ts` | `logParticipantJoin(appointmentId, name, email)` | Fetches ANY appointment by id, no scoping/auth; inserts `meet_attendance_logs` | N — table policy is `USING (true)`, fully open | `src/app/meet/[id]/page.tsx` (live) |
| `calendar/appointments.ts` | `logParticipantLeave(logId)` | Updates `meet_attendance_logs`, cookie-only, no `getUser()` | N — same open policy | `src/app/meet/[id]/page.tsx` (live) |
| `calendar/appointments.ts` | `getMeetingAnalytics` | Reads `appointments` + `invoices.amount_paid` (financial), no auth check | Y | `src/app/workspaces/[id]/meet-analytics/page.tsx` (live) |
| `calendar/appointments.ts` | `createInstantMeeting` | Inserts `appointments`, no auth check | N — same open public INSERT policy | `src/components/calendar/InstantMeetClient.tsx` (live) |
| `calendar/core.ts` | `getCalendars` | Reads `booking_calendars`, no auth check | N in practice — table has a `FOR SELECT USING (true)` public-read policy | not found in `src/` — dead code |
| `calendar/core.ts` | `createCalendar` | Inserts `booking_calendars`, no auth check | Y for INSERT | not found in `src/` — dead code (superseded by `calendars.ts`) |
| `calendar/core.ts` | `updateCalendar` | Updates `booking_calendars`, no auth check | Y | not found — dead code |
| `calendar/core.ts` | `deleteCalendar` | Deletes `booking_calendars`, no auth check | Y | not found — dead code |
| `calendar/calendars.ts` | `createCalendar(payload)` | Inserts `booking_calendars`, no auth check, **spreads raw client payload with no field allow-list** | Y | `src/components/calendar/views/CalendarPagesView.tsx` (**live**) |
| `calendar/calendars.ts` | `updateCalendar(id, payload)` | Same, raw payload spread, no auth check | Y | `CalendarPagesView.tsx` (**live**) |
| `calendar/calendars.ts` | `deleteCalendar(id)` | Deletes `booking_calendars`, no auth check | Y | not found — dead code |
| `calendar.ts` | `getAppointments` | Duplicate of `appointments.ts` version, no auth check | Y | not found — dead code |
| `calendar.ts` | `createBooking` | Duplicate of `createAppointment`, no auth check | N — open public INSERT policy | not found — dead code |
| `calendar.ts` | `updateAppointmentStatus` | Updates `appointments.status`, no auth check | Y | `src/components/calendar/AppointmentsList.tsx` (**live**) |
| `calendar.ts` | `deleteAppointment` | Destructive delete, duplicate, no auth check | Y | not found — dead code |
| `calendar.ts` | `createOutcome` | Inserts `booking_outcomes` — drives pipeline/workflow routing (privilege-adjacent), no auth check | Y | `src/components/calendar/OutcomeManager.tsx` (**live**) |
| `calendar.ts` | `getCalendarOutcomes(calendarId)` | Query closure **ignores the wrapper's workspaceId entirely** — zero scoping of any kind | Y | not found — dead code |
| `calendar.ts` | `saveIntakeForm` | Upserts `booking_intake_forms`, `calendarId` not verified to belong to workspace, no auth check | Y | `src/components/calendar/IntakeFormBuilder.tsx` (**live**) |
| `calendar.ts` | `getIntakeForm(calendarId)` | Closure ignores workspaceId entirely, zero scoping | Y | not found — dead code |
| `calendar.ts` | `getComprehensiveCalendarAnalytics` | Reads `appointments` + `booking_slot_analytics` (business metrics), no auth check | Y | `src/app/calendar/analytics/page.tsx` (**live**) |
| `calendar.ts` | `getBookingAnalytics(workspaceId)` | **Classic pure IDOR** — raw `workspaceId` param used directly, ignoring the wrapper's own cookie gate, no auth check | Y | not found — dead code |
| `calendar.ts` | `getWaitlistEntries` | Reads `booking_waitlists` + `contacts` PII, no auth check | Y | `src/components/calendar/WaitlistManager.tsx`, `src/app/calendar/waitlist/page.tsx` (**live**) |
| `calendar.ts` | `offerWaitlistSpot` | Updates `booking_waitlists`, returns contact PII, no auth check | Y | `WaitlistManager.tsx` (**live**) |
| `calendar.ts` | `addContactToWaitlist` | Creates/reads `contacts`, calls RPC with cookie workspaceId, no auth check | Y (`contacts` read); RPC internals unverified | `WaitlistManager.tsx` (**live**) |
| `calendar.ts` | `createPackage` | Inserts `booking_packages` (billing/credits — financial), no auth check | Y | not found — dead code |
| `settings.ts` | `getWorkspaceBranding()` | Reads logo/custom domain/platform name, cookie-only, no auth check | Y | `src/app/settings/SettingsClient.tsx`, `src/app/settings/page.tsx` |
| `settings.ts` | `updateWorkspaceBranding(updates)` | Writes branding, no auth check | Y (admin-membership INSERT/UPDATE policy) | settings UI |
| `settings.ts` | `verifyCustomDomainCname(customDomain)` | Writes `custom_domain`/SSL status, no auth check | Y | settings UI |
| `settings.ts` | `getWorkspaceMembers()` (settings.ts copy) | **Uses `createAdminClient()`** — full PII leak (emails, names, avatars) with zero backstop of any kind, no auth check | **N (bypassed)** | `SettingsClient.tsx` (team tab, **live**) |
| `settings.ts` | `getWorkspaceInvitations()` | Reads invitee emails/roles, no auth check | Y | settings UI (team tab) |
| `settings.ts` | `getWebhooks()` | Reads `webhook_endpoints.*` including the webhook **secret**, no auth check | Y in the narrow sense of default-deny (RLS enabled, **no policy exists** — so non-admin-client reads return nothing for anyone) | settings UI (webhooks tab) |
| `settings.ts` | `createWebhook(url, events)` | Inserts a webhook + generates a secret, no auth check | Y (default-deny, no policy) | settings UI |
| `settings.ts` | `deleteWebhook(id)` | Destructive delete, no auth check | Y (default-deny) | settings UI |
| `settings.ts` | `getWebhookLogs(webhookId)` | Reads delivery payloads/response data, no auth check | Y (explicit membership policy) | settings UI |
| `settings.ts` | `getWorkspaceApiKey()` | Reads `workspaces.api_key` (a secret credential), no auth check | Y (`get_user_workspaces()` membership check) | settings UI (API tab) |
| `settings.ts` | `generateWorkspaceApiKey()` | **Overwrites** another workspace's API key and hands the new key back to the caller, no auth check | Y (owner-only UPDATE policy blocks non-owners) | settings UI (API tab) |
| `settings.ts` | `updateWorkspaceLogo(logoUrl)` | Writes logo URL to `workspace_branding` + `workspaces`, no auth check | Y (both tables) | settings UI |
| `settings.ts` | `getOAuthClients()` | Reads OAuth client records, no auth check | Y (membership policy) | settings UI (API/OAuth tab) |
| `settings.ts` | `createOAuthClient(name, redirectUris, scopes)` | Inserts an OAuth client (privilege-related — client_id/secret_hash), no auth check | Y | settings UI |
| `settings.ts` | `deleteOAuthClient(clientId)` | Destructive delete, no auth check | Y | settings UI |
| `builder.ts` | `createWebsite(name, subdomain, templateId)` | Inserts `websites`/`website_pages`/`pages`, no auth check (`requireAuth` imported but never called) | Y | `src/components/builder/WebsiteManager.tsx` |
| `builder.ts` | `duplicateWebsite(websiteId)` | Reads an arbitrary `websites` row by raw id (not even workspace-scoped on the read), duplicates it, no auth check | Y (both read and write) | `WebsiteManager.tsx` |
| `builder.ts` | `deleteWebsite(websiteId)` | Destructive delete, no auth check | Y | `WebsiteManager.tsx` |
| `builder.ts` | `updateWebsiteSettings(websiteId, type, settings)` | Updates `websites`/`funnels`, no auth check | Y for `websites`; `funnels` policy **not confirmed** — flag as unresolved | — |
| `builder.ts` | `publishPage(pageId, content)` | Publishes + overwrites page content, no auth check | Y | — |
| `builder.ts` | `updatePageContent(pageId, content)` | Overwrites page content, no auth check | Y | — |
| `builder.ts` | `createPage(name, websiteId)` | Inserts under raw `websiteId` with no ownership check that it belongs to the workspace | Y (partial) | — |
| `builder.ts` | `updatePageSettings(pageId, settings)` | Updates page settings, no auth check | Y | — |
| `builder.ts` | `getWorkspaceBuilderSettings()` | Reads builder settings, no auth check | Y | — |
| `builder.ts` | `updateWorkspaceBuilderSettings(settings)` | Upserts builder settings incl. **webhook URLs used by the public submit route**, no auth check | Y | — |
| `builder.ts` | `saveCustomComponent(name, description, content)` | Inserts custom component, no auth check | Y | — |
| `builder.ts` | `getCustomComponents()` | Reads custom components, no auth check | Y | — |
| `builder.ts` | `deleteCustomComponent(id)` | Destructive delete, no auth check | Y | — |
| `builder.ts` | `saveMediaAsset(url, filename, sizeBytes, mimeType, label)` | Inserts media asset record, no auth check | Y | — |
| `builder.ts` | `getMediaAssets()` | Reads media assets, no auth check | Y | — |
| `builder.ts` | `deleteMediaAsset(id)` | Destructive delete, no auth check | Y | — |
| `builder.ts` | `handlePageFormSubmission(pageId, workspaceId, payload)` | **Raw `workspaceId` param direct from caller, zero auth, zero pageId↔workspaceId binding check.** Writes/updates `contacts` PII + `contact_activities`, triggers automation execution (`publishEvent`) under an attacker-chosen workspace | **N** — `contacts` INSERT policy is `WITH CHECK (true)` by design (migration comment admits app-layer is supposed to validate this and doesn't) | `src/app/api/builder/submit/route.ts` (**fully public, unauthenticated route**), `src/components/builder/user/Form.tsx` — **genuine live cross-tenant IDOR, injects fake contacts + triggers automations into any workspace by guessing a workspaceId** |
| `tasks.ts` | `getTasks` | No `getUser()`/`getCurrentProfile()` call anywhere; reads full task list + assignee/contact PII | Y | `src/components/kanban/TasksBoard.tsx` |
| `tasks.ts` | `getTaskDetails(taskId)` | No auth check; reads full task incl. activities/attachments/assignees | Y | `src/components/kanban/TaskDetailDrawer.tsx` |
| `tasks.ts` | `getAssignableMembers` | No auth check, **admin client** (RLS bypassed); returns member **emails** + roles for whatever workspace is in the cookie | **N (bypassed)** | `AssigneePicker.tsx`, `CreateTaskModal.tsx`, `TaskDetailDrawer.tsx`, `TasksToolbar.tsx` — **live, reachable PII leak** |
| `tasks.ts` | `getWorkspaceTags` (tasks.ts copy) | No auth check | Y | no call sites found — dead code (see duplicates) |
| `tasks.ts` | `sendDailyBriefing` | No auth check; iterates **every user in the system** via admin client and emails each their tasks | N/A (mass-email trigger, not a read leak) | no call sites found — dead/unwired, but exported and callable |
| `tasks.ts` | `deleteTaskAttachment(attachmentId)` | Auth check present but **does not reject** — `getUserRole()` returns `null` on no session, guard is `if (role === 'viewer')`, and `null !== 'viewer'` so it proceeds; deletes storage object + DB row | N — no RLS policy found for `task_attachments` | `TaskDetailDrawer.tsx` (**live**) |
| `tasks.ts` | `getAttachmentUrl(filePath)` | No auth check, no workspace check; `filePath` is fully client-supplied and passed straight into `createSignedUrl()` — low-entropy path structure (`${workspaceId}/${taskId}/...`) makes it guessable | N/A — storage signed-URL generation doesn't go through table RLS | `TaskDetailDrawer.tsx` (**live**) |
| `shipments.ts` | `createShipment(workspaceId, payload)` | **No auth/membership check at all**, admin client; reads/writes billing quota, inserts shipment + tracking records, sends email — lets any caller burn another workspace's tracking quota | **N (bypassed)** | `src/app/shipments/ShipmentsClient.tsx` (**live "create shipment" button**), also called internally from `finance.ts:481` |
| `shipments.ts` | `generateShipmentTokenAction(shipmentId)` | No auth check; mints the exact HMAC token `confirmReceiptAction` treats as proof of recipient authorization — if this export is reachable as a Server Action (not fully confirmed at the Next.js build level), anyone can forge delivery confirmation for any workspace's shipment | N/A (no DB read; logic-level exposure) | `src/app/track/[shipmentId]/page.tsx` (today's intended flow is server-only, but the export itself has zero access control — **flagged as critical pending build-level confirmation**) |
| `shipments.ts` | `syncShipmentTracking(shipmentId)` | No auth/membership check, admin client; polls carrier API, updates status/location, can trigger emails | **N (bypassed)** | `src/app/api/cron/tracking-sync/route.ts` **and** `src/app/shipments/ShipmentsClient.tsx` (**live "sync now" button — confirmed reachable by any authenticated user for any shipmentId**) |
| `courseCommerce.ts` | `updateCoursePricing(courseId, payload)` | No `getUser()` call; updates storefront pricing | Y (non-admin client, RLS blocks true strangers) | `src/app/courses/[id]/components/CoursePricingForm.tsx` (**live**) |
| `courseCommerce.ts` | `getWorkspacePaymentIntegration()` | No auth check, admin client; discloses whether Stripe Connect is active + the workspace's **publishable key** | **N (bypassed)** | `CoursePricingForm.tsx` (**live**) |
| `reputation_actions.ts` | `submitPrivateFeedback` | Raw `workspaceId` param, **zero auth**, admin client; inserts fake reviews, emails the workspace owner — no rate limit/CAPTCHA | **N (bypassed)** | `src/app/feedback/FeedbackClient.tsx` (**public `/feedback` page, live**) |
| `publicBlog.ts` | `getPublicBlogPost` | **Confirmed live IDOR**: `preview=true` skips the published-only filter, and for an anonymous visitor the query becomes fully unscoped — can return any workspace's unpublished draft by slug | Partial/fragile — relies entirely on RLS, which behaves inconsistently for the no-cookie case | `src/app/blog/[slug]/page.tsx` via `?preview=1` (**live**) |
| `publicBlog.ts` | `subscribeToNewsletter` | No auth check; inserts `contacts` (PII: email) for a caller-supplied workspace | **N** — `WITH CHECK (true)`, fully open | public blog newsletter widgets (**live**) |
| `publicBlog.ts` | `recordPageview` | No auth check; inserts analytics row for arbitrary workspace | N — fully open policy | `BlogTracker.tsx` (**live**, low severity — no PII) |
| `publicBlog.ts` | `submitComment` | No auth check; inserts comment capturing author email (PII) for arbitrary workspace | N — fully open policy | `BlogComments.tsx` (**live**) |
| `popia.ts` | `unsubscribeEmail` | **Zero auth check**; marks contacts invalid + updates suppression list from raw `email`/`workspaceId` URL params, no token/signature | Y (blocks true strangers, but also means the function silently no-ops for real anonymous unsubscribers — a functional bug on top of the security gap) | `src/app/public/unsubscribe/page.tsx` (**live**, URL query params, no signature) |
| `operations.ts` | `getWorkflows` | No auth check; reads workflow definitions | Y | `src/app/automations/page.tsx` |
| `operations.ts` | `getOrders` | No auth check; reads `orders` + contact PII | Y | `src/app/orders/page.tsx` |
| `operations.ts` | `getExpenses` | No auth check; reads financial `accounting_transactions` | Y | not called anywhere — dead code, duplicate of `expenses.ts:getExpensesLive` (see duplicates) |
| `operations.ts` | `getProjects` | No auth check | Y | `src/app/projects/page.tsx` |
| `operations.ts` | `createProject` | No auth check | Y | `src/app/projects/ProjectsClient.tsx` |
| `operations.ts` | `getSupportTickets` | No auth check; reads tickets + contact names | Y | `src/app/support/page.tsx`, tickets-reply page |
| `operations.ts` | `createSupportTicket` | Auth check present but **non-rejecting** — `user` fetched then only used as `user?.email` in an email template, never gated on | Y | `SubmitTicketModal.tsx` (**live**) |
| `operations.ts` | `getMediaFiles` | No auth check | Y | `src/app/media/page.tsx` |
| `operations.ts` | `saveTextDraftToMedia` | No auth check; inserts arbitrary text content | Y | `src/app/ai-studio/content/AiStudioClient.tsx` |
| `messaging.ts` | `getMetaAuthUrl` | No auth check; embeds unverified cookie workspaceId into an OAuth `state` param trusted downstream | N/A (no DB call; downstream callback route not in scope, flagged for follow-up) | `ConnectPlatformsModal.tsx` |
| `messaging.ts` | `connectPlatformManually` | No auth check; encrypts and upserts real platform credentials (page/IG/WhatsApp tokens) | Y | `IntegrationsList.tsx` |
| `messaging.ts` | `getConnectedPlatforms` | No auth check; reads encrypted credentials blob | Y | `IntegrationsList.tsx`, `ConnectPlatformsModal.tsx` |
| `messaging.ts` | `disconnectPlatform` | No auth check; destructive delete | Y | `IntegrationsList.tsx` |
| `messaging.ts` | `getConversations` | No auth check; reads conversations + contact PII (phone/email/opt-in) + message content | Y | `ConversationsClient.tsx`, `conversations/page.tsx` |
| `messaging.ts` | `sendMessage` | No auth check; **sends a real outbound email/SMS/WhatsApp/Facebook/Instagram message** using workspace integration credentials | Y (blocks the DB insert for a non-member cookie, which in practice prevents the send) | `MessageInput.tsx`, `ConversationThread.tsx` |
| `messaging.ts` | `sendInternalNote` | No auth check | Y | `ConversationThread.tsx` |
| `messaging.ts` | `updateConversationAssignment` | No auth check, **no workspace filter in the query at all** — entirely RLS-dependent | Y | `ContactInfoPanel.tsx` |
| `messaging.ts` | `updateConversationStatus` | Same pattern | Y | `ConversationThread.tsx`/`ConversationsClient.tsx` |
| `messaging.ts` | `updateConversationTags` | Same pattern | Y | `ContactInfoPanel.tsx` |
| `messaging.ts` | `getQuickReplies` | No auth check | **N — fully exploitable today**: policy is `FOR SELECT USING (true)`/`FOR ALL USING (true)`, any authenticated user can read/write any workspace's quick replies | `MessageInput.tsx` |
| `messaging.ts` | `createQuickReply` | No auth check | **N** — same open policy | `MessageInput.tsx`/settings UI |
| `messaging.ts` | `deleteQuickReply` | No auth check | **N** — same open policy | settings UI |
| `messaging.ts` | `updateContactConsent` | No auth check; updates compliance-relevant `opted_in`/`opted_out` flags | Y | `ContactInfoPanel.tsx` |
| `messaging.ts` | `getMetaOauthToken` | No auth check; **decrypts** a real Facebook OAuth token | Y | internal helper for the 5 `fetch*` functions below |
| `messaging.ts` | `fetchMetaBusinesses` / `fetchMetaPages` / `fetchMetaInstagramAccounts` / `fetchMetaWhatsAppAccounts` / `fetchWhatsAppPhoneNumbers` | No auth check beyond inherited token read; can enumerate a workspace's connected Meta business assets | Y (inherited) | `ConnectPlatformsModal.tsx` |
| `messaging.ts` | `saveMetaConnections` | No auth check; validates + upserts Facebook/Instagram/WhatsApp credentials | Y | `ConnectPlatformsModal.tsx` |

**~116 total (c) findings.** Roughly a third are dead code (no live caller found), but per the task brief, unreferenced server actions are still independently callable and represent real attack surface, not lower-priority items purely for being unwired from the current UI.

---

## Weak (b) — Real Gap, Lower Immediate Blast Radius

*(Auth is checked and does reject; the workspace id itself is trusted from the caller/cookie with no `workspace_members` verification.)*

| File | Function | What it exposes/allows | RLS backstop | Called from |
|---|---|---|---|---|
| `pipelines.ts` | `createPipeline` | Inserts `pipelines`/`pipeline_stages` | Y | `pipelines/new/page.tsx`, `CreatePipelineModal.tsx` |
| `pipelines.ts` | `createOpportunity` | Inserts `opportunities` | Y | `DealModal.tsx` |
| `pipelines.ts` | `getPipelines` | Reads pipelines | Y | `pipelines/page.tsx`, `[id]/stages/page.tsx`, `LeadCRMConnector.tsx` |
| `pipelines.ts` | `getPipelineStages` | Reads stages | Y | multiple live pages |
| `pipelines.ts` | `getPipelineOpportunities` | Reads opportunities + contact PII | Y | `pipelines/page.tsx` |
| `pipelines.ts` | `updateDealStage` | Writes deal stage/value (financial) | Y | `KanbanBoard.tsx`, `PipelinesClient.tsx`, `PropertyDealClient.tsx` |
| `pipelines.ts` | `updateOpportunity` | Writes value/status/contact (financial) | Y | `DealModal.tsx`, `OpportunityModal.tsx` |
| `pipelines.ts` | `deleteOpportunity` | Destructive delete | Y | `OpportunityModal.tsx` |
| `pipelines.ts` | `updateStageOrder` | Calls RPC with cookie workspaceId; RPC's own internal checks **not verified** — flag as unresolved | Unresolved (RPC, possibly `SECURITY DEFINER`) | `StageSettingsModal.tsx` |
| `pipelines.ts` | `updateStage` | Writes stage name | Y | `StageSettingsModal.tsx` |
| `pipelines.ts` | `deleteStage` | Destructive — cascades to delete opportunities | Y | `StageManager.tsx`, `StageSettingsModal.tsx` |
| `pipelines.ts` | `updatePipelineStages` | Bulk insert/update | Y | `StageManager.tsx`, `StageSettingsModal.tsx` |
| `settings.ts` | `inviteTeamMember` | *(Reclassified from initial pass — verifies admin membership before proceeding; effectively (a). Listed here only per the batch agent's note that the target workspaceId itself still originates from a cookie before that verification runs.)* | Y | team settings UI |
| `builderAI.ts` | `generateAICopySuggestions(prompt, context)` | Wrapper checks auth, uses unverified cookie workspaceId — but function does **no DB read/write** (pure templating), so currently inert | N/A (no query) | builder AI copy assistant |
| `builderAI.ts` | `generateAISectionLayout(prompt)` | Same — no DB access | N/A | builder AI layout assistant |
| `builderDeploy.ts` | `publishPageStatic(pageId)` | Publishes content, uploads to Storage bucket `published-sites` | Y | `BuilderEditor.tsx`/`WebsiteManager.tsx` |
| `builderDeploy.ts` | `addCustomDomain(websiteId, domainName)` | Inserts custom domain, no check `websiteId` belongs to workspace | Y | `WebsiteSettings.tsx` |
| `builderDeploy.ts` | `removeCustomDomain(domainId)` | Destructive delete | Y | `WebsiteSettings.tsx` |
| `builderDeploy.ts` | `verifyDomainSSL(domainId)` | Reads/updates domain SSL state | Y | `WebsiteSettings.tsx` |
| `builderDeploy.ts` | `createSubdirectoryPage(websiteId, name, path)` | Inserts page under raw websiteId, no ownership check | Y (partial) | — |
| `builderDeploy.ts` | `deleteSubdirectoryPage(pageId)` | Destructive cascading delete | Y | — |
| `builderDeploy.ts` | `renameSubdirectoryPage(pageId, newName, newPath)` | Updates page/routing — code comment explicitly acknowledges relying on RLS alone | Y | — |
| `builderDeploy.ts` | `getPageRevisions(pageId)` | Reads version history | Y | — |
| `builderDeploy.ts` | `restorePageRevision(versionId)` | **Overwrites live page content** with an old version (destructive) | Y | — |
| `workspace.ts` | `getWorkspaceMembers()` (workspace.ts copy) | Reads member list + PII, cookie-only | Y | settings/team UI — **name collides with settings.ts's Critical copy, see duplicates** |
| `social.ts` | `getSocialAccounts` | Reads platform credentials column | Y | `src/app/social/page.tsx` |
| `social.ts` | `getSocialPosts` | Reads posts | Y | `src/app/social/page.tsx` |
| `social.ts` | `createSocialPost` | **Publishes real posts to Facebook/Instagram** via Graph API using decrypted tokens | Y | `ContentStudioWorkspaceClient.tsx`, `SocialPlannerClient.tsx`, `AIAssistantSidebar.tsx`, `actions_registry.ts` |
| `social.ts` | `publishSocialPost` | Updates post status | Y | not called anywhere — dead code |
| `tasks.ts` | `createTask` | Inserts task | Y | `CreateTaskModal.tsx` |
| `tasks.ts` | `updateTask` / `updateTaskStatus` | Updates task; also reads the pre-update row with **no workspace filter** before diffing | Y | `TasksBoard.tsx`, `TaskDetailDrawer.tsx` |
| `tasks.ts` | `addTaskComment(taskId, content, mentions)` | **No workspace scoping of `taskId` at all**; trusts arbitrary `mentions` user IDs for notifications/emails with no same-workspace check | Partial — depends on whether `WITH CHECK` independently validates task ownership, **not confirmed live** | `TaskDetailDrawer.tsx` |
| `tasks.ts` | `toggleTaskAssignee(taskId, userId)` | `taskId` never scoped to workspace; arbitrary `userId` can be assigned | Y | `TaskDetailDrawer.tsx` |
| `tasks.ts` | `uploadTaskAttachment(taskId, formData)` | Cookie-only workspace scoping for storage path + DB insert, no check `taskId` belongs to that workspace | **N — no RLS policy found for `task_attachments`** | `TaskDetailDrawer.tsx` |
| `retainers.ts` | `applyRetainerToInvoice(invoiceId, contactId, workspaceId)` | Raw `workspaceId` param; **invoice fetch has no workspace scoping at all**; writes financial ledger, can flip invoice to "paid" | Y (implicit WITH CHECK from USING clause blocks writes outside caller's own memberships) | not called anywhere — dead/unwired code today |
| `retainers.ts` | `getRetainerBalance(contactId, workspaceId)` | Read-only financial balance | Y | `RetainerSelector.tsx` (**live**, invoice creation flow) |
| `domains.ts` | `getSenderDomains` | Reads domain config | Y | `DomainsTab.tsx` |
| `domains.ts` | `registerSenderDomain` | Inserts domain | Y | `DomainsTab.tsx` |
| `domains.ts` | `deleteSenderDomain` | Destructive delete | Y | `DomainsTab.tsx` |
| `domains.ts` | `verifySenderDomain` | Reads/updates domain verification | Y | `DomainsTab.tsx` |
| `domains.ts` | `updateDomainRouting` | Updates routing config | Y | `CustomDomainsTab.tsx` |
| `domains.ts` | `deleteDomain` | Destructive delete | Y | `CustomDomainsTab.tsx` |
| `blogCommentsAdmin.ts` | `updateCommentStatus` | Moderation action (approve/spam) | Y | `BlogCommentsClient.tsx` |
| `blogCommentsAdmin.ts` | `deleteComment` | Destructive delete | Y | `BlogCommentsClient.tsx` |
| `blogCommentsAdmin.ts` | `updateBlogSettings` | Upserts settings | Y | `BlogCommentsClient.tsx` |
| `analytics.ts` | `getConversionAnalytics` | Reads marketing/revenue-attribution data | **N — no RLS policy/table found for `conversion_events` in migrations, could not confirm** | not called anywhere — dead code |
| `analytics.ts` | `getDashboardStats` | Reads contacts/orders/tasks/conversations counts | Y (multiple policies) | `src/app/settings/page.tsx` (**live**) |
| `analytics.ts` | `getSupportAnalytics` | Aggregates help/support data with **zero workspace scoping anywhere in the app code** (relies entirely on RLS) | Y for most tables; 2 tables intentionally global | `src/app/admin/help/analytics/page.tsx` (**live**) |
| `affiliates.ts` | `createProgramme(workspaceId, data)` | Inserts commission structure, raw workspaceId | Y | `AffiliatesClient.tsx` |
| `affiliates.ts` | `getProgrammes(workspaceId)` | Reads programmes, raw workspaceId | Y | not called anywhere — dead code |
| `affiliates.ts` | `getProgrammeById(id)` | **No workspace scoping parameter at all** | Y | not called anywhere — dead code |
| `affiliates.ts` | `updateProgramme(id, data)` | Updates commission rate/type/approval rules | Y | `AffiliatesClient.tsx` |
| `affiliates.ts` | `deleteProgramme(id)` | Destructive delete | Y | `AffiliatesClient.tsx` |
| `affiliates.ts` | `approveAffiliate(affiliateId)` | Grants active affiliate status (privilege-adjacent) | Y | `AffiliatesClient.tsx` |
| `affiliates.ts` | `rejectAffiliate(affiliateId)` | Status change | Y | `AffiliatesClient.tsx` |
| `affiliates.ts` | `suspendAffiliate(affiliateId)` | Disables an affiliate | Y | `AffiliatesClient.tsx` |
| `affiliates.ts` | `deleteAffiliate(affiliateId)` | Hard delete, cascades clicks/commissions/payouts | Y | `AffiliatesClient.tsx` |
| `affiliates.ts` | `approvePayout(payoutId, reference)` | Marks payout + commissions paid (financial, destructive) | Y | `AffiliatesClient.tsx` |
| `affiliates.ts` | `rejectPayout(payoutId)` | Marks payout failed | Y | `AffiliatesClient.tsx` |
| `affiliates.ts` | `updateCommissionStatus(commissionId, status)` | Updates commission status (financial) | Y | `AffiliatesClient.tsx` |
| `affiliates.ts` | `getDecryptedPayoutBatch(payoutIds)` | **Bulk-decrypts bank/payout details** (PII/financial secret) for arbitrary caller-supplied ids | Y — most sensitive function in the file even with RLS | `AffiliatesClient.tsx` |
| `expenses.ts` | `getExpensesLive` | Reads financial transactions | Y | `ExpenseLiveClient.tsx`, `finance/expenses/page.tsx` (**live**) |
| `expenses.ts` | `createExpense` | Financial insert | Y | `ExpenseLiveClient.tsx` |
| `expenses.ts` | `updateExpense` | Financial update | Y | `ExpenseLiveClient.tsx` |
| `expenses.ts` | `deleteExpense` | Destructive/financial delete | Y | `ExpenseLiveClient.tsx` |
| `reputation_actions.ts` | `respondToReview` | Writes reply text to a review | Y | `ReputationClient.tsx` |
| `reputation_actions.ts` | `deleteReview` | Destructive delete | Y | `ReputationClient.tsx` |
| `reputation_actions.ts` | `getReputationSettings` | Reads settings | Y | `ReputationClient.tsx` |
| `reputation_actions.ts` | `saveReputationSettings` | Upserts settings, auto-triggers a sync | Y | `ReputationClient.tsx` |
| `reputation_actions.ts` | `sendReviewRequest` | Reads contact PII + Twilio creds from `automations.settings`, sends real email/SMS/WhatsApp | **N for the `automations` table specifically** — no policy found anywhere in migrations | `ReputationClient.tsx` |
| `reputation_actions.ts` | `syncReviewsAction` | Reads/writes settings + reviews, does outbound HTTP fetches | Y | `ReputationClient.tsx` |
| `popia.ts` | `invokeRightToErasure` | **Irreversibly anonymizes PII**, cancels workflows, purges enrollment queue, updates suppression list | Y (blocks true cross-tenant abuse today, but this severity warrants `requireWorkspaceAccess()` regardless of RLS) | `ProfileSidebar.tsx` (**live "Right to Erasure" action**) |

---

## Confirmed Safe By Design (d)

- `auth.ts: setupWorkspace` — creates the caller's own workspace, checks for existing membership by `user_id` first.
- `auth.ts: forgotPassword` — public by design; always returns a generic response to prevent email enumeration.
- `auth.ts: resetPassword` — operates on the caller's own authenticated session only.
- `auth.ts: handleLogout` — logs out the current session only.
- `auth.ts: notifySignIn` / `notifyUpdate` — pure email helpers, no DB access, own-session context.
- `auth.ts: getEmailByUsername` — pre-authentication lookup, returns only an email needed for login-by-username.
- `workspace.ts: createWorkspace` — creates a new resource scoped to the caller, no pre-existing tenant data touched.
- `settings.ts: testEmailConnection` — sends a test email only to the caller's own address, no tenant data.
- `builder.ts: getTemplates` — static in-memory template list, no DB access.
- `calendar/scheduling.ts: validateSlot` / `getAvailableSlots` / `validateCollectiveSlot` — deliberately public availability-checking for booking pages; no PII returned.
- `calendar/core.ts: getPublicCalendarBySlug` — deliberately public, scoped by unique slug (not an id), returns only non-PII display config.
- `studentEnrollments.ts` (all 6 functions) — every cross-tenant-looking parameter is actually derived server-side from a trusted row (a course's real `workspace_id`) or the caller's own authenticated email, never a raw client-supplied workspace id.
- `shipments.ts: confirmReceiptAction` — deliberately unauthenticated guest flow, genuinely scoped by an HMAC token (caveat: only as safe as `generateShipmentTokenAction` staying non-public — see Critical table).
- `courseCommerce.ts: createDirectCourseCheckoutSession` / `verifyLessonAccess` — workspaceId derived from the trusted course row, not client input.
- `courseCommerce.ts: createCoursePayFastCheckout` — verified independently: uses `getPortalSession()`, which resolves contact/workspace strictly from the authenticated user's own email with `portal_access_enabled`, plus a properly role-gated admin-impersonation branch.
- `projects.ts` (all 3 functions) — each either uses verified portal-session contact ownership, or resolves `workspace_id` from a trusted DB row plus an explicit `workspace_members` check before writing.
- `reputation_actions.ts: getPublicReputationSettings` — admin client but only returns non-sensitive public branding for an intentionally-unauthenticated feedback page.
- `publicBlog.ts: getPublicBlogPosts` / `getPublicCategories` / `getPostComments` / `getBlogSettings` — all hard-filtered to already-published/approved/non-sensitive content, backed by an explicit public RLS policy.
- `emailProviders.ts` (all 3 functions) — each calls an explicit `requireWorkspaceMember(workspaceId)` gate before touching the DB, even before the admin-client call.
- `analytics/invoices.ts: getInvoiceAnalytics` — explicitly checks `workspace_members` before running; correctly implemented (currently unreferenced by any UI route — dead but safe).
- `affiliates.ts`: `applyToProgramme`, `loginAffiliate`, `logoutAffiliate`, `getAuthenticatedAffiliate`, `requestPayout`, `updatePayoutSettings`, `getDecryptedPayoutDetails` — the deliberately-public affiliate-portal flows; all scoped either by a JWT-verified affiliate id or server-derived `programmeId`, never a trusted-but-unverified client parameter.
- `messaging.ts: getLinkedInAuthUrl` / `getTikTokAuthUrl` — no DB access, static OAuth URL construction from env config only.
- `domains.ts: addDomain` / `getDomains` — explicitly verify `workspace_members` before using the workspaceId (the one pair in this file built correctly — see duplicate note).
- `workspace.ts: saveWorkspaceKycSettings` — explicit `workspace_members` + admin-role check before the write (categorized (a), not (d), but included here for completeness of "verified correct" functions).

---

## Duplicate Implementation Findings

1. **`getWorkspaceMembers` implemented twice with opposite security postures.** `src/app/actions/workspace.ts` (uses `createServerClient()`, RLS-enforced → (b) Weak) vs. `src/app/actions/settings.ts` (uses `createAdminClient()`, **RLS fully bypassed** → (c) Critical). Same feature, same table, and the more dangerous copy is the one actually reachable from the live team-settings UI.
2. **Three `executeAction()` wrapper copies drifted apart across builder.ts / builderAI.ts / builderDeploy.ts.** `builderAI.ts` and `builderDeploy.ts` both correctly call `getUser()`. `builder.ts`'s copy **omits the call entirely** despite importing `requireAuth` (dead import — strong evidence the check was intended and lost), making all 17 of its DB-touching functions Critical instead of Weak like its siblings.
3. **`setActiveWorkspace` (auth.ts) has zero membership check** and is the single upstream gate feeding the `active_workspace_id` cookie that nearly every other Weak/Critical finding above ultimately trusts. It is the highest-leverage single fix in this entire report — reachable from `DashboardWorkspacePicker.tsx`, `DashboardHeader.tsx`, sign-up/sign-in forms, and the portal layout.
4. **`booking_calendars` CRUD implemented three separate times**: `calendar/core.ts` (dead), `calendar/calendars.ts` (**live**, and the only one that also skips a field allow-list on the raw payload), and `calendar.ts` (dead, but the only one of the three that calls `requireAuth()`). All three trust the cookie workspaceId with no membership check.
5. **Appointment creation/mutation implemented twice**: `calendar/appointments.ts` (live, feature-rich — round-robin, meeting links) vs. `calendar.ts` (simpler, apparently dead). Both insert into the same `appointments` table through the same unauthenticated wrapper.
6. **`getAppointments` implemented twice** (`calendar/appointments.ts`, `calendar.ts`), both unauthenticated, both with the same `contacts` PII join.
7. **OAuth URL generators duplicated**: `getMetaAuthUrl`/`getLinkedInAuthUrl`/`getTikTokAuthUrl` exist in both `social.ts` (dead, unauthenticated) and `messaging.ts` (**live** — actually imported by `SocialPlannerClient.tsx`, `ConnectPlatformsModal.tsx`, `IntegrationsList.tsx`). The messaging.ts copies got the full audit above (all Critical/dead-simple `(d)`); the social.ts copies are dead code but present the same pattern.
8. **`getWorkspaceTags` implemented twice**: `tasks.ts` (audited above, no auth check, dead) vs. `contacts.ts` (delegates to `ContactService`, the one actually wired to `/contacts` and `/contacts/tags` — not in this audit's scope but presumably already covered by the earlier CRM contacts.ts fix pass).
9. **`getExpenses` (operations.ts, no auth, dead) duplicates `getExpensesLive` (expenses.ts, properly auth-checked, live)** — same table, same filter, only one copy was ever hardened.
10. **`domains.ts` mixes two hardening generations in the same file**: the older "Sender Domains" functions trust the cookie; the newer "Custom Domain Connection" functions (`addDomain`/`getDomains`) correctly verify membership. Worth consolidating on the newer pattern rather than fixing the old one in place.
11. **`getInvoiceAnalytics` (analytics/invoices.ts, correctly hardened, dead) vs. `getDashboardStats`/`getConversionAnalytics` (analytics.ts, weak, live)** — look like two generations of the same "dashboard financial summary" concept; the safely-written one never got wired up.
12. **Course checkout has two parallel builders** (`courseCommerce.ts: createDirectCourseCheckoutSession`, `studentEnrollments.ts: createCourseCheckoutSession`) — not a security issue (both correctly derive workspaceId from the course row), but worth consolidating as duplicated logic.

---

## Recommended Fix Batching

Grouped by feature area, roughly ordered by severity × live-reachability (a dead-code Critical is still worth fixing, but a live one should go first):

**Batch 1 — `setActiveWorkspace` + shared auth infrastructure (highest leverage, do first).**
`auth.ts: setActiveWorkspace`. Fixing this alone (add a `workspace_members` check before setting the cookie) reduces the *practical* exploitability of a large fraction of every other Weak finding in this report, though it does not fix the app-layer gaps themselves and does nothing for the Critical findings that use the admin client or have no query scoping at all.

**Batch 2 — Calendar/Booking subsystem (largest single blast radius: ~32 Critical + 13 Weak findings across 6 files).**
`pipelines.ts`, `calendar.ts`, `calendar/appointments.ts`, `calendar/core.ts`, `calendar/calendars.ts`, `calendar/scheduling.ts`. Needs both the auth-wrapper fix (add `getUser()` to the shared `executeAction()`) and a decision on the 3x-duplicated `booking_calendars` CRUD and 2x-duplicated appointment creation — consolidate before or during the fix, not after.

**Batch 3 — Settings/Workspace admin surface (secrets + PII: API keys, webhooks, OAuth clients, team member emails).**
`settings.ts`, `workspace.ts`. Contains the worst single admin-client PII leak (`settings.ts: getWorkspaceMembers`) and the API-key/webhook-secret exposure functions.

**Batch 4 — Builder/Website/Funnel subsystem.**
`builder.ts`, `builderAI.ts`, `builderDeploy.ts`. Includes the live, confirmed cross-tenant IDOR in `handlePageFormSubmission` (public route, no pageId↔workspaceId binding) — should be pulled forward ahead of the rest of this batch given it's already reachable from an unauthenticated public route today.

**Batch 5 — Messaging/Conversations/Social integrations.**
`messaging.ts`, `social.ts`. Includes real outbound-message-sending (`sendMessage`), credential decryption (`getMetaOauthToken`), and the fully-open `getQuickReplies`/`createQuickReply`/`deleteQuickReply` RLS policy gap (the one place in this whole report where RLS itself, not just the app layer, needs a policy fix).

**Batch 6 — Tasks/Kanban.**
`tasks.ts`. Includes the admin-client PII leak (`getAssignableMembers`), the non-rejecting auth check (`deleteTaskAttachment`), and the guessable-path attachment URL leak (`getAttachmentUrl`).

**Batch 7 — Shipments/Courier.**
`shipments.ts`. Includes `createShipment` (admin client, zero auth, quota abuse) and the shipment-delivery-confirmation token generator that needs a build-level reachability check before triage can even close.

**Batch 8 — Compliance & public-facing content (POPIA, blog, reputation/feedback).**
`popia.ts`, `publicBlog.ts`, `reputation_actions.ts`. Lower live-blast-radius individually, but `popia.ts: invokeRightToErasure` (irreversible PII anonymization) and `publicBlog.ts: getPublicBlogPost`'s preview IDOR deserve attention regardless of batch order given severity of action, not just reachability.

**Batch 9 — Finance/Billing adjacents not already fixed.**
`expenses.ts`, `retainers.ts`, `affiliates.ts`, `domains.ts`, `analytics.ts`, `analytics/invoices.ts`, `blogCommentsAdmin.ts`, `emailProviders.ts` (already safe, no action), `operations.ts`, `courseCommerce.ts`. Mostly Weak-tier, RLS-backstopped findings; batch together since the fix (swap cookie-trust for `requireWorkspaceAccess()`) is mechanically identical across all of them, same as the quotes.ts/finance.ts pattern. `operations.ts: getExpenses` and `affiliates.ts: getProgrammes`/`getProgrammeById` should likely be **deleted** rather than fixed, being confirmed dead duplicates of already-correct implementations.

**Not yet triaged — flagged for a future pass, not assumed safe:** `src/app/api/auth/meta/callback/route.ts` (trusts the `state` param `getMetaAuthUrl`/`messaging.ts`'s OAuth functions hand it), `contacts.ts`'s `getWorkspaceTags`/`ContactService` (assumed already covered by the earlier CRM fix pass but not re-verified in this document), and any `src/app/api/**/route.ts` API routes generally — this triage covered only `src/app/actions/*.ts` Server Actions, per the task's stated scope.
