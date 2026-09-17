import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { WorkspaceNotificationCenter } from '@/lib/crm/WorkspaceNotificationCenter';

export class ReminderScheduler {
  /**
   * Run every minute via /api/cron/workers/task-reminders. Scans for
   * pending reminders and dispatches notifications. Uses the admin client
   * (a cron invocation has no logged-in user/session for an RLS-scoped
   * client to see rows through) — every reminder here already carries its
   * own workspace_id/user_id, which is what WorkspaceNotificationCenter.notify
   * scopes the actual notification to, so there's no cross-workspace
   * exposure risk in reading task_reminders admin-side.
   */
  public static async dispatchDueReminders() {
    const supabase = createAdminClient();
    
    // Find due reminders that haven't been sent
    const { data: reminders } = await supabase
      .from('task_reminders')
      .select('*, tasks!inner(title, status)')
      .eq('is_sent', false)
      .lte('trigger_time', new Date().toISOString());

    if (!reminders || reminders.length === 0) return;

    for (const reminder of reminders) {
      if (reminder.tasks.status !== 'done') {
        // Send Notification
        await WorkspaceNotificationCenter.notify(
          reminder.workspace_id,
          reminder.user_id,
          'Task Reminder',
          `${reminder.message}: ${reminder.tasks.title}`,
          'alert',
          reminder.task_id,
          'task'
        );
      }

      // Mark as sent
      await supabase.from('task_reminders').update({ is_sent: true }).eq('id', reminder.id);
    }
  }

  /**
   * Schedules a new reminder for a task.
   */
  public static async scheduleReminder(workspaceId: string, taskId: string, userId: string, triggerTime: string, message: string) {
    const supabase = await createServerClient();
    await supabase.from('task_reminders').insert({
      workspace_id: workspaceId,
      task_id: taskId,
      user_id: userId,
      trigger_time: triggerTime,
      message
    });
  }
}
