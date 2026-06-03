-- Add leave balance tracking to employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS annual_leave_balance integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS sick_leave_balance integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS annual_leave_used integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sick_leave_used integer DEFAULT 0;

-- Add actioned_by and rejection reason to leave_requests
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS actioned_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS actioned_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_reason text;
