import { createServerClient } from '@/lib/supabase/server';

export class WorkflowFailureMonitor {
  /**
   * Identifies failed workflow executions (the live schema has no separate
   * dead-letter table — `status = 'failed'` on workflow_executions is the
   * only failure signal that actually gets written at runtime).
   */
  public static async getFailures(workspaceId: string, limit = 50) {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('workflow_executions')
      .select('*, workflows!inner(name, workspace_id)')
      .eq('workflows.workspace_id', workspaceId)
      .eq('status', 'failed')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // NOTE: resolveFailure() was intentionally not carried over. It used to
  // flip workflow_failures.is_resolved — a column that has no equivalent on
  // workflow_executions. There is currently no "acknowledged"/"resolved"
  // concept in the live schema, and this class has zero callers, so adding
  // one here would mean inventing execution-state semantics without a
  // consumer to validate them against. Needs a real schema decision
  // (e.g. an `acknowledged_at` column) before this comes back.
}
