# LeadsMind LMS — Full Feature Audit (Technical Ground-Truth Report)

> Internal reference. Every claim is a direct read of the current `lms` branch and/or the live
> Supabase database (queried via the service-role key, 2026-09-02).
>
> **Verification legend:** ✅ real & wired end-to-end · ⚠️ real but partial / has a real gap ·
> ⛔ stub / dead / not built.

---

## 1 — Data model (live)

| Table | Rows (live) | Notes |
|---|---|---|
| `courses` | 6 | `slug`, `landing_page_settings` (jsonb), `domain_id`, `url_path`, `pricing_model`, `subscription_interval`, `enrolment_cap`, `certificate_config` (jsonb), `category_id`, `onboarding_email_*`, `status`, `published` |
| `course_modules` | 2 | `drip_days`, `position`, `is_active`, `publish_status`, `required_for_completion`, `nqf_level` |
| `course_lessons` | 3 | `lesson_type` (canvas-only in practice, see §7), `content` (jsonb, legacy fallback), `unlock_type` (`sequential`/`drip`/`quiz_gated`), `drip_value`, `time_estimate_minutes`, `is_preview`, `access_level`, `is_active` |
| `content_blocks` | 15 | The live authoring unit. `type`: `video, audio, reading, rich_text, quiz, assignment, flashcards, download, slides, embed, live_session, html_code`. `completion_rule`: `watched_threshold, opened, quiz_passed, submitted, none` |
| `lesson_block_completions` | 0 | `(content_block_id, contact_id)` unique |
| `lesson_reading_completions` | 0 | Scroll+dwell gate for canvas lessons with no trackable blocks |
| `course_progress` | 2 | Row-per-(contact, lesson). `completed_at`, `progress_seconds`, `interaction_attempts`, `completion_override` |
| `enrollments` | 6 | `status`, `active`, `access_type`, `payment_status`, `last_lesson_id`, `last_position_seconds`, `last_active_at`, `expires_at`, `grace_period_expires_at`, `stripe_payment_intent_id` |
| `quiz_questions` / `quiz_settings` / `quiz_attempts` | 0 / 0 / 0 | Lesson-scoped quizzes. `metadata` jsonb holds per-type answer keys; `quiz_attempts.grade_status` ∈ `{auto, pending_review, reviewed}` |
| `module_quiz_settings` / `module_quiz_questions` / `module_quiz_attempts` | 0 / 10 / 0 | Structurally mirrors the lesson-quiz tables, scoped through `course_modules`. The 10 seeded rows are AI-generated MCQs |
| `course_certificates` | 0 | `validation_id` (unique, crypto-random), `student_name_snapshot`, `course_title_snapshot`, `issued_at`, `unique(contact_id, course_id)` |
| `lms_assignment_submissions` | 0 | `text_submission`, `file_url`, `grade_status` (`pending/passed/failed`), `feedback_comments`, `graded_at`, `unique(contact_id, lesson_id)` |
| `flashcard_reviews` | 0 | `(contact_id, content_block_id, card_index)` unique, `status` (`learning/known`), `next_due_at`, `review_count` |
| `lms_remedial_assignments` | 0 | AI remedial-exercise records |
| `lms_automation_rules` | (n/a) | `trigger_type`: `course_completed, lesson_completed, quiz_passed, quiz_failed, module_completed, enrollment_created, certificate_issued, struggling_detected`. `course_id` (nullable — NULL = workspace-wide, set = course-scoped). `trigger_config`/`action_config` jsonb |
| `course_categories` | seeded per workspace | `name`, `color`, `position`, `unique(workspace_id, name)` |
| `course_qa_interactions` | 2 | RAG Q&A log |
| `course_content_chunks` / `lesson_summaries` | 0 | pgvector RAG + AI lesson summaries |
| `lms_certificate_templates`, `lms_certificates`, `lms_quizzes` | 0 | **Legacy / dead.** Zero code references — see §9 |

Tables that do **not** exist: `lesson_blocks`, `enrolments` (single-L), `quizzes`, `course_automations` / `lms_automations`, `cohorts` / `course_cohorts`, `course_reviews`, `student_portal_assignments`, `lesson_completions`, `assignments`, `flashcards`, `certificates` (bare).

### Route map

