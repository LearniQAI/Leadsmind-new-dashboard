import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceNotificationCenter } from '@/lib/crm/WorkspaceNotificationCenter';
import { UnifiedActivityEngine } from '@/lib/crm/UnifiedActivityEngine';

export class EscalationHandler {
  /**
   * Intended to be run via a cron job daily.
   * Scans for heavily overdue tasks and creates escalation records for managers.
   */
  public static async escalateOverdueTasks(workspaceId: string) {
    const supabase = await createServerClient();
    
    // Find tasks overdue by more than 48 hours
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - 48);

    const { data: overdueTasks } = await supabase
      .from('crm_tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'Pending')
      .lt('due_date', thresholdDate.toISOString());

    if (!overdueTasks || overdueTasks.length === 0) return;

    for (const task of overdueTasks) {
      // Create escalation record
      await supabase.from('overdue_escalations').insert({
        workspace_id: workspaceId,
        task_id: task.id,
        escalation_reason: 'Task overdue by more than 48 hours.'
      });

      // Update task status and priority
      await supabase.from('crm_tasks').update({ 
        status: 'Overdue',
        priority: 'Urgent' 
      }).eq('id', task.id);

      // Notify the owner
      if (task.owner_id) {
        await WorkspaceNotificationCenter.notify(
          workspaceId,
          task.owner_id,
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
