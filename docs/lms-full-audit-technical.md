# LeadsMind LMS — Full Feature Audit (Technical Ground-Truth Report)

> Internal reference. Audit-only — nothing was changed. Every claim is a direct read of the
> current `lms` branch and/or the live Supabase database (queried via the service-role key,
> 2026-09-02). Where a prior audit (`docs/student-portal-audit.md`, `docs/Leadsmind/Modules/LMS.md`)
> is now stale, that is called out explicitly.
>
> **Verification legend:** ✅ real & wired end-to-end · ⚠️ real but partial / has a real gap ·
> ⛔ stub / dead / not built.

---

## STEP 0 — Ground truth established

### Live DB — LMS tables that exist and their real row shape

| Table | Rows (live) | Notes |
|---|---|---|
| `courses` | 6 | Columns incl. `slug`, `landing_page_settings` (jsonb), `domain_id`, `url_path`, `pricing_model`, `subscription_interval`, `enrolment_cap`, `certificate_config` (jsonb), `onboarding_email_*`, `status`, `published` |
| `course_modules` | 2 | `drip_days`, `position`, `is_active`, `publish_status`, `required_for_completion`, `nqf_level` |
| `course_lessons` | 3 | `lesson_type`, `content` (jsonb, in practice `{}`), `unlock_type` (`sequential`/`drip`/…), `drip_value`, `time_estimate_minutes`, `is_preview`, `access_level`, `is_active` |
| `content_blocks` | 15 | The **live** block table. `type` check: `video,audio,reading,rich_text,quiz,assignment,flashcards,download,slides,embed,live_session` + `html_code` (migration `20260903000018`). `completion_rule`: `watched_threshold,opened,quiz_passed,submitted,none`. `video_provider`, `file_url`, `completion_threshold`, `content` jsonb |
| `lesson_block_completions` | 0 | `(content_block_id, contact_id)` unique. Migration `…08` |
| `lesson_reading_completions` | 0 | Migration `…21`. Scroll+dwell gate for canvas lessons with **no** trackable blocks |
| `course_progress` | 2 | Row-per-(contact, lesson). `completed_at`, `progress_seconds`, `interaction_attempts`, `completion_override` (bool, migration `…23`) |
| `enrollments` | 6 | (double-L). `status`, `active`, `access_type`, `payment_status`, `last_lesson_id`, `last_position_seconds`, `last_active_at`, `expires_at`, `grace_period_expires_at`, `stripe_payment_intent_id` |
| `quiz_questions` | 0 | `question_type` check allows 8 types; `options`/`correct_answer` jsonb |
| `quiz_settings` | 0 | `max_attempts` (def 3), `pass_percentage` (def 70), `show_answers_after`, `publish_status` |
| `quiz_attempts` | 0 | `lesson_id` (nullable, ON DELETE SET NULL — migration `…14`), `student_id` (= **contact id**), `score`, `max_score`, `percentage`, `passed`, `submitted_at` |
| `module_quiz_settings` / `module_quiz_questions` / `module_quiz_attempts` | 0 / 10 / 0 | Migration `…13`. Structurally mirror the lesson-quiz tables, scoped through `course_modules`. The 10 question rows are AI-generated MCQs |
| `course_certificates` | 0 | Migration `…19`. `validation_id` (unique), `student_name_snapshot`, `course_title_snapshot`, `issued_at`, `unique(contact_id, course_id)` |
| `lms_assignment_submissions` | 0 | Migration `190`. `text_submission`, `file_url`, `grade_status` (`pending/passed/failed`), `feedback_comments`, `graded_at`, `unique(contact_id, lesson_id)` |
| `flashcard_reviews` | 0 | Migration `…20`. `(contact_id, content_block_id, card_index)` unique, `status` (`learning/known`), `next_due_at`, `review_count` |
| `lms_remedial_assignments` | 0 | AI remedial |
| `lms_automation_rules` | (n/a) | Migration `171`. `trigger_type` check: `course_completed, lesson_completed, quiz_passed, quiz_failed, module_completed, enrollment_created, certificate_issued, struggling_detected`. `trigger_config`/`action_config` jsonb |
| `course_qa_interactions` | 2 | RAG Q&A log — real answers, `model_used = gpt-4o-mini` |
| `course_content_chunks` / `lesson_summaries` | 0 | pgvector RAG + AI lesson summaries |
| `lms_certificate_templates`, `lms_certificates`, `lms_quizzes` | 0 | **Legacy / dead.** Zero code references. `lms_quiz_submissions` was **dropped** (migration `…16`) |

Tables that do **not** exist (confirmed `PGRST205`): `lesson_blocks`, `enrolments` (single-L),
`quizzes`, `course_categories`, `course_automations` / `lms_automations`, `cohorts` /
`course_cohorts`, `course_reviews`, `student_portal_assignments`, `lesson_completions`,
`assignments`, `flashcards`, `certificates` (bare).

### Route map (current)

Admin: `src/app/courses/page.tsx` (list) · `courses/[id]/page.tsx` (workspace: modules,
pricing, landing, settings, submissions, analytics tabs) · `courses/[id]/automations` ·
`courses/[id]/lessons/[lessonId]/builder` (canvas) · `courses/[id]/quiz/[quizId]`
(QuizWorkbench + analytics) · `courses/[id]/module-quiz/[moduleId]` · `courses/[id]/learn`
(admin preview player) · `courses/certificates` (list + Design tab).

Student: `student/page.tsx` (dashboard) · `student/results` · `student/flashcards` (+ `[blockId]`) ·
`student/settings` · `student/marketplace` · `student/checkout/[courseId]` ·
`student/courses/[id]` (player) · `…/quiz/[quizId]` · `…/module-quiz/[moduleId]` · `…/remedial`.

Public: `certificates/verify/[id]` · `unauthenticated/courses/[slug]` (+ custom-domain) ·
`checkout/[id]` (guest-capable).

Student sidebar nav (`student/layout.tsx`): My Dashboard · **My Results** · **Flashcards** ·
Course Catalog · **Settings** · Admin Workspace · Sign out. (The 3 bolded items did not exist
at the time of `student-portal-audit.md`.)

---

## STEP 1 — Courses (admin-side)

### 1.1 Course creation — ✅

`CreateCourseWizard.tsx` — 2 steps. Step 1: name, domain (`leadsmind.io` default +
connected custom domains from `getDomainsForCurrentWorkspace`), URL path (auto-slugged, live
preview of `https://<host>/courses/<slug>`). Calls `createCourseWithDomain(title, domainId, urlPath)`.
Step 2: theme picker (3 real themes, live `CourseThemeMiniPreview`), persisted via
`updateCourseLandingSettings(id, { template })` into `courses.landing_page_settings.template`.
New courses land as `status='draft'`, `published=false` (confirmed on live rows).
Publish/unpublish toggled from the course workspace. No placeholder data injected on create.

