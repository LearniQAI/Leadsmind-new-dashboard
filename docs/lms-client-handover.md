# What's Built in the LeadsMind Course Platform

**Feature handover — prepared for LearniQ AI (Nelly & team)**
Reviewed 2 September 2026 · Based on a direct review of the live system and current working code · Audit only, nothing was changed.

This is written for a non-technical reader. It describes what a course creator and a student can
actually *do* in each part of the platform right now — not what is planned, and not what a screen
appears to offer until you use it. Where something looks finished but isn't, that's called out in a
"still being worked on" note, and Section 6 gathers every one of those into a single list.

**Status key:** 🟢 Ready to use (works end to end) · 🟡 Partly there (usable, with a real limit) · 🔴 Planned (not built yet)

| Area | Status | One-line summary |
|---|---|---|
| Course building | 🟢 Ready | Create courses, build the curriculum, add any of 12 lesson content types, design a sales page. |
| Student portal | 🟢 Ready | Dashboard, course player, results page, catalogue with search, flashcard review, settings. |
| Quizzes | 🟡 Partly there | Lesson and module quizzes work and are graded fairly; three question styles are live, not eight. |
| Certificates | 🟡 Partly there | Real, verifiable certificates on completion; automatic emailing is not built yet. |
| Course themes | 🟢 Ready | Three genuine visual identities — Ember, Signal, Grove — applied per course. |
| Course automations | 🟡 Partly there | The rule builder is fully built; most events that would trigger a rule aren't connected yet. |

---

## 1. Course building

This is the strongest area. A creator can take a course from an empty title to a published,
sellable product without leaving the platform.

**What you can do today**

- **Create a course** in two short steps — name and web address (on `leadsmind.io` or your own
  connected domain), then pick a visual theme. New courses start as a private draft; you publish
  when ready.
- **Build the curriculum** with modules and lessons. Drag to reorder. Set a module to unlock a
  number of days after enrolment ("drip"), require lessons in order, or gate a lesson behind a quiz pass.
- **Add lesson content** from twelve building blocks: video, audio, reading document, rich text,
  slides, downloadable file, embedded widget, live-session link, custom HTML, quiz, assignment,
  flashcards. Every one both authors correctly and shows up correctly for the student.
- **Design each lesson visually** in a drag-and-drop canvas builder, or start from one of two
  ready-made lesson layouts ("Standard", "Deep-Dive").
- **Build a sales / landing page** from three template designs, with real editable sections:
  outcomes, reviews, FAQ, instructor bio, curriculum outline, pricing. Each section can be shown or hidden.
- **Set pricing** — free, one-time, subscription (monthly/yearly), or hybrid — and take payment
  through the built-in checkout, which also works for buyers without an account (guest checkout).

**Still being worked on**

- The canvas lesson builder is functional and now shows the student exactly what you laid out, but
  it sits alongside an older lesson-editing path, so authoring isn't yet one unified flow. Two older
  carried-over lesson types — "code exercise" and "SCORM package" — are placeholders only.
