-- Sprint 4: CRM Intelligence and Attribution Tracking

-- 1. Add attribution column to form_submissions
ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS attribution JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_returning BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- 2. Add form_attribution to contacts if not already there
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS form_attribution JSONB DEFAULT '{}';

-- 3. Add hidden fields config to form settings
-- We will store hidden field configs in forms.config -> 'hiddenFields' JSON array.
