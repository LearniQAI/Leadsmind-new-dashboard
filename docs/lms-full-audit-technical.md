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
- **Batch 7 (2026-09-02, see STEP 6.7):** the legacy `lesson_type` authoring path (and its
  `code`/`scorm` mock shims) has been fully retired — canvas/`content_blocks` is now the only
  lesson-authoring model, everywhere. `LessonTypePicker.tsx` was deleted.

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

- ~~Legacy `lesson_type` fallback renderers still ship (`code`/`scorm` are mock shims).~~
  Resolved — Batch 7 (STEP 6.7).
- ~~`/portal/*`... reads `course_progress.progress_percent` which does not exist...~~
  Resolved — Batch 5 (STEP 6.5).
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

`api/ai/generate-questions/route.ts` (`requireLmsInstructor`). **Original audit state:**
context for both scopes was `course_lessons.content` (`{}` in practice) — see 3.3 history.
**Batch 3 (2026-09-02, code-complete — see STEP 6.3):** both scopes now assemble real text
from `content_blocks` via `src/lib/lms/lessonContentForAI.ts` — `rich_text`, `reading`/
`slides` text, `assignment` instructions, `flashcards`, video/audio titles (no transcript
field exists), `html_code` visible text — with `course_lessons.content` kept as a legacy
string fallback. Lesson window 1500→4000 chars, module window 6000→8000 chars. Confirmed
(STEP 6.3) that module-scope's old apparent edge was never real body content — it was
leaking every lesson's *title* into the prompt while lesson-scope leaked only one. Prompt
asks for **exactly 5 MCQs**; inserts `question_type: 'mcq'` into `quiz_questions` /
`module_quiz_questions`. Real OpenAI call (`gpt-4o-mini`, temp 0.5) with a canned-5-question
mock fallback when the key is missing / placeholder (`sk_mock_key` / contains `PLACEHOLDER` /
starts `sk-proj-O15jtbs`, now `src/lib/ai/openaiKey.ts::getUsableOpenAIKey`). **Still MCQ-only**
— unchanged, out of Batch 3 scope.

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
- **Original audit state:** no automatic send-on-completion — pull-only download. **Batch 4
  (2026-09-02, code-complete — see STEP 6.4):** a seeded, on-by-default automation rule chain
  (`course_completed → assign_certificate`, `certificate_issued → send_certificate_email`)
  now delivers the certificate automatically, reusing the persisted `ensureCourseCertificate`
  path and a real dedicated email template. Still pull-download-capable exactly as before —
  this adds delivery, it doesn't replace the manual download.
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
| G5 | AI quiz gen | MCQ only; lesson-scoped generation reads `course_lessons.content` (`{}` in practice) not the actual `content_blocks`, so lesson-scoped output can be generic | ~~Medium~~ → **Content source resolved in code (2026-09-02, Batch 3); live verification pending** — both scopes now assemble real text from `content_blocks`. Still MCQ-only (out of Batch 3 scope). See STEP 6.3 |
| G6 | AI quiz gen | Short-answer grading is exact string match vs a synonyms list — no fuzzy/AI marking | ~~Low~~ → **Resolved in code (2026-09-02, Batch 3); live verification pending** — deterministic fuzzy matching (punctuation-insensitive + capped edit-distance) now default for `short_answer` + `fill_blank`; opt-in per-question AI-semantic grading added, **default off**. See STEP 6.3 |
| G7 | Certificates | No automatic issue/email on course completion — pull-only download | ~~Medium~~ → **Resolved in code (2026-09-02, Batch 4); live verification pending** — seeded rule chain (`course_completed → assign_certificate → certificate_issued → send_certificate_email`), on by default for new courses, real explicit toggle for existing ones. See STEP 6.4 |
| G8 | Certificates | Design templates real, but no live "preview with real course data" beyond the form; custom-upload placement UX not exercised in this audit | Low |
| G9 | Catalog | No category / tag filter or taxonomy (no `course_categories` table); search is client-side over the already-loaded list | ~~Low~~ → **Resolved in code (2026-09-02, Batch 6); live verification pending** — real, flat, single-category-per-course taxonomy, admin-manageable, composes with search/price/sort. Search is still client-side over the loaded list (unchanged, out of scope). See STEP 6.6 |
| G10 | Lesson authoring | Two parallel models (canvas `content_blocks` vs legacy `lesson_type`); `code` + `scorm` legacy lesson types are mock shims only | ~~Medium~~ → **Fully resolved in code (2026-09-02, Batch 7); live verification pending** — legacy per-`lesson_type` system fully retired (student renderer, admin type-picker, admin preview player); `code`/`scorm` removed everywhere as options, not just deprioritized. Zero real lessons required migration. See STEP 6.7 |
| G11 | Cohorts | `cohorts` / `course_cohorts` tables do not exist — no cohort/group functionality | Low (if not in scope) |
| G12 | Assignments | Grading is manual/staff-driven; no cross-course "assignments due" inbox (My Results lists submitted ones only) | ~~Low~~ → **Resolved in code (2026-09-02, Batch 8); live verification pending** — unified "My Work" section on My Results (not-submitted / awaiting review / needs revision / recently graded), covering assignments AND Batch 2's file-upload pending-review quiz attempts together; a real cross-course admin "Needs grading" queue also built. **Depends on Batch 2's migration `…026` being applied** — see STEP 6.8 |
| G13 | Contact portal | `/portal/dashboard` reads a non-existent `course_progress.progress_percent` — progress likely shows 0 there (separate portal from `/student`) | ~~Low~~ → **Resolved in code (2026-09-02, Batch 5); live verification pending** — real per-course completed/total calculation, same formula `/student` uses. See STEP 6.5 |
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

## STEP 6.3 — Batch 3 resolution log ("AI Generation Content Source + Fuzzy Grading", 2026-09-02)

> Same status vocabulary as 6.1 / 6.2: **code-complete** = wired, `npx tsc --noEmit` clean,
> `npx vitest run` **226/226** (8 new fuzzy-matching tests in `quizGrading.test.ts`), plus a
> live read of the real `content_blocks` to confirm the new AI context source (below). A real
> end-to-end OpenAI generation run + a real student fuzzy/AI-graded submission need a running
> app — runbook: `docs/lms-quiz-types-batch3-verification.md`. **No migrations in this batch.**

### STEP 0 re-confirm (drift check, 2026-09-02)

- `api/ai/generate-questions/route.ts` (unchanged since the original audit): **lesson scope**
  read `course_lessons.content`, `JSON.stringify`'d it, `contentLimit = 1500`. **Module
  scope** read `course_lessons.content` for every lesson in the module and joined them as
  ``Lesson "<title>": <stringified content>``, `contentLimit = 6000`. Neither read
  `content_blocks`. MCQ-only.
- Live DB: **0 of 3** `course_lessons` rows have non-empty `content` (all `{}`). No legacy
  non-empty `content` anywhere on this workspace — the audit's "maybe some pre-canvas lessons
  still have body text" hypothesis is **not** confirmed here (kept as a cheap fallback anyway
  for other workspaces).
- `content_blocks` (15 live rows) has **no** `rich_text` / `assignment` / `slides` rows on
  this workspace; the real text present is video-block `content.title`
  ("Adverb | 5 Types of Adverb | Parts of speech"), `html_code` `content.html`, and one audio
  embed. No `transcript` field exists on `video` or `audio` blocks (confirmed) — video/audio
  contribute only their title/description.
