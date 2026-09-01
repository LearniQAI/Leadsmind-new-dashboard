# Student Portal — Complete Ground-Truth Inventory (Audit-Only)

> Scope: every real student-facing feature under `/student/*` plus adjacent student-facing
> paths (`/unauthenticated/courses/*`, `/portal/*`, `/api/student/*`), as the code exists on
> branch `lms` today. No fixes, no redesign — just what's real, what's placeholder, and what's
> broken/orphaned. Every claim is a direct source read with `file:line` citations.
>
> **Note on Milestone 3 cross-reference:** the Milestone 3 task list (tasks 44–61) is not
> checked into this repo, so task *titles* below (50, 58, 59) are quoted from the audit prompt
> and from inline code comments (`// Task 59: ...`), not from a task doc I could read. The
> code status against each is verified; the mapping to a task number is only as good as those
> comment strings.

---

## STEP 0 — Route map (`/student/*` and other student-facing paths)

| Route | Component | What it does | Data binding |
|---|---|---|---|
| `/student` | `src/app/student/page.tsx` | Dashboard: 4 stat cards, "Continue learning" banner, "My courses" grid | **Mixed** — course grid is real; 2 of 4 stat cards are broken; banner is dead (legacy schema) |
| `/student/marketplace` | `marketplace/page.tsx` + `MarketplaceClient.tsx` | Course catalog; enrol / buy / open | **Real** — `getMarketplaceCourses`, `getMyEnrollments` |
| `/student/checkout/[courseId]` | `checkout/[courseId]/page.tsx` + `CheckoutClient.tsx` | Paid-course checkout, enrolment-cap check, Stripe session | **Real** — `courses`, `enrollments`, Stripe |
| `/student/courses/[id]` | `courses/[id]/page.tsx` + `StudentPlayerClient.tsx` | Course player: syllabus, content-block rendering, completion, gating, per-course theme, cert download | **Real** — `course_modules`, `course_lessons`, `content_blocks`, `course_progress`, `lesson_block_completions` |
| `/student/courses/[id]/quiz/[quizId]` | `quiz/[quizId]/page.tsx` + `StudentQuizClient.tsx` | Lesson-level quiz taking + server-graded result + review + remedial CTA | **Real** — `quiz_questions`, `quiz_settings`, `quiz_attempts`, `lms_remedial_assignments` |
| `/student/courses/[id]/module-quiz/[moduleId]` | `module-quiz/[moduleId]/page.tsx` (reuses `StudentQuizClient`) | Module-level quiz, gated on all-lessons-complete | **Real data, but ORPHANED** — no link to it anywhere in the student UI (see Step 4) |
| `/student/courses/[id]/remedial` | `remedial/page.tsx` + `RemedialClient.tsx` | AI-generated remedial assignment when quiz attempts are exhausted | **Real** — `lms_remedial_assignments`, `generateRemedialAssignment` (AI) |
| `/unauthenticated/courses/[slug]` | `unauthenticated/courses/[slug]/page.tsx` | Public course landing/sales page (slug or custom domain) | **Real** — `getCourseLandingData` / `...ByDomain` |
| `/unauthenticated/domain-portal` | `unauthenticated/domain-portal/page.tsx` | Custom-domain root: lists published courses on that domain | **Real** — `getPublishedCoursesForDomain` |
| `/portal/courses` | `(portal)/portal/courses/page.tsx` | **Separate** contact/client portal (`getPortalSession`, not Supabase auth). Lists enrolments, progress, live sessions, cert link, upsell grid. Links *into* `/student/courses/[id]` for playback | **Real** — `enrollments`, `course_lessons`, `course_progress`, `lms_expert_sessions` |
| `/api/student/courses/[id]/certificate` | `api/student/courses/[id]/certificate/route.ts` | On-demand PDF completion certificate (Puppeteer/Chromium), gated on 100% lessons + all quizzes passed | **Real** — reads `course_lessons`/`course_progress`/`quiz_attempts`/`contacts`; renders hard-coded HTML→PDF; **not persisted** |

`src/app/student/layout.tsx` sidebar nav has exactly three links: **My Dashboard**, **Course Catalog**, **Admin Workspace** (`/courses`), plus Sign Out. There is **no** Results / Progress / Transcript / Certificates / Profile / Settings nav item.

