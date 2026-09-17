import { createAdminClient } from '@/lib/supabase/server';
import { WorkspaceNotificationCenter } from '@/lib/crm/WorkspaceNotificationCenter';
import { UnifiedActivityEngine } from '@/lib/crm/UnifiedActivityEngine';

export class EscalationHandler {
  /**
   * Run daily via /api/cron/workers/task-escalations. Scans for heavily
   * overdue tasks (public.tasks, the same table the List/Kanban/Calendar
   * board uses) and creates escalation records.
   *
   * Uses the admin client, not createServerClient() (which the previous,
   * never-actually-run version of this class used) — a cron invocation has
   * no logged-in user/session cookie, so an RLS-scoped client would see
   * zero rows under the "Workspace isolation" policies on tasks/
   * overdue_escalations. The explicit .eq('workspace_id', workspaceId)
   * filter below is what enforces isolation instead, the same trusted-
   * server pattern every other cron worker in this codebase already uses.
   */
  public static async escalateOverdueTasks(workspaceId: string) {
    const supabase = createAdminClient();

    // Find tasks overdue by more than 48 hours. tasks.due_date is a DATE
    // (not a TIMESTAMPTZ), so compare against the calendar date 2 days ago.
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 2);
    const thresholdDateStr = thresholdDate.toISOString().split('T')[0];

    const { data: overdueTasks } = await supabase
      .from('tasks')
      .select('*, assignees:task_assignees(user_id)')
      .eq('workspace_id', workspaceId)
      .neq('status', 'done')
      .lt('due_date', thresholdDateStr);

    if (!overdueTasks || overdueTasks.length === 0) return;

    for (const task of overdueTasks) {
      // Skip tasks already escalated and still open.
      const { data: existingEscalation } = await supabase
        .from('overdue_escalations')
        .select('id')
        .eq('task_id', task.id)
        .eq('status', 'Open')
        .maybeSingle();
      if (existingEscalation) continue;

      // Create escalation record
      await supabase.from('overdue_escalations').insert({
        workspace_id: workspaceId,
        task_id: task.id,
        escalation_reason: 'Task overdue by more than 48 hours.'
      });

      // Update task priority
      await supabase.from('tasks').update({
        priority: 'high'
      }).eq('id', task.id);

      // Notify every assignee (tasks supports multiple, unlike the old
      // single owner_id crm_tasks model).
      const assigneeIds: string[] = (task.assignees || []).map((a: any) => a.user_id);
      for (const assigneeId of assigneeIds) {
        await WorkspaceNotificationCenter.notify(
          workspaceId,
          assigneeId,
          'Task Escalated',
          `Your task "${task.title}" is heavily overdue and has been escalated.`,
          'alert',
          task.id,
          'task'
        );
      }

      // Log to timeline
      await UnifiedActivityEngine.logActivity(
        workspaceId,
        null,
        'opportunity', // abstract representation
        task.id,
        'escalation',
        `Task "${task.title}" escalated due to missed deadline.`
      );
    }
  }
}
