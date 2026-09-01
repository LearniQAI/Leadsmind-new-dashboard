-- Standalone flashcard review mode — per-student, per-card review state.
--
-- Flashcards have no table of their own: a set is content_blocks.content.flashcards (a JSON
-- array of {front, back}) on a block of type 'flashcards'. A "card" is therefore addressed by
-- (content_block_id, card_index) — a stable reference into that array. This table records how
-- a given student is doing on each card.
--
-- SCOPE (deliberately lightweight, NOT SM-2 spaced repetition): status is a two-bucket
-- 'learning' / 'known'. next_due_at is a simple resurface hint set by the review action —
-- 'known' -> now + 3 days, 'learning' -> now + a few minutes — so a next session can re-queue
-- what's due plus anything never reviewed. No ease factors, no computed intervals.

create table if not exists public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  content_block_id uuid not null references public.content_blocks(id) on delete cascade,
  card_index integer not null,
  status text not null default 'learning' check (status in ('learning', 'known')),
  review_count integer not null default 0,
  last_reviewed_at timestamptz,
  next_due_at timestamptz,
  created_at timestamptz not null default now(),
  unique (contact_id, content_block_id, card_index)
);

create index if not exists idx_flashcard_reviews_contact on public.flashcard_reviews(contact_id);
create index if not exists idx_flashcard_reviews_block on public.flashcard_reviews(content_block_id);

alter table public.flashcard_reviews enable row level security;

-- A student may read ONLY their own review rows (matched via the email on their contact) —
-- same shape as "students read own course_progress" (migration 177).
create policy "students read own flashcard_reviews"
  on public.flashcard_reviews for select
  using (exists (
    select 1 from public.contacts
    where contacts.id = flashcard_reviews.contact_id
      and contacts.email = auth.jwt() ->> 'email'
  ));

-- Workspace members (instructors/admins) may read every review row for their workspace's
-- content, resolved content_block -> course_lesson -> course -> workspace_members.
create policy "workspace members access flashcard_reviews"
  on public.flashcard_reviews for all
  using (exists (
    select 1
    from public.content_blocks cb
    join public.course_lessons cl on cl.id = cb.lesson_id
    join public.courses c on c.id = cl.course_id
    join public.workspace_members wm on wm.workspace_id = c.workspace_id
    where cb.id = flashcard_reviews.content_block_id
      and wm.user_id = auth.uid()
  ));

-- No student INSERT/UPDATE policy: rows are written only by the recordFlashcardReview server
-- action via the service-role client, after it re-verifies the student is enrolled in the
-- course the flashcard set belongs to.
