-- Pre-Batch-1 policy definitions captured from live pg_policies 2026-09-21. Re-run to roll back.
DROP POLICY IF EXISTS "allow_public_select_content_blocks_published_courses" ON public.content_blocks;
CREATE POLICY "allow_public_select_content_blocks_published_courses" ON public.content_blocks AS PERMISSIVE FOR SELECT TO anon,authenticated USING ((EXISTS ( SELECT 1
   FROM (course_lessons cl
     JOIN courses c ON ((c.id = cl.course_id)))
  WHERE ((cl.id = content_blocks.lesson_id) AND ((c.published = true) OR (c.status = 'published'::text))))));
DROP POLICY IF EXISTS "students read content_blocks for enrolled courses" ON public.content_blocks;
CREATE POLICY "students read content_blocks for enrolled courses" ON public.content_blocks AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM ((course_lessons cl
     JOIN enrollments e ON ((e.course_id = cl.course_id)))
     JOIN contacts ct ON ((ct.id = e.contact_id)))
  WHERE ((cl.id = content_blocks.lesson_id) AND (ct.email = (auth.jwt() ->> 'email'::text))))));
DROP POLICY IF EXISTS "workspace members access content_blocks" ON public.content_blocks;
CREATE POLICY "workspace members access content_blocks" ON public.content_blocks AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM (course_lessons cl
     JOIN workspace_members wm ON ((wm.workspace_id = cl.workspace_id)))
  WHERE ((cl.id = content_blocks.lesson_id) AND (wm.user_id = auth.uid())))));
DROP POLICY IF EXISTS "allow_public_select_lessons_published_courses" ON public.course_lessons;
CREATE POLICY "allow_public_select_lessons_published_courses" ON public.course_lessons AS PERMISSIVE FOR SELECT TO anon,authenticated USING ((EXISTS ( SELECT 1
   FROM courses
  WHERE ((courses.id = course_lessons.course_id) AND ((courses.published = true) OR (courses.status = 'published'::text))))));
DROP POLICY IF EXISTS "students read course_lessons for enrolled courses" ON public.course_lessons;
CREATE POLICY "students read course_lessons for enrolled courses" ON public.course_lessons AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (enrollments e
     JOIN contacts ct ON ((e.contact_id = ct.id)))
  WHERE ((e.course_id = course_lessons.course_id) AND (ct.email = (auth.jwt() ->> 'email'::text))))));
DROP POLICY IF EXISTS "workspace members access course_lessons" ON public.course_lessons;
CREATE POLICY "workspace members access course_lessons" ON public.course_lessons AS PERMISSIVE FOR ALL TO public USING ((workspace_id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid()))));
DROP POLICY IF EXISTS "allow_public_select_modules_published_courses" ON public.course_modules;
CREATE POLICY "allow_public_select_modules_published_courses" ON public.course_modules AS PERMISSIVE FOR SELECT TO anon,authenticated USING ((EXISTS ( SELECT 1
   FROM courses
  WHERE ((courses.id = course_modules.course_id) AND ((courses.published = true) OR (courses.status = 'published'::text))))));
DROP POLICY IF EXISTS "students read course_modules for enrolled courses" ON public.course_modules;
CREATE POLICY "students read course_modules for enrolled courses" ON public.course_modules AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (enrollments e
     JOIN contacts ct ON ((e.contact_id = ct.id)))
  WHERE ((e.course_id = course_modules.course_id) AND (ct.email = (auth.jwt() ->> 'email'::text))))));
DROP POLICY IF EXISTS "workspace members access course_modules" ON public.course_modules;
CREATE POLICY "workspace members access course_modules" ON public.course_modules AS PERMISSIVE FOR ALL TO public USING ((workspace_id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid()))));
DROP POLICY IF EXISTS "students manage their own lesson_block_completions" ON public.lesson_block_completions;
CREATE POLICY "students manage their own lesson_block_completions" ON public.lesson_block_completions AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM contacts ct
  WHERE ((ct.id = lesson_block_completions.contact_id) AND (ct.email = (auth.jwt() ->> 'email'::text))))));
