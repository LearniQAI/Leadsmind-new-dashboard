/**
 * WorkflowEngine — processes steps sequence, evaluates logic branches,
 * and runs CRM & email action integrations asynchronously.
 */
import { ConditionEvaluator, ConditionRule } from './ConditionEvaluator';
import { CRMActionHandler } from './CRMActionHandler';
import { EmailAutomationService } from './EmailAutomationService';
import { AutomationLogger } from './AutomationLogger';
import { createAdminClient } from '@/lib/supabase/server';

export interface WorkflowStep {
  id: string;
  workflowId: string;
  position: number;
  type: string;
  config: Record<string, any>;
}

export interface WorkflowContext {
  workspaceId: string;
  formName: string;
  values: Record<string, any>;
  completionPercentage?: number;
  attribution?: Record<string, any>;
  isReturningContact?: boolean;
  metadata?: Record<string, any>;
}

export const WorkflowEngine = {
  /**
   * Run workflow sequence asynchronously in the background.
   * Workflow executions should never block form submission runtime.
   */
  async runWorkflow(
    workflowId: string,
    context: WorkflowContext
  ): Promise<void> {
    // Run async process in background, allowing early returns
    (async () => {
      const supabase = createAdminClient();

      try {
        // 1. Fetch workflow metadata
        const { data: workflow, error: wfErr } = await supabase
          .from('workflows')
          .select('name, is_active')
          .eq('id', workflowId)
          .single();

        if (wfErr || !workflow || !workflow.is_active) return;

        // 2. Fetch steps in order of position
        const { data: steps, error: stepsErr } = await supabase
          .from('workflow_steps')
          .select('*')
          .eq('workflow_id', workflowId)
          .order('position', { ascending: true });

        if (stepsErr || !steps || steps.length === 0) return;

        // 3. Resolve CRM contact
        let userEmail = '';
        for (const [k, v] of Object.entries(context.values)) {
          if (k.toLowerCase().includes('email') && typeof v === 'string' && v.includes('@')) {
            userEmail = v.trim();
            break;
          }
        }
        const contactId = await CRMActionHandler.resolveContactId(userEmail, context.workspaceId, supabase);

        // 4. Start execution logging
        const executionId = await AutomationLogger.startExecution({
          workflowId,
          workspaceId: context.workspaceId,
          contactId,
          status: 'running',
          context: context.values
        });

        if (!executionId) return;

        // 5. Execute steps sequence with loop protection limit
        let currentIdx = 0;
        const maxStepsRun = 50; 
        let runCount = 0;

        while (currentIdx < steps.length && runCount < maxStepsRun) {
          runCount++;
          const step = steps[currentIdx];
          
          await AutomationLogger.logStep(executionId, context.workspaceId, step.id, { status: 'running' });

          const stepResult = await this.executeStep(step, context, contactId);

          if (stepResult.success) {
            await AutomationLogger.logStep(executionId, context.workspaceId, step.id, { status: 'completed' });
            
            // Handle branching condition node
            if (step.type === 'if_else' && stepResult.branchPath) {
              if (stepResult.branchPath === 'stop') {
                await AutomationLogger.updateExecution(executionId, {
                  status: 'completed',
                  currentStep: currentIdx + 1
                });
                return; // Stop execution
              }
              // Skip or jump position based on branch config if configured
              if (typeof stepResult.branchPath === 'number') {
                currentIdx = stepResult.branchPath;
                continue;
              }
            }
            
            currentIdx++;
          } else {
            // Log failure and terminate execution
            await AutomationLogger.logStep(executionId, context.workspaceId, step.id, {
              status: 'failed',
              errorMessage: stepResult.error
            });
            await AutomationLogger.updateExecution(executionId, {
              status: 'failed',
              errorMessage: `Step at position ${step.position} failed: ${stepResult.error}`
            });
            return;
          }
        }

        // Successfully completed all steps
        await AutomationLogger.updateExecution(executionId, {
          status: 'completed',
          currentStep: currentIdx
        });

      } catch (err: any) {
        console.error('[WorkflowEngine] Critical runtime failure:', err);
      }
    })();
  },

  /**
   * Process a single action node.
   */
  async executeStep(
    step: WorkflowStep,
    context: WorkflowContext,
    contactId: string | null
  ): Promise<{ success: boolean; error?: string; branchPath?: string | number }> {
    const config = step.config || {};

    try {
      // 1. Wait/delay execution scaffold
      if (step.type === 'wait') {
        const delaySeconds = parseInt(config.delaySeconds || '0', 10);
        if (delaySeconds > 0) {
          // Keep delay bounds small during real-time server responses
          const cappedDelay = Math.min(delaySeconds, 10); 
          await new Promise(r => setTimeout(r, cappedDelay * 1000));
        }
        return { success: true };
      }

      // 2. Branching evaluations
      if (step.type === 'if_else') {
        const conditions: ConditionRule[] = config.conditions || [];
        const isMatch = ConditionEvaluator.evaluate(conditions, {
          values: context.values,
          completionPercentage: context.completionPercentage,
          attribution: context.attribution,
          isReturningContact: context.isReturningContact,
          metadata: context.metadata
        });

        if (isMatch) {
          return { success: true, branchPath: config.matchAction || 'continue' };
        } else {
          return { success: true, branchPath: config.fallbackAction || 'stop' };
        }
      }

      // 3. Email action nodes
      if (step.type === 'send_email') {
        const emailRes = await EmailAutomationService.sendWorkflowEmail(
          context.workspaceId,
          {
            templateType: config.templateType || 'confirmation',
            subject: config.subject || 'LeadsMind Update',
            body: config.body || '',
            toEmail: config.toEmail,
            fromName: config.fromName,
            fromEmail: config.fromEmail
          },
          context.values
        );
        return emailRes.success
          ? { success: true }
          : { success: false, error: emailRes.error };
      }

      // 4. CRM Action nodes
      const crmRes = await CRMActionHandler.executeAction(
        step.type,
        config,
        {
          workspaceId: context.workspaceId,
          contactId: contactId || undefined,
          email: context.values.email,
          formName: context.formName,
          values: context.values
        }
      );

      return crmRes.success
        ? { success: true }
        : { success: false, error: crmRes.error };

    } catch (err: any) {
      return { success: false, error: err.message || 'Workflow step executor crashed.' };
    }
  }
};
