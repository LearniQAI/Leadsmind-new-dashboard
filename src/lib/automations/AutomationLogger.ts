/**
 * AutomationLogger — manages database logs for active workflow executions and step outcomes.
 */
import { createAdminClient } from '@/lib/supabase/server';

export interface WorkflowExecutionLog {
  id?: string;
  workflowId: string;
  workspaceId: string;
  contactId?: string | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep?: number;
  errorMessage?: string | null;
  context?: Record<string, any>;
}

export const AutomationLogger = {
  /**
   * Log the start of a workflow execution.
   */
  async startExecution(log: WorkflowExecutionLog): Promise<string | null> {
    const supabase = createAdminClient();
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .insert({
          workflow_id: log.workflowId,
          workspace_id: log.workspaceId,
          // Fallback contact UUID placeholder if contact couldn't be resolved
          contact_id: log.contactId || null,
          status: 'running',
          current_step: 1,
          context: log.context || {},
          started_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error('[AutomationLogger] Start execution error:', error);
        return null;
      }
      return data.id;
    } catch (err) {
      console.error('[AutomationLogger] Unexpected error starting execution:', err);
      return null;
    }
  },

  /**
   * Update execution overall state.
   */
  async updateExecution(
    executionId: string,
    updates: Partial<WorkflowExecutionLog>
  ): Promise<void> {
    const supabase = createAdminClient();
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.currentStep) dbUpdates.current_step = updates.currentStep;
      if (updates.errorMessage !== undefined) dbUpdates.error_message = updates.errorMessage;
      if (updates.status === 'completed' || updates.status === 'failed') {
        dbUpdates.completed_at = new Date().toISOString();
      }

      await supabase
        .from('workflow_executions')
        .update(dbUpdates)
        .eq('id', executionId);
    } catch (err) {
      console.error('[AutomationLogger] Update execution error:', err);
    }
  },

  /**
   * Record individual step executions.
   */
  async logStep(
    executionId: string,
    workspaceId: string,
    stepId: string,
    updates: {
      status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
      errorMessage?: string | null;
      retryCount?: number;
    }
  ): Promise<void> {
    const supabase = createAdminClient();
    try {
      const dbLog = {
        execution_id: executionId,
        workspace_id: workspaceId,
        step_id: stepId,
        status: updates.status,
        error_message: updates.errorMessage || null,
        retry_count: updates.retryCount || 0,
        started_at: updates.status === 'running' ? new Date().toISOString() : null,
        completed_at: (updates.status === 'completed' || updates.status === 'failed') ? new Date().toISOString() : null
      };

      // Perform upsert on log table
      await supabase
        .from('workflow_step_logs')
        .upsert(dbLog, { onConflict: 'execution_id,step_id' });
    } catch (err) {
      console.error('[AutomationLogger] Log step error:', err);
    }
  }
};