### 1.2 Curriculum builder — ✅ (core) / ⚠️ (depth not exhaustively exercised)

`ModuleCard.tsx`, `ModuleCreatorModal`, `LessonCreatorModal`, `ModulesToolbar`. Modules and
lessons are real `course_modules` / `course_lessons` rows. Module settings: `drip_days`,
`publish_status` (draft/active/scheduled), `required_for_completion`, `nqf_level`, `icon`,
`position`. Lesson settings: `unlock_type` (`sequential` default / `drip` / `quiz_gated`),
`drip_value`, `time_estimate_minutes`, `is_preview`, `access_level`. Drag-reorder uses
`@hello-pangea/dnd` (in deps; `position` column is the sort key). Drip + sequential + module
prerequisite locking is genuinely enforced student-side — see `lock-utils.ts` (STEP 2.2).

### 1.3 Content-block system — ✅ authoring, ✅ student rendering (all 12 types)

Dedicated editor per type in `courses/[id]/components/blocks/`: `VideoBlockEditor`,
`AudioBlockEditor`, `ReadingBlockEditor`, `RichTextBlockEditor`, `QuizBlockEditor`,
`AssignmentBlockEditor`, `FlashcardsBlockEditor`, `DownloadBlockEditor`, `EmbedBlockEditor`,
`HtmlCodeBlockEditor`, `LiveSessionBlockEditor`. Scanned — no "coming soon" / disabled stubs.
`slides` reuses the reading editor/renderer (PDF-style). `ContentBlockList.tsx` is the
admin ordering surface.

Student render — `StudentPlayerClient.tsx:849-953` `renderBlockBody()`, one shared per-type
switch used by both the flat-list and canvas render paths:

| Block | Student render | Completion signal |
|---|---|---|
| video | `VideoPlayer` (+ low-bandwidth mode) | `watched_threshold` (90%) |
| audio | `VoiceNotePlayer` or sandboxed embed iframe | `watched_threshold` / `opened` |
| html_code | `SandboxedHtml` | (view) |
| reading / slides | opens `ReadingModal` | `opened` |
| rich_text | sanitized HTML (`sanitizeRichTextHtml`) | (view) |
| download | file link | `opened` |
| embed | `isSafeEmbedUrl`-gated sandboxed iframe | `opened` |
| live_session | join link | `opened` |
| quiz | link to `/student/courses/[id]/quiz/[lessonId]` | `quiz_passed` (server-graded) |
| assignment | `renderAssignmentPanel` — text + 1 file, status, feedback, resubmit | `submitted` |
| flashcards | inline deck (`renderFlashcardsPanel`) | finished |

`markBlockComplete` → `recordBlockCompletion` (`actions/blockCompletion.ts`) → `lesson_block_completions`.
"Next lesson" refuses to advance unless `getLessonBlockCompletionStatus(lessonId).allComplete`
(`StudentPlayerClient` ~:1116). `completion_rule='none'` blocks auto-complete on view.

### 1.4 Canvas / WYSIWYG lesson builder — ⚠️ real, some rough edges

`courses/[id]/lessons/[lessonId]/builder/page.tsx` → `BuilderEditor type="lesson"` (CraftJS,
`@craftjs/core`). Each lesson is backed by a `pages` row linked via `pages.course_lesson_id`
(migration `20260903000012`), lazily created from `BLANK_LESSON_CANVAS` on first open for
pre-existing lessons. Canvas content is flattened server-side (`flattenLessonCanvas`) into an
ordered list the player renders: `heading`/`text`/`image` inline like an article; a
`block`/`contentbox` node hands off to the same `renderBlockBody` switch keyed on a real
`content_blocks` row — so canvas and flat-list never drift.

- **Canvas ↔ student rendering parity** — addressed: single shared switch.
- **Text-only canvas lessons** — previously completable instantly with nothing read;
  closed by `lesson_reading_completions` (migration `…21`): server-recomputed scroll + dwell
  floor derived from word count, applied **only** when a canvas lesson has zero trackable blocks.
- **Soft-confirm completion** (migration `…23`): "Mark complete" is always clickable; if real
  signals aren't met the student confirms a dialog and `course_progress.completion_override`
  is set server-side from an independent re-check. Honest-reporting flag; no student-facing effect.
- Lesson templates: `LESSON_TEMPLATES` = **2** ("Standard Lesson", "Deep-Dive Lesson"),
  CraftJS-JSON seeds applied via `actions.deserialize()`.
- Rough edges: two parallel authoring models coexist — the newer canvas/`content_blocks`
  path and the legacy `lesson_type` path (`LessonTypePicker` still offers `text/video/quiz/
  assignment/pdf/audio/live_session/flashcards/code/scorm`, incl. `code` and `scorm` which
  have only mock in-player shims). The legacy per-`lesson_type` renderers still exist as the
  fallback when a lesson has no blocks (`StudentPlayerClient` ~:1270-1400).

### 1.5 Course landing / sales pages — ✅

3 templates: `TemplateCleanMinimal`, `TemplateBoldFeatureRich`, `TemplateCommunityCoaching`
(`src/components/courses/landing-pages/`), each theme-tokened. Data-bound sections from
`courses.landing_page_settings`: `outcomes`, `reviews`, `faq`, `instructor` (name/bio/avatar),
`curriculum` summary, `pricing` (`getPricingView`). Per-section visibility toggles
(`isSectionVisible`). Editors: `CourseLandingForm`, `LandingFaqEditor`,
`LandingOutcomesEditor`, `LandingReviewsEditor`. Served at `/unauthenticated/courses/[slug]`
by slug or custom domain (`getCourseLandingData` / `…ByDomain`), plus a custom-domain root
listing published courses.

Pricing models (`courseCommerce.ts`): `free` / `one_time` / `subscription` (month|year) /
`hybrid`. Enroll CTA → `/checkout/[courseId]` — public, works logged-out. Guest checkout:
`src/app/actions/guestCheckout.ts` + `src/lib/lms/guestEnrollment.ts` (emits
`student.enrolled` + `payment.completed`). Stripe Connect; payment webhooks at
`api/webhooks/payments`. A code comment on the landing "Enroll" handler flags a known
checkout-page gap left out of scope in the landing-page pass (not independently re-verified here).

### 1.6 Course-level Automations tab — ⚠️→✅ engine wired in Batch 1 (2026-09-02), live verification pending

> **Batch 1 update (2026-09-02).** Findings 1–4 below are the *original* audit state. All
> four are now addressed in code — see **STEP 6.1** for the per-trigger trace and the
> remaining live-verification checklist (`docs/lms-automation-batch1-verification.md`).
> The numbered findings are kept verbatim as the historical baseline.

