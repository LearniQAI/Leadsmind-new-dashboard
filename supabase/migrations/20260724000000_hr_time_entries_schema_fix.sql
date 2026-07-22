-- Migration: Fix hr/time-tracking schema drift on public.time_entries
--
-- public.time_entries was originally created by 20240101000069_phase36_invoice_advanced.sql
-- with a contact/invoice-billing shape (contact_id, duration_seconds, billable_rate, status,
-- invoice_id, started_at, ended_at) for a billing-time-tracking feature that was never wired
-- up in any application code (verified: zero references to this table outside the HR route).
--
-- 20240101000185_hr_inventory.sql later tried to define time_entries again with an HR
-- manual-hour-logging shape (employee_id, date, hours, billable, description, project_name,
-- hourly_rate, billed) via `CREATE TABLE IF NOT EXISTS` — which silently no-op'd because the
-- table already existed from the earlier migration, so those columns were never actually
-- applied. src/app/api/hr/time-tracking/route.ts has always queried this never-applied shape,
-- causing a hard PGRST200 "no relationship between time_entries and employees" failure on
-- every request, unrelated to auth.
--
-- This migration adds the missing HR columns via ALTER TABLE (idempotent, safe to re-run).
-- The old contact/invoice-billing columns are left in place untouched — nothing in the
-- codebase uses them today, but they're kept in case a future billing feature still wants
-- them, and dropping them isn't necessary to fix the HR route.

ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS hours NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billable BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billed BOOLEAN DEFAULT false;

-- Index to support the HR route's common lookups (workspace + employee filtering)
CREATE INDEX IF NOT EXISTS idx_time_entries_workspace_employee
  ON public.time_entries (workspace_id, employee_id);