- Grading matcher (post-Batch-2 `quizGrading.ts::matchesAccepted`, shared by `short_answer`
  **and** every `fill_blank` blank): `String(x).trim().replace(/\s+/g,' ')` + `.toLowerCase()`
  unless `case_sensitive`, then **exact `===`** against each accepted string. **No**
  punctuation handling, **no** edit-distance.

### G5 — why module-scope "seemed to work better" (confirmed)

Both scopes read the same empty `course_lessons.content`. The difference is entirely in the
string each handed the model:

- **Lesson scope** put `JSON.stringify(lesson.content)` — literally `"{}"` — into the `content`
  variable. The lesson *title* went only into the separate `title` var / the prompt's
  `"${title}"`. So the model got **one title + "{}"**.
- **Module scope** built ``Lesson "${l.title}": {}`` for **every** lesson in the module. That
  string carries **every lesson title** in the module — 6–10 real topic phrases
  ("Adverbs", "Present perfect", "Phrasal verbs", …) — which is genuine content signal a
  model can write plausible questions from.

So module-scope was never reading lesson *bodies* either; it just leaked far more **titles**.
Neither was using real content.

### G5 — fix (code-complete)

- New `src/lib/lms/lessonContentForAI.ts` → `assembleLessonContext(db, lessonIds[])`. Per
  lesson it gathers, in block order: `rich_text` (HTML-stripped prose — primary signal),
  `reading`/`slides` (`content.text/.body/.caption` + title; **PDF binaries are not text-
  extracted anywhere in the codebase — a file-only reading block contributes just its
  title/caption, stated**), `assignment` (`content.instructions`), `flashcards` (front/back
  pairs), `video`/`audio` (**title + description only — no transcript field exists**),
  `html_code` (HTML-stripped *visible* text, capped), `embed`/`download`/`live_session`
  (author label if set). Plus `course_lessons.content` as a legacy string fallback. `htmlToText`
  helper (tag strip + the ~6 entities that actually occur), 2000-char cap per block.
- `api/ai/generate-questions/route.ts`: **lesson scope** → `assembleLessonContext([lesson_id])`,
  `contentLimit` 1500 → **4000**. **Module scope** → `assembleLessonContext(<all module
  lesson ids>)` (replacing the `Lesson "title": {}` join with the real per-lesson assembled
  text, still headed `Lesson "<title>":`), `contentLimit` 6000 → **8000** (~2k tokens, well
  inside gpt-4o-mini). Prompt now says "base every question strictly on the provided content"
  — or, when the assembled body is < ~120 real chars, "content is sparse — base on the title
  + general knowledge" (so a thin course still generates something usable rather than
  hallucinating detail).
- **Live check (2026-09-02):** ran the assembler's logic against the 3 real lessons — the AI
  now receives, e.g., `Adverb | 5 Types of Adverb | Parts of speech` (video title) and the
  `html_code` visible text ("My First Webpage", "Welcome to My Website", …) where it
  previously received `"{}"`. On a genuinely content-rich course (real `rich_text` / reading
  prose) it would pull substantial body text; output quality is now bounded by **what authors
  put in blocks**, not by a hardcoded empty column.
- **Not changed:** still MCQ-only, still `gpt-4o-mini` temp 0.5, still the same placeholder-key
  mock fallback. Non-MCQ generation is a separate item, not in Batch 3's scope.

### G6 — deterministic fuzzy matching (code-complete, DEFAULT ON)

`quizGrading.ts::matchesAccepted` is now three tiers, first hit wins:

1. **exact** after trim + whitespace-collapse (+ case-fold unless `case_sensitive`) —
   byte-identical to the pre-Batch-3 rule, so nothing that passed before regresses.
2. **punctuation-insensitive** — `normalizeForFuzzy` strips `.,;:!?'"()[]{}<>/\|@#%^*_~+=-`
   and quote variants, collapses space (respects `case_sensitive`).
3. **edit-distance** — `levenshtein()` is Optimal String Alignment (Damerau-Levenshtein: an
   adjacent transposition = 1 edit, e.g. `recieve`→`receive`), accepted when
   `distance ≤ typoTolerance(max(len))` where tolerance is **0 for ≤4 chars, 1 for 5–7,
   2 for ≥8** (capped at 2).

Verified (unit): `mitochondira`→`mitochondria`, `recieve`→`receive`, `Newton's 2nd Law.`→
`newtons 2nd law`, ` photosynthesis!!! `→`photosynthesis` all accept; `cat`↛`cot`,
`42`↛`24`, `ion`↛`eon`, `respiration`↛`photosynthesis`, `France`↛`Germany` all still reject.
`matchesAccepted(..., { fuzzy: false })` restores pure exact. `mcq`/`true_false` grading is
untouched (they never call this matcher).

### G6 — opt-in AI-semantic grading (code-complete, DEFAULT OFF)

- **Toggle:** per-question, `quiz_questions.metadata.ai_grading` (the `metadata` column added
  in Batch 2 — **no new migration**). Surfaced only for `short_answer` + `fill_blank` in
  `QuizWorkbenchClient` as an explicit opt-in checkbox with a plain-language cost/
  non-determinism warning. `handleNewQuestion` resets it to `false`.
- **Path:** new `src/lib/lms/aiGradeAnswer.ts` → `applyAiGradingPass(base, questions, answers,
  passPct)`, called by `gradeQuizAttempt` / `gradeModuleQuizAttempt` / the file-upload
  `gradeQuizAttemptManualReview` **after** the deterministic grade. It only calls OpenAI for a
  question that is (a) `short_answer`/`fill_blank`, (b) `metadata.ai_grading === true`, (c)
  scored **0** deterministically, and (d) has a non-empty answer. So a correct answer never
  costs a call; the non-determinism only ever affects an answer the cheap path already
  rejected. `aiJudgeAnswer` uses the established raw-fetch `gpt-4o-mini` pattern at
  **temperature 0**, `response_format: json_object`, `{ "correct": true|false }`.
- **Mock fallback** (`getUsableOpenAIKey()` — the same `sk_mock_key`/`PLACEHOLDER`/
  `sk-proj-O15jtbs` guard, factored into `src/lib/ai/openaiKey.ts`): returns `false`, i.e.
  AI grading contributes nothing without a real key and the deterministic result stands. It
  never silently accepts.
- `fill_blank` with AI on: each still-failing blank is judged against its own accepted list;
  the question is awarded only if **every** blank ends up acceptable.

### Files changed (Batch 3)

- New: `src/lib/lms/lessonContentForAI.ts`, `src/lib/lms/aiGradeAnswer.ts`,
  `src/lib/ai/openaiKey.ts`.
- `src/lib/lms/quizGrading.ts` — 3-tier `matchesAccepted` + `levenshtein` (OSA) +
  `typoTolerance` + `normalizeForFuzzy`; `quizGrading.test.ts` +8.
- `src/lib/lms/gradeQuiz.ts`, `gradeModuleQuiz.ts` — `await applyAiGradingPass(...)` after the
  deterministic grade.
- `src/app/actions/quizzes.ts` — `gradeQuizAttemptManualReview` runs the AI pass too.
- `src/app/api/ai/generate-questions/route.ts` — `assembleLessonContext` for both scopes;
  4000 / 8000 char windows; sparse-content prompt branch.
- `src/app/courses/[id]/quiz/[quizId]/QuizWorkbenchClient.tsx` — `AiGradingToggle` for
  `short_answer` + `fill_blank`; `metadata.ai_grading` load/save/reset.

### Known limitations / honest notes (Batch 3)

