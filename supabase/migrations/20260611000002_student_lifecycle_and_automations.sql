-- Migration: Student Onboarding, Magic Links & LMS Automations
-- File: supabase/migrations/20260611000002_student_lifecycle_and_automations.sql

-- 1. Alter courses table for custom email templates
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS onboarding_email_subject TEXT DEFAULT 'Welcome to {{course_name}}!';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS onboarding_email_body TEXT DEFAULT 'Hello {{student_first_name}},

Welcome to {{course_name}}! You have been granted {{access_type_description}} access.

Access your student portal here: {{portal_url}}

If you have any questions, contact us at {{admin_support_email}}.';

-- 2. Create student magic links table for token verification tracking
CREATE TABLE IF NOT EXISTS public.student_magic_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on student_magic_links
ALTER TABLE public.student_magic_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access student_magic_links" ON public.student_magic_links FOR ALL USING (true);

-- 3. Create email queue table
CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  priority TEXT DEFAULT 'high' CHECK (priority IN ('high', 'medium', 'low')),
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Enable RLS on email_queue
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access email_queue" ON public.email_queue FOR ALL USING (true);

-- 4. Create lms delayed actions table for delayed workflows
CREATE TABLE IF NOT EXISTS public.lms_delayed_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_config JSONB DEFAULT '{}',
  run_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on lms_delayed_actions
ALTER TABLE public.lms_delayed_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access lms_delayed_actions" ON public.lms_delayed_actions FOR ALL USING (true);

-- 5. Trigger to automatically generate onboarding welcome email on enrollment created
CREATE OR REPLACE FUNCTION public.fn_on_enrollment_created()
RETURNS TRIGGER AS $$
DECLARE
  v_course_title TEXT;
  v_first_name TEXT;
  v_email TEXT;
  v_subject TEXT;
  v_body TEXT;
  v_workspace_id UUID;
  v_access_desc TEXT;
  v_support_email TEXT;
  v_portal_url TEXT;
  v_body_hydrated TEXT;
  v_subject_hydrated TEXT;
BEGIN
  -- Fetch course details
  SELECT title, workspace_id, onboarding_email_subject, onboarding_email_body
  INTO v_course_title, v_workspace_id, v_subject, v_body
  FROM public.courses
  WHERE id = NEW.course_id;

  -- Fetch contact details
  SELECT first_name, email
  INTO v_first_name, v_email
  FROM public.contacts
  WHERE id = NEW.contact_id;

  -- Fetch workspace support email
  SELECT email_from_address
  INTO v_support_email
  FROM public.workspaces
  WHERE id = v_workspace_id;

  IF v_support_email IS NULL THEN
    v_support_email := 'support@leadsmind.io';
  END IF;

  v_portal_url := 'https://www.leadsmind.io/student/courses/' || NEW.course_id;
  v_access_desc := COALESCE(NEW.access_type, 'full') || ' access';

  -- Use defaults if subject/body are null
  IF v_subject IS NULL THEN
    v_subject := 'Welcome to {{course_name}}!';
  END IF;
  IF v_body IS NULL THEN
    v_body := 'Hello {{student_first_name}},

Welcome to {{course_name}}! You have been granted {{access_type_description}} access.

Access your student portal here: {{portal_url}}

If you have any questions, contact us at {{admin_support_email}}.';
  END IF;

  -- Replace template variables
  v_subject_hydrated := REPLACE(v_subject, '{{course_name}}', COALESCE(v_course_title, ''));
  v_subject_hydrated := REPLACE(v_subject_hydrated, '{{student_first_name}}', COALESCE(v_first_name, ''));
  v_subject_hydrated := REPLACE(v_subject_hydrated, '{{student_email}}', COALESCE(v_email, ''));
  v_subject_hydrated := REPLACE(v_subject_hydrated, '{{portal_url}}', v_portal_url);
  v_subject_hydrated := REPLACE(v_subject_hydrated, '{{access_type_description}}', v_access_desc);
  v_subject_hydrated := REPLACE(v_subject_hydrated, '{{admin_support_email}}', v_support_email);

  v_body_hydrated := REPLACE(v_body, '{{course_name}}', COALESCE(v_course_title, ''));
  v_body_hydrated := REPLACE(v_body_hydrated, '{{student_first_name}}', COALESCE(v_first_name, ''));
  v_body_hydrated := REPLACE(v_body_hydrated, '{{student_email}}', COALESCE(v_email, ''));
  v_body_hydrated := REPLACE(v_body_hydrated, '{{portal_url}}', v_portal_url);
  v_body_hydrated := REPLACE(v_body_hydrated, '{{access_type_description}}', v_access_desc);
  v_body_hydrated := REPLACE(v_body_hydrated, '{{admin_support_email}}', v_support_email);

  -- Convert plain body breaks into HTML paragraph layout
  v_body_hydrated := '<div style="font-family:sans-serif;font-size:14px;color:#333;line-height:1.6;padding:20px;">' || 
                      REPLACE(v_body_hydrated, E'\n', '<br />') || 
                     '</div>';

  -- Insert into email_queue
  INSERT INTO public.email_queue (workspace_id, to_email, subject, body_html, priority, status)
  VALUES (v_workspace_id, v_email, v_subject_hydrated, v_body_hydrated, 'high', 'pending');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger if exists
DROP TRIGGER IF EXISTS tr_on_enrollment_created ON public.enrollments;
CREATE TRIGGER tr_on_enrollment_created
  AFTER INSERT ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_on_enrollment_created();