Auth: `/student/*` uses `requireAuth()` (Supabase user). A student's *contact* row is resolved per-course from `courses.workspace_id` via `getOrCreateStudentContact()` (`studentEnrollments.ts:13`), auto-creating a `contacts` row if none exists. All progress/quiz writes key off that **contact_id**, not the auth user id — this distinction is the root of the dashboard stat bugs below.

---

## STEP 1 — Dashboard (`src/app/student/page.tsx`)

### The 4 stat cards

| Card | Source | Verdict |
|---|---|---|
| **Enrolled courses** | `courses.length` from `getEnrolledCoursesWithProgress()` | **Real.** Count of active enrolments (`isEnrolmentActive` filter). |
| **Avg. progress** | `mean(course.progressPercentage)` over enrolled courses | **Real.** Each course's `progressPercentage = round(completedLessons / totalLessons * 100)` where `completedLessons` = count of `course_progress` rows for the course, `totalLessons` = count of `course_lessons` (`studentEnrollments.ts:281-372`). Lesson-level, genuine. |
| **Quizzes passed** | `quiz_attempts` query at `page.tsx:35-41` | **BROKEN — always 0.** Two independent faults: (1) `.select('score_pct, passed')` — column **`score_pct` does not exist** on the live `quiz_attempts` table (live schema `supabase/migrations/20240101000171_lms_admin.sql:86` has `score`, `max_score`, `percentage`; `score_pct` only appears in the stale, unused `src/supabase/lms_schema.sql`). A select on a missing column errors → `quizAttempts` is `null`. (2) `.eq('student_id', profile?.id)` filters by the **auth user id**, but `submitQuizAttempt` writes `student_id: contactId` (`studentProgress.ts:153`). Even with a valid column, this id never matches. |
| **Avg. quiz score** | `mean(Number(q.score_pct))` over the same query | **BROKEN — always 0%.** Same two faults; `score_pct` is also the wrong field name for the average even if rows were returned. |
| — | `getCurrentWorkspaceId()` is awaited at `page.tsx:34` and its result discarded | Dead line; quiz query is not workspace-scoped. Cosmetic. |
| — | `module_quiz_attempts` | **Not counted at all.** Module-quiz passes never contribute to "Quizzes passed". |

### "My courses" card grid

- **Source:** `getEnrolledCoursesWithProgress()` — real. One card per active enrolment.
- **"2 lessons" / "0 lessons" badge** (`page.tsx:171`): `course.totalLessons` = live `count(course_lessons WHERE course_id = …)`. `0 lessons` = the course genuinely has zero lesson rows (empty/test course), not a display bug.
- **"0/2 lessons" + progress bar + "0%"** (`page.tsx:191-198`): `completedLessons` = count of this contact's `course_progress` rows for the course; `pct = course.progressPercentage`. Genuine per-student lesson-completion tracking. This is the **lesson-level** `course_progress` signal — *not* `lesson_block_completions`. Block completions exist and drive in-player gating / "can advance" checks and are written on quiz pass (`studentProgress.ts:166-183`), but the dashboard % is the coarser lesson count.
- **Thumbnail** (`page.tsx:158-168`): `course.thumbnail_url` if set, else a `BookOpen` icon on a gradient. The "generic placeholder icon" on the second course in the screenshot = that course's `thumbnail_url` is null. Expected fallback behavior, present in every course grid in the app (marketplace, portal). Not a thumbnail-handling gap; just an empty field on a test course.
- **Completed badge / button label** (`page.tsx:173-210`): `done = pct >= 100`; button reads Start / Resume / Review off `pct`. Real.

### "Continue learning" banner (`src/components/lms/ContinueLearningBanner.tsx`)

**DEAD — renders `null` in practice.** It is written against a schema that does not exist in this codebase:
- `student_portal_assignments` (`:36`) — **never defined** in any migration.
- `courses(id, name, description)` (`:38`) — live `courses` has `title`, not `name`.
- `lessons` + `modules` tables (`:49-50`) — live schema is `course_lessons` + `course_modules`.
- `lesson_completions` keyed by `user_id` (`:69`) — **never defined**; real completion is `course_progress` keyed by `contact_id`.
Every one of those queries returns nothing, so one of the early `return null` guards (`:44`, `:55`) fires. The banner never displays. It is rendered unconditionally at `page.tsx:106`.

---

## STEP 2 — Course catalog (`/student/marketplace`)