DROP POLICY IF EXISTS "workspace members read lesson_block_completions" ON public.lesson_block_completions;
CREATE POLICY "workspace members read lesson_block_completions" ON public.lesson_block_completions AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM ((content_blocks cb
     JOIN course_lessons cl ON ((cl.id = cb.lesson_id)))
     JOIN workspace_members wm ON ((wm.workspace_id = cl.workspace_id)))
  WHERE ((cb.id = lesson_block_completions.content_block_id) AND (wm.user_id = auth.uid())))));
DROP POLICY IF EXISTS "students manage their own lesson_reading_completions" ON public.lesson_reading_completions;
CREATE POLICY "students manage their own lesson_reading_completions" ON public.lesson_reading_completions AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM contacts ct
  WHERE ((ct.id = lesson_reading_completions.contact_id) AND (ct.email = (auth.jwt() ->> 'email'::text))))));
DROP POLICY IF EXISTS "workspace members read lesson_reading_completions" ON public.lesson_reading_completions;
CREATE POLICY "workspace members read lesson_reading_completions" ON public.lesson_reading_completions AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (course_lessons cl
     JOIN workspace_members wm ON ((wm.workspace_id = cl.workspace_id)))
  WHERE ((cl.id = lesson_reading_completions.lesson_id) AND (wm.user_id = auth.uid())))));
DROP POLICY IF EXISTS "students insert own assignment submissions" ON public.lms_assignment_submissions;
CREATE POLICY "students insert own assignment submissions" ON public.lms_assignment_submissions AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM contacts
  WHERE ((contacts.id = lms_assignment_submissions.contact_id) AND (contacts.email = (auth.jwt() ->> 'email'::text))))));
DROP POLICY IF EXISTS "students read own assignment submissions" ON public.lms_assignment_submissions;
CREATE POLICY "students read own assignment submissions" ON public.lms_assignment_submissions AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM contacts
  WHERE ((contacts.id = lms_assignment_submissions.contact_id) AND (contacts.email = (auth.jwt() ->> 'email'::text))))));
DROP POLICY IF EXISTS "students update own assignment submissions" ON public.lms_assignment_submissions;
CREATE POLICY "students update own assignment submissions" ON public.lms_assignment_submissions AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM contacts
  WHERE ((contacts.id = lms_assignment_submissions.contact_id) AND (contacts.email = (auth.jwt() ->> 'email'::text))))));