Admin: `src/app/courses/page.tsx` (list) · `courses/[id]/page.tsx` (workspace: modules, pricing, landing, settings, submissions, analytics tabs) · `courses/[id]/automations` · `courses/[id]/lessons/[lessonId]/builder` (canvas) · `courses/[id]/quiz/[quizId]` (QuizWorkbench + analytics) · `courses/[id]/module-quiz/[moduleId]` · `courses/[id]/learn` (admin preview player) · `courses/certificates` (list + Design tab) · `courses/needs-grading` (cross-course grading queue).

Student: `student/page.tsx` (dashboard) · `student/results` · `student/flashcards` (+ `[blockId]`) · `student/settings` · `student/marketplace` · `student/courses/[id]` (player) · `…/quiz/[quizId]` · `…/module-quiz/[moduleId]` · `…/remedial`.

Public: `certificates/verify/[id]` · `unauthenticated/courses/[slug]` (+ custom-domain) · `checkout/[id]` (public, guest-capable).

---

## 2 — Course building (admin)

**Creation** — `CreateCourseWizard.tsx`, 2 steps: name + domain (`leadsmind.io` default or a connected custom domain) + auto-slugged URL path with a live preview, then a theme pick (§6). New courses start `status='draft'`, `published=false`; a certificate-delivery automation chain (§5) is seeded automatically on every new course.

**Curriculum** — `ModuleCard`, `ModuleCreatorModal`, `LessonCreatorModal`, `ModulesToolbar`. Real `course_modules` / `course_lessons` rows; drag-reorder via `@hello-pangea/dnd`. Module settings: `drip_days`, `publish_status`, `required_for_completion`, `nqf_level`, `position`. Lesson settings: `unlock_type` (`sequential` / `drip` / `quiz_gated`), `drip_value`, `time_estimate_minutes`, `is_preview`, `access_level`. Drip + sequential + module-prerequisite locking is enforced student-side (`lock-utils.ts`).

**Content blocks — all 12 types, authoring and student rendering both real.** Dedicated editor per type under `courses/[id]/components/blocks/`. Student render is one shared switch, `StudentPlayerClient.tsx::renderBlockBody()`, used by both the canvas and the flat-list path so the two never drift:

| Block | Student render | Completion signal |
|---|---|---|
| video | `VideoPlayer` (+ low-bandwidth mode) | `watched_threshold` (90%) |
| audio | `VoiceNotePlayer` or sandboxed embed | `watched_threshold` / `opened` |
| html_code | `SandboxedHtml` | view |
| reading / slides | `ReadingModal` | `opened` |
| rich_text | sanitized HTML | view |
| download | file link | `opened` |
| embed | sandboxed, URL-safety-checked iframe | `opened` |
| live_session | join link | `opened` |
| quiz | links to the quiz player | `quiz_passed` (server-graded) |
| assignment | text + 1 file, status, feedback, resubmit | `submitted` |
| flashcards | inline deck | finished |

A lesson only advances once every block on it reports complete (`getLessonBlockCompletionStatus`); `completion_rule='none'` blocks auto-complete on view.

**Canvas lesson builder** — `courses/[id]/lessons/[lessonId]/builder`, CraftJS. Every lesson is backed by a `pages` row; content is flattened server-side into an ordered list the player renders — headings/text/images inline like an article, a block node handing off to the same `renderBlockBody` switch above. This is the single authoring model for lesson content (see §7 — the older per-`lesson_type` renderer has been retired). Text-only canvas lessons that carry no trackable block are still gated by a real scroll + dwell floor (`lesson_reading_completions`, word-count-derived) rather than being instantly completable. "Mark complete" always stays clickable; if the real signals aren't met the student confirms a dialog and the server independently re-checks before setting `course_progress.completion_override` — an honest-reporting flag with no student-facing shortcut. Two lesson-layout starting points exist ("Standard", "Deep-Dive").

**Landing / sales pages** — 3 templates (`TemplateCleanMinimal`, `TemplateBoldFeatureRich`, `TemplateCommunityCoaching`), each theme-tokened, with real editable sections (outcomes, reviews, FAQ, instructor bio, curriculum summary, pricing) and per-section visibility toggles. Pricing models: free / one-time / subscription (month or year) / hybrid. The "Enroll" button on every template goes to the public `checkout/[courseId]` page — see §10 for the checkout path itself and the one caution that governs it.

**Course categories** — a flat, single-category-per-course taxonomy (`CourseCategoryField`, workspace-scoped, name + colour). The catalogue's category filter, search, price filter and sort all compose together. Deleting a category un-categorizes its courses rather than touching them.

---

## 3 — Student portal

