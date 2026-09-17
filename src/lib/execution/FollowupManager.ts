import { createServerClient } from '@/lib/supabase/server';
import { UnifiedActivityEngine } from '@/lib/crm/UnifiedActivityEngine';

export class FollowupManager {
  /**
   * Creates a dedicated followup task (public.tasks, the same table the
   * List/Kanban/Calendar board uses) linked to an existing entity.
   */
  public static async scheduleFollowup(
    workspaceId: string,
    ownerId: string,
    entityType: 'opportunity' | 'contact' | 'company',
    entityId: string,
    dueDate: string,
    notes: string
  ) {
    const supabase = await createServerClient();

    const taskData: any = {
      workspace_id: workspaceId,
      created_by: ownerId,
      title: `Follow up: ${entityType}`,
      description: notes,
      status: 'todo',
      priority: 'high',
      due_date: dueDate
    };

    // Attach abstract entity links
    if (entityType === 'opportunity') taskData.opportunity_id = entityId;
    else if (entityType === 'contact') taskData.contact_id = entityId;
    else if (entityType === 'company') taskData.company_id = entityId;

    const { data, error } = await supabase.from('tasks').insert(taskData).select().single();
    if (error) throw error;

    await supabase.from('task_assignees').insert({ task_id: data.id, user_id: ownerId });

    await UnifiedActivityEngine.logActivity(
      workspaceId,
      ownerId,
      entityType,
      entityId,
      'note',
      `Scheduled a follow-up for ${new Date(dueDate).toLocaleDateString()}: ${notes}`
    );

    return data;
  }
}
