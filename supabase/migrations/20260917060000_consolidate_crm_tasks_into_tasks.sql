-- Consolidation: crm_tasks is removed as a separate feature. tasks
-- (public.tasks, the real List/Kanban/Calendar board's backend) becomes
-- the single implementation for CRM tasks. This mirrors the
-- proposals->quotes consolidation (20260917050000). Audited 2026-09-17:
--   - public.tasks has the only real, working, user-facing surface
--     (board UI, realtime, multi-assignee via task_assignees) and correct
--     NOT NULL workspace_id scoping.
--   - public.crm_tasks's write paths (task-workspace.ts createTask/
--     updateTaskStatus, components/tasks/TaskKanban.tsx) are dead code —
--     not imported/rendered anywhere. Its only live consumer was the
--     read-only Analytics dashboard (getTaskDashboardData), which always
--     showed zero data because nothing ever wrote to crm_tasks.
--   - EscalationHandler/FollowupManager/ReminderScheduler (crm_tasks-based
--     automation) are never invoked by any cron (vercel.json) or route —
--     dead code regardless of which table they targeted.
--   - Both tables had 0 rows in production at audit time — no data
--     migration/loss risk either direction.
--
-- This migration:
--   1. Adds company_id/opportunity_id linkage to tasks (crm_tasks had
--      these; tasks only had contact_id) so the consolidated Analytics/
--      automation code can link a task to a company or opportunity.
--   2. Repoints task_reminders.task_id and overdue_escalations.task_id
--      at tasks(id) instead of the dropped crm_tasks(id).
--   3. Drops public.crm_tasks and its RLS policy.

-- 1. CRM entity linkage on the canonical tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.crm_companies(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES public.crm_opportunities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON public.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_opportunity_id ON public.tasks(opportunity_id);

-- 2. Repoint task_reminders and overdue_escalations at tasks(id).
-- Both tables are empty (confirmed at audit time), so dropping and
-- recreating the FK is safe — nothing to backfill.
ALTER TABLE public.task_reminders DROP CONSTRAINT IF EXISTS task_reminders_task_id_fkey;
ALTER TABLE public.task_reminders ADD CONSTRAINT task_reminders_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

ALTER TABLE public.overdue_escalations DROP CONSTRAINT IF EXISTS overdue_escalations_task_id_fkey;
ALTER TABLE public.overdue_escalations ADD CONSTRAINT overdue_escalations_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

-- 3. Drop the orphaned crm_tasks table and its policy.
DROP POLICY IF EXISTS "Workspace isolation for crm_tasks" ON public.crm_tasks;
DROP TABLE IF EXISTS public.crm_tasks;
