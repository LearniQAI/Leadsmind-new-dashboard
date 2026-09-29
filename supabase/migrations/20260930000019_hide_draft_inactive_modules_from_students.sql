-- LMS: DRAFT and INACTIVE modules must not be readable by students or the public.
--
-- Before this, the student/public SELECT policies on course_modules / course_lessons had no status
-- condition, so anyone with the anon key could read a draft module and its lessons straight from the
-- API. Visible now means: is_active AND publish_status IN ('published', 'coming_soon') — the same rule
-- as the app (src/lib/lms/studentVisibility.ts); 'coming_soon' stays visible-but-locked.
--
-- Staff are unaffected: "workspace members access ..." and the lms_role_gate_* policies are untouched.
-- Nothing is dropped except the six policies recreated below, in the same transaction.
--
-- content_blocks, quiz_settings, audio_* etc. gate on a JOIN to course_lessons; those subqueries run
-- under the caller's own RLS, so they now stop returning draft lessons' rows automatically.
-- course_content_chunks and lesson_summaries only checked enrolment, so they gain an explicit lesson check.

drop policy if exists "public read free course_modules" on public.course_modules;
create policy "public read free course_modules" on public.course_modules
  for select to anon, authenticated
  using (
    is_active
    and publish_status in ('published', 'coming_soon')
    and exists (
      select 1 from public.courses c
      where c.id = course_modules.course_id and c.status = 'published' and c.pricing_model = 'free'
    )
  );

drop policy if exists "students read course_modules for enrolled courses" on public.course_modules;
create policy "students read course_modules for enrolled courses" on public.course_modules
  for select to authenticated
  using (
    is_active
    and publish_status in ('published', 'coming_soon')
    and exists (
      select 1 from public.enrollments e
      join public.contacts ct on e.contact_id = ct.id
      where e.course_id = course_modules.course_id and ct.email = (auth.jwt() ->> 'email')
    )
  );

drop policy if exists "public read free or preview course_lessons" on public.course_lessons;
create policy "public read free or preview course_lessons" on public.course_lessons
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.course_modules m
      where m.id = course_lessons.module_id and m.is_active and m.publish_status in ('published', 'coming_soon')
    )
    and exists (
      select 1 from public.courses c
      where c.id = course_lessons.course_id and c.status = 'published'
        and (c.pricing_model = 'free' or course_lessons.is_preview = true)
    )
  );

drop policy if exists "students read course_lessons for enrolled courses" on public.course_lessons;
create policy "students read course_lessons for enrolled courses" on public.course_lessons
  for select to authenticated
  using (
    exists (
      select 1 from public.course_modules m
      where m.id = course_lessons.module_id and m.is_active and m.publish_status in ('published', 'coming_soon')
    )
    and exists (
      select 1 from public.enrollments e
      join public.contacts ct on e.contact_id = ct.id
      where e.course_id = course_lessons.course_id and ct.email = (auth.jwt() ->> 'email')
    )
  );

-- The lesson row itself is the visibility test: a student's RLS only returns lessons in visible modules.
drop policy if exists "students read course_content_chunks for enrolled courses" on public.course_content_chunks;
create policy "students read course_content_chunks for enrolled courses" on public.course_content_chunks
  for select to authenticated
  using (
    exists (select 1 from public.course_lessons cl where cl.id = course_content_chunks.lesson_id)
    and exists (
      select 1 from public.enrollments e
      join public.contacts ct on e.contact_id = ct.id
      where e.course_id = course_content_chunks.course_id and ct.email = (auth.jwt() ->> 'email')
    )
  );

drop policy if exists "students read lesson_summaries for enrolled courses" on public.lesson_summaries;
create policy "students read lesson_summaries for enrolled courses" on public.lesson_summaries
  for select to authenticated
  using (
    exists (select 1 from public.course_lessons cl where cl.id = lesson_summaries.lesson_id)
    and exists (
      select 1 from public.enrollments e
      join public.contacts ct on e.contact_id = ct.id
      where e.course_id = lesson_summaries.course_id and ct.email = (auth.jwt() ->> 'email')
    )
  );