- **Courses shown:** `getMarketplaceCourses()` (`studentEnrollments.ts:228`) → `courses WHERE published = true AND workspace_id IN (allowed set)`. Allowed set = override `workspaceId` param, or the `active_workspace_id` cookie **plus** every workspace where the user is a `workspace_members` row or has a `contacts` row. (Comment documents a prior cross-tenant leak that was scoped down.) So: **only `published = true` courses**, correctly tenant-scoped. Draft courses never appear.
- **Filtering / search:** **none.** `MarketplaceClient.tsx` renders `courses.map(...)` directly — no search box, no category/tag/price filter, no sort. Flat grid.
- **Enrolment state:** real. `enrolledCourseIds` from `getMyEnrollments()`; each card shows one of: **Manage course** (user is `admin` in that workspace — blocked from self-enrol), **Enrolled — open**, **Buy & enrol** (`price > 0` → `/student/checkout/[id]`), or **Enrol now** (free → `enrollStudent()` server action). `enrollStudent` re-checks admin role and, for `pricing_model !== 'free'`, requires a paid `invoices` row referencing the course.
- **Price display:** `isFree = !(course.price > 0)` → "FREE" or `$${price}`. Reads real `courses.price`.
- **Empty state:** real (`courses.length === 0` → "No courses available").

---

## STEP 3 — Course player / lesson experience (`/student/courses/[id]`)

Cross-referenced, not re-discovered — confirmed still wired as documented:

- **Content-block rendering:** `StudentPlayerClient.tsx:760-869` renders ordered `content_blocks` (fetched server-side, `page.tsx:97-111`) for: `video`, `audio` (embed + voice-note), `html_code`, `reading`/`slides` (in-page `ReadingModal`), `rich_text` (sanitized), `download`, `embed` (`isSafeEmbedUrl` gate), `live_session`, `quiz` (link to lesson quiz), `assignment`, `flashcards`. Legacy per-`lesson_type` renderers (video/quiz/pdf/audio/assignment/live_session/flashcards/code/scorm) still exist as the fallback when a lesson has no blocks (`:871-1099`).
- **Completion gating:** `getLessonLockReason()` (`components/lock-utils.ts`) drives `LockedLessonPlaceholder`; "Next lesson" button calls `getLessonBlockCompletionStatus(lessonId)` and refuses to advance unless `allComplete` (`:1116-1132`). Block completions recorded via `recordBlockCompletion` (`actions/blockCompletion.ts`); `completion_rule === 'none'` blocks auto-complete on view (`:157-164`).
- **Per-course theming:** `getCourseTheme(course.landing_page_settings?.template)` (`lib/courses/courseThemeTokens`) → `theme.solidBgClass` / `primaryHex` used throughout. Working.
- **Access gate:** player is served only to an enrolment where `isEnrolmentActive(enrollment)` is true (`page.tsx:53`); deactivated enrolment shows an "Access paused" card.
- **Ancillary widgets present:** `LiveHelpWidget`, `CourseQAWidget`, `LessonSummaryPanel`, heartbeat/position-restore (`useHeartbeat`, `?restore=&t=&lessonId=` params), low-bandwidth video mode, in-browser code sandbox (`new Function`), mock SCORM API shims.
- **Certificate download:** `handleDownloadCertificate` (`:384-386`) opens `/api/student/courses/[id]/certificate`; the button only renders in `SyllabusSidebar` when `globalProgressPercentage === 100` (`SyllabusSidebar.tsx:99-106`).

Status: **real and functional** as previously documented. Nothing here appears regressed.

---

## STEP 4 — Quizzes (student-facing)

### Lesson-level quiz — `/student/courses/[id]/quiz/[quizId]` (quizId = lesson id)
**Real and functional.** `page.tsx` verifies enrolment, loads `quiz_questions` + `quiz_settings` + attempt count + remedial status. `StudentQuizClient` walks questions (MCQ, true/false, short-answer have real answer UI; matching/ordering/fill_blank/code/file_upload have no input UI and are silently ungradeable client-side). On submit → `submitQuizAttempt` (`studentProgress.ts:131`): server re-grades via `gradeQuizAttempt`, inserts a `quiz_attempts` row, and on pass writes `lesson_block_completions` for quiz blocks + marks the lesson complete + runs the struggle processor. Result screen shows score, pass/fail, per-question review with correct answers + explanations. Attempt lockout at `settings.max_attempts` (default 3) → "Start AI Remedial Session" CTA.