`courses/[id]/automations/` — full CRUD over `lms_automation_rules` via
`/api/lms/automations` (`requireLmsInstructor`), a visual trigger→condition→action canvas,
active toggle, "Seed core blueprints" (`seedCourseBlueprints`). `RuleModal` offers 8 triggers
and 9 actions.

**The engine behind it does not fully work:**

1. **Rules are workspace-scoped, not course-scoped.** The GET/PATCH/DELETE filter only on
   `workspace_id`; the client fetches `?workspaceId=` (no course id). A rule created from
   Course A's tab also applies to Course B.
2. **6 of 8 triggers are never emitted.** `grep emitLMSEvent` across `src/` + `libs/`
   yields only: `certificate_issued`, `struggling_detected`, `student.enrolled`,
   `payment.completed`, `payment.failed`. There is **no** emit for `course_completed`,
   `lesson_completed`, `quiz_passed`, `quiz_failed`, `module_completed`. Rules on those
   triggers can never fire.
3. **Name mismatch on the one enrolment trigger.** Code emits `student.enrolled`; the rule
   dropdown offers `enrollment_created`. `emitLMSEvent` matches `trigger_type` by exact
   string (`lms-event-bus.ts:30`), so they never match.
4. **Stub actions.** `automation-executor.ts` handles `enroll_course`/`grant_full_access`,
   `grant_partial_access`, `revoke_course`, `add_tag`, `send_email`, `send_whatsapp`,
   `notify_instructor`. `enroll_bundle` and `assign_certificate` fall through to
   `default: warn`. `grant_community` is a `console.log` no-op.
5. Only genuinely working path today: trigger `certificate_issued` **or**
   `struggling_detected` → action `send_email` / `add_tag` / `send_whatsapp` /
   `notify_instructor` / `enroll_course` / `revoke_course`. Delay (`delay_hours`/`delay_days`)
   routes through `lms_delayed_actions` (needs a drain cron — not verified here).

---

## STEP 2 — Student Portal

### 2.1 Dashboard (`student/page.tsx`) — ✅ (was ⚠️ in prior audit)

- **Enrolled courses**, **Avg. progress** — real, lesson-level (`course_progress` count /
  `course_lessons` count) via `getEnrolledCoursesWithProgress`.
- **Quizzes passed**, **Avg. quiz score** — **fixed.** Now `getStudentQuizStats()`
  (`studentProgress.ts:307`): resolves every `contacts.id` for the auth email, reads **both**
  `quiz_attempts` and `module_quiz_attempts` by `student_id IN (contactIds)`, using the real
  `percentage` column. `quizzesPassed` = distinct passed quizzes (lesson + module);
  `avgQuizScore` = mean `percentage` over all attempts. The prior `score_pct`-column error
  and auth-id-vs-contact-id filter bug are both gone.
- **Continue Learning banner** — **fixed / rebuilt.** `ContinueLearningBanner.tsx` now takes
  the already-fetched enrolment list (no query), `pickContinueLearningCourse` returns the most
  recently active `<100%` course (`enrollments.last_active_at`, falls back to `enrolled_at`).
  Deep-links `?restore=true&lessonId=&t=` when `last_lesson_id` exists. Renders nothing if all
  courses complete / none enrolled.
- "My courses" grid — real; thumbnail falls back to an icon by design.

### 2.2 Lesson player (`student/courses/[id]`) — ✅

Content-block + canvas rendering as STEP 1.3/1.4. Completion: per-block
(`lesson_block_completions`), reading/scroll (`lesson_reading_completions`), lesson-level
(`course_progress`). Gating — `lock-utils.ts` `getLessonLockReason`: `coming_soon`,
`paid_locked`, `dripped` (module `drip_days` from `enrolled_at`, + per-lesson `drip`),
`prerequisite` (cross-module + within-module `sequential`/`quiz_gated`). Access gate:
player served only when `isEnrolmentActive(enrollment)`; deactivated → "Access paused" card.
Auto-advance: after the last lesson of a module, if `module.has_module_quiz` and all module
lessons done, the player routes to the module quiz (`StudentPlayerClient.tsx:549`).
Ancillary (present, not deep-audited): `LiveHelpWidget`, `CourseQAWidget` (RAG),
`LessonSummaryPanel`, heartbeat/position-restore, low-bandwidth video.

### 2.3 My Results (`student/results/page.tsx`) — ✅ (new — did not exist in prior audit)

`getStudentResults()` (`studentResults.ts`) keyed on all contact ids:
- **Quiz history** — combined `quiz_attempts` + `module_quiz_attempts`, joined to
  lesson/module → course for titles; nullable FKs handled ("Removed lesson quiz").
- **Assignments** — `lms_assignment_submissions` → status (`pending`/`passed`/`failed`),
  feedback flag, submitted/graded dates, deep-link into the lesson.
- **Certificates** — `course_certificates` rows → course title snapshot, validation id,
  Verify link (`/certificates/verify/<id>`), Download link.
- Stat strip: courses completed, quizzes passed, avg score, assignments submitted.
Plus a per-course progress list. This is a genuinely complete feature.

### 2.4 Course Catalog (`student/marketplace`) — ✅ (search/filter now present)

`getMarketplaceCourses` — `published=true` + tenant-scoped (cookie workspace + every
workspace where the user is a member or has a contact). `MarketplaceClient.tsx` now has:
text search, price filter (`all`/`free`/`paid`), sort (`newest`/`price_asc`/`price_desc`/
`title_az`), clear-filters. **No category/tag filter** (categories not implemented — no
`course_categories` table). Enrolment state per card: Manage / Enrolled–open / Buy & enrol /
Enrol now; `enrollStudent` re-checks admin role and, for paid, requires a paid `invoices` row.

### 2.5 Flashcard review mode (`student/flashcards`) — ✅ (new)

`getStudentFlashcardSets` — every `flashcards` content block across actively-enrolled courses.
Per set: total / known / learning / due counts from `flashcard_reviews`.
`/student/flashcards/[blockId]` → `FlashcardSessionClient`; `recordFlashcardReview` upserts
`flashcard_reviews`. **Resurface schedule is deliberately simple, not SM-2**
(`studentFlashcards.ts:40`): `known` → +3 days, `learning` → +8 minutes; the session re-queues
everything due plus anything never reviewed. Enrolment re-checked on every read/write.

### 2.6 Settings / Profile (`student/settings`) — ✅ (new)

`getStudentSettings` / `updateStudentName` / `updateStudentNotificationPref`
(`studentSettings.ts`). Name edits write to `users` **and every** `contacts` row for the
email (keeps the player sidebar + certificate PDF in sync). Password change reuses existing
`account.ts` / `auth.ts` flows. One notification pref (`course_updates_email`) persisted to
`contacts.notification_preferences`. **Email change is deliberately deferred** (it's the
cross-workspace identity key; downstream propagation unbuilt).

### 2.7 Known open issues in this area

