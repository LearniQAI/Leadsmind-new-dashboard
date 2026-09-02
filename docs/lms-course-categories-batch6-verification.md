# Real Course Categories — Batch 6 live-verification checklist

Companion to `docs/lms-full-audit-technical.md` **STEP 6.6**. Code is complete, `npx tsc
--noEmit` is clean, `npx vitest run` is unchanged at 226/226, `eslint` is clean on every
touched file. This runbook closes G9 with live evidence once the migration is applied.

## Prerequisites

1. Apply `supabase/migrations/20260903000028_course_categories.sql`.
2. Confirm the starter list seeded for a real workspace:
   ```sql
   select name, color, position from course_categories where workspace_id = '<WORKSPACE_ID>' order by position;
   -- expect: Business, Technology, Language & Communication, Health & Wellness,
   --         Personal Development, Academic
   ```

## A. Admin — manage categories

- [ ] Open a course's General settings. Confirm the **Category** field shows the seeded
      starter list in the dropdown, defaulting to "Uncategorized".
- [ ] Click **Manage**, add a new category with a name + a swatch color. Confirm it appears
      immediately in the dropdown and gets selected.
- [ ] Assign the course to that new category and Save. Confirm `courses.category_id` updated
      correctly (SQL: `select category_id from courses where id = '<COURSE_ID>'`).
- [ ] Delete that category from the Manage panel. Confirm the course's `category_id` is now
      `NULL` (SET NULL, not a broken FK) and the course itself still exists and loads fine.
- [ ] Try assigning a category id from a **different** workspace via a raw API call —
      confirm the `/api/lms/course` PATCH rejects it (400, "Category not found in this
      workspace").

## B. Student catalog — filter + composition

- [ ] Assign 2+ real published courses to different categories, leave at least one course
      uncategorized.
- [ ] Load `/student/marketplace`. Confirm the category dropdown lists only categories that
      have a course in this result set, plus "Uncategorized" (since at least one course has
      none).
- [ ] Select a category — confirm only courses in that category show, count updates
      ("Showing N of M courses").
- [ ] Select "Uncategorized" — confirm only uncategorized courses show.
- [ ] With a category selected, also type a search term and pick a price filter — confirm all
      three narrow together (AND, not OR) — e.g. category=Technology AND price=free AND
      query="java" only shows courses matching every condition.
- [ ] Change sort while a category is selected — confirm the category filter stays applied.
- [ ] Click "Clear filters" — confirm search, price, AND category all reset together.
- [ ] Confirm each course card shows its real category name + color swatch badge (bottom-left
      of the cover image), and an uncategorized course shows no badge (not a blank/error one).

## C. Regression

- [ ] A course with no category still appears in "All categories" (default view) — never
      hidden.
- [ ] Existing search, price filter, and sort still work exactly as before for a workspace
      with zero categories created (the dropdown should not even render if there are no
      categories AND no uncategorized courses — confirm it doesn't show a broken empty list).

---

## Sign-off

G9 is closed when A–C are all checked on a live instance.