- **Not live-verified.** Assembler logic was run against live `content_blocks`; no live OpenAI
  generation run and no live student submission this pass.
- On the current demo workspace the block text is genuinely thin (no `rich_text`/reading
  prose authored) — the assembler extracts every real signal that exists (video titles,
  html_code text) but can't manufacture content that authors didn't write. The sparse-content
  prompt branch handles this.
- Fuzzy tolerance is deliberately conservative (cap 2, 0 for short answers): it will still
  reject a 3-edit typo on a long answer and any 1-edit difference on a ≤4-char answer. A
  numeric answer like `42` gets zero tolerance (correct — `24` must not match).
- AI-semantic grading is genuinely **non-deterministic** at the margin — the same borderline
  answer *can* be graded differently on a retake. This is why it's opt-in, default off, and
  fallback-only. It is also not retro-applied: turning it on doesn't re-grade past attempts.
- The AI judge makes **one call per still-wrong AI-enabled question per submission**; a
  `fill_blank` with several wrong blanks makes one call per wrong blank. No batching.
- `applyAiGradingPass` has no unit test that exercises a real model (would be non-
  deterministic); it's covered by the "no candidates → returns base unchanged, zero calls"
  path via the existing grader tests.

---

## STEP 6.4 — Batch 4 resolution log ("Automatic Certificate Issuance & Delivery", 2026-09-02)

> Same status vocabulary as 6.1–6.3: **code-complete** = wired, `npx tsc --noEmit` clean,
> `npx vitest run` still 226/226 (no new pure-logic surface here to unit-test — this batch is
> DB/event-orchestration, same category as `gradeQuizAttemptManualReview` in Batch 2, which
> also has no unit test, by the same precedent). Runbook:
> `docs/lms-certificate-delivery-batch4-verification.md`. **One migration** (below).

### STEP 0 — design decision: (a), as recommended

Chose the seeded on-by-default rule chain over a hardcoded system behaviour. The STEP 1 audit
found no real ordering/race concern that would force option (b) — see "chain execution" below.
Certificate delivery is therefore a normal, visible, editable pair of rows in the same
`lms_automation_rules` table as everything else on the Automations tab, exactly like every
other real automation in this codebase.

### STEP 1 audit findings

- **Email infra confirmed and reused, not duplicated.** `sendCourseOnboardingEmail`
  (`src/lib/lms/onboardingEmail.ts`) is the one other real templated LMS email: Resend via
  `sendEmail()` (`src/lib/email.ts`, fail-**closed** on a missing/placeholder key — throws),
  `getWorkspaceEmailConfig` for the workspace's own sender, wrapped in a try/catch that is
  fail-**soft** at the caller (logs, returns `{sent:false, reason}`, never throws back out).
  New `src/lib/lms/certificateEmail.ts::sendCertificateEarnedEmail` copies this exact shape.