- Legacy `lesson_type` fallback renderers still ship (`code`/`scorm` are mock shims).
- `/portal/*` (the separate CRM-contact portal) is a distinct surface; `/portal/dashboard`
  reads `course_progress.progress_percent` which does not exist on the row-per-lesson table —
  likely always 0 there (not the `/student` portal, noted for completeness).
- Short-answer grading is exact-match against a synonyms list, no fuzzy/AI matching.

---

## STEP 3 — Quizzes

### 3.1 Lesson-level quizzes — ✅ core, ⚠️ question-type coverage

- **Question types:** schema allows `mcq, true_false, short_answer, matching, ordering,
  fill_blank, code, file_upload`. **Original audit state:** student UI rendered inputs for
  only `mcq`/`true_false`/`short_answer`; the other 5 scored 0. **Batch 2 (2026-09-02,
  code-complete — see STEP 6.2):** all 8 now have a real student answer UI and real server
  grading — `matching`/`ordering`/`fill_blank` fully auto-graded, `code` by normalized-text
  match against accepted solutions (no execution), `file_upload` by instructor review (which
  makes that quiz non-instant). `LIVE_GRADED_TYPES` in `quizGrading.ts` now holds 7; grading
  moved to the shared pure module `src/lib/lms/quizGrading.ts`.
- **Server-side grading:** ✅. `submitQuizAttempt` (`studentProgress.ts:145`) recomputes
  score/pass from `quiz_questions` server-side, never trusts a client score, inserts
  `quiz_attempts` (`student_id` = contact id), and on pass writes quiz-block
  `lesson_block_completions` + `markLessonComplete` + runs the struggle processor.
- **Attempt limits:** `quiz_settings.max_attempts` (default 3) → lockout → "Start AI Remedial
  Session" CTA.
- **AI remedial:** ✅. `/student/courses/[id]/remedial` → `generateRemedialAssignment` (AI)
  writes an `lms_remedial_assignments` row; passing it unlocks the quiz (`hasPassedRemedial`).
  Lesson-scoped only.

### 3.2 Module-level quizzes — ✅ (now reachable — prior "orphaned" finding fixed)

Separate real system: `module_quiz_settings` / `module_quiz_questions` (10 live rows) /
`module_quiz_attempts`, scoped via `course_modules`. `submitModuleQuizAttempt`
(`studentProgress.ts:222`): **server-side gate** — `getModuleCompletionStatus` requires every
lesson in the module complete before an attempt is accepted (not just a UI affordance).
`gradeModuleQuizAttempt` grades server-side, inserts the real attempt row.

**Reachability (was the gap):** `SyllabusSidebar.tsx:192-221` renders a module-quiz link when
`mod.has_module_quiz`; `StudentPlayerClient.tsx:549` auto-routes to it after the module's last
lesson. `getModuleQuizAccessStatus` gives the student a real "finish these lessons first"
message. The admin preview player also links to `/courses/[id]/module-quiz/...`.

### 3.3 AI-assisted question generation — ⚠️ real, MCQ-only

`api/ai/generate-questions/route.ts` (`requireLmsInstructor`). Lesson scope: context =
`course_lessons.content` (**note:** live lesson `content` is `{}` — real lesson body lives in
`content_blocks`, which this route does not read, so lesson-scoped generation can be
thin-context). Module scope: context = concatenated `content` of every lesson in the module
(6000-char window). Prompt asks for **exactly 5 MCQs**; inserts `question_type: 'mcq'` into
`quiz_questions` / `module_quiz_questions`. Real OpenAI call (`gpt-4o-mini`, temp 0.5) with a
canned-5-question mock fallback when the key is missing / placeholder
(`sk_mock_key` / contains `PLACEHOLDER` / starts `sk-proj-O15jtbs`). No non-MCQ generation.

### 3.4 Admin quiz analytics — ✅ (reads real attempt data — prior legacy-table issue fixed)

`QuizAnalyticsConsole.tsx` → `getQuizSubmissionsAction(lessonId)` reads `quiz_attempts`;
`getModuleQuizSubmissionsAction(moduleId)` reads `module_quiz_attempts`
(`app/actions/quizzes.ts:95` / `:142`). Both key on `student_id` (contact id) and do a manual
`contacts` join (no DB FK). The legacy `lms_quiz_submissions` table it used to read was
**dropped** in migration `20260903000016`. Per-student attempt grouping, trend, per-question
review, CSV export.

---

## STEP 4 — Certificates

**Substantially rebuilt since `student-portal-audit.md` — that audit is stale here.**

### 4.1 Persisted certificate system — ✅

`course_certificates` (migration `…19`). `GET /api/student/courses/[id]/certificate/route.ts`:
- Verifies eligibility server-side (see 4.2).
- **First issue** writes one row: `validation_id` =
  `LM-<course4>-<contact4>-<randomBytes(4) hex>` (crypto, not `Math.random`), plus
  `student_name_snapshot` + `course_title_snapshot`. `unique(contact_id, course_id)` with a
  race re-read. **Every later download reuses that row** — same id, same date, same names,
  even if the student or course is later renamed. (Prior behaviour: a fresh `Math.random`
  id + fresh date on every download — unverifiable.)
- Streams an A4-landscape PDF via `libs/services/src/pdf/cert-generator.ts` (puppeteer-core
  + `@sparticuz/chromium`).
- Emits `certificate_issued` telemetry.

### 4.2 Completion eligibility — ✅

Route re-checks: `count(course_progress WHERE completed_at IS NOT NULL) >= count(course_lessons)`
(100% lessons) **and** for every lesson that has `quiz_questions`, a passing `quiz_attempts`
row exists for this contact. Fails with 403 otherwise. No student INSERT policy on
`course_certificates` — rows are only ever written by this route via service-role.

### 4.3 Public verification — ✅

`certificates/verify/[id]/page.tsx` — no auth, service-role read, exposes **only**
name / course / issue date / validation id (nothing else). "Certificate verified" vs
"Certificate not found". Linked from My Results.

### 4.4 Certificate design — ⚠️ real, templates only, no auto-send

- `certificate_config` jsonb on **both** `courses` and `workspaces` (migration `…22`).
  Route resolves `courses.certificate_config ?? workspaces.certificate_config ?? {template:'classic'}`.
- `libs/services/src/pdf/cert-templates.ts` — **3 built-in templates**: `classic`, `modern`,
  `editorial`, each with `accentColor` / `logoUrl` / `signatureName` / `signatureTitle` /
  `signatureImageUrl`. Plus a **custom-upload** mode (`customUpload.imageUrl` +
  `placements` per field: `xPct/yPct/fontSize/color/align`) which supersedes `template`.
- Admin UI: `courses/certificates` "Design" tab → `CertificateDesignForm` →
  `saveWorkspaceCertificateConfig` (workspace default); per-course override in
  Course → Settings → Certificate (`CourseCertificateForm` / `CertificateDesignForm`).