**Dashboard** (`student/page.tsx`) — enrolled courses and average progress (lesson-level: completed `course_progress` rows over total `course_lessons`); quizzes passed and average quiz score, computed from both `quiz_attempts` and `module_quiz_attempts` by real contact id; a "Continue learning" panel that deep-links back into the most recently active, not-yet-complete course (and, for video, the exact position).

**Course player** (`student/courses/[id]`) — content-block + canvas rendering as §2. Gating (`lock-utils.ts::getLessonLockReason`): `coming_soon`, `paid_locked`, `dripped` (module `drip_days` + per-lesson drip), `prerequisite` (cross-module and within-module sequential/quiz-gated). The player is only served while `isEnrolmentActive(enrollment)` holds; a deactivated enrolment shows an "Access paused" card. After a module's last lesson, if the module has a module quiz, the player auto-routes to it.

**My Results** (`student/results`) — quiz history (lesson + module quizzes, joined to titles), assignment status and feedback, earned certificates with verify/download links, per-course progress, and a **"My Work" panel** consolidating everything a student owes or is owed across every course: not-yet-submitted assignments, items awaiting review (pending assignments and file-upload quiz attempts together, one inbox), assignments sent back for revision, and recently-graded work.

**Course catalogue** (`student/marketplace`) — text search, category filter, price filter (all/free/paid), sort (newest/price/title), all composing together; per-course enrolment state (manage / enrolled / buy / enrol).

**Flashcard review** (`student/flashcards`) — every flashcard set across actively-enrolled courses, with total/known/learning/due counts. Review schedule is a deliberately simple two-speed system, not full spaced repetition: `known` → resurface in 3 days, `learning` → resurface in 8 minutes.

**Settings** (`student/settings`) — name (kept in sync across the account and every linked contact record, including on certificates), password, one notification preference. Changing the account email address is intentionally not offered — it's the identity key that ties a student's records together across the workspace.

---

## 4 — Quizzes

**Lesson quizzes** — pass mark (`quiz_settings.pass_percentage`, default 70%) and attempt limit (default 3). Grading is always recomputed server-side from the real answer key on submit; a client score is never trusted. Passing marks the lesson complete. Once attempts run out, the student is offered an AI-generated remedial exercise; passing it unlocks another attempt.

**Module quizzes** — a separate, structurally-mirrored system scoped to a module. The server gate (`getModuleCompletionStatus`) genuinely requires every lesson in the module to be complete before an attempt is accepted — not just a hidden button. Reachable from the course outline and auto-routed to after the module's last lesson.

**All 8 question types have a real student answer UI and real server grading:**

| Type | Student UI | Grading |
|---|---|---|
| `mcq` / `true_false` | choice buttons | exact match |
| `short_answer` | text input | fuzzy match (below) |
| `matching` | dropdown-per-item against a shuffled bank | all pairs must match, all-or-nothing |
| `ordering` | drag-to-reorder | submitted order must equal the stored order exactly |
| `fill_blank` | inline input per blank | each blank fuzzy-matched independently; all must pass |
| `code` | monospace text area seeded with a starter template | **normalized-text match against instructor-listed accepted solutions — the code is never executed.** A functionally correct answer the instructor didn't list as a variant scores 0. Both the admin editor and the student view carry this caveat explicitly. |
| `file_upload` | reuses the standard student upload flow | **manual instructor review** — a quiz containing a file-upload question is not instant; the attempt is inserted `pending_review` and does not complete the lesson or fire a pass/fail event until an instructor grades it from the quiz analytics console |

**Grading matcher** (`src/lib/lms/quizGrading.ts`, shared by `short_answer` and every `fill_blank` blank) — three tiers, first hit wins: exact match, then punctuation-insensitive match, then a capped edit-distance match (Damerau-Levenshtein, tolerance 0 for ≤4 chars / 1 for 5–7 / 2 for ≥8). This is the default and always on. Layered on top, **opt-in, per-question, default-off** AI-semantic grading (`aiGradeAnswer.ts`) can be enabled for `short_answer`/`fill_blank` questions; it only ever runs on an answer the deterministic pass already scored 0, at temperature 0, and contributes nothing without a real OpenAI key configured — it never silently accepts. Because it is a live model call, it is genuinely non-deterministic at the margin (the same borderline answer can grade differently on a retake), which is exactly why it stays opt-in rather than default behaviour.

**AI question generation** — `api/ai/generate-questions`, both lesson- and module-scope, reads real text assembled from the lesson's actual `content_blocks` (rich text, reading/slide text, assignment instructions, flashcard fronts/backs, video/audio titles, visible HTML text) rather than the empty legacy `course_lessons.content` field. **Still multiple-choice only** — the generator does not produce any of the other 7 question types.