### Module-level quiz — `/student/courses/[id]/module-quiz/[moduleId]`
**Real data path, but not reachable from the student UI.** The page reuses `StudentQuizClient` with a `moduleId` prop, gates on `getModuleCompletionStatus` (all module lessons complete), reads `module_quiz_questions`/`module_quiz_settings`/`module_quiz_attempts`, and submits via `submitModuleQuizAttempt` (server-graded, real insert). **However:** `grep module-quiz src/app/student` returns only the page file itself. `StudentPlayerClient` and `SyllabusSidebar` link **only** to lesson quizzes (`/quiz/${activeLesson.id}`) — there is no module-quiz link, button, or syllabus node anywhere in the student player. The admin-workspace player (`/courses/[id]/...`, `ModuleCard.tsx:219`) *does* link to its own `/courses/[id]/module-quiz/...`. So a student can only reach the module quiz by typing/knowing the URL.

### Does the student portal surface quiz results/history to the student?
**No.** There is no student-facing page that lists quizzes taken, scores, pass/fail, or attempt history. The only places a student ever sees a quiz result:
1. The one-time result screen immediately after submitting (`StudentQuizClient`, not persisted in the UI).
2. The dashboard "Quizzes passed" / "Avg. quiz score" cards — which are **broken and always show 0 / 0%** (Step 1).

So the prompt's hypothesis is confirmed as a **real gap**: a "Quizzes passed" stat exists on the dashboard, no page lists which quizzes or what scores, and the stat itself is non-functional. Quiz history *is* visible to admins (`quiz_attempts` feeds `/courses` admin analytics), just never to the student.

---

## STEP 5 — Results / progress / transcript

- **Dedicated "my results" / "my progress" page:** **does not exist.** No route, no nav entry, no component. The dashboard summary stats (Step 1) are the entirety of the student's own analytics surface, and half of them are broken.
- **In-player progress:** the course player shows a live `globalProgressPercentage` ring + `completed / total lessons` in the syllabus sidebar (real, computed client-side from `completedLessonIds`). That's per-course and only visible while inside a course.

### Task 58 — "Build student transcript generation"
**Backend stub only, non-functional, no UI.** `src/app/api/lms/transcript/route.ts` builds a jsPDF transcript, but:
- Auth is `requireWorkspaceAccess()` (admin/workspace), takes `?studentId=&courseId=` as query params — **not** a student self-serve endpoint.
- Queries `courses.name` (live col is `title`) and `quiz_attempts.select('score_pct, passed, quizzes(lesson_id)')` — `score_pct` doesn't exist, and there is no `quizzes` FK relation on the live `quiz_attempts` (it has a bare `lesson_id`). The query errors.
- `grep 'lms/transcript' src` → **zero callers.** No button, page, or link invokes it.
Effectively dead scaffolding.

### Task 59 — "Build a student-facing learning analytics dashboard"
**Backend stub only, non-functional, no UI.** `src/app/api/lms/analytics/route.ts` (comment: `// Task 59: Build a student-facing learning analytics dashboard`):
- Also `requireWorkspaceAccess()` + `?studentId=` — not student self-serve.
- Reads `student_portal_assignments` (**table never defined**) and `quiz_attempts.score_pct` (**column never defined**). Returns zeros/empties at best.
- `grep 'lms/analytics' src` → **zero callers.** No dashboard consumes it.
Effectively dead scaffolding. The nearest thing that actually renders is the four dashboard cards, which are a different (also broken) code path.

---

## STEP 6 — Certificates

**Partially real: one live generation path; everything schema-side is dead.**

- **What actually renders a certificate to a student:** `GET /api/student/courses/[id]/certificate` (`route.ts`). It:
  - resolves the contact, checks `count(course_progress) >= count(course_lessons)`, and checks a passing `quiz_attempts` row exists for every lesson that has `quiz_questions`;
  - calls `generateCertificatePDF({ studentName, courseTitle, completionDate, validationId })` (`libs/services/src/pdf/cert-generator.ts`) — a **hard-coded HTML template** rendered to A4-landscape PDF via `puppeteer-core` + `@sparticuz/chromium`; `validationId` is `LM-XXXX-XXXX-XXXX` from `Math.random()` (not stored, not verifiable);
  - emits a `certificate_issued` telemetry event;
  - streams the PDF as a download. **Nothing is persisted** — no row is written anywhere.
  - **Entry points:** the player sidebar button (only at 100%), and `/portal/courses`'s "Get Certificate" link (shown when `progress === 100`).
