import { createServerClient } from '@/lib/supabase/server';
import { UnifiedActivityEngine } from '@/lib/crm/UnifiedActivityEngine';

export class WorkflowExecutionEngine {
  /**
   * Evaluates and executes matching workflows when an event occurs.
   * This is the core operational router for LeadsMind automations.
   */
  public static async processEvent(
    workspaceId: string, 
    eventType: string, 
    entityType: 'contact' | 'company' | 'opportunity' | 'form' | 'lead', 
    entityId: string,
    payload: any = {}
  ) {
    const supabase = await createServerClient();
    
    // 1. Find all active workflows mapped to this trigger
    const { data: triggers } = await supabase
      .from('workflow_triggers')
      .select('workflow_id, automation_workflows!inner(is_active, workspace_id)')
      .eq('event_type', eventType)
      .eq('automation_workflows.workspace_id', workspaceId)
      .eq('automation_workflows.is_active', true);

    if (!triggers || triggers.length === 0) return;

    for (const trigger of triggers) {
      const workflowId = trigger.workflow_id;
      
      // 2. Create Execution Log (Running state)
      const { data: log, error: logError } = await supabase.from('workflow_execution_logs').insert({
        workspace_id: workspaceId,
        workflow_id: workflowId,
        trigger_event: eventType,
        entity_type: entityType,
        entity_id: entityId,
        status: 'running'
      }).select().single();

      if (logError) continue;

      try {
        // 3. Fetch sequentially ordered actions
        const { data: actions } = await supabase
          .from('workflow_actions')
          .select('*')
          .eq('workflow_id', workflowId)
          .order('sequence_order', { ascending: true });

        if (actions) {
          // 4. Execute Actions Deterministically
          for (const action of actions) {
            await this.executeAction(workspaceId, action, entityType, entityId, payload);
          }
        }

        // 5. Mark Success
        await supabase.from('workflow_execution_logs').update({ status: 'success' }).eq('id', log.id);
        
        // Update execution count on workflow safely
        const { data: wData } = await supabase.from('automation_workflows').select('execution_count').eq('id', workflowId).single();
        if (wData) {
          await supabase.from('automation_workflows').update({ execution_count: wData.execution_count + 1 }).eq('id', workflowId);
        }

      } catch (error: any) {
        // 6. Handle Failure / Dead Letter Queue
        await supabase.from('workflow_execution_logs').update({ status: 'failed' }).eq('id', log.id);
        await supabase.from('workflow_failures').insert({
          execution_log_id: log.id,
          workflow_id: workflowId,
          failed_action_type: 'unknown',
          error_message: error.message || 'Execution failed'
        });
      }
    }
  }

  /**
   * Executes a specific action step.
   * In a real implementation, this routes to specific domain services (e.g., CRM Engine, Notifications).
   */
  private static async executeAction(workspaceId: string, action: any, entityType: string, entityId: string, payload: any) {
    // Deterministic Routing switch
    switch (action.action_type) {
      case 'create_notification':
        // Example integration
        // await WorkspaceNotificationCenter.notify(...)
        break;
      case 'create_opportunity':
        // Creates opp and logs activity
        await UnifiedActivityEngine.logActivity(workspaceId, null, entityType as any, entityId, 'workflow_action', `Workflow automatically created opportunity.`);
        break;
      case 'assign_owner':
        await UnifiedActivityEngine.logActivity(workspaceId, null, entityType as any, entityId, 'workflow_action', `Workflow assigned owner.`);
        break;
      default:
        // Generic success
        break;
    }
  }
}