**Quiz analytics** — per-student attempt grouping, trend, per-question review, CSV export, reading the real `quiz_attempts` / `module_quiz_attempts` tables. A "Needs grading" queue at `courses/needs-grading` gives an instructor one cross-course view of every pending assignment and pending file-upload quiz attempt, deep-linking to the existing per-course/per-quiz grading screens rather than duplicating a second grading path.

---

## 5 — Certificates

**Issuance** — a student earns a certificate once every lesson is complete **and** every quiz in the course (every lesson that has questions) has been passed; the server re-checks both before issuing. The first issue writes one permanent `course_certificates` row with a crypto-random `validation_id` (e.g. `LM-3C48-19BA-A4F7C201`) and freezes the student's name and the course title at that moment — a later rename of either doesn't alter an already-issued certificate. Every later download reuses that same row.

**Delivery** — a seeded, on-by-default automation rule chain (`course_completed → assign_certificate → certificate_issued → send_certificate_email`) emails the student automatically once the certificate is issued, linking to the real authenticated download and the public verify page, sent through the same transactional-email infrastructure as the platform's other automated emails. This is automatic on every course created going forward; a course created earlier only has it once an admin turns it on from that course's Automations tab. The manual "download my certificate" path (course player at 100%, My Results, client portal) is unchanged and always available regardless of whether the email fires.

**Verification** — a public, unauthenticated page at `certificates/verify/[id]` exposes only name, course, issue date and validation id — nothing else.

**Design** — three built-in templates (Classic, Modern, Editorial), each with an accent colour, logo, and signature name/title/image; or a fully custom-upload mode where an admin places each field (student name, course title, date, validation id) by percentage position on their own uploaded background image. Set once as a workspace default, overridable per course.

**Real, current limitations, confirmed by rendering the actual template code:**
- **The Classic template clips its footer on long data.** When a long student name and a long course title combine, the wrapped text pushes the "Verified Graduate" seal and the date/validation-id row down far enough that the footer is cut off by the certificate page's own fixed-height, `overflow:hidden` boundary — the validation ID becomes invisible on the generated PDF. Modern and Editorial do not have this problem (their footers are independently positioned / their layout absorbs the wrap).
- **Custom-upload mode has no collision-awareness between fields.** Each field is independently positioned and vertically centred on its own fixed point, with no measurement of another field's rendered height. An admin who places the student-name and course-title fields close together — reasonable when previewing with short sample data — can get a real visual overlap once a genuinely long name or title is substituted in.

Both are real, current, unfixed layout bugs in the certificate templates, confirmed by rendering the templates with long-name/long-course stress data and inspecting the output. Evidence: `docs/batch10-certificate-verification/` (8 rendered screenshots + index).

---

## 6 — Course themes

Three genuine, per-course visual identities (`src/lib/courses/courseThemeTokens.ts`), each with a full token set — background/surface/text/border/success/error colours, gradient/solid/hover classes, heading and body fonts, two corner-radius scales:

| Internal key | Brand name | Identity | Signature element |
|---|---|---|---|
| `clean_minimal` | **Ember** | warm near-white, vivid orange, rounded sans, generous radius | the "glow" |
| `bold_feature_rich` | **Signal** | near-black + white cards, crimson, hard edges, grotesque type | rotated "seal" |
| `community_coaching` | **Grove** | pale sage, forest green, warm serif, organic radius | branching progress line |

Applied consistently on the landing templates, the student player and syllabus sidebar, the canvas lesson builder, the admin course workspace, and the create-course wizard preview — all from live course data, not a static mockup.

---

## 7 — Lesson authoring

Canvas / `content_blocks` (§2) is the **only** lesson-authoring model in the product today. An earlier, parallel per-`lesson_type` authoring and rendering path (with dedicated "code exercise" and "SCORM package" lesson types) has been fully retired: the legacy student-render branches, the standalone lesson-type picker, and the admin preview player's code/SCORM cases are all removed. Every real lesson in the live database was already canvas-authored before this consolidation, so nothing needed migrating. New lessons are created canvas-only; there is no remaining path to create a "code exercise" or "SCORM package" lesson. Neither type ever ran real student code or loaded a real SCORM package — both were interactive-looking shims — so removing them removes a source of a student-facing feature that looked complete but wasn't, not a real capability.