- `getAdminCertificates` now reads `course_certificates` (with `courses(title)` + contact
  join), not the legacy `certificates` table; on error it warns and returns `[]` (so the
  page renders empty rather than crashing — but it is no longer *permanently* empty by
  construction, it will list real issued rows).
- **Not built:** automatic send-on-completion (no `emitLMSEvent`/email path issues a
  certificate or emails a link on course completion — `grep` for cert email in
  `lib/automation` + `lib/lms` is empty; the `assign_certificate` automation action is an
  unhandled stub). Delivery today is pull-only: the student downloads from the player sidebar
  (at 100%), My Results, or `/portal/courses`.
- Legacy `lms_certificates` / `lms_certificate_templates` — ⛔ zero code refs, zero rows.

---

## STEP 5 — Course Themes

**✅ genuinely working, per-course, live data.** `src/lib/courses/courseThemeTokens.ts`.

3 themes; internal DB enum keys unchanged (7 pre-existing courses already store them), only
what each produces changed:

| Internal key (`landing_page_settings.template`) | Brand name | Identity | Signature element |
|---|---|---|---|
| `clean_minimal` | **Ember** | warm near-white `#FFFDF9`, vivid orange `#FF6B1A`, rounded sans (Sora), `rounded-3xl` | the "glow" |
| `bold_feature_rich` | **Signal** | near-black `#0B0B0C` + white cards, crimson `#FF1E3C`, high-contrast grotesque, `rounded-none` | rotated/diagonal "seal" |
| `community_coaching` | **Grove** | pale sage `#FBFAF7`, forest green `#16A34A`, warm serif (Lora), organic `28px_12px` radius | branching progress line |

Full token set each: `primaryHex/accentHex`, page bg/surface/text/border/success/error,
gradient/solid/hover/text/border Tailwind classes, heading + body font classes, two radius
scales. `getCourseTheme(template)` defaults to `clean_minimal` (Ember) for `null`.

Applied in: the 3 landing-page templates, the **student player** (`StudentPlayerClient`,
`SyllabusSidebar`, `ModuleQuizShell`), the **canvas lesson builder** (`LessonBuilderContext`),
the **admin course workspace** (`CourseWorkspaceClient`), the create-course wizard preview,
and `CourseThemeMiniPreview` / `ThemeSignature`. Fonts loaded via the project's single Google
Fonts `css2` URL (not `next/font`).

---

## STEP 6 — Honest gaps & known limitations (consolidated)

| # | Area | Gap | Severity |
|---|---|---|---|
| G1 | Automations | 6 of 8 rule triggers (`course_completed`, `lesson_completed`, `quiz_passed`, `quiz_failed`, `module_completed`, `enrollment_created`) are never emitted — rules on them silently never fire | ~~High~~ → **Resolved in code (2026-09-02, Batch 1); live verification pending** — see STEP 6.1 |
| G2 | Automations | Rules are workspace-wide, not per-course, despite living on a per-course tab | ~~Medium~~ → **Resolved in code (2026-09-02, Batch 1); live verification pending** — see STEP 6.1 |
| G3 | Automations | `enroll_bundle` + `assign_certificate` actions are unhandled stubs; `grant_community` is a no-op | ~~Medium~~ → **Partially resolved in code (2026-09-02, Batch 1); live verification pending** — `enroll_bundle` + `assign_certificate` now real; `grant_community` intentionally partial (no forum-ACL concept exists). See STEP 6.1 |
| G4 | Quizzes | 5 of 8 question types (`matching`, `ordering`, `fill_blank`, `code`, `file_upload`) have no student answer UI and always grade 0; the "8 question types" label in the lesson picker overstates it | ~~Medium~~ → **Resolved in code (2026-09-02, Batch 2); live verification pending** — all 8 now have real student UI + server grading (`code` by normalized-text match, not execution; `file_upload` by instructor review). Label is now accurate. See STEP 6.2 |
| G5 | AI quiz gen | MCQ only; lesson-scoped generation reads `course_lessons.content` (`{}` in practice) not the actual `content_blocks`, so lesson-scoped output can be generic | Medium |
| G6 | AI quiz gen | Short-answer grading is exact string match vs a synonyms list — no fuzzy/AI marking | Low |
| G7 | Certificates | No automatic issue/email on course completion — pull-only download | Medium (roadmap item) |
| G8 | Certificates | Design templates real, but no live "preview with real course data" beyond the form; custom-upload placement UX not exercised in this audit | Low |
| G9 | Catalog | No category / tag filter or taxonomy (no `course_categories` table); search is client-side over the already-loaded list | Low |
| G10 | Lesson authoring | Two parallel models (canvas `content_blocks` vs legacy `lesson_type`); `code` + `scorm` legacy lesson types are mock shims only | Medium |
| G11 | Cohorts | `cohorts` / `course_cohorts` tables do not exist — no cohort/group functionality | Low (if not in scope) |
| G12 | Assignments | Grading is manual/staff-driven; no cross-course "assignments due" inbox (My Results lists submitted ones only) | Low |
| G13 | Contact portal | `/portal/dashboard` reads a non-existent `course_progress.progress_percent` — progress likely shows 0 there (separate portal from `/student`) | Low |
| G14 | Legacy tables | `lms_certificates`, `lms_certificate_templates`, `lms_quizzes` remain in the DB, dead (drop deferred — Milestone 5, ADR-0005) | Cosmetic |
| G15 | Landing/checkout | A code comment flags an out-of-scope checkout-page gap from the landing-page pass; guest-checkout payment paths not exercised live in this audit | Unknown — needs live payment test |

## STEP 6.1 — Batch 1 resolution log ("Make Course Automations Actually Work", 2026-09-02)

> Status vocabulary here: **code-complete** = the path is wired and type-checks + unit tests
> pass, but the end-to-end "do the student action, watch the rule fire" proof must be run on a
> live environment (no running app / seeded students available to this pass). The runnable
> checklist is `docs/lms-automation-batch1-verification.md`.

### STEP 0 re-confirm (drift check, 2026-09-02)

- `grep -rn 'emitLMSEvent(' src/ libs/` — real emit sites, pre-Batch-1, emitted exactly:
  `struggling_detected` (`libs/core/src/analytics/struggle-processor.ts`), `certificate_issued`
  (`src/app/api/student/courses/[id]/certificate/route.ts`), `student.enrolled` ×4
  (`src/app/api/webhooks/payments/route.ts`, `src/lib/lms/guestEnrollment.ts`,
  `src/app/actions/studentEnrollments.ts`, `src/app/actions/guestCheckout.ts`),
  `payment.completed` ×2, `payment.failed` ×1, plus the dynamic `triggerEvent` in
  `abandonment-scanner.ts` (`course.abandoned{,.critical}` / `lesson.abandoned` — not in the
  builder dropdown). **Confirmed: 0 of the 6 dropdown triggers were emitted.**
