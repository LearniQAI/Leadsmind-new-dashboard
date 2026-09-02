# LMS Automations — Batch 1 live-verification checklist

Companion to `docs/lms-full-audit-technical.md` **STEP 6.1**. Batch 1 wired the course
Automations engine (triggers G1, scoping G2, stub actions G3). The code is complete, type-checks
and passes unit tests; this doc is the runbook to close G1/G2/G3 with live evidence.

Run against a deployed/dev instance with a writable Supabase. Every trigger gets its own proof.

---

## Prerequisites

1. Apply migration `supabase/migrations/20260903000024_lms_automation_rules_course_scope.sql`.
2. A workspace with **two** published courses — **Course A** and **Course B** — each with:
   - at least one module with ≥2 lessons,
   - at least one lesson-level quiz and one module-level quiz,
   - a test student contact enrolled (email you can log in as).
3. Tail the server logs — the event bus prints `[LMS Event Bus] Emitted event: <type>` and
   `[LMS Event Bus] Processing rule: <name>` / `[LMS Worker Executor] Executing action: <type>`.

Helper SQL (psql / Supabase SQL editor):

```sql
-- rules on a course
select id, name, trigger_type, action_type, course_id, active
from lms_automation_rules where course_id = '<COURSE_A_ID>';

-- did an immediate action run? (tags / enrolments / certs / notifications)
select tags from contacts where id = '<STUDENT_CONTACT_ID>';
select * from lms_bundle_enrollments where contact_id = '<STUDENT_CONTACT_ID>';
select * from course_certificates where contact_id = '<STUDENT_CONTACT_ID>';
select * from notifications where workspace_id = '<WS_ID>' order by created_at desc limit 5;

-- delayed actions (rules with delay_hours/delay_days)
select * from lms_delayed_actions where contact_id = '<STUDENT_CONTACT_ID>' order by run_at desc;
```

Use a **cheap, observable action** for each trigger test: `add_tag` with a unique
`tag_name` (e.g. `t-lesson-done`). "Fired" = that tag appears on the student contact.

---

## G1 — the 5 newly wired triggers

For each row: build the rule **from Course A's Automations tab** (so `course_id` is set),
activate it, perform the real student action in Course A, then check.

| # | Rule (trigger → action) | Real student action | Pass criteria |
|---|---|---|---|
| 1 | `lesson_completed` → `add_tag` `t-lesson` | In the player, mark a lesson complete | Log: `Emitted event: lesson_completed`; `t-lesson` on contact. Re-open the lesson / re-mark → **no** second emit (idempotent). |
| 2 | `module_completed` → `add_tag` `t-module` | Complete the **last remaining** lesson in a module | Log: `Emitted event: module_completed`; `t-module` on contact. Completing an already-complete module's lesson again → no re-emit. |
| 3 | `course_completed` → `add_tag` `t-course` | Complete the final lesson of the course | Log: `Emitted event: course_completed`; `t-course` on contact. Fires exactly once. |
| 4 | `quiz_passed` (min_score 70) → `add_tag` `t-qpass` | Submit a lesson quiz with score ≥ 70 | Log: `Emitted event: quiz_passed`; `t-qpass` on contact. Submit again scoring < 70 → rule **skipped** (`fails min_score` log line), no dup tag. |
| 5 | `quiz_failed` (min_score 70) → `add_tag` `t-qfail` | Submit a lesson quiz scoring < 70 (server-graded fail) | Log: `Emitted event: quiz_failed`; `t-qfail` on contact. |
| 6 | `quiz_passed` → `add_tag` `t-mqpass` | Complete all module lessons, then pass the **module** quiz | Log: `Emitted event: quiz_passed` with `quizScope: 'module'`; `t-mqpass` on contact. |

Record for each: the log line(s), timestamp, and the `contacts.tags` value after.

---

## G2 — enrolment trigger name

7. Build a Course A rule: `enrollment_created` → `add_tag` `t-enrolled`. Activate.
8. Create a **real enrolment** into Course A (admin "enrol student", or a guest/free checkout).
9. **Pass:** log shows `Emitted event: enrollment_created` and the rule processes;
   `t-enrolled` lands on the contact. (Pre-Batch-1 this emitted `student.enrolled` and never
   matched.)

---

## G2 — course scoping

10. Keep rule #1 (`lesson_completed` → `t-lesson`) on **Course A**.
11. As the test student, complete a lesson in **Course B**.
12. **Pass:** log shows `Emitted event: lesson_completed` for the Course B course id, then
    `No active rules matching event: lesson_completed (course: <COURSE_B_ID>)` — the Course A
    rule does **not** run, and `t-lesson` is **not** re-applied for the Course B action.
13. Regression: confirm any legacy `course_id IS NULL` rule (e.g. an existing
    `certificate_issued` / `struggling_detected` rule) still fires for both courses — issue a
    certificate in Course B and confirm the NULL rule processes.

---

## G3 — the 3 previously-stub actions

14. **`enroll_bundle`** — create an `lms_bundles` row with Course B in `course_ids`. Build a
    Course A rule: `lesson_completed` → `enroll_bundle` (pick the bundle). Complete a Course A
    lesson. **Pass:** `lms_bundle_enrollments` row for (bundle, contact) + a child
    `enrollments` row into Course B; log `assign`/`enroll_bundle` lines, no `default: warn`.
15. **`assign_certificate`** — build a Course A rule: `course_completed` → `assign_certificate`.
    Complete Course A. **Pass:** a `course_certificates` row for (contact, Course A) with a
    `LM-…` `validation_id`; the student's certificate **download** for Course A returns that
    **same** `validation_id` (one creation path). Re-run the trigger → same row, no duplicate,
    log `already issued`.
16. **`grant_community`** — build a rule: `enrollment_created` → `grant_community`. Enrol the
    student. **Pass (partial, by design):** `community-access` in `contacts.tags` and
    `contacts.metadata.community_role = 'member'`; log line notes forum access itself is
    workspace-membership-gated. This is the honest scope — there is no forum ACL to flip.

---

## Sign-off

Two-bucket report back into `docs/lms-full-audit-technical.md` STEP 6.1:

- **Confirmed working (live):** list each trigger/action with its log line + row evidence + date.
- **Still open / partial:** anything that didn't fire, plus `grant_community` (permanently
  partial until a forum-ACL concept exists) and the pre-existing `executeLMSAction` course-id
  precedence note.

Then flip G1/G2 to **Resolved** and G3 to **Resolved (grant_community partial)** with the
live date.