DROP POLICY IF EXISTS "workspace members manage assignment submissions" ON public.lms_assignment_submissions;
CREATE POLICY "workspace members manage assignment submissions" ON public.lms_assignment_submissions AS PERMISSIVE FOR ALL TO authenticated USING ((workspace_id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid()))));
DROP POLICY IF EXISTS "Service role access lms_delayed_actions" ON public.lms_delayed_actions;
CREATE POLICY "Service role access lms_delayed_actions" ON public.lms_delayed_actions AS PERMISSIVE FOR ALL TO public USING (true);
DROP POLICY IF EXISTS "Service role full access availabilities" ON public.lms_expert_availabilities;
CREATE POLICY "Service role full access availabilities" ON public.lms_expert_availabilities AS PERMISSIVE FOR ALL TO public USING (true);
DROP POLICY IF EXISTS "Workspace members select availabilities" ON public.lms_expert_availabilities;
CREATE POLICY "Workspace members select availabilities" ON public.lms_expert_availabilities AS PERMISSIVE FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Service role full access experts" ON public.lms_expert_profiles;
CREATE POLICY "Service role full access experts" ON public.lms_expert_profiles AS PERMISSIVE FOR ALL TO public USING (true);
DROP POLICY IF EXISTS "Workspace members select experts" ON public.lms_expert_profiles;
CREATE POLICY "Workspace members select experts" ON public.lms_expert_profiles AS PERMISSIVE FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Service role full access sessions" ON public.lms_expert_sessions;
CREATE POLICY "Service role full access sessions" ON public.lms_expert_sessions AS PERMISSIVE FOR ALL TO public USING (true);
DROP POLICY IF EXISTS "Workspace members select sessions" ON public.lms_expert_sessions;
CREATE POLICY "Workspace members select sessions" ON public.lms_expert_sessions AS PERMISSIVE FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Service role full access assignments" ON public.lms_remedial_assignments;
CREATE POLICY "Service role full access assignments" ON public.lms_remedial_assignments AS PERMISSIVE FOR ALL TO public USING (true);
DROP POLICY IF EXISTS "Student select assignments" ON public.lms_remedial_assignments;
CREATE POLICY "Student select assignments" ON public.lms_remedial_assignments AS PERMISSIVE FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public select recordings" ON public.lms_session_recordings;
CREATE POLICY "Public select recordings" ON public.lms_session_recordings AS PERMISSIVE FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Service role full access recordings" ON public.lms_session_recordings;
CREATE POLICY "Service role full access recordings" ON public.lms_session_recordings AS PERMISSIVE FOR ALL TO public USING (true);
DROP POLICY IF EXISTS "Service role full access struggle scores" ON public.lms_student_struggle_scores;
CREATE POLICY "Service role full access struggle scores" ON public.lms_student_struggle_scores AS PERMISSIVE FOR ALL TO public USING (true);
DROP POLICY IF EXISTS "Workspace members read struggle scores" ON public.lms_student_struggle_scores;
CREATE POLICY "Workspace members read struggle scores" ON public.lms_student_struggle_scores AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM workspace_members
  WHERE ((workspace_members.workspace_id = lms_student_struggle_scores.workspace_id) AND (workspace_members.user_id = auth.uid())))));
DROP POLICY IF EXISTS "students read module_quiz_questions for enrolled courses" ON public.module_quiz_questions;
CREATE POLICY "students read module_quiz_questions for enrolled courses" ON public.module_quiz_questions AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM ((enrollments e
     JOIN contacts ct ON ((e.contact_id = ct.id)))
     JOIN course_modules cm ON ((cm.course_id = e.course_id)))
  WHERE ((cm.id = module_quiz_questions.module_id) AND (ct.email = (auth.jwt() ->> 'email'::text))))));
DROP POLICY IF EXISTS "workspace members access module_quiz_questions" ON public.module_quiz_questions;
CREATE POLICY "workspace members access module_quiz_questions" ON public.module_quiz_questions AS PERMISSIVE FOR ALL TO public USING ((workspace_id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid()))));
DROP POLICY IF EXISTS "Users can delete course content" ON storage.objects;
CREATE POLICY "Users can delete course content" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'lms_content'::text) AND ((storage.foldername(name))[1] IN ( SELECT (workspace_members.workspace_id)::text AS workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid())))));
DROP POLICY IF EXISTS "Users can upload course content" ON storage.objects;
CREATE POLICY "Users can upload course content" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'lms_content'::text) AND ((storage.foldername(name))[1] IN ( SELECT (workspace_members.workspace_id)::text AS workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid())))));
DROP POLICY IF EXISTS "Users can view course content" ON storage.objects;
CREATE POLICY "Users can view course content" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING ((bucket_id = 'lms_content'::text));
DROP POLICY IF EXISTS "students read quiz_questions for enrolled courses" ON public.quiz_questions;
CREATE POLICY "students read quiz_questions for enrolled courses" ON public.quiz_questions AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM ((enrollments e
     JOIN contacts ct ON ((e.contact_id = ct.id)))
     JOIN course_lessons cl ON ((cl.course_id = e.course_id)))
  WHERE ((cl.id = quiz_questions.lesson_id) AND (ct.email = (auth.jwt() ->> 'email'::text))))));
DROP POLICY IF EXISTS "workspace members access quiz_questions" ON public.quiz_questions;
CREATE POLICY "workspace members access quiz_questions" ON public.quiz_questions AS PERMISSIVE FOR ALL TO public USING ((workspace_id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid()))));