- **Real, found-not-assumed bug: the generic `send_email` automation action does not
  interpolate `{{variables}}`** — `automation-executor.ts`'s `send_email` case does
  `` `<div>${config.email_body || ''}</div>` `` with no `render()` step, so the 5 pre-existing
  seeded blueprints (e.g. "Free Enrolment Flow") actually send literal `{{student_first_name}}`
  text today. This is why a **dedicated action type** (`send_certificate_email`, own fixed
  template, not reusing `send_email`) was the right call, not a side effect avoided — reusing
  the broken generic path would have shipped an unrendered template. Not fixed here (separate,
  pre-existing issue, out of Batch 4's scope) but now documented.
- **Chain execution — confirmed to cascade correctly, and a real gap was found and closed.**
  `emitLMSEvent` executes `executeLMSAction` synchronously (`await`, no queue) for a
  no-delay rule, and `assign_certificate`'s own action handler `await`s a **nested**
  `emitLMSEvent('certificate_issued', ...)` on a genuine first issue — so
  `course_completed → assign_certificate → certificate_issued → send_certificate_email` runs
  as one real, awaited call chain within a single request. **Real gap found:** `emitLMSEvent`
  built the executor's `config` from only `rule.action_config` + `courseId/lessonId/moduleId`
  — it never passed the triggering event's `metadata` through, so `send_certificate_email`
  had no way to read the `validationId` `assign_certificate`'s emit carried. **Fixed:**
  `emitLMSEvent` now spreads `payload.metadata` into the action config (rule config wins on
  any key collision), for both the immediate-execution and delayed-action paths.
- **Loop safety re-verified for the chained scenario specifically, not just standalone.**
  `assign_certificate` only re-emits `certificate_issued` when `ensureCourseCertificate`
  reports `created: true` — and that flag comes from a real DB check (existing row → `false`),
  not from in-memory state. So even a deliberately misconfigured
  `certificate_issued → assign_certificate` rule self-terminates: the second call finds the
  row `assign_certificate` itself just inserted, gets `created:false`, and does not re-emit.
  No infinite loop possible through this action.
- **Second real gap found: the certificate DOWNLOAD route's own `certificate_issued` emit was
  unconditional** — every re-download (not just the first) re-fired the event. Harmless before
  any `certificate_issued` rule existed; **once this batch seeds one, every re-download would
  have sent a fresh "you earned your certificate!" email.** This is exactly the chained-rule
  idempotency risk STEP 1 asked to re-verify, and it did NOT hold. **Fixed:**
  `api/student/courses/[id]/certificate/route.ts` now gates that emit on `cert.created`,
  matching `assign_certificate`'s own guard.
- **`seedCourseBlueprints` re-run safety:** confirmed unsafe as-is — it unconditionally
  `insert()`s all 5 blueprints with no existence check, so clicking its button twice
  duplicates every rule. Batch 4 does **not** add its 2 rules to that array. Instead, new
  `seedCertificateDeliveryBlueprint(courseId, workspaceId)` checks for an existing
  `course_completed` + `assign_certificate` row scoped to the course **first** and no-ops if
  found — safe to call automatically on every course creation and safe to re-trigger by hand.

### STEP 2 — build

- **New action type `send_certificate_email`** (`automation-executor.ts`) — real
  congratulatory template (`certificateEmail.ts`): student's real first name, real course
  title, a **real download link** to the existing authenticated
  `/api/student/courses/[id]/certificate` route + a verify link, sent via the same
  Resend/`getWorkspaceEmailConfig` infra. **Decision: link, not PDF attachment** — generating
  the attachment would mean a second real Puppeteer/`@sparticuz/chromium` render inside the
  automation event-bus's synchronous call stack (already mid-chain through other rules), for
  no benefit over a link to the one canonical, always-current PDF-generation path
  (`issueCertificate.ts`'s explicit "exactly ONE certificate-creation path" principle). Stated
  here as the open question the original certificate work flagged, now closed.
- **`lms_automation_rules.action_type` CHECK constraint didn't allow the new value** —
  confirmed live (migration `20240101000171_lms_admin.sql`'s enum). New migration
  `20260903000027_lms_automation_send_certificate_email_action.sql` adds
  `'send_certificate_email'` to the allowed list. (No other schema change this batch —
  `course_certificates`, `lms_automation_rules.course_id`, and `metadata` all already exist
  from Batches 1–2.)
- **Seeding:** `seedCertificateDeliveryBlueprint` called (a) automatically from
  `createCourseWithDomain`, fail-soft, right after a course is created — every **new** course
  gets the chain; (b) via a new explicit `enableCertificateDelivery` server action, exposed as
  a real **"Enable certificate delivery"** button in the course Automations tab (only shown
  when the course doesn't already have the chain — computed from the loaded rules, not
  assumed) — the real, transparent way to backfill an **existing** course, per Step 2's
  either/or: chosen "a real admin-triggered action," not a silent one-off migration script.
- **Rule visibility:** `send_certificate_email` added to `RuleModal`'s action dropdown with
  its own no-config explainer, and to the Automations canvas's action-icon switch
  (`assign_certificate` → award icon, `send_certificate_email` → mail icon) — both seeded
  rules render and edit exactly like any hand-built rule.
- **Fail-soft confirmed by construction:** `sendCertificateEarnedEmail` catches every error
  internally and returns `{sent:false, reason}` — `automation-executor.ts`'s
  `send_certificate_email` case never throws it back into `emitLMSEvent`'s loop, so one rule
  failing to email never stops the certificate (already persisted by the earlier
  `assign_certificate` step) or any other rule.

### STEP 3 — idempotency, end to end (verified by code trace)

1. Student completes final lesson → `markLessonCompleteForContact`'s **first-completion fast
   path** (existing `existing?.completed_at` guard, unchanged from Batch 1) means
   `course_completed` fires **exactly once** per genuine 100%-completion event.
2. `assign_certificate` → `ensureCourseCertificate`: unique `(contact_id, course_id)` DB
   constraint + race-safe re-read → **exactly one** `course_certificates` row ever, `created`
   true only the first time.
3. `certificate_issued` emitted **only when `created:true`** — both call sites now agree
   (`assign_certificate` already did; the download route is the fix above) → **exactly one**
   `certificate_issued` event per student per course, regardless of how many times the route
   is hit or the completion recalculated.
4. `send_certificate_email` therefore runs **at most once** per student per course. A
   re-triggered completion recalculation (Batch 1's flagged risk) hits step 1's fast path and
   never reaches step 2 again; even if it somehow did, step 2's DB-level idempotency absorbs
   it before an event is ever re-emitted.
5. The manual "download my certificate" button and the admin issued-certificates list are
   unaffected — both still read the same single `course_certificates` row via
   `ensureCourseCertificate` / `getAdminCertificates`; nothing about this batch changes what
   they show.

### Files changed (Batch 4)

- Migration: `20260903000027_lms_automation_send_certificate_email_action.sql`.
- New: `src/lib/lms/certificateEmail.ts`.
- `libs/workers/src/automation-executor.ts` — `send_certificate_email` case.
- `libs/core/src/events/lms-event-bus.ts` — pass `payload.metadata` into the executed action's
  config (both immediate and delayed paths).
- `src/app/api/student/courses/[id]/certificate/route.ts` — gate the `certificate_issued`
  emit on `cert.created` (bug fix, required for chain idempotency).
- `src/app/actions/courseBlueprints.ts` — `seedCertificateDeliveryBlueprint` (idempotent) +
  `enableCertificateDelivery` (auth-gated action).
- `src/app/actions/lms.ts` — `createCourseWithDomain` seeds the chain on every new course,
  fail-soft.
- `src/app/courses/[id]/automations/AutomationsClient.tsx` — "Enable certificate delivery"
  button (state-aware) + action icons.
- `src/app/courses/[id]/automations/components/RuleModal.tsx` — `send_certificate_email` in
  the action dropdown + explainer.

### Known limitations / honest notes (Batch 4)

- **Not live-verified.** No running app / real email send / real student completion this
  pass; verified by full code trace of the idempotency chain instead. Runbook:
  `docs/lms-certificate-delivery-batch4-verification.md`.
- Existing courses created **before** this batch do not have the chain until an admin clicks
  "Enable certificate delivery" (or it's scripted in bulk separately) — deliberate, not a
  silent migration.
- The generic `send_email` action's missing `{{variable}}` interpolation (found during this
  audit) is a real pre-existing bug, left unfixed — out of this batch's scope, but now on the
  record rather than newly discovered and ignored.
- `libs/core/src/events/lms-event-bus.ts` and `libs/workers/src/automation-executor.ts` both
  fail this project's `no-console` ESLint rule — **pre-existing** on both files (9 violations
  before this batch, 11 after; the 2 new ones are this batch's own log lines, in the same
  style as every other case in the same file). Not a regression introduced by this batch, not
  fixed either (would mean touching every existing case, out of scope).
- Certificate email delivery inherits the same delivery risk as every other transactional
  email in this project: it depends on a real configured Resend key
  (`getWorkspaceEmailConfig` / `RESEND_API_KEY`); with none configured it fails soft and logs
  `lms.certificate_email.send_failed`, exactly as intended, never blocking the certificate
  itself.

---

## STEP 6.5 — Batch 5 resolution log ("Contact Portal Progress Reading a Nonexistent Column", 2026-09-02)

> Same status vocabulary as 6.1–6.4: **code-complete** = wired, `npx tsc --noEmit` clean,
> `npx vitest run` unchanged at 226/226 (this is a query-correctness fix in a Server Component,
> the same category as the other DB-orchestration fixes in this project with no dedicated unit
> test). Real evidence below is a live-data trace of the fixed formula, not a running-app
> screenshot — see "Verification" for exactly what was and wasn't run. **No migration.**

### STEP 0 re-confirm

- Live `course_progress` columns (re-queried 2026-09-02): `id, workspace_id, contact_id,
  course_id, lesson_id, completed_at, created_at, progress_seconds, interaction_attempts,
  completion_override`. **No `progress_percent` column** — confirmed, matches the original
  audit finding.
- **Exact broken code**, `src/app/(portal)/portal/dashboard/page.tsx:81-91` (pre-fix): fetched
  `course_progress` with `.select('*')` (not a select naming the missing column, so **no query
  error** — the pattern here is subtly different from a swallowed-error case), built
  `new Map(records.map(p => [p.course_id, p.progress_percent || 0]))`. Since `*` never
  contains `progress_percent`, `p.progress_percent` is `undefined` on every row and the
  `|| 0` fallback silently turns that into a legitimate-looking `0`. **No error is ever
  thrown or logged** — this is quieter than the swallowed-`try/catch` pattern found elsewhere
  in this project: there was nothing to swallow, the code just always computed zero.
- **Second, structural problem beyond the column name:** `course_progress` is a row-per-
  lesson-completion table (confirmed live: 2 rows for one contact/course pair, one per
  completed lesson), not one summary row per course. Even a column-name fix alone (e.g.
  reading some other single field) couldn't work here — the map built from raw rows keyed by
  `course_id` needed to be a **count**, not a field lookup.
- **Real correct formula, confirmed reused:** `getEnrolledCoursesWithProgress()`
  (`src/app/actions/studentEnrollments.ts:337`) already computes this correctly for
  `/student`: `completedLessons` = count of `course_progress` rows for the contact where
  `completed_at IS NOT NULL`, `totalLessons` = count of `course_lessons` for the course,
  `progressPercentage = round(completed/total*100)`. **Not called directly** — it resolves its
  contact via `getUser()` (Supabase-auth email → matched `contacts` rows), a different
  identity path than this page's `getPortalSession()`-resolved `contact.id`. A portal contact
  isn't guaranteed to have a matching Supabase auth user, so calling the student function here
  risked either "Not authenticated" for a real portal session or resolving progress against
  the wrong identity. **Replicated the exact same formula** against the already-loaded
  `contact.id` instead — same real calculation, correct identity for this session type, stated
  explicitly per Step 1's either/or.

### STEP 1 — fix

`src/app/(portal)/portal/dashboard/page.tsx`: replaced the `progress_percent` lookup with two
scoped queries (`course_progress` filtered `completed_at IS NOT NULL` + `course_lessons`
count, both `.in('course_id', courseIds)`), counted per course, `Math.round(completed/total*100)`
per course, then averaged across the contact's enrollments — same "Average Progress" card
shape/semantics as before, now computing a real number. Change is scoped to that one block;
nothing else on the page (invoices, bookings, FICA banner) was touched.

### STEP 2 — sibling-bug sweep of `/portal/*`

Checked every `.from()`/`.select()` call across `portal/{courses,bookings,invoices,documents,
projects,support,profile,layout}` — 9 files, ~20 queries — against the real live schema:

- `portal/courses/page.tsx` **already computes progress correctly** (`course_progress` +
  `course_lessons` counts, same real formula) — not a duplicate of this bug, no fix needed.
- Live-checked every other table referenced: `lms_expert_sessions` / `lms_expert_profiles`
  (columns `course_id`/`start_time`/`end_time`/`is_live`/`meeting_url`/`name`/`bio` — all real,
  confirmed against migration `20240101000172_remedial_and_experts.sql`), `contact_documents`
  → `media_files` join (confirmed live, no error), `proposals` (`contact_id`/`status`
  confirmed live), `booking_calendars`, `projects` (`project_settings` jsonb column real),
  `project_tasks`, `support_tickets`, `invoices`, `appointments`, `workspaces`
  (`invoice_settings`/`project_settings`), `users` (`first_name`/`last_name`),
  `kyc_risk_ratings` (`fica_complete`) — every column referenced in these files exists on the
  live table it's queried against.
- Grepped all of `/portal/*` for the same shape of bug (`.progress`, `_percent`, `percentage`)
  — **zero other hits**. This specific "summary-percentage column that doesn't exist" pattern
  does not recur elsewhere in the contact portal.
- **Conclusion: no sibling schema-drift issues found in `/portal/*` this pass.** A real,
  checked "no," not an unchecked assumption — see the table-by-table list above.

### STEP 3 — verification

- **Real live-data trace of the fixed formula** (not a running-app load — no dev server this
  pass): queried the real `course_progress` / `course_lessons` tables for a real contact with
  real completions — 2 of 3 lessons complete for one course → **67%**. This is the exact
  number the fixed `/portal/dashboard` query (per-course, then averaged) and the existing
  `/student` `getEnrolledCoursesWithProgress()` (same formula, same tables, same
  `completed_at IS NOT NULL` filter) independently compute for that course — by construction,
  since both now run the identical calculation, not by inspecting two rendered pages.
- **Not run:** loading `/portal/dashboard` and `/student` in a browser side-by-side. Runbook
  step for that is in `docs/lms-portal-progress-batch5-verification.md`.
- Regression: `npx tsc --noEmit` clean; `npx vitest run` 226/226 unchanged; `eslint` on the
  touched file clean.

### Known limitations / honest notes (Batch 5)

- **Not live-verified** in a running app — code-complete, verified by direct live-data trace
  of the corrected query logic instead. See the runbook for the remaining browser-level check.
- The average-progress card is still an **average across enrollments** (unchanged UX/shape from
  before this batch) — this fix corrects the number that goes into that average, it doesn't
  change what the card is summarizing.
- `portal/courses/page.tsx`'s unrelated `course_lessons` query (line 32-34) fetches every
  lesson in the database with no `.in(courseIds)` scoping — a real inefficiency noticed while
  auditing this file for schema drift, but not a schema-drift bug and not in this batch's
  scope; flagged here rather than silently fixed as a drive-by.

---

## STEP 6.6 — Batch 6 resolution log ("Real Course Categories & Tags", 2026-09-02)

> Same status vocabulary as 6.1–6.5: **code-complete** = wired, `npx tsc --noEmit` clean,
> `npx vitest run` unchanged at 226/226 (the category filter is inline `useMemo` logic in
> `MarketplaceClient.tsx` — the same shape as the pre-existing, also-untested price filter it
> sits beside; no new pure-logic module to extract). **One migration**, confirmed NOT applied
> to this session's live DB (consistent with every prior batch) — see "Verification" for what
> was and wasn't checkable as a result. Runbook: `docs/lms-course-categories-batch6-verification.md`.

### STEP 0 re-confirm

- **The earlier finding does not hold in the form the prompt describes, and the real story is
  cleaner than "dormant scaffolding to repair."** Re-read `docs/schema-drift-audit.md`'s
  actual original finding (item 43): it flagged `src/app/actions/lms/categories.ts` — a
  **file that was never imported anywhere** — referencing a `course_categories` table and a
  `courses.category_id` column that were confirmed **not to exist on the live schema even
  then** ("no table/col"). So there was never a real table+column pair sitting dormant; only
  dead *code* pointing at a schema that was never real. Re-confirmed live 2026-09-02:
  `course_categories` still doesn't exist (`PGRST205`), `courses` still has no `category_id`
  column (confirmed against the real, current 21-column `courses` schema) — **and the dead
  `categories.ts` file itself has since been removed from the repo entirely** (not found
  under `src/app/actions/lms/` any more; a separate cleanup pass, not this batch). Nothing to
  repair, repoint, or bypass — this is a genuinely fresh build.
- **Real course inventory checked before designing a starter list:** 6 real courses exist,
  titles: "English Language", two `T18 Test Course …` smoke-test placeholders, one literal
  YouTube URL as a title, "Mathematics", and "Michael" — unmistakably demo/test data with no
  real, coherent taxonomy of its own to reverse-engineer categories from. The starter list
  seeded (Business / Technology / Language & Communication / Health & Wellness / Personal
  Development / Academic) is therefore a **generic, sensible set for any course marketplace**,
  stated explicitly as such rather than presented as derived from real content signal that
  doesn't exist here.

### STEP 1 — scope decision

**Flat, single-category-per-course** — as recommended, not tags/many-to-many, not a nested
taxonomy. Matches the catalog's existing complexity level (a flat price filter + sort, no
hierarchy anywhere else in the catalog) and Step 0 found no real course variety here that
would argue for freeform multi-tag over a fixed list.

### STEP 2 — build

- **Schema** (`20260903000028_course_categories.sql`): `course_categories` (workspace-scoped,
  `name` + `color` + `position`, `unique(workspace_id, name)`) + `courses.category_id`
  (nullable FK, `ON DELETE SET NULL` — deleting a category un-categorizes its courses, never
  deletes or hides them). RLS mirrors the existing two-policy shape (workspace members manage;
  public/anon read, matching the public content-blocks read policy) — real read path is still
  the service-role admin client everywhere else in this app, so this is defense-in-depth.
  Seeds the generic starter list into every workspace that has at least one real course,
  `ON CONFLICT DO NOTHING` (safe to re-run).
- **Admin UI:** new `CourseCategoryField` (select + inline create with an 8-swatch fixed
  palette + delete-with-confirmation-free-because-`SET NULL`), embedded in the course's
  existing General settings (`CourseSettingsForm`) using the same `Field`/`Select`/
  `TextInput`/`GhostButton` primitives every other settings panel in this project uses —
  plugs into that form's existing dirty-tracking/save flow rather than a separate save
  button. `/api/lms/course` PATCH validates `category_id` belongs to the caller's own
  workspace before writing it (never trusted blindly, same discipline as every other
  cross-entity reference in this app).
- **Student-facing:** `getMarketplaceCourses()` now attaches `categoryName`/`categoryColor` to
  each course and returns the relevant workspace(s)' category list; `MarketplaceClient.tsx`
  gets a new category `<select>` in the existing control bar (same `controlBase` styling as
  the sort dropdown), a category badge on each course card, and composes with search + price
  filter + sort in the same `useMemo` — a student can genuinely combine all four
  simultaneously. The dropdown only lists categories that actually have a course in the
  current result set, plus "Uncategorized" only when at least one course has no category — no
  dead filter options.
- Uncategorized courses (`category_id IS NULL` — the default for every existing course pre-
  migration) render under "All categories" normally and get an explicit "Uncategorized" filter
  option; never hidden, never erroring.

### STEP 3 — verification

- **Real, live-checked graceful degradation** (this session's DB, migration not yet applied):
  ran the exact query shape `getMarketplaceCourses()` now uses against the current live
  database — `course_categories` doesn't exist yet, the query's error is absorbed by the
  `{data} = await …` destructure (never thrown), `categories` resolves to `[]`, and every real
  published course's `categoryName` comes out `null` (Uncategorized) — confirming the function
  does not break today, before the migration lands, and that "no category" renders exactly as
  intended.
- `npx tsc --noEmit` clean; `npx vitest run` 226/226 unchanged; `eslint` clean (0 errors, 0
  warnings) across every touched file.
- **Not run:** creating a real category, assigning it to a real course, and confirming the
  catalog narrows correctly + composes with search/price/sort — needs the migration applied
  to a real environment. Runbook: `docs/lms-course-categories-batch6-verification.md`.

### Files changed (Batch 6)

- Migration: `20260903000028_course_categories.sql`.
- New: `src/app/actions/courseCategories.ts`,
  `src/app/courses/[id]/components/CourseCategoryField.tsx`.
- `src/app/courses/[id]/components/CourseSettingsForm.tsx` — category field wired into the
  existing save flow.
- `src/app/api/lms/course/route.ts` — `category_id` in the PATCH whitelist, workspace-validated.
- `src/app/actions/studentEnrollments.ts` — `getMarketplaceCourses()` attaches category
  name/color + returns the category list.
- `src/app/student/marketplace/page.tsx`, `MarketplaceClient.tsx` — category filter, badge,
  composed filtering.

### Known limitations / honest notes (Batch 6)

- **Not live-verified end-to-end** — migration not applied to any DB this pass; the one real
  check possible without it (graceful degradation) was run and passed.
- Categories are workspace-scoped with no cross-workspace sharing — a chain running many
  workspaces re-creates the same starter list per workspace rather than sharing one global set.
  Reasonable for this schema's existing multi-tenant pattern; not revisited.
- No icon picker, only a small fixed 8-color swatch palette — matches the "simple list — name,
  maybe a color" scope explicitly requested, not a gap.
- Catalog search itself remains client-side over the already-loaded course list (G9's original
  "search is client-side" note) — unchanged, out of this batch's scope, which was specifically
  the missing taxonomy/filter, not search architecture.

---

## STEP 6.7 — Batch 7 resolution log ("Consolidate Lesson Authoring", 2026-09-02)

> Same status vocabulary as 6.1–6.6: **code-complete** = wired, `npx tsc --noEmit` clean,
> `npx vitest run` unchanged at 226/226 (a UI-consolidation batch — no new pure-logic module).
> **No migration** — STEP 0's audit found nothing to migrate. No live app run this pass;
> "content preserved exactly" is verified by construction (the canvas/content_blocks render
> paths were never touched — see below), not by a before/after screenshot comparison.

### STEP 0 — audit (this reshaped the whole plan)

- **Live lesson inventory (3 lessons, 100% coverage):** every real `course_lessons` row has
  `lesson_type = 'text'`, a linked canvas `pages` row (`course_lesson_id`), **and** real
  `content_blocks` rows referenced from that canvas tree. `course_lessons.content` (the legacy
  field) is `{}` on all three. **Zero real lessons rely on the legacy per-`lesson_type`
  render path.** There was nothing to migrate — Step 3's "real lesson migration" is a
  confirmed no-op, stated plainly rather than performed as theater.
- **New-lesson creation already canvas-only — this was done in an earlier, undocumented pass.**
  `AddLessonNameModal` (the only reachable "+ Add Lesson" flow) POSTs
  `lesson_type: 'text', content: {}, create_builder_page: true` unconditionally — there is no
  live path that creates a lesson of any other type. The standalone `LessonTypePicker`
  component was still imported and rendered in `CourseWorkspaceClient.tsx`, but a full search
  confirmed **`setIsLessonPickerOpen(true)` has zero call sites anywhere** — it was already
  fully dead code, never reachable by a real click.
- **`LessonCreatorModal`'s own internal Step-1 type grid was also already unreachable.** Its
  two real, live callers — `onEditLesson`'s no-`builder_page` fallback and
  `handleCreateAssignment`'s "add an assignment block" shortcut — both always pass an existing
  `editingLesson`, and the modal's own `useEffect` jumps straight to Step 2 whenever
  `editingLesson` is set. Step 1 could only ever render if the modal were opened with no
  lesson at all, which nothing in the live codebase does.
- **`code` and `scorm` present as fully real to a student, not visibly fake — confirmed, not
  assumed.** `code`: a genuine Monaco editor + a `new Function('console', codeValue)` runner
  that really executes JS/TS in the browser and prints real console output (only fails
  silently for the other listed languages — Python/HTML/CSS — which it can't actually run).
  `scorm`: a "SCORM player" card with a version label and a fake `window.API`/`API_1484_11`
  SCORM 1.2/2004 shim wired up — genuinely responds to real SCORM JS calls — but **nothing
  ever loads a real SCORM package into it** (no manifest parsing, no launch file, just a
  static card + a "Mark SCORM complete" button, or a raw iframe/download link for a `.zip`).
  Both present with full confidence, no "demo"/"placeholder" language anywhere a student would
  see. This confirmed the urgency STEP 2 assumed.
- **A second, separate instance of the same shim was found during the codebase search that
  wasn't in the original G10 description:** the ADMIN preview player
  (`/courses/[id]/learn` → `CoursePlayerClient` → `SpecializedPlayer.tsx`) has its own
  Video/Audio/PDF/Live-Session/Flashcards/Code/Quiz/Assignment/SCORM switch, keyed off
  `lesson.type` — a field real `course_lessons` rows never populate (the real column is
  `lesson_type`), a fact the file's own pre-existing comment already documented. This switch
  was **already entirely dead** for real lessons (always falls to its plain-text `default`
  case) — confirmed, not new breakage. Only its `Code`/`SCORM` cases were removed here (Step 2
  scope); the broader "this admin preview never shows real canvas content" gap is a separate,
  larger issue, stated but not fixed in this batch (see limitations).

### STEP 1 — consolidation decision: RECOMMENDED path, executed in full

Full retirement, not the fallback alternative — STEP 0 found no real blocker (no real
legacy-authored content anywhere to risk losing). Concretely:
- `StudentPlayerClient.tsx`: removed the `lesson_type === 'video' | 'pdf' | 'audio' |
  'assignment' | 'live_session' | 'flashcards' | 'code' | 'scorm'` render branches and their
  supporting state/effects (SCORM `window.API` shim, Monaco code-runner state, transcript
  toggle). **Kept** `lesson_type === 'quiz'` — a distinct, real, currently-used system (a
  lesson that IS a quiz container, gated separately by `/quiz/[quizId]`), not part of this
  consolidation. **Kept** the shared `renderAssignmentPanel`/`renderFlashcardsPanel` functions
  (still real, still used by the `content_blocks` `assignment`/`flashcards` types) — only their
  legacy `lesson_type`-driven dispatch entries were removed.
- `LessonTypePicker.tsx` — deleted (confirmed fully dead, see STEP 0).
- `LessonCreatorModal.tsx` — rewritten, not deleted (it has one real remaining job: the
  content-blocks editor for `handleCreateAssignment`'s shortcut and `onEditLesson`'s
  no-canvas-page fallback). Removed: the Step-1 type grid, the `type` state as a user choice,
  and every type-gated panel that only existed to configure a type nobody can create anymore
  (video/audio/PDF/SCORM asset URL + upload, SCORM version, Code sandbox, Live Session
  schedule, the legacy on-lesson flashcards deck — the real flashcards mechanism is the
  `content_blocks` `flashcards` type via `FlashcardsBlockEditor`, untouched). Kept: title,
  the real Content Blocks panel (`ContentBlockList`), access level, time estimate, unlock
  condition, the free-text fallback body, and the AI lesson-summary control.
- `SpecializedPlayer.tsx` (admin preview) — removed its `Code` and `SCORM` cases specifically
  (Step 2), left every other case as-is (already-dead, out of this batch's scope to fix).
- `src/app/actions/help.ts` — the `course-module-lesson-builder` help article described
  "choosing a lesson type such as ... SCORM-labelled upload" — now stale. Rewrote it to
  describe the real canvas-first flow and to state SCORM/code-sandbox were removed as options
  (this article already had an honest "SCORM isn't real" FAQ entry before this batch; the body
  copy just hadn't caught up).

### STEP 2 — code/scorm: removed entirely, everywhere found

Removed as selectable/reachable options from: `LessonCreatorModal`'s type grid (gone with the
whole grid), `LessonTypePicker.tsx` (deleted), the `StudentPlayerClient` render switch, and the
`SpecializedPlayer` admin-preview switch. **Not attempted:** real SCORM runtime or real
in-browser code execution/grading — explicitly out of scope per the prompt, stated rather than
quietly built partway.

### STEP 3 — build safety, verified by real search + code trace

- Full-codebase search confirmed `LessonTypePicker` had exactly one importer
  (`CourseWorkspaceClient.tsx`) before deletion, and zero remain after.
- Full-codebase search for `lesson_type === 'video'|'pdf'|'audio'|'code'|'scorm'|
  'live_session'|'flashcards'|'assignment'` returns zero hits anywhere in `src/` post-edit.
- `hasAssignmentBlock` (real, `content_blocks`-based) is unchanged; only its dead
  `|| activeLesson.lesson_type === 'assignment'` OR-clause was dropped.
- The low-bandwidth data-saver banner was gated on the now-dead
  `activeLesson.lesson_type === 'video'` (meaning it silently never showed for any real,
  canvas-authored video lesson before this batch either) — replaced with a real
  `hasVideoBlock` check against `activeLesson.contentBlocks`, a small in-scope correctness fix
  surfaced by removing the branch it was piggy-backing on.
- `npx tsc --noEmit` clean; `npx eslint` on every touched file: 0 new errors, 0 new warnings
  (3 pre-existing `exhaustive-deps` warnings confirmed unchanged via a `git stash` diff; one
  pre-existing warning — on the now-deleted SCORM effect — is gone, a net improvement).

### STEP 4 — verification

- **Content preserved exactly:** verified by construction, not by comparison — the
  `canvasItems`/`contentBlocks` render branches (the ONLY branches any real lesson ever
  reaches) were not edited at all in this batch. Zero real lessons touch the removed code, so
  there is nothing that could have changed for them.
- **New-lesson creation is canvas-only, with no legacy step reachable:** confirmed by code
  trace (`AddLessonNameModal` is the only creation path) and by deleting the one component
  that could have offered a type choice.
- **Code/scorm confirmed absent everywhere searched:** `LessonCreatorModal`, the deleted
  `LessonTypePicker`, `StudentPlayerClient`, `SpecializedPlayer` — all clear. `help.ts`
  corrected. `src/data/modules.ts` (marketing landing-page copy) still lists "SCORM support"
  as a feature — **found, not fixed**, same treatment as Batch 3's "10 quiz question types"
  marketing overstatement: a business-copy decision, out of a code-audit batch's scope, stated
  plainly rather than silently left or silently rewritten.
- **Gating regression:** `getLessonLockReason`, `markLessonCompleteForContact`,
  `lesson_block_completions`/`recordBlockCompletion`, and the reading-gate logic were not
  touched by any edit in this batch — zero-diff, so drip/sequential locking and quiz-block
  completion are unaffected by construction, not just by inference.
- **Not run:** an actual browser session clicking through course creation → canvas editing →
  student playback. Runbook: `docs/lms-lesson-consolidation-batch7-verification.md`.

### Files changed (Batch 7)

- `src/app/student/courses/[id]/StudentPlayerClient.tsx` — legacy render branches + dead
  state/effects removed; `hasVideoBlock` real-signal fix.
- `src/app/courses/[id]/components/LessonCreatorModal.tsx` — rewritten (content-blocks-only
  editor, no type picker).
- Deleted: `src/app/courses/[id]/components/LessonTypePicker.tsx`.
- `src/app/courses/[id]/CourseWorkspaceClient.tsx` — `LessonTypePicker` import/state/handler/
  JSX removed.
- `src/app/courses/[id]/learn/components/SpecializedPlayer.tsx` — `Code`/`SCORM` cases removed.
- `src/app/api/lms/lessons/route.ts` — stale comment corrected.
- `src/app/actions/help.ts` — lesson-builder help article updated to the real flow.

### Known limitations / honest notes (Batch 7)

- **Not live-verified in a running browser.** Verified by full-codebase search + code trace +
  the "zero real lessons touch the removed paths" argument instead. Runbook provided.
- **`SpecializedPlayer`/`CoursePlayerClient` (the admin `/courses/[id]/learn` preview) is
  confirmed dead for real lessons beyond just Code/SCORM** — every real canvas-authored lesson
  renders as plain fallback text there, not its real content blocks. This is a genuinely
  separate, larger gap (the admin preview needs its own canvas/content_blocks awareness, the
  same rebuild the student player already has) — found during this audit, explicitly NOT
  fixed here (out of Batch 7's scope, which was retiring the legacy path and removing
  code/scorm, not rebuilding the admin preview). Worth its own future item.
- `src/data/modules.ts` marketing copy still claims "SCORM support" — flagged, not changed
  (business-copy decision).
- `LessonCreatorModal` still exists (not deleted) — it has one real remaining job (the
  content-blocks editor for the assignment-shortcut and no-canvas-page edge case). This is a
  deliberate, narrower removal than "delete the whole modal," stated explicitly.

---

## STEP 6.8 — Batch 8 resolution log ("Cross-Course Assignments/Pending-Work Inbox", 2026-09-02)

> Same status vocabulary as 6.1–6.7: **code-complete** = wired, `npx tsc --noEmit` clean,
> `npx vitest run` unchanged at 226/226 (DB-query + UI batch, no new pure-logic module — same
> category as Batches 4/5/6). **No new migration** — but see the hard dependency on Batch 2's
> migration below, found live during this batch's own verification pass.

### STEP 0 — audit

- **Enumeration pattern confirmed reusable:** the same real
  `content_blocks(type='assignment') → course_lessons → courses`, scoped through the
  contact's active `enrollments`, that `getStudentFlashcardSets` (Batch/earlier "flashcard
  review" work) already uses for its own block enumeration. Reused directly, not
  reimplemented.
- **No due-date concept exists — confirmed, not assumed.** Grepped `AssignmentBlockEditor.tsx`
  and the `content-blocks` API route: an assignment block's `content` only ever has
  `instructions`. No due-date field anywhere in the schema or the admin editor. "Not yet
  submitted" in this batch means exactly that and nothing more — never framed as overdue.
- **Real states re-confirmed:** `lms_assignment_submissions.grade_status` ∈
  `{pending, passed, failed}` (migration `190`, live and applied). `quiz_attempts` /
  `module_quiz_attempts.grade_status` ∈ `{auto, pending_review, reviewed}` (Batch 2,
  migration `…026`) — **only defined in a migration FILE, not yet applied to this session's
  live database** (re-confirmed by this batch's own live query smoke test — see
  "Verification"). A plain `'auto'` attempt is fully resolved instantly and correctly does
  NOT appear in this inbox; only `pending_review` and a recently-`reviewed` one do.
- **Admin side — confirmed no unified queue exists today.** `CourseSubmissionsTab` is
  strictly per-course (`/api/lms/assignments?courseId=`, ALL submissions not just pending).
  `QuizAnalyticsConsole` is strictly per-quiz. An instructor with pending work spread across
  several courses had to check each course's Submissions tab and each quiz's Results tab
  individually — confirmed, not assumed, by reading both components' data-fetching. This
  justified Step 1's decision to include the admin side.

### STEP 1 — scope decision

Built the recommended full scope: ONE unified student-facing "My Work" section (on the
existing My Results page, not a new page — it's naturally the results/status home already)
covering all five real states from the prompt, **plus** a basic admin-facing cross-course
"Needs grading" queue — included now, not deferred, because it assembles from the exact same
two real tables (`lms_assignment_submissions`, `quiz_attempts`/`module_quiz_attempts`) the
student view already queries, just `workspace_id`-scoped instead of `contact_id`-scoped — a
small, symmetric addition, not a second system.

### STEP 2 — build

- **Student:** new `getStudentPendingWork()` (`src/app/actions/studentPendingWork.ts`) —
  reuses `getStudentContactIds()` (the same contact-resolution helper `getStudentResults` /
  `getStudentFlashcardSets` use). Returns 4 real buckets: `notSubmitted`, `awaitingReview`
  (assignments `pending` + quiz attempts `pending_review`, in the SAME bucket, not two
  separate inboxes — the prompt's explicit ask), `needsRevision` (assignments `failed` only —
  a real, stated design choice: a failed quiz's real recovery path is retake/AI-remedial, not
  resubmission, so it doesn't belong here), `recentlyGraded` (assignments `passed` + quiz
  attempts `reviewed`, within a stated 7-day window). Rendered as a new "My Work" section at
  the top of `/student/results`, above the existing stat strip — reusing `DashCard`/
  `DashEmptyState`, matching the page's existing visual language exactly.
- **Admin:** new `getWorkspacePendingGradingQueue()` (`src/app/actions/courseGrading.ts`) —
  same two tables, `workspace_id`-scoped, joined to `contacts` for student name/email. New
  page `/courses/needs-grading` (mirrors `/courses/certificates`'s existing
  page-shell-then-client pattern), linked from the Courses list header next to the existing
  Certificates button.
- **Real deep links, reusing real existing grading actions — nothing new was built to grade
  anything.** Assignment items link to
  `/courses/[id]?tab=settings&section=submissions` (the existing `CourseSubmissionsTab`, which
  already grades via `PATCH /api/lms/assignments`); quiz items link to
  `/courses/[id]/quiz/[lessonId]?tab=analytics` or `/courses/[id]/module-quiz/[moduleId]
  ?tab=analytics` (the existing `QuizAnalyticsConsole` → `ManualReviewPanel`, which already
  grades via Batch 2's `gradeQuizAttemptManualReview`). Small, real, in-scope addition needed
  to make these deep links land on the right tab: `CourseWorkspaceClient` and
  `QuizWorkbenchClient` now read `?tab=`/`?section=` on mount (they previously always opened
  on their first tab) — a genuine, reusable navigation improvement, not a one-off hack.
  Student-side items link into the real lesson (`?lessonId=`, the same pattern
  `getStudentResults`'s assignment list already used) or the course itself for quizzes (no
  per-attempt detail page exists for a student to land on — stated, not invented).

### STEP 3/4 — verification

- **Real live query smoke test (not a UI walkthrough — no running app this pass):** ran the
  exact query shapes both new actions use against the live database. `lms_assignment_submissions`
  (`grade_status='pending'`) and the `content_blocks`/`course_lessons` enumeration queries ran
  clean (0 rows — none seeded yet, but no schema error). **`quiz_attempts.grade_status` and
  `module_quiz_attempts.grade_status` do not exist on this live database** — confirming Batch
  2's migration `20260903000026_quiz_attempts_manual_review.sql` is still unapplied here, same
  as every prior batch's "not applied to any DB" note, just now caught as a real, concrete
  blocking dependency rather than a generic caveat.
- **Real, honest consequence of that:** today, on this live database, the assignment half of
  both the student "My Work" section and the admin "Needs grading" queue would work
  end-to-end (0 real pending rows to show, but the query path is sound); the file-upload-quiz
  half would silently show nothing (student side: a caught-and-swallowed query error, same
  no-error-check convention `getStudentResults` already uses for its own parallel queries —
  not a new pattern; admin side: `getWorkspacePendingGradingQueue` explicitly checks
  `.error` and throws, caught by its own try/catch, so the page falls back to an empty state
  rather than crashing) until migration `…026` is applied.
- `npx tsc --noEmit` clean; `npx eslint` on every touched file: 0 new errors, 2 pre-existing
  warnings unchanged; `npx vitest run` 226/226 unchanged.
- **Not run:** a live browser session with real seeded pending items across all 4 (5 with
  admin) categories. Runbook: `docs/lms-pending-work-batch8-verification.md`.

### Files changed (Batch 8)

- New: `src/app/actions/studentPendingWork.ts`, `src/app/actions/courseGrading.ts`,
  `src/app/courses/needs-grading/{page.tsx,NeedsGradingClient.tsx}`.
- `src/app/student/results/page.tsx` — "My Work" section.
- `src/app/courses/CoursesClient.tsx` — "Needs grading" nav button.
- `src/app/courses/[id]/CourseWorkspaceClient.tsx`,
  `src/app/courses/[id]/quiz/[quizId]/QuizWorkbenchClient.tsx` — `?tab=`/`?section=` deep-link
  support on mount.

### Known limitations / honest notes (Batch 8)

- **Hard dependency on Batch 2's migration `20260903000026`.** The quiz-attempt half of both
  views is inert without it. Flagged prominently, not discovered quietly — apply Batches 2's
  and this batch's migrations together.
- Not live-verified in a running browser — runbook provided.
- "Not yet submitted" has no time dimension by real design (no due-date field exists) — it
  will never say "overdue," only "not submitted yet."
- `needsRevision` is assignments-only, a stated real design choice, not a gap.
- No per-attempt detail page for a student to land on for a quiz item — the deep link goes to
  the course itself, the closest real destination that exists today.
- The admin queue enumerates and deep-links; it does not add a grade-inline action on that
  page itself — grading still happens on the existing Submissions/Results tabs, deliberately,
  to avoid a second, parallel grading code path.

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
