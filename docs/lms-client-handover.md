# What's Built in the LeadsMind Course Platform

**Feature handover — prepared for LearniQ AI (Nelly & team)**
Based on a direct review of the live system and current working code.

This is written for a non-technical reader. It describes what a course creator and a student can
actually *do* in each part of the platform right now — not what is planned, and not what a screen
appears to offer until you use it. Where something has a real limit, that's called out in a
"still being worked on" note, and Section 7 gathers every one of those into a single list.

**Status key:** 🟢 Ready to use (works end to end) · 🟡 Partly there (usable, with a real limit) · 🔴 Planned (not built yet)

| Area | Status | One-line summary |
|---|---|---|
| Course building | 🟢 Ready | Create courses, build the curriculum, add any of 12 lesson content types, design a sales page. |
| Student portal | 🟢 Ready | Dashboard, course player, results page, catalogue with search and categories, flashcard review, settings. |
| Quizzes | 🟢 Ready (one caveat) | All eight question styles work end to end; code-answer quizzes are graded by matching, not by running the code. |
| Certificates | 🟢 Ready | Real, verifiable certificates issued and emailed automatically on completion. |
| Course themes | 🟢 Ready | Three genuine visual identities — Ember, Signal, Grove — applied per course. |
| Course automations | 🟢 Ready | The rule builder works end to end and is scoped per course. |
| **Checkout & payments** | 🔴 **Needs a live test** | The code looks right on a direct read, but no real payment has ever been run through this system end to end. Treat as unproven until it has. |

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
  ready-made lesson layouts ("Standard", "Deep-Dive"). This is now the one and only way lessons
  are built — an older, second lesson-editing system (including two placeholder lesson types,
  "code exercise" and "SCORM package", that looked real but never ran real code or loaded a real
  course package) has been retired.
- **Build a sales / landing page** from three template designs, with real editable sections:
  outcomes, reviews, FAQ, instructor bio, curriculum outline, pricing. Each section can be shown or hidden.
- **Set pricing** — free, one-time, subscription (monthly/yearly), or hybrid — with checkout that
  also works for buyers without an account (guest checkout). **See the payments note at the top
  of this document and in Section 7 — the checkout flow itself has not yet been proven with a
  real test payment.**
- **Organise the catalogue with categories** — a simple, one-category-per-course list your
  students can filter the course catalogue by.
- **Build automation rules** — "when X happens, send an email / add a tag / enrol them elsewhere
  / issue a certificate." All the real triggers (course completed, lesson completed, quiz
  passed/failed, module completed, new enrolment, certificate issued, student struggling) fire
  correctly, and a rule built on one course only applies to that course.

**Still being worked on**

- One automation action, **the plain "send an email" action, doesn't fill in placeholders** like
  the student's first name — it sends the literal text `{{student_first_name}}` instead. The
  dedicated certificate-delivery email is not affected by this; any other rule using a
  placeholder in its email body is.
- Two automation actions in the builder's list, **"assign certificate" and "enrol in a bundle,"
  are real**, but **"grant community access" only partially is** — it tags the record but there's
  no community-access gate in the product yet for it to actually restrict.

---

## 2. The student portal

The student side is a complete portal, not just a course player.

**What a student can do today**

- **Dashboard** — enrolled courses, overall progress, quizzes passed and average quiz score,
  plus a "Continue learning" panel that drops them back into the right course and, for video, the
  right spot in the video.
- **Course player** — work through lessons with progress tracked per content block. Lessons
  genuinely lock until earlier ones are done, until a drip date arrives, or until a required quiz is
  passed. Text-only lessons require the student to scroll through and spend time on the reading
  before it counts as complete.
- **My Results page** — every quiz attempt with score and pass/fail; assignment status (pending /
  passed / needs revision) with instructor feedback; earned certificates with verify and download
  links; per-course progress; and a "My Work" list gathering everything not-yet-submitted,
  awaiting review, sent back for revision, or recently graded, across every course at once.
- **Course catalogue** — search box, category filter, free / paid filter, sort by newest / price /
  title. Enrolment state shows on each course.
- **Flashcard review** — a dedicated area gathering flashcard sets from every enrolled course.
  Cards marked "still learning" return within minutes; "got it" cards resurface after a few days.
- **Settings** — change display name (kept in sync everywhere, including on certificates), change
  password, turn course-update emails on or off.

**Still being worked on**

- Flashcard scheduling is a simple two-speed system, not a full spaced-repetition algorithm.
- Changing the account **email address** from settings is intentionally not available yet — that
  address ties together everything the student owns.

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
  last lesson.
- **All eight question styles work for students**: multiple choice, true/false, short answer,
  matching, ordering, fill-in-the-blank, code, and file upload. Short-answer and fill-in-the-blank
  answers are matched with a bit of built-in tolerance for typos and punctuation, and you can
  optionally turn on AI-assisted marking for either, question by question.
- **AI question generation** — generate multiple-choice questions from a lesson's or module's
  content with one click, then edit them.