- **`lms_certificates` / `lms_certificate_templates`:** defined in migrations (`20240101000047`, `20240101000056`, `20240101000156`) and have **zero references in `src/`** (`grep 'lms_certificates' src` → nothing). Confirmed dead scaffolding, exactly like the earlier quiz-cleanup audit found — same status as the cohort tables.
- **Task 50 — "Fix certificate saving and the admin certificates page crash":** the admin side is `src/app/actions/lms/certificates.ts` + `src/app/courses/certificates/`. `getAdminCertificates()` queries a table called `certificates` (not `lms_certificates`) with `courses(name)` — legacy schema again — wrapped in a `try/catch` that **swallows the error and returns `{ data: [] }`** ("prevent the UI crash"). `saveCertificateTemplate()` writes `courses.certificate_template_id` (a column from the stale `src/supabase/lms_schema.sql`, not the live `courses`). So "the crash" was fixed by making the page render an empty list; no code anywhere inserts a certificate row, so the admin certificates page is permanently empty by construction. Not student-facing, included only for the Task 50 cross-reference.

**Bottom line:** a student *can* download a real (if generic, unverifiable, unstored) PDF on 100% completion. The certificate *records* / *templates* / *admin management* layer is entirely unbuilt/dead.

---

## STEP 7 — Assignments (student-facing)

- **Submission flow:** real, **only inside a lesson**. `StudentPlayerClient` renders `renderAssignmentPanel()` when a lesson has an `assignment` content block or `lesson_type === 'assignment'` (`:173-198`, `:437-568`). It `GET`s `/api/lms/assignments?lessonId=` for an existing submission, supports a text response + one file upload (`/api/lms/upload`), `POST`s to `/api/lms/assignments`, and shows graded status (`pending` / `passed` / `failed`), instructor `feedback_comments`, and a "Resubmit" path when not passed.
- **Any portal-level assignment list?** **No.** There is no page listing pending / submitted / graded assignments across courses. A student only sees an assignment by navigating to the specific lesson that contains it. No inbox, no "due" view, no cross-course roll-up.

---

## STEP 8 — Anything else discoverable

- **Remedial (AI) sessions** — `/student/courses/[id]/remedial?lessonId=` — real. Auto-generates an `lms_remedial_assignments` row via `generateRemedialAssignment` (AI) when a student exhausts quiz attempts; passing it unlocks the quiz (`hasPassedRemedial` in the quiz page). Lesson-scoped only (no module-quiz equivalent — those CTAs are hidden for module scope).
- **Course Q&A widget** (`CourseQAWidget`) and **Live Help widget** (`LiveHelpWidget`) — in-player only, real components (not audited in depth here).
- **Lesson summary panel** (`LessonSummaryPanel`) — in-player AI/summary panel per lesson.
- **Flashcards** — rendered inline as a content-block / lesson type in the player (`renderFlashcardsPanel`). **No** standalone spaced-repetition "flashcard review" surface.
- **Profile / settings / notification preferences** — **none under `/student/*`.** The only profile page in the app for a portal-type user is `/portal/profile` (the separate contact portal, `getPortalSession` auth), plus `/portal/profile/verify-email`. A `/student` student has no settings page at all.
- **Adjacent contact/client portal `/portal/*`** — `dashboard`, `courses`, `bookings`, `invoices`, `projects`, `documents`, `support`, `profile`. This is a CRM-contact portal, not the `/student` portal, but `/portal/courses` is genuinely student-facing (lists enrolments, links into the `/student` player, offers the certificate download). It reads real `enrollments` / `course_progress` / `lms_expert_sessions`; note `/portal/dashboard` reads `course_progress.progress_percent` (`page.tsx:85`), a column the live row-per-lesson `course_progress` table does not have — likely always 0.
- **`/unauthenticated/courses/[slug]`** and **`/unauthenticated/domain-portal`** — real public marketing/landing surfaces for courses (slug- or custom-domain-served), backed by `courseLanding` actions.

---

## STEP 9 — Summary table

