# AI Generation Content Source + Fuzzy Grading — Batch 3 live-verification checklist

Companion to `docs/lms-full-audit-technical.md` **STEP 6.3**. No migrations in this batch —
just deploy the code. Code is complete, `npx tsc --noEmit` is clean, `npx vitest run` is
226/226 (8 new fuzzy-matching tests). This runbook closes G5/G6 with live evidence.

---

## A. AI generation now uses real lesson content (G5)

Prerequisite: a lesson with real `content_blocks` text — e.g. a `rich_text` block with a
paragraph of real prose, or a `reading` block with a `content.text` body. (The demo workspace
checked during this pass has no `rich_text`/reading prose — only video titles and `html_code`
markup, so its own generated questions will still look thin; pick or seed a content-rich
lesson to prove this properly, ideally reusing the volcano/plate-tectonics style lesson from
this project's earlier successful module-quiz AI-generation test.)

- [ ] Open that lesson's quiz workbench → "Generate with AI" (lesson scope). Confirm the
      generated 5 questions reference specifics from the lesson's real text (names, terms,
      numbers actually in the content) rather than generic "what is the primary objective of
      X" filler.
- [ ] Open the module containing 2+ lessons with real content → "Generate with AI" (module
      scope). Confirm questions draw from **multiple** lessons' real content, not just the
      first one.
- [ ] With `OPENAI_API_KEY` unset/placeholder, repeat both — confirm the existing mock
      fallback still returns its 5 canned questions (regression, unchanged code path).
- [ ] Optional: temporarily log `content.substring(0, 200)` in the route (or inspect via a
      debugger) to directly confirm the string sent to OpenAI now contains real block text,
      not `"{}"`.

## B. Deterministic fuzzy matching (G6a)

Prerequisite: a lesson quiz with one `short_answer` question (accepted answers e.g.
`mitochondria`) and one `fill_blank` question (one blank, accepted `photosynthesis`).

- [ ] Submit `short_answer` = `Mitochondrion` (typo/singular variant) → now **accepted**
      (previously would have failed exact match).
- [ ] Submit `short_answer` = `MITOCHONDRIA!!` (case + punctuation) → accepted.
- [ ] Submit `short_answer` = `nucleus` (genuinely wrong) → still **rejected** — confirm no
      false-positive over-tolerance.
- [ ] Submit `fill_blank` blank = `Photosynthesis.` (trailing punctuation) → accepted.
- [ ] Submit `fill_blank` blank = `respiration` (wrong) → still rejected.
- [ ] Set the short_answer question to `case_sensitive` → submit a case-different but
      otherwise-correct answer → confirm it is now rejected (fuzzy tier respects the flag).

## C. Opt-in AI-semantic grading (G6b) — off by default

- [ ] Confirm every pre-existing question (and any new one where you didn't touch the
      toggle) has `metadata.ai_grading` absent/false — SQL: `select id, metadata->>'ai_grading'
      from quiz_questions where question_type in ('short_answer','fill_blank');` should show
      `null`/`false` for everything except the one you deliberately enable below.
- [ ] In the workbench, open a `short_answer` question, check **"AI-assisted acceptance
      (opt-in)"**, save. Confirm `metadata.ai_grading = true` in the DB.
- [ ] As a student, submit an answer that is a genuine synonym/paraphrase NOT in the accepted
      list and NOT within fuzzy typo-distance (e.g. accepted = `"photosynthesis"`, submit
      `"the process plants use to convert sunlight into energy"`). Confirm it is judged
      **correct** (a real OpenAI call happens — check server logs / OpenAI dashboard usage).
- [ ] Submit a genuinely wrong answer on the same question (e.g. `"mitosis"`). Confirm it is
      judged **incorrect**.
- [ ] Confirm a DIFFERENT `short_answer` question on the same quiz, with `ai_grading` left
      off, does NOT trigger any OpenAI call for an equivalent synonym answer — it is graded
      purely by the deterministic tiers (check logs: no `lms.ai_grade.*` line for that
      question).
- [ ] With `OPENAI_API_KEY` unset/placeholder, repeat the synonym submission on the
      `ai_grading` question — confirm it now correctly falls back to "not accepted" (mock
      fallback returns `false`; the deterministic miss stands) rather than erroring.

## D. Regression

- [ ] mcq / true_false / matching / ordering / code / file_upload grading are unchanged —
      spot-check one submission of each still grades exactly as before Batch 3.
- [ ] `applyAiGradingPass` makes **zero** OpenAI calls on a quiz where no question has
      `ai_grading` enabled (confirm via logs on any normal submission).

---

## Sign-off

G5 is closed when A is checked on a live instance with real content-rich lessons. G6 is
closed when B–D are all checked. Until then STEP 6.3 stays "code-complete, live verification
pending".
