---
type: project
milestone: 3
focus: HR, Learning, Calendar & Telephony Completion
status: not-started
---

# Milestone 3 — HR, Learning, Calendar & Telephony Completion

31 tasks (Full Production-Readiness Plan items 44–74). Completes the three
back-office pillars (HR, LMS, Calendar) and adds a real phone system. **Not
started** — this note is the live task-by-task tracker. Task names are from the
plan document (19 July 2026); no separate issue tracker exists in the repo.

Related modules: [[Communications-Hub]] · [[LMS]] · [[Marketing-Automation]]
Prev / Next: [[Milestone-2]] · [[Milestone-4]]

## Status — two-bucket

### Verified / Fixed
- _None yet._

### Deliberately Deferred / Open
- All 31 tasks below. Tracked as a group on [[Deferred-Items-Tracker]] (D14).
- Some code foundations already exist and are noted inline, but no task is
  closed.

## HR (44–49)

- [ ] Build HR Attendance, Schedule, Warning & Termination workflows
- [ ] Build real clock-in/clock-out and overtime tracking
- [ ] Build employee document/attachment upload
- [ ] Build self-service payslip viewing
- [ ] Fix "Mark as Paid" / "Delete Run" payroll buttons
- [ ] Extend HR notifications (payroll runs, new hires, terminations)

Files: `src/app/{hr,hrm,payroll}`, `src/app/api/hr/{employees,leave,payroll,time-tracking}`,
`src/app/actions/hr/`. Cross-workspace access gap here was closed in
[[Milestone-1]] (task 7).

## Learning / LMS (50–61)

- [ ] Fix certificate saving and the admin certificates page crash
- [ ] Build a true "Cohort" grouping for courses
- [ ] Build student-initiated session booking
- [ ] Connect students to the richer Quiz system
- [ ] Add course categories
- [ ] Build a real YouTube/Vimeo embed player (replacing the raw URL box)
- [ ] Complete the flashcards, code, and SCORM lesson builders
- [ ] Build a true drag-and-drop question type
- [ ] Build student transcript generation
- [ ] Build a student-facing learning analytics dashboard
- [ ] Build AI essay grading
- [ ] Build AI-generated new quizzes beyond the existing remedial questions

Files: `src/app/{courses,student}`, `src/app/api/lms/*`, `src/lib/lms/*`,
`src/app/actions/{lms,quizzes}.ts`. See [[LMS]]. The module-quiz schema this
builds on is [[ADR-0001-module-quiz-separate-tables]]; transcript work touches
the tables discussed in [[ADR-0002-quiz-attempt-fk-set-null]].

## Calendar (62–71)

- [ ] Build real Google Calendar & Outlook "Connect"
- [ ] Fix fake video-meeting link generation
- [ ] Connect the Round Robin booking algorithm
- [ ] Build booking-confirmation emails and self-service cancel/reschedule
- [ ] Add Apple Calendar / Exchange sync
- [ ] Build scheduled pre-meeting reminders
- [ ] Add SMS/WhatsApp appointment reminders
- [ ] Add support for recurring/repeating meetings
- [ ] Build real Zoom / Google Meet / Microsoft Teams video-conferencing integration
- [ ] Build workspace/room/desk booking (meeting rooms, desks, equipment)

Files: `src/app/{calendar,meet}`, `src/lib/calendar/*` (`calendarSync.ts`,
`googleMeet.ts`, `recurring.ts`, `notifications.ts`), `src/app/actions/calendar/`.

## Telephony (72–74) — new build

- [ ] Build a real phone system — number provisioning and call handling
- [ ] Build a real IVR menu builder
- [ ] Update the "Phone & IVR" marketing page to match what's actually built

Foundation: `src/lib/twilio/`, `src/app/api/webhooks/twilio/`. See
[[Communications-Hub]].