- `completeLesson.ts` *does* emit `lesson_completed` / `module_completed` / `course_completed`
  — but via `publishEvent()` → `@/lib/events/EventBus` → `triggerWorkflows` (the **CRM**
  automation engine), a wholly separate engine from `lms_automation_rules` / `emitLMSEvent`.
  The course Automations tab reads only the latter. **Confirmed** — this is the root cause of
  G1 and the reason a `grep` for the event *names* looked partly populated.
- Trigger-name mismatch **confirmed still present**: emit `student.enrolled` vs dropdown
  `enrollment_created`; `emitLMSEvent` matches `trigger_type` by exact string.
- Scoping **confirmed still present**: `src/app/api/lms/automations/route.ts` GET/PATCH/DELETE
  filtered on `workspace_id` only; client `AutomationsClient.tsx` fetched `?workspaceId=`;
  `emitLMSEvent` matched `(workspace_id, trigger_type, active)` with no course filter.

### G1 — 5 missing triggers now emitted via `emitLMSEvent` (code-complete)

| Trigger | Real emit point added | Idempotency (fires once per genuine transition) |
|---|---|---|
| `lesson_completed` | `src/lib/lms/completeLesson.ts` — inside the post-write telemetry block, beside the existing `publishEvent('lesson_completed')` | The `existing?.completed_at` fast-path `return` near the top of `markLessonCompleteForContact` means an already-complete lesson never re-enters this block. |
| `module_completed` | same file — emitted only when the just-completed lesson takes its module to `completedLessons === moduleLessons.length` | Same fast-path guard; the count test only runs inside the "first completion of this lesson" pass. Emitted from the **write** path, *not* `getModuleCompletionStatus` (a pure read called on every page load — emitting there would re-fire). |
| `course_completed` | same file — emitted when the final lesson takes the course to 100% (same trigger point the certificate auto-eligibility check uses conceptually) | Same fast-path guard. |
| `quiz_passed` / `quiz_failed` (lesson) | `src/app/actions/studentProgress.ts` → `submitQuizAttempt`, right after the server-graded `{ score, passed }` and the `quiz_attempts` insert | One real submit → one attempt row → one emit. Only runs on an actual submit action, never on a page load. Metadata carries the real server score; `min_score` is honoured in `emitLMSEvent`. |
| `quiz_passed` / `quiz_failed` (module) | same file → `submitModuleQuizAttempt`, after the `module_quiz_attempts` insert | Same discipline. |

All five go through the single lesson-completion choke point (`markLessonCompleteForContact`)
or the two server-graded quiz-submit actions — no other code path marks a lesson/module/course
complete or grades a quiz.

### G2 — enrolment trigger name (code-complete)

**Chosen: rename the emitted event `student.enrolled` → `enrollment_created`** at its 4 call
sites (above). Rationale: `enrollment_created` is already the value baked into the builder
dropdown (`RuleModal` `TRIGGERS`), the 5 seeded blueprints (`courseBlueprints.ts`, 3 rules),
and every rule users have already saved to `lms_automation_rules`. The emit side is 4 bare
string literals with **no other consumer** (`emitLMSEvent` only uses the string to match
rules; `payment.completed` is emitted separately and is untouched). Renaming the rule side
would instead have required a data migration of existing rows + editing the blueprints + the
dropdown. Fewer lines of real, working, user-facing code touched.

### G2 — course scoping (code-complete)

- Migration `supabase/migrations/20260903000024_lms_automation_rules_course_scope.sql`: adds
  **nullable** `course_id uuid REFERENCES courses(id) ON DELETE CASCADE` + indexes.
  **NULL = workspace-wide** (a deliberate, distinct category); **non-NULL = fires only for
  that course**. Existing rows are left NULL — their current behaviour is preserved exactly,
  no silent scope change.
- `emitLMSEvent` (`libs/core/src/events/lms-event-bus.ts`): after the `(workspace_id,
  trigger_type, active)` fetch, filters with `ruleMatchesCourse(rule, payload.courseId)` —
  `!rule.course_id || rule.course_id === payload.courseId`.
- `src/app/api/lms/automations/route.ts`: GET accepts `?courseId=` →
  `.or('course_id.eq.<id>,course_id.is.null')`; POST persists `course_id`; PATCH updates it
  only when explicitly supplied.
- `AutomationsClient.tsx` fetches `&courseId=${course.id}`; `RuleModal` receives `courseId`
  and sends it on create; `seedCourseBlueprints` stamps `course_id` on every seeded rule.
- **`certificate_issued` / `struggling_detected` rules already working today**: both emitters
  pass a real `courseId`, and all pre-existing rows are `course_id = NULL`, so
  `ruleMatchesCourse` returns `true` for them unchanged — they keep matching every course, as
  before. Genuinely workspace-wide automations therefore remain a supported category (the
  NULL row); no design question left open. **Note:** the builder has no "scope" control yet —
  every rule *created* from a course tab is now course-scoped, and a legacy NULL row can only
  be re-scoped by a direct `update lms_automation_rules set course_id = … ` (or by deleting
  and recreating it). A scope selector in `RuleModal` is a reasonable follow-up, not a Batch 1
  requirement.
- Pure predicates `ruleMatchesCourse` / `quizScoreGatePasses` extracted to
  `libs/core/src/events/lms-rule-matching.ts` and unit-tested:
  `src/lib/lms/lmsAutomationScoping.test.ts` (8 cases, passing).

### G3 — the 3 stub actions (`libs/workers/src/automation-executor.ts`)

