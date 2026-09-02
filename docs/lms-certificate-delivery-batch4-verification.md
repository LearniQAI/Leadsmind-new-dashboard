# Automatic Certificate Delivery — Batch 4 live-verification checklist

Companion to `docs/lms-full-audit-technical.md` **STEP 6.4**. Code is complete, `npx tsc
--noEmit` is clean, `npx vitest run` is 226/226 (unchanged — this batch is DB/event
orchestration with no new pure logic to unit test, same as Batch 2's manual-review action).
This runbook closes G7 with live evidence.

## Prerequisites

1. Apply `supabase/migrations/20260903000027_lms_automation_send_certificate_email_action.sql`.
2. A workspace with a **real, working Resend key** configured (`getWorkspaceEmailConfig` /
   `RESEND_API_KEY`) if you want to see a real email land; otherwise the fail-soft path is
   still checkable via logs.
3. A course with a real test student who can reach 100% (all lessons + all quizzes).

Helper SQL:

```sql
-- the seeded chain for a course
select id, name, trigger_type, action_type, active
from lms_automation_rules where course_id = '<COURSE_ID>'
  and trigger_type in ('course_completed','certificate_issued');

-- the certificate row
select id, validation_id, issued_at from course_certificates
where contact_id = '<CONTACT_ID>' and course_id = '<COURSE_ID>';
```

Tail logs for: `[LMS Event Bus] Emitted event: course_completed`,
`[LMS Worker Executor] Executing action: assign_certificate`,
`[LMS Event Bus] Emitted event: certificate_issued`,
`[LMS Worker Executor] Executing action: send_certificate_email`, and either
`lms.certificate_email.sent` or `lms.certificate_email.send_failed`.

## A. New course gets the chain automatically

- [ ] Create a brand-new course (wizard, both steps). Open its Automations tab. Confirm
      **"Certificate delivery enabled"** shows immediately (no button click) and the rule list
      contains both seeded rows (`course_completed → assign_certificate`,
      `certificate_issued → send_certificate_email`).

## B. Existing course — explicit enable

- [ ] Open a course created **before** this batch. Confirm the Automations tab shows the
      amber **"Enable certificate delivery"** button, not the enabled state.
- [ ] Click it. Confirm it flips to "Certificate delivery enabled" and both rules now exist
      (SQL above).
- [ ] Click "Seed core blueprints" on the same course afterward — confirm it does NOT touch or
      duplicate the certificate-delivery rules (they're a separate insert path).

## C. Real completion → real chain fires

- [ ] As the test student, complete every lesson and pass every quiz in a course that has the
      chain enabled.
- [ ] Confirm in logs: `course_completed` emitted → `assign_certificate` executed →
      `certificate_issued` emitted → `send_certificate_email` executed.
- [ ] SQL: exactly **one** new `course_certificates` row for this (contact, course).
- [ ] With a real Resend key configured: confirm the email actually arrives — subject
      "You earned your certificate for `<course>`! 🎓", real student first name, real course
      title, a working **Download my certificate** link that lands on the real PDF (via the
      existing authenticated download route), and a working verify link.
- [ ] Without a real key (or with a placeholder): confirm `lms.certificate_email.send_failed`
      is logged with a real reason, and — critically — the certificate row from the SQL check
      above still exists and the download route still serves a valid PDF.

## D. Idempotency — no duplicate certificate, no duplicate email

- [ ] Re-open the course player and re-trigger a completion recalculation for the
      already-certificated student (e.g. mark a lesson incomplete then complete it again, or
      call `markLessonComplete` again on the last lesson).
- [ ] Confirm `course_completed` either does not re-fire (if the lesson's own fast-path
      absorbs it) or, if it does, that `assign_certificate` logs `already issued` (not
      `issued`) and does **not** re-emit `certificate_issued` — no second
      `send_certificate_email` execution, no second email.
- [ ] SQL: still exactly **one** `course_certificates` row for this (contact, course); same
      `validation_id` as before.
- [ ] Manually hit the download route 2–3 times in a row (re-download). Confirm via logs that
      `certificate_issued` is emitted only on the run where the row didn't exist yet (should
      already be zero additional emits here, since the cert was created in step C) — no
      additional certificate-earned emails from repeated downloads.

## E. Unaffected surfaces

- [ ] Student's My Results page shows the single certificate with the same validation id as
      the SQL row.
- [ ] The player sidebar's manual "Download certificate" button and `/portal/courses`'s
      "Get Certificate" link both still work and serve the identical PDF/validation id.
- [ ] Admin `courses/certificates` list shows exactly one row for this student/course, same
      validation id.

---

## Sign-off

G7 is closed only when A–E are all checked on a live instance. Until then STEP 6.4 stays
"code-complete, live verification pending".