| Feature / page | Real or placeholder | Functional status | In Milestone 3 (44–61)? |
|---|---|---|---|
| `/student` dashboard — shell, header, layout | Real | Fully working | n/a (list not in repo) |
| Dashboard · Enrolled courses card | Real | Fully working | — |
| Dashboard · Avg. progress card | Real | Fully working (lesson-level `course_progress`) | — |
| Dashboard · Quizzes passed card | Real intent | **Broken — always 0** (`score_pct` column doesn't exist; filters by user id not contact id; ignores `module_quiz_attempts`) | implied by Task 59 area |
| Dashboard · Avg. quiz score card | Real intent | **Broken — always 0%** (same faults) | implied by Task 59 area |
| Dashboard · "My courses" grid | Real | Fully working (thumbnail falls back to icon by design) | — |
| Dashboard · "Continue learning" banner | Placeholder / legacy | **Dead — never renders** (queries `student_portal_assignments`, `lessons`, `lesson_completions`, `courses.name` — none exist) | — |
| `/student/marketplace` catalog | Real | Working; **no search/filter/sort**; correct published-only + tenant scoping + enrolment state | — |
| `/student/checkout/[courseId]` | Real | Working (Stripe, enrolment cap, admin block) | — |
| `/student/courses/[id]` player | Real | Working — content blocks, gating, theming, heartbeat, cert button at 100% | Phases B/C/F (pre-M3) |
| Lesson-level quiz `/quiz/[quizId]` | Real | Working — server-graded, attempts, review, remedial CTA | Milestone 3 quiz engine |
| Module-level quiz `/module-quiz/[moduleId]` | Real | Data path works; **orphaned — no link from student UI**, URL-only | recent module-quiz build |
| Student-visible quiz results/history page | — | **Does not exist** | gap |
| `/student/courses/[id]/remedial` | Real | Working (AI generation, unlocks quiz); lesson-scoped only | Milestone 3 remedial |
| Certificate PDF `/api/student/courses/[id]/certificate` | Real | Working — generates generic, unstored, unverifiable PDF at 100% + all quizzes passed | Task 50 area |
| `lms_certificates` / `lms_certificate_templates` | Dead scaffolding | Zero code refs; no rows ever written | Task 50 |
| Admin certificates page `/courses/certificates` | Placeholder | Renders empty by construction (error swallowed); not student-facing | Task 50 ("page crash") |
| Student transcript | Stub | `/api/lms/transcript` exists, **zero callers**, admin-auth, queries broken (`score_pct`, `courses.name`) | **Task 58** |
| Student learning-analytics dashboard | Stub | `/api/lms/analytics` exists, **zero callers**, admin-auth, queries a non-existent table | **Task 59** |
| "My results" / "my progress" / transcript **page** | — | **Entirely unbuilt** (no route, no nav) | Tasks 58–59 |
| Assignment submission (in-lesson) | Real | Working — text + file, grade status, feedback, resubmit | Milestone 3 content blocks |
| Cross-course assignment list (pending/submitted/graded) | — | **Does not exist** | gap |
| Flashcards | Real | Inline block/lesson only; **no standalone review mode** | — |
| Profile / settings / notification prefs under `/student` | — | **Does not exist** (only `/portal/profile`, a different portal) | gap |
| `/unauthenticated/courses/[slug]` public landing | Real | Working | pre-M3 landing-page work |
| `/unauthenticated/domain-portal` | Real | Working | custom-domain work |
| `/portal/courses` (adjacent contact portal) | Real | Working; links into `/student` player; offers cert | separate portal track |

### Broken / orphaned / unbuilt — consolidated

1. **Dashboard "Quizzes passed" & "Avg. quiz score"** — always 0; `score_pct` column doesn't exist, wrong id filter, `module_quiz_attempts` uncounted (`page.tsx:35-47`).
2. **"Continue learning" banner** — dead; entire component targets a non-existent legacy schema (`ContinueLearningBanner.tsx`).
3. **Module-level quiz** — real but unreachable from the student UI; no link anywhere in `src/app/student/*`.
4. **No student-facing quiz results / progress / transcript / analytics page** — dashboard stubs (`/api/lms/transcript`, `/api/lms/analytics`) have zero callers and broken queries; Tasks 58 & 59 are unbuilt beyond dead API stubs.
5. **Certificates** — only a live, generic, unstored PDF at 100%; `lms_certificates*` tables and the admin certificates page are dead/empty (Task 50 "fix" = error suppression).
6. **No cross-course assignment list** — assignments visible only inside their lesson.
7. **No `/student` profile / settings / notification preferences.**
8. **Marketplace has no search or filtering.**