- **Quiz analytics for creators** — every student's attempts, scores, trends, per-question
  breakdown, CSV export, plus a "Needs grading" queue across every course.

**Still being worked on**

- **Code-answer questions are graded by matching text, not by running the code.** A correct
  answer written differently from every listed accepted answer will score zero. Both the builder
  and the student see this stated plainly.
- **A quiz containing a file-upload question isn't instant** — it waits for a person to grade it,
  same as an assignment.
- AI generation only produces multiple-choice questions.

---

## 4. Certificates

Certificates are real, permanent records — not a fresh PDF invented on every download.

**What you can do today**

- **Students earn a certificate** automatically once they've completed every lesson *and* passed
  every quiz in a course. The system re-checks both before issuing.
- **It's emailed to them automatically** the moment they earn it, with a real download link — no
  need for you or the student to do anything.
- **Each certificate has a permanent ID** (e.g. `LM-3C48-19BA-A4F7C201`) and freezes the student's
  name, course title and issue date at the moment it's first earned, so a later name or course
  rename doesn't alter an issued certificate.
- **Anyone can verify a certificate** at a public web page using that ID. It confirms name, course
  and date — nothing else, no private data.
- **Students can also download the PDF any time** from the course player (at 100%), My Results, or
  the client portal.
- **You can design the certificate** — one of three built-in styles (Classic, Modern, Editorial),
  an accent colour, a logo and a signature, or upload your own full design and position the text
  fields on it. Set once as a workspace default, override per course.

**Still being worked on**

- **The Classic template can clip its footer** — verified by rendering it — when a student has
  both a very long name and a very long course title at once; the date and verification-ID line
  can get cut off at the bottom of the page. The Modern and Editorial styles don't have this issue.
- **Custom-uploaded certificate designs have no automatic spacing check** between fields — if two
  fields (like name and course title) are placed close together, a longer-than-expected name or
  title can visually overlap the field below it. Worth a quick check with your own real long names
  before relying on a custom design at scale.
- Automatic delivery went out only to courses created after this feature shipped, or to a course
  where an admin has switched it on from that course's Automations tab.

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

---

## 6. Checkout & payments — needs a live test before real customer use

This is the one part of the platform we're asking you to treat differently from everything above.

The checkout flow — including guest checkout for buyers without an account — is built, and the
code has been read carefully and looks correct: a buyer pays through a secure, hosted Stripe
checkout page, and only a verified confirmation from Stripe ever creates the enrolment. But **no
real payment has ever actually been run through this system, start to finish, by anyone.** The
specific check that exists to confirm a buyer can't fake their way to a free enrolment has never
been executed — only reasoned through by reading the code.

This isn't a case of "probably fine" — it's the one place in the whole platform where a real test,
with real (or safely test-mode) money moving through it, matters more than confidence from reading
the code. We'd recommend running one before this checkout path is used with real customers.

---

## 7. Everything that isn't done yet

One consolidated list, roughly in priority order.

| Priority | Item | Detail |
|---|---|---|
| 🔴 **Highest** | **Checkout & payments not yet live-tested** | See Section 6. The code reads correctly, but no real payment has ever actually been run through this system, and the test that exists to confirm it's safe has never been executed. This is the one item that should be resolved before real customer payments depend on it. |
| 🟡 Medium | Code-answer quiz questions are graded by matching, not execution | A correct answer written differently from the listed accepted answers scores zero. |
| 🟡 Medium | File-upload quiz questions aren't instant | Like an assignment, they wait for a person to grade them. |
| 🟡 Medium | Certificate template layout issues on long names/titles | Classic template can clip its footer; custom-upload designs have no spacing safeguard between fields. See Section 4. |
| 🟡 Medium | The plain "send an email" automation doesn't fill in placeholders | Emails using `{{student_first_name}}`-style placeholders send that literal text. Certificate-delivery emails aren't affected. |
| 🟡 Low | AI question generation is multiple-choice only | Every other question style must be written by hand. |
| 🟡 Low | "Grant community access" automation action is partial | It tags the record, but there's no community-access gate yet for it to enforce. |
| 🟡 Low | Flashcards use a simple two-speed schedule | Not a full spaced-repetition algorithm. |
| 🟡 Low | Email-address change disabled for students | Intentional for now — the address links everything the student owns. |
| 🔴 Planned | No cohorts / student groups | Not built yet. |
| 🔴 Cosmetic | Old unused tables still present | Leftover certificate and quiz tables from a previous version remain in the database, unused; removal is deliberately scheduled for later. |

---

## The bottom line

Course building, the student portal, quizzes, certificates, course themes and automations are all
in good shape and can be used with confidence today. A creator can build, price, theme, automate
and publish a full course, and a student gets a complete, honest learning experience with
progress, results and a verifiable, automatically-delivered certificate at the end.

The one item that stands apart from everything else in this document is checkout and payments.
Nothing about it looks wrong — but nothing about it has been proven right either, because it has
never carried a real payment. That's the one piece of real, pre-launch work left before this
platform should be trusted with real customer money.
