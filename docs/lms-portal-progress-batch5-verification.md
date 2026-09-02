# Contact Portal Progress Fix — Batch 5 live-verification checklist

Companion to `docs/lms-full-audit-technical.md` **STEP 6.5**. No migration. Code is complete,
`npx tsc --noEmit` is clean, `npx vitest run` is unchanged at 226/226. This runbook closes G13
with a real browser-level check (this pass verified the fixed query logic directly against
live data — see STEP 6.5 — but did not load the pages in a running app).

## A. Real number, not zero

- [ ] Log in as a real portal contact with at least one enrolment and some real lesson
      completions (e.g. the contact used in this pass's live-data trace, or seed one).
- [ ] Load `/portal/dashboard`. Confirm the "Average Progress" card shows a real, non-zero
      percentage matching `round(completed lessons / total lessons * 100)` averaged across
      that contact's enrolments (compute it by hand from `course_progress` /
      `course_lessons` for a real cross-check).

## B. Cross-portal agreement

- [ ] For a contact who also has a `/student` login for the same email/workspace, load both
      `/portal/dashboard` and `/student` for the same course. Confirm the per-course
      percentage `/student`'s "My courses" card shows for that course matches what you'd get
      averaging in `/portal/dashboard` for a contact enrolled in only that one course (i.e.
      the two portals agree on the same underlying number for the same course).

## C. Regression

- [ ] Confirm the rest of `/portal/dashboard` is unaffected: FICA banner, overdue invoice
      banner, invoices table, upcoming bookings — all still behave exactly as before.

## D. Sibling sweep (already done statically this pass — optional live re-confirm)

- [ ] Spot-check `/portal/courses`, `/portal/bookings`, `/portal/invoices`,
      `/portal/documents`, `/portal/projects`, `/portal/support` load without server errors
      for a real contact — the STEP 6.5 static sweep found no schema-drift issues in these,
      this is just a real-environment confirmation.

---

## Sign-off

G13 is closed when A–C are checked on a live instance.
