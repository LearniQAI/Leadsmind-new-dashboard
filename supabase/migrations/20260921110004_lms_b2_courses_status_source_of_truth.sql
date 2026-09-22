-- LMS batch 2 / fix 7: `status` is the source of truth for course visibility; `published` is kept as a
-- derived mirror so the many readers/writers of the boolean keep working. The trigger guarantees
-- published = (status = 'published') on every write:
--   * status written / changed  -> published follows it (status wins)
--   * only `published` changed  -> status follows it (true -> 'published'; false -> 'draft', but an
--                                  'archived' course stays archived)
--   * INSERT with status NULL   -> derived from published
-- Every current writer already sets both together (course PATCH route, CourseWorkspaceClient,
-- archive route), so nothing changes for them. RLS then checks status only, so the old
-- "published OR status" loophole cannot exist again. Existing rows: the two disagreeing courses were
-- removed in 20260921110003; a consistency backfill below is a no-op unless something drifted.
-- Rollback: DROP TRIGGER courses_sync_published_status ON public.courses; DROP FUNCTION
-- public.courses_sync_published_status(); then re-run supabase/rollback/20260921_lms_batch2_policies_before.sql
CREATE OR REPLACE FUNCTION public.courses_sync_published_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NULL THEN
      NEW.status := CASE WHEN COALESCE(NEW.published, false) THEN 'published' ELSE 'draft' END;
    END IF;
    NEW.published := (NEW.status = 'published');
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.published := (NEW.status = 'published');
    ELSIF NEW.published IS DISTINCT FROM OLD.published THEN
      IF COALESCE(NEW.published, false) THEN
        NEW.status := 'published';
      ELSIF NEW.status = 'published' THEN
        NEW.status := 'draft';
      END IF;
      NEW.published := (NEW.status = 'published');
    ELSE
      NEW.published := (NEW.status = 'published');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS courses_sync_published_status ON public.courses;
CREATE TRIGGER courses_sync_published_status
  BEFORE INSERT OR UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.courses_sync_published_status();

-- Backfill (no-op when already consistent; the trigger above does the work).
UPDATE public.courses SET published = (status = 'published')
 WHERE published IS DISTINCT FROM (status = 'published');

-- RLS: check status only.
DROP POLICY IF EXISTS "allow_public_select_published_courses" ON public.courses;
CREATE POLICY "allow_public_select_published_courses" ON public.courses
  AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "students read published courses" ON public.courses;
CREATE POLICY "students read published courses" ON public.courses
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "public read free or preview content_blocks" ON public.content_blocks;
CREATE POLICY "public read free or preview content_blocks" ON public.content_blocks
  AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.course_lessons cl JOIN public.courses c ON c.id = cl.course_id
                 WHERE cl.id = content_blocks.lesson_id
                   AND c.status = 'published'
                   AND (c.pricing_model = 'free' OR cl.is_preview = true)));

DROP POLICY IF EXISTS "public read free or preview course_lessons" ON public.course_lessons;
CREATE POLICY "public read free or preview course_lessons" ON public.course_lessons
  AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c
                 WHERE c.id = course_lessons.course_id
                   AND c.status = 'published'
                   AND (c.pricing_model = 'free' OR course_lessons.is_preview = true)));

DROP POLICY IF EXISTS "public read free course_modules" ON public.course_modules;
CREATE POLICY "public read free course_modules" ON public.course_modules
  AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c
                 WHERE c.id = course_modules.course_id
                   AND c.status = 'published'
                   AND c.pricing_model = 'free'));
