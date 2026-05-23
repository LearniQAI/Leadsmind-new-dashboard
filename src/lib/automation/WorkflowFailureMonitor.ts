import { createServerClient } from '@/lib/supabase/server';

export class WorkflowFailureMonitor {
  /**
   * Identifies unresolved workflow failures in the Dead Letter Queue.
   */
  public static async getFailures(workspaceId: string, limit = 50) {
    const supabase = await createServerClient();
    
    // We fetch failures by joining via the workflow_id to verify workspace ownership securely
    const { data, error } = await supabase
      .from('workflow_failures')
      .select('*, automation_workflows!inner(name, workspace_id), workflow_execution_logs!inner(*)')
      .eq('automation_workflows.workspace_id', workspaceId)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * Marks a failure as resolved.
   */
  public static async resolveFailure(failureId: string) {
    const supabase = await createServerClient();
    await supabase.from('workflow_failures').update({ is_resolved: true }).eq('id', failureId);
  }
}
