'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';

export async function getTaskDashboardData() {
  try {
    const { userId, workspaceId } = await requireWorkspaceAccess();

    const supabase = await createServerClient();

    // Fetch all tasks for the workspace, from the canonical `tasks` table
    // (shared with the List/Kanban/Calendar board — see
    // 20260917060000_consolidate_crm_tasks_into_tasks.sql).
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*, company:company_id(name), contact:contact_id(first_name, last_name, email), opportunity:opportunity_id(name)')
      .eq('workspace_id', workspaceId)
      .order('due_date', { ascending: true });

    // Fetch escalations
    const { data: escalations } = await supabase
      .from('overdue_escalations')
      .select('*, tasks!inner(title)')
      .eq('workspace_id', workspaceId)
      .eq('status', 'Open');

    return {
      success: true,
      data: {
        tasks: tasks || [],
        escalations: escalations || [],
        currentUserId: userId
      }
    };
  } catch (error: any) {
    logger.error({ err: error }, 'task_workspace.dashboard.fetch.failed');
    return { success: false, error: 'Unauthorized' };
  }
}