| Action | Status | Implementation |
|---|---|---|
| `enroll_bundle` | **Real** | Delegates to `lms_enroll_bundle` (`src/lib/automation/lms_actions.ts`) — the one existing bundle-enrolment impl (writes `lms_bundle_enrollments` + a child `enrollments` row per course, publishes `student_enrolled_bundle`). Builder now has a real bundle picker (`getBundles` action → `lms_bundles`). |
| `assign_certificate` | **Real** | New shared helper `ensureCourseCertificate` (`src/lib/lms/issueCertificate.ts`) — the persisted, stable-`validation_id`, one-row-per-`(contact,course)` mechanism. `src/app/api/student/courses/[id]/certificate/route.ts` was **refactored onto the same helper**, so there is exactly one certificate-creation path. Emits `certificate_issued` only on a genuine first issue (`cert.created`), so a `certificate_issued → assign_certificate` rule cannot loop. |
| `grant_community` | **Partial — honest** | There is **no per-contact community/forum access gate in this codebase**: `src/app/community/*` is gated purely by workspace membership (`check_workspace_access`), and `contacts.metadata.community_role` (written by the CRM engine's `update_community_privilege`) is read nowhere. Implemented the real, observable effect that *does* have consumers: apply a `community-access` CRM tag (same atomic `add_contact_tag_atomic` RPC as `add_tag`) and stamp `contacts.metadata.community_role`. Logs plainly that forum browsing itself is not yet ACL-gated. Not faked as full success. |

### Live-verification status (STEP 5) — **pending**

Not run this pass: no running app instance + seeded student accounts + writable Supabase were
available. `npx tsc --noEmit` clean; `npx vitest run` 188/188 pass (incl. the 8 new scoping
tests). Per-trigger live steps, expected `[LMS Event Bus]` log lines and the SQL to confirm
`lms_automation_rules` / `lms_delayed_actions` / `course_certificates` / `contacts.tags` rows
are in `docs/lms-automation-batch1-verification.md`. **G1/G2/G3 above are marked
code-complete, not closed, until that checklist is executed.**

### Pre-existing issue noted in passing (not a Batch 1 item)

`executeLMSAction` resolves `courseId = config.courseId || config.course_id` — the **event's**
course id wins over a rule's *configured target* `course_id`. An `enroll_course` /
`revoke_course` action aimed at a *different* course than the trigger's would act on the
trigger's course instead. Out of scope for Batch 1 (not G1–G3), left as-is; the seeded
blueprints all target the same course so they are unaffected.

---

## STEP 6.2 — Batch 2 resolution log ("Missing Quiz Question Types", 2026-09-02)

> Same status vocabulary as STEP 6.1: **code-complete** = wired, `npx tsc --noEmit` clean,
> `npx vitest run` 218/218 pass (30 new in `src/lib/lms/quizGrading.test.ts`). The
> student-answers-each-type + instructor-grades-the-upload end-to-end proof needs a running
> app + seeded student — runbook: `docs/lms-quiz-types-batch2-verification.md`.

### STEP 0 re-confirm (drift check, 2026-09-02)

- Live DB: `quiz_questions` **0 rows**, `module_quiz_questions` **10 rows all `mcq`** — so
  **zero** existing rows of any of the 5 types; free hand on storage shape. Neither table had
  a `metadata` column (columns: `id, lesson_id|module_id, workspace_id, question_type,
  question_text, options, correct_answer, explanation, points, position, created_at`).
- `LIVE_GRADED_TYPES = {mcq, true_false, short_answer}` confirmed in **both** `gradeQuiz.ts`
  and `gradeModuleQuiz.ts`. `StudentQuizClient.tsx` rendered inputs for those 3 only. Split
  was still exactly "3 work, 5 don't".
- **New finding:** the admin `QuizWorkbenchClient` already had authoring UI for all 8 types
  and POSTed a `metadata` object for the 5 — but `/api/lms/quiz/questions` +
  `/api/lms/module-quiz/questions` **silently dropped `metadata`** (never in the insert/update
  payload, no column). So a matching/ordering/etc. question saved with `options: []`,
  `correct_answer: {}`, nothing gradeable. `fill_blank` had no per-blank answer editor at
  all; `code` stored `assertions` (input/expected) that nothing consumed.
- `api/ai/generate-questions` still MCQ-only (unchanged — G5, not this batch).
- `page.tsx` (lesson quiz) passed full rows incl. `correct_answer` straight to the client.

### Storage decision

`metadata jsonb` column added to `quiz_questions` + `module_quiz_questions`
(`20260903000025_quiz_questions_metadata.sql`). Kept the answer key in a **separate** column
(not `correct_answer`) specifically so the student page can strip it — `buildClientQuestion`
in `src/lib/lms/quizGrading.ts` drops `metadata` + `correct_answer` for the 5 new types and
sends only a safe `presentation` object (left items + a **shuffled** right bank; the shuffled
ordering items; the blank text + count; the code starter; the rubric). The 3 existing types
are passed through untouched (their `correct_answer` still ships — the client's optimistic
preview grade for those 3 is unchanged, zero regression). Canonical `metadata` shape per type
is documented in the migration and in `quizGrading.ts`.

### Per-type outcome

| Type | Student UI | Grading | Scope decision |
|---|---|---|---|
| `matching` | dropdown-per-left-item, choosing from a shuffled right bank | server: every pair must match the stored mapping (all-or-nothing per question, like the existing 3) | none — fully auto-gradable |
| `ordering` | real drag-to-reorder (`@hello-pangea/dnd`, the project's existing DnD lib) | server: submitted order must equal the stored order exactly | none — fully auto-gradable |
| `fill_blank` | inline `<input>` per `[blank]`, rendered into the sentence | server: **reuses the short-answer matcher** (`matchesAccepted`) per blank against a per-blank accepted list; all blanks must match; honours `case_sensitive` | none — added the missing per-blank accepted-answers editor to the admin workbench |
| `code` | monospace `<textarea>` seeded with the starter template | server: `normalizeCodeSubmission` (trim lines, collapse whitespace, drop blank lines / CRLF) then exact-match against any stored **accepted solution** — **the code is NOT executed** | **SCOPED DOWN** per prompt. Real execution/test-runner is a separate large project. Admin editor shows an amber note "graded by matching against accepted solutions, not by running the code"; the student sees the same caveat. Replaced the old unused `assertions` editor with an "accepted solutions" editor. |
| `file_upload` | reuses the existing student upload flow (`/api/lms/upload`, `pathPrefix=student-assignments`) — identical to the in-lesson Assignment upload | **manual**: `gradeQuestionSet` marks the attempt `pendingManual`; `submitQuizAttempt` inserts it `grade_status='pending_review'`, `passed=NULL`, does **not** complete the lesson or fire `quiz_passed`/`quiz_failed`. Instructor grades from `QuizAnalyticsConsole` → new `gradeQuizAttemptManualReview` action → recomputes `auto + awarded` points, sets `passed`, and (lesson scope, now passing) runs block-completion + `markLessonCompleteForContact` + emits the event. | **SCOPED DOWN** per prompt — no auto-grade. Explicit behaviour change: **a quiz containing a `file_upload` question is no longer instant / fully automated.** Surfaced to the student (amber banner on the quiz + "awaiting review" result screen) and to the admin (amber note in the editor + "Pending review" state in the results console). Did **not** reuse `lms_assignment_submissions` (its `unique(contact_id, lesson_id)` would collide with a real lesson assignment); review state lives on the attempt row (`20260903000026_quiz_attempts_manual_review.sql`: `grade_status`, `auto_score`, `manual_points_awarded`, `reviewer_feedback`, `graded_by_user_id`, `graded_at`). |

### Labeling (STEP 4)

After this batch all 8 types genuinely function, so `LessonTypePicker.tsx`'s "8 question
types" is now **accurate** and left as-is. `docs`/help copy (`src/app/actions/help.ts:725`)
already enumerated all eight and is now true. **Still overstated, out of this batch's scope:**
`src/app/(marketing)/landing/data.tsx` says "**10** quiz question types" (there are 8) —
flagged, not changed (marketing copy, separate decision).

### Files changed

- Migrations: `20260903000025_quiz_questions_metadata.sql`,
  `20260903000026_quiz_attempts_manual_review.sql`.
- New: `src/lib/lms/quizGrading.ts` (pure: `gradeSingleQuestion`, `gradeQuestionSet`,
  `gradeWithManualAwards`, `buildClientQuestion`, `normalizeCodeSubmission`, `matchesAccepted`,
  `stableShuffle`, `LIVE_GRADED_TYPES`, `MANUAL_REVIEW_TYPES`) + `quizGrading.test.ts` (30).
- `src/lib/lms/gradeQuiz.ts`, `gradeModuleQuiz.ts` → delegate to `gradeQuestionSet`; return
  `pendingManual` + `autoRawScore`.
- `src/app/actions/studentProgress.ts` → `submitQuizAttempt` / `submitModuleQuizAttempt`
  handle the `pending_review` insert + early return.
- `src/app/actions/quizzes.ts` → `getQuizSubmissionsAction` / `getModuleQuizSubmissionsAction`
  now also return `answers` / `grade_status` / `max_score` / `auto_score` /
  `manual_points_awarded` / `reviewer_feedback`; new `gradeQuizAttemptManualReview`.
- `src/app/api/lms/quiz/questions/route.ts` + `…/module-quiz/questions/route.ts` → persist
  `metadata` on POST + PATCH.
- `src/app/student/courses/[id]/quiz/[quizId]/StudentQuizClient.tsx` → 5 new answer
  components + file upload + `pendingReview` result state; optimistic client preview now only
  when every question is one of the 3 client-gradable types.
- `src/app/student/courses/[id]/quiz/[quizId]/page.tsx` + `…/module-quiz/[moduleId]/page.tsx`
  → `.map(buildClientQuestion)` before handing questions to the client.
- `src/app/courses/[id]/quiz/[quizId]/QuizWorkbenchClient.tsx` → per-blank accepted-answers
  editor; `code` "accepted solutions" editor + caveat; `file_upload` "not instant" note;
  `metadata` shapes aligned to `quizGrading.ts`.
- `src/app/courses/[id]/quiz/[quizId]/QuizAnalyticsConsole.tsx` → "Pending review" state in
  the roster + a `ManualReviewPanel` (open file, award points ≤ question points, feedback,
  finalise).

### Known limitations / honest notes (Batch 2)

- **Not live-verified.** No running app + seeded student this pass. Migrations **not** applied
  to any DB by this change (consistent with Batch 1 — production migration is a Milestone 5
  gate item).
- **Deploy coupling:** `submitQuizAttempt` / `submitModuleQuizAttempt` now always write
  `grade_status` + `auto_score`, so migration `…26` MUST be applied before or with this code
  or **every** quiz submission breaks (not just the new types). Ship them together.
- `matching` / `ordering` / `fill_blank` are **all-or-nothing per question** (no partial
  credit) — deliberately consistent with how `mcq`/`short_answer` already score.
- `code` grading is **string comparison, not execution** — a functionally-correct solution
  the instructor didn't list as an accepted variant scores 0. This is the documented scope
  cut; real execution is a separate project.
- `file_upload` inherits the **same workspace-membership constraint** as the existing
  in-lesson Assignment upload: `/api/lms/upload` calls `requireWorkspaceAccess()`, so a
  contact-only `/student` user with no `workspace_members` row can't upload. Pre-existing,
  shared with Assignments, not introduced here.
- A `pending_review` attempt **counts toward `max_attempts`** for a lesson quiz. A student
  who submits a file-upload quiz and is then out of attempts sees the remedial CTA while the
  review is still pending. Minor; left as-is (it is a real attempt).
- `ordering` uses pointer drag (`@hello-pangea/dnd`); no keyboard-only reorder fallback was
  added.

---

### What IS solid (verified this pass)

Course creation + theming; module/lesson curriculum with real drip + sequential + prerequisite
locking; all 12 content-block types authoring **and** student rendering; canvas lesson builder
with canvas↔player parity and the text-only reading gate; 3 landing templates with real
data-bound sections + guest-capable checkout wiring; the full student portal (dashboard with
the quiz-stat bugs fixed, rebuilt Continue Learning, complete My Results page, catalog with
search/filter, standalone flashcard review, settings); server-side lesson- and module-quiz
grading with real attempt persistence and analytics; the persisted certificate system with
stable verification ids, name/title snapshotting, public verification, and 100%-lessons +
all-quizzes-passed eligibility; 3 genuinely distinct course themes applied across landing,
player and admin.

---

## Appendix — key file references

- Student: `src/app/student/{page,layout}.tsx`, `student/results/page.tsx`,
  `student/flashcards/{page,[blockId]}`, `student/settings/*`,
  `student/courses/[id]/StudentPlayerClient.tsx` (+ `components/lock-utils.ts`,
  `SyllabusSidebar.tsx`), `student/courses/[id]/quiz/[quizId]/StudentQuizClient.tsx`,
  `student/courses/[id]/module-quiz/[moduleId]/*`.
- Actions: `src/app/actions/studentProgress.ts`, `studentResults.ts`, `studentEnrollments.ts`,
  `studentFlashcards.ts`, `studentSettings.ts`, `quizzes.ts`, `lms.ts`, `courseCommerce.ts`,
  `courseLanding.ts`, `guestCheckout.ts`, `lms/certificates.ts`, `courseBlueprints.ts`.
- Lib: `src/lib/lms/{gradeQuiz,gradeModuleQuiz,moduleCompletion,completeLesson,access}.ts`,
  `src/lib/courses/courseThemeTokens.ts`, `src/lib/builder/lessonTemplates.ts`.
- API: `src/app/api/lms/{automations,module-quiz/*,quiz/*}`, `api/ai/generate-questions`,
  `api/student/courses/[id]/certificate/route.ts`, `api/webhooks/payments`.
- Certificate PDF: `libs/services/src/pdf/{cert-generator,cert-templates}.ts`.
- Automation engine: `libs/core/src/events/lms-event-bus.ts`,
  `libs/workers/src/automation-executor.ts`.
- Admin: `src/app/courses/components/CreateCourseWizard.tsx`,
  `courses/[id]/components/blocks/*`, `courses/[id]/automations/*`,
  `courses/[id]/lessons/[lessonId]/builder/page.tsx`, `courses/certificates/*`,
  `src/components/courses/landing-pages/Template*.tsx`, `src/components/builder/BuilderEditor`.
- Migrations: `supabase/migrations/2026090300000{3,8,12,13,14,15,16,18,19,20,21,22,23}_*.sql`,
  `20240101000171_lms_admin.sql`, `20240101000190_lms_assignment_submissions.sql`.