**Known remaining gap in this area:** the admin preview player at `courses/[id]/learn` does not yet render a real canvas-authored lesson's actual content blocks — every real lesson falls back to plain text there. This is a separate, pre-existing limitation of that specific preview surface, not something this consolidation introduced or fixed.

---

## 8 — Course automations

`courses/[id]/automations` — full CRUD over `lms_automation_rules`, a visual trigger → condition → action canvas, a "seed core blueprints" starter set, and per-course scoping: a rule created from a course's own Automations tab applies only to that course; a legacy workspace-wide rule (no course set) still applies everywhere, as a distinct, supported category.

**Working triggers:** `course_completed`, `lesson_completed`, `module_completed`, `quiz_passed`, `quiz_failed`, `enrollment_created`, `certificate_issued`, `struggling_detected` — all eight of the builder's trigger options now have a real emit point, fired from the single lesson-completion choke point or from the two server-graded quiz-submit actions, so a lesson/module/course can't be marked complete or a quiz graded without the matching event firing exactly once.

**Working actions:** `enroll_course`, `grant_full_access`, `grant_partial_access`, `revoke_course`, `add_tag`, `send_email`, `send_whatsapp`, `notify_instructor`, `enroll_bundle` (delegates to the platform's real bundle-enrolment path), `assign_certificate` (issues via the same persisted, idempotent certificate path certificates use everywhere else), `send_certificate_email` (the certificate-delivery action, §5).

**`grant_community` is honestly partial.** There is no per-contact community/forum access gate anywhere in this codebase to grant into — community areas are gated purely by workspace membership. This action applies a CRM tag and stamps a community-role field that nothing yet reads to restrict access; it logs plainly that forum browsing itself isn't ACL-gated. It is not faked as a full grant.

**A real, separate, currently-unfixed bug:** the generic `send_email` automation action does not interpolate `{{variable}}` placeholders in its body — it inserts the configured template text as-is. Several pre-existing seeded rules (e.g. a "Free Enrolment Flow" blueprint) reference `{{student_first_name}}` and similar placeholders; today those go out as literal, unrendered text in the email a student receives. `send_certificate_email` avoids this because it is a dedicated action with its own real template, not a `send_email` consumer — but every other automation rule that uses `send_email` with a placeholder in its body is affected. This is a real, current bug, not fixed.

---

## 9 — Legacy / dead surface area

`lms_certificates`, `lms_certificate_templates`, and `lms_quizzes` remain in the live database with zero rows and zero code references anywhere in the app. Their removal is a deliberate, standing product decision to defer schema cleanup to a later milestone (ADR-0005) — they are inert, not a functional risk, and left in place on purpose rather than by oversight.

`cohorts` / `course_cohorts` do not exist — there is no cohort or group-of-students functionality anywhere in the product today. This is a planned area, not a partially-built one.

---

## 10 — Payment & checkout — not yet live-tested

This is the one area of the platform that has **not** been verified end-to-end in a real environment, and it should not be treated as ready until it has.

The guest-checkout and paid-enrolment code path has been read in full, current form: a public checkout page branches into a guest flow (name + email for a free course; Stripe-hosted checkout in guest mode for a paid one) with no sign-in requirement, a signature-verified Stripe webhook completes the enrolment, and the enrolment-insert logic and the event this path emits both read correctly on direct inspection. That is a code read, not a completed test.

**No real paid enrolment — guest or signed-in — has ever gone through this system on this database.** There are zero contacts created via guest checkout and zero enrolments carrying a real Stripe payment-intent id, ever, on this live database. The specific test that exists to confirm a student cannot fake a completed payment and get enrolled for free (`docs/LIVE_TEST_CHECKLIST.md`, Test 3 — the guest-return confirmation screen has no code path of its own that can write an enrolment; only the verified webhook can) has a written, reasoned justification on file, but **has never actually been executed, by anyone, in this codebase's history.** Its results section is still blank.

Compounding this: the Stripe key configured in this environment is a **live-mode key**, not a test key. Attempting a real checkout here would not be a test — it would be a real charge. No such attempt has been made, and none should be, until a genuine test-mode Stripe environment (test keys, webhook forwarding, a running app, a real browser) is available to run the existing checklist against.

**Do not describe checkout or payments as ready, fully functional, or secure.** Every other area in this document reflects code that has been read, reasoned about, and in most cases exercised against the live database; this one reflects code that has only been read. It is the single highest-priority item to run a real, live, test-mode test against before the platform is trusted with real customer payments.

---

## 11 — Everything not yet built, in one place

- **Cohorts** — no cohort/group functionality; `cohorts`/`course_cohorts` tables don't exist.
- **`code`-question grading is string-matching, not execution** — a correct-but-differently-written answer can score 0 unless the instructor listed it as an accepted variant.
- **A `file_upload` question makes its quiz non-instant** — the attempt sits `pending_review` until an instructor grades it; the lesson doesn't complete and no pass/fail event fires until then.
- **AI question generation is multiple-choice only**, regardless of scope.
- **The Classic certificate template clips its footer** on a long name + long course title combination; **custom-upload certificate fields can visually overlap** on long values placed close together. Neither is fixed.
- **The generic `send_email` automation action does not interpolate `{{variables}}`** — affected rules send literal placeholder text.
- **`grant_community` automation action is a partial implementation** — it tags/stamps a record nothing yet enforces against; there is no real per-contact community access gate to grant into.
- **Legacy dead tables remain in the database** (`lms_certificates`, `lms_certificate_templates`, `lms_quizzes`) — zero rows, zero code references, removal deliberately deferred.
- **Flashcard review is a simple two-speed schedule**, not spaced repetition.
- **Email-address change is disabled for students** — intentional, since that address is the cross-workspace identity key.
- **Payment/checkout has not been live-tested** — see §10, the one item on this list that carries real financial risk and needs to be resolved before, not after, real customer use.

---

## What IS solid

Course creation and theming; module/lesson curriculum with real drip, sequential and prerequisite locking; all 12 content-block types, authored and rendered; the canvas lesson builder with real canvas↔player parity and a real reading-completion gate; three landing-page templates with live data-bound sections; a complete student portal (dashboard, results, catalogue with search/filter/categories, flashcard review, settings); server-side lesson- and module-quiz grading across all 8 question types with real attempt persistence and analytics; fuzzy short-answer/fill-blank grading on by default, AI-semantic grading available opt-in; a persisted certificate system with stable verification ids, snapshotting, public verification, automatic delivery, and honest, correctly-scoped completion eligibility; a working, per-course-scoped automation engine covering all 8 triggers; three genuinely distinct course themes applied consistently across the whole product.

---

## Appendix — key file references

- Student: `src/app/student/{page,layout}.tsx`, `student/results/page.tsx`, `student/flashcards/{page,[blockId]}`, `student/settings/*`, `student/courses/[id]/StudentPlayerClient.tsx` (+ `lock-utils.ts`, `SyllabusSidebar.tsx`), `student/courses/[id]/quiz/[quizId]/StudentQuizClient.tsx`, `student/courses/[id]/module-quiz/[moduleId]/*`.
- Actions: `src/app/actions/studentProgress.ts`, `studentResults.ts`, `studentEnrollments.ts`, `studentFlashcards.ts`, `studentSettings.ts`, `studentPendingWork.ts`, `courseGrading.ts`, `courseCategories.ts`, `quizzes.ts`, `lms.ts`, `courseCommerce.ts`, `courseLanding.ts`, `guestCheckout.ts`, `courseBlueprints.ts`.
- Lib: `src/lib/lms/{gradeQuiz,gradeModuleQuiz,quizGrading,aiGradeAnswer,lessonContentForAI,moduleCompletion,completeLesson,issueCertificate,certificateEmail,access}.ts`, `src/lib/ai/openaiKey.ts`, `src/lib/courses/courseThemeTokens.ts`.
- API: `src/app/api/lms/{automations,quiz/*,module-quiz/*,course}`, `api/ai/generate-questions`, `api/student/courses/[id]/certificate/route.ts`, `api/webhooks/payments`.
- Certificate PDF: `libs/services/src/pdf/{cert-generator,cert-templates}.ts`.
- Automation engine: `libs/core/src/events/{lms-event-bus,lms-rule-matching}.ts`, `libs/workers/src/automation-executor.ts`.
- Admin: `src/app/courses/components/CreateCourseWizard.tsx`, `courses/[id]/components/{blocks/*,CourseCategoryField.tsx,LessonCreatorModal.tsx}`, `courses/[id]/automations/*`, `courses/[id]/lessons/[lessonId]/builder/page.tsx`, `courses/certificates/*`, `courses/needs-grading/*`, `src/components/courses/landing-pages/Template*.tsx`.
- Checkout: `src/app/checkout/[id]/*`, `src/lib/lms/guestEnrollment.ts`, `src/lib/stripe.ts`, `docs/LIVE_TEST_CHECKLIST.md`.
