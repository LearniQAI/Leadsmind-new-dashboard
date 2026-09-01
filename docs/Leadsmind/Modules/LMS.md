---
type: module
---

# LMS

## Purpose

Course authoring and delivery: courses, modules/lessons, a multi-type quiz
engine, enrollment, certificates, student progress, cohorts, and a student
portal. Two audiences — workspace members (authors/admins) and portal contacts
(students who never get a `workspace_members` row, authenticated via
`src/lib/portal/session.ts`). Deep migration history (LMS phases 3, 5, 25, 29,
plus course-commerce, assignment-submission, automation-matrix and the
`quiz_engine_10_types` engine).

## Key Files

- Admin pages: `src/app/courses` (`[id]`, `certificates`, `components`,
  `utils`), `src/app/content-studio`.
- Student: `src/app/student`, `src/app/portal`, `ContinueLearningBanner`
  component (commits `337aefbf`, `b89a7525`, `1a6ae32d`).
- Server actions: `src/app/actions/lms/`, `lms.ts`, `quizzes.ts`,
  `studentEnrollments.ts`, `studentProgress.ts`, `blockCompletion.ts`,
  `courseBlueprints.ts`, `courseCommerce.ts`, `courseEmails.ts`,
  `courseLanding.ts`.
- Lib: `src/lib/lms/` — `access.ts`, `enrolment.ts`, `completeLesson.ts`,
  `moduleCompletion.ts`, `gradeQuiz.ts`, `gradeModuleQuiz.ts`,
  `lessonBlockTree.ts`, `chunking.ts`, `ragPipeline.ts`, `summaryPipeline.ts`,
  `onboardingEmail.ts`.

## API Routes / DB Tables

- Routes: `src/app/api/lms/*` — `course`, `courses`, `modules`, `lessons`,
  `content-blocks`, `module-quiz`, `quiz`, `remedial`, `struggle`, `progress`,
  `enrollments`, `assignments`, `analytics`, `transcript`, `course-qa`
  (RAG Q&A), `lesson-summary`, `upload`, `video-thumbnail`, `contacts-search`,
  `automations`. Also `src/app/api/courses/[id]`, `src/app/api/enrolments/[id]`,
  `src/app/api/student/courses/*` (incl. `[id]/certificate`).
- Tables: `courses`, `course_modules`, `course_lessons`, `lesson_blocks`,
  `lesson_block_completions`, `enrollments`, `course_progress`, `quiz_attempts`,
  `module_quiz*` (`20260903000013`), `course_content_chunks`
  (`20260824000000_course_qa_rag.sql`, `vector(1536)`), `lesson_summaries`
  (`20260825000000`), `content_blocks` (`20260903000003`), certificates tables
  (phase 29). Recent FK/cascade fixes: `a52cf93b`,
  `20260903000014/15_*_fk_set_null.sql`,
  `20260903000016_drop_legacy_lms_quizzes.sql`.

## Known Issues

- **Quiz-grading trust exploit (fixed in [[Milestone-1]]):** grading is now
  server-side; `markLessonComplete()` enforces enrollment + quiz-pass; the
  certificate route rejects issuance when a quizzed lesson has no passing
  `quiz_attempts` row; a raw POST to `/api/lms/progress` for a course the caller
  isn't enrolled in returns 403 (`src/app/api/lms/progress/route.ts:8` comment).
- **Second quiz engine** (`lms_quiz_submissions`, workspace-member scoped via
  `check_workspace_access`) was reasoned about but left unchanged — assessed as
  not reachable by anonymous portal students. Confirm live.
- **Self-report writes** locked down: ownership-only INSERT policies on
  `enrollments`, `quiz_attempts`, `course_progress` dropped
  (`20260725000001_lock_down_student_self_report_writes.sql`).
- `src/lib/automation/lms_actions.ts` `update_community_privilege` /
  `send_whatsapp_template` still use the session-scoped client (flagged, not
  fixed — see security review section E).
- Certificate saving + admin certificates page crash — [[Milestone-3]] task 50.
- Lesson builders incomplete: flashcards, code, SCORM (task 56); no true
  drag-and-drop question type (task 57); YouTube/Vimeo lessons are a raw URL box
  (task 55).
- `course_content_chunks.source_reference` title snapshot can go stale if a
  lesson title changes without content changing (content_hash only tracks
  extracted text) — known minor RAG limitation.
- AI mock fallbacks: `src/app/api/ai/generate*/route.ts` return canned text when
  the OpenAI key is missing / `sk_mock_key` / contains `PLACEHOLDER` / starts
  with `sk-proj-O15jtbs`.

## Related Tasks

[[Milestone-1]] (quiz-grading + certificate trust fixes, student self-report
RLS) · [[Milestone-3]] (certificates, cohorts, session booking, categories,
embed player, lesson builders, transcripts, learning analytics, AI essay
grading, AI quiz generation — see [[Milestone-3]]) ·
[[Milestone-4]] (course RAG/Q&A via pgvector, lesson summaries)