- The **Automations tab** on a course lets you build rules ("when X happens, send an email / add a
  tag / enrol them elsewhere"). The builder and rule list are real, but most triggering events
  (lesson completed, quiz passed/failed, course completed, module completed, new enrolment) are not
  connected, so rules built on those will not fire. Only *certificate issued* and *student flagged as
  struggling* work as triggers today. Rules also currently apply across every course in the
  workspace, not just the one you built them on.

---

## 2. The student portal

The student side is now a complete portal, not just a course player. Several things flagged as
broken in the earlier review have been fixed.

**What a student can do today**

- **Dashboard** — enrolled courses, overall progress, quizzes passed and average quiz score (these
  last two were previously stuck at zero and now report correctly), plus a "Continue learning" panel
  that drops them back into the right course and, for video, the right spot in the video.
- **Course player** — work through lessons with progress tracked per content block. Lessons
  genuinely lock until earlier ones are done, until a drip date arrives, or until a required quiz is
  passed. Text-only lessons now require the student to scroll through and spend time on the reading
  before it counts as complete.
- **My Results page** — a real, complete page: every quiz attempt with score and pass/fail;
  assignment status (pending / passed / needs revision) with instructor feedback; earned
  certificates with verify and download links; per-course progress. This page did not exist before.
- **Course catalogue** — search box, free / paid filter, sort by newest / price / title. Enrolment
  state shows on each course.
- **Flashcard review** — a dedicated area gathering flashcard sets from every enrolled course. Cards
  marked "still learning" return within minutes; "got it" cards resurface after a few days.
- **Settings** — change display name (kept in sync everywhere, including on certificates), change
  password, turn course-update emails on or off.

**Still being worked on**

- Flashcard scheduling is a simple two-speed system, not a full spaced-repetition algorithm.
- Changing the account **email address** from settings is intentionally not available yet — that
  address ties together everything the student owns.
- Assignment marking is done by a person, not automatically, and there's no single "assignments due"
  list across courses.

---

## 3. Quizzes

There are two separate quiz systems and both work. Grading is always done on the server from the
real answer key — a student can't tamper with their score.

**What you can do today**

- **Lesson quizzes** — attached to a single lesson. Set a pass mark (70% default) and attempt limit
  (3 default). Passing marks the lesson complete. When attempts run out, the student is offered an
  **AI-generated remedial exercise**; passing it unlocks another attempt.
- **Module quizzes** — a separate quiz covering a whole module. The student can only take it once
  every lesson in the module is complete (enforced on the server, not just hidden). It's reachable
  from the course outline, and the player moves the student to it automatically after the module's
  last lesson. *This link was missing in the earlier review and is now in place.*
- **AI question generation** — generate multiple-choice questions from a lesson's or module's
  content with one click, then edit them.
- **Quiz analytics for creators** — every student's attempts, scores, trends, per-question
  breakdown, CSV export. Now reads live attempt data (previously read an old, unused table).

**Still being worked on**

- The builder advertises **eight question styles**, but only three are fully live for students:
  multiple choice, true / false, short text answer. The other five (matching, ordering,
  fill-in-the-blank, code, file upload) can be added by a creator but a student can't answer them
  and they score zero.
- AI generation only produces multiple-choice questions.
- Short-answer marking is an exact match against a list of accepted answers you provide — it doesn't
  handle near-misses or unlisted synonyms.

---

## 4. Certificates

This area was rebuilt since the last review. Certificates are now real, permanent records — not a
fresh PDF invented on every download.

**What you can do today**

- **Students earn a certificate** automatically once they've completed every lesson *and* passed
  every quiz in a course. The system re-checks both before issuing.
- **Each certificate has a permanent ID** (e.g. `LM-3C48-19BA-A4F7C201`) and freezes the student's
  name, course title and issue date at the moment it's first earned, so a later name or course
  rename doesn't alter an issued certificate.
- **Anyone can verify a certificate** at a public web page using that ID. It confirms name, course
  and date — nothing else, no private data.
- **Students download the PDF** from the course player (at 100%), My Results, or the client portal.
- **You can design the certificate** — one of three built-in styles (Classic, Modern, Editorial),
  an accent colour, a logo and a signature, or upload your own full design and position the text
  fields on it. Set once as a workspace default, override per course.

**Still being worked on**

- **Automatic delivery is not built.** The certificate is created and recorded on completion, but
  nothing emails it to the student or notifies you — the student must return and download it.
  Sending it automatically on completion is a clear next step.
- The design screens are functional but haven't been exercised against a wide range of real course
  data and custom uploads.

---

## 5. Course themes

Each course can carry one of three genuine visual identities. This is real, live styling per course
— not just a colour label.

- **Ember** — warm and energetic. Near-white background, vivid orange, rounded shapes, a friendly
  rounded typeface. For coaching and creative courses. This is the default.
- **Signal** — sharp and high-contrast. Near-black with white cards, strong crimson, hard edges, a
  bold headline typeface, a rotated "seal" motif. For certification and flagship courses.
- **Grove** — calm and natural. Pale sage background, forest green, a warm serif typeface, soft
  organic corners, a branching progress line. For language, wellness and personal-growth courses.

Each theme controls the full palette, the heading and body typefaces, the corner rounding, and one
signature visual element. It's applied on the public landing page, throughout the student's player
and lesson outline, and in the creator's preview — consistently, from live course data.

*Note: the three names are stored internally under their original labels, so you'll occasionally see
an old name in a developer-facing place; the customer-facing names are Ember, Signal and Grove.*

---

## 6. Everything that isn't done yet

One consolidated list, roughly in priority order.

| Priority | Item | Detail |
|---|---|---|
| 🔴 High | Course automations don't fire | Most triggers (lesson completed, quiz passed/failed, course completed, module completed, new enrolment) aren't connected. The builder looks fully functional but rules on those events never run. Only "certificate issued" and "student struggling" work today. |
| 🔴 High | Automation rules aren't course-specific | A rule created on one course's Automations tab applies to every course in the workspace. |
| 🟡 Medium | Only three quiz question types work for students | MC, true/false, short answer are live. Matching, ordering, fill-blank, code, file upload can be created but can't be answered and score zero. |
| 🟡 Medium | Certificates aren't sent automatically | Created and verifiable on completion, but the student must return and download; no automatic email or creator notification. |
| 🟡 Medium | AI question generation is multiple-choice only | And for a single lesson it works from the lesson's stored text, which is often empty in the current content model — module-level generation gives better results. |
| 🟡 Medium | Two lesson-authoring paths; two dead legacy types | The visual canvas builder and an older lesson editor both exist. "Code exercise" and "SCORM package" are placeholders. |
| 🟡 Low | "Assign certificate" / "enrol in bundle" automation actions | Offered in the rule builder's action list but not implemented; "grant community access" does nothing yet. |
| 🟡 Low | No course categories or tags | Catalogue has search, free/paid filter and sorting, but no subject taxonomy to browse by. |
| 🟡 Low | Flashcards use a simple two-speed schedule | Not a full spaced-repetition algorithm. |
| 🟡 Low | Short-answer grading is exact-match | Checks against a list of accepted answers; no handling of unlisted synonyms or typos. |
| 🟡 Low | No "assignments due" list for students | A student sees an assignment only inside its lesson; My Results lists ones already submitted. |
| 🟡 Low | Email-address change disabled for students | Intentional for now — the address links everything the student owns. |
| 🟡 Low | Live payment paths not re-tested in this review | Guest checkout and providers are wired; a full end-to-end payment test is a separate pre-launch task. |
| 🔴 Cosmetic | Old unused tables still present | Leftover certificate and quiz tables from a previous version remain in the database, unused; removal is deliberately scheduled for later. |

---

## The bottom line

Course building, the student portal and course themes are in good shape and can be used with
confidence today. A creator can build, price, theme and publish a full course, and a student gets a
complete, honest learning experience with progress, results and a verifiable certificate at the end.

Quizzes and certificates work but each has one clear limitation to close — the five inactive
question types, and automatic certificate delivery. Course automations is the one place where the
interface promises more than the system currently delivers, and it's the highest-value area to
finish next.
