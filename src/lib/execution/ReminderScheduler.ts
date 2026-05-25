import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceNotificationCenter } from '@/lib/crm/WorkspaceNotificationCenter';

export class ReminderScheduler {
  /**
   * Intended to be run via a cron job every minute.
   * Scans for pending reminders and dispatches notifications.
   */
  public static async dispatchDueReminders() {
    const supabase = await createServerClient();
    
    // Find due reminders that haven't been sent
    const { data: reminders } = await supabase
      .from('task_reminders')
      .select('*, crm_tasks!inner(title, status)')
      .eq('is_sent', false)
      .lte('trigger_time', new Date().toISOString());

    if (!reminders || reminders.length === 0) return;

    for (const reminder of reminders) {
      if (reminder.crm_tasks.status !== 'Completed') {
        // Send Notification
        await WorkspaceNotificationCenter.notify(
          reminder.workspace_id,
          reminder.user_id,
          'Task Reminder',
          `${reminder.message}: ${reminder.crm_tasks.title}`,
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
