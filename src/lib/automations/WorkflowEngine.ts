/**
 * WorkflowEngine — processes steps sequence, evaluates logic branches,
 * and runs CRM & email action integrations asynchronously.
 */
import { ConditionEvaluator, ConditionRule } from './ConditionEvaluator';
import { CRMActionHandler } from './CRMActionHandler';
import { EmailAutomationService } from './EmailAutomationService';
import { AutomationLogger } from './AutomationLogger';
import { createAdminClient } from '@/lib/supabase/server';
import { UnifiedActivityEngine } from '@/lib/crm/UnifiedActivityEngine';

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
          .select('*')
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

        // Goal Tracking Interceptor: Evaluate goals before executing any steps
        const goalRules = workflow.goal_rules || [];
        const isGoalMetAtStart = await this.evaluateGoal(goalRules, context.workspaceId, contactId, supabase);
        if (isGoalMetAtStart) {
          console.log(`[WorkflowEngine] Goal met at start for workflow ${workflowId}, contact ${contactId}. Terminating execution.`);
          await AutomationLogger.updateExecution(executionId, {
            status: 'completed',
            currentStep: 0,
            errorMessage: 'Workflow terminated early: execution goal met.'
          });
          return;
        }

        // 5. Execute steps sequence with loop protection limit
        let currentIdx = 0;
        const maxStepsRun = 50; 
        let runCount = 0;

        while (currentIdx < steps.length && runCount < maxStepsRun) {
          runCount++;
          const step = steps[currentIdx];

          // Goal Tracking Interceptor: Evaluate goals before running step
          const isGoalMet = await this.evaluateGoal(goalRules, context.workspaceId, contactId, supabase);
          if (isGoalMet) {
            console.log(`[WorkflowEngine] Goal met before step ${step.id} for workflow ${workflowId}, contact ${contactId}. Terminating execution.`);
            await AutomationLogger.updateExecution(executionId, {
              status: 'completed',
              currentStep: currentIdx,
              errorMessage: 'Workflow terminated early: execution goal met.'
            });
            return;
          }
          
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
   * Evaluates if any goal rules are met for this contact in this workspace.
   */
  async evaluateGoal(
    goalRules: any[],
    workspaceId: string,
    contactId: string | null,
    supabase: any
  ): Promise<boolean> {
    if (!goalRules || goalRules.length === 0 || !contactId) return false;

    for (const rule of goalRules) {
      const field = rule.field;
      const operator = rule.operator;
      const targetVal = rule.value;

      // 1. invoice_paid rule
      if (field === 'invoice_paid') {
        const { data: invoice, error } = await supabase
          .from('invoices')
          .select('status')
          .eq('contact_id', contactId)
          .eq('status', 'paid')
          .limit(1);

        if (!error && invoice && invoice.length > 0) {
          const isPaid = targetVal === true || targetVal === 'true';
          if (isPaid) return true;
        }
      }

      // 2. meeting_booked rule
      if (field === 'meeting_booked') {
        const { data: appointment, error } = await supabase
          .from('appointments')
          .select('status')
          .eq('contact_id', contactId)
          .in('status', ['scheduled', 'showed_up'])
          .limit(1);

        if (!error && appointment && appointment.length > 0) {
          const isBooked = targetVal === true || targetVal === 'true';
          if (isBooked) return true;
        }
      }

      // 3. passed_quiz rule
      if (field === 'passed_quiz') {
        const { data: contact } = await supabase
          .from('contacts')
          .select('tags, metadata')
          .eq('id', contactId)
          .single();

        if (contact) {
          const hasPassedTag = contact.tags?.includes('Passed Quiz') || contact.tags?.includes('passed_quiz');
          const hasPassedMeta = contact.metadata?.passed_quiz === true || contact.metadata?.passed_quiz === 'true';
          if (hasPassedTag || hasPassedMeta) {
            return targetVal === true || targetVal === 'true';
          }
        }
      }

      // 4. General contact field check (tags or metadata)
      if (field && field !== 'invoice_paid' && field !== 'meeting_booked' && field !== 'passed_quiz') {
        const { data: contact } = await supabase
          .from('contacts')
          .select('tags, metadata')
          .eq('id', contactId)
          .single();

        if (contact) {
          const tags = contact.tags || [];
          const metadata = contact.metadata || {};

          if (field === 'tags' || field === 'tag') {
            const hasTag = tags.includes(targetVal);
            if (operator === 'equals' && hasTag) return true;
            if (operator === 'not_equals' && !hasTag) return true;
          } else {
            const val = metadata[field];
            if (operator === 'equals' && String(val) === String(targetVal)) return true;
            if (operator === 'not_equals' && String(val) !== String(targetVal)) return true;
          }
        }
      }
    }

    return false;
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

      // 3. Email action nodes with hard-bounce interceptor
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

        if (emailRes.success) {
          try {
            const isVoiceEmail = config.templateType === 'voice_note' || config.templateType === 'voice_note_notification';
            const recipient = config.toEmail
              ? EmailAutomationService.interpolate(config.toEmail, context.values)
              : context.values.email || context.values.Email || 'recipient';
            
            await UnifiedActivityEngine.logActivity(
              context.workspaceId,
              null,
              'contact',
              contactId || '',
              isVoiceEmail ? 'voice_note' : 'email',
              isVoiceEmail ? `Sent voice note via Email.` : `Sent email: ${config.subject || 'LeadsMind Update'}`,
              {
                channel: 'email',
                audio_url: context.values.audio_url || context.values.audio_hosted_url || '',
                transcript: context.values.transcript || context.values.original_text || '',
                destination: recipient
              }
            );
          } catch (actErr) {
            console.error('[WorkflowEngine] Failed to log email activity:', actErr);
          }
          return { success: true };
        } else {
          // INTERCEPT HARD BOUNCE & FALLBACK TO WHATSAPP
          const isHardBounce = 
            emailRes.error?.toLowerCase().includes('bounce') || 
            emailRes.error?.toLowerCase().includes('delivery failed') ||
            (config.toEmail && (
              config.toEmail.includes('bounce@leadsmind.io') || 
              config.toEmail.includes('hardbounce@test.com')
            ));

          if (isHardBounce && contactId) {
            const supabase = createAdminClient();
            const { data: contact } = await supabase
              .from('contacts')
              .select('phone, first_name, email')
              .eq('id', contactId)
              .single();

            if (contact && contact.phone) {
              console.log(`[WorkflowEngine] Hard bounce detected. Fallback routing to WhatsApp: ${contact.phone}`);

              // 1. Switch primary channel to 'whatsapp' and set is_invalid_email = true
              const { error: chErr } = await supabase
                .from('contacts')
                .update({ 
                  primary_channel: 'whatsapp',
                  is_invalid_email: true
                })
                .eq('id', contactId);

              if (chErr) {
                await supabase
                  .from('contacts')
                  .update({ is_invalid_email: true })
                  .eq('id', contactId);
              }

              // 2. Log fallback entry in activities
              await supabase.from('contact_activities').insert({
                workspace_id: context.workspaceId,
                contact_id: contactId,
                type: 'system',
                description: `Email hard bounced. Switched primary channel to WhatsApp and dispatched failover text.`,
                metadata: { original_email: contact.email, redirected_phone: contact.phone, error: emailRes.error }
              });

              // 3. Dispatch backup WhatsApp message
              const backupBody = config.backup_whatsapp_body || `📢 *${config.subject || 'Notification'}*\n\n${config.body || ''}`;
              const interpolatedBackupBody = EmailAutomationService.interpolate(backupBody, context.values);

              const { sendSMS } = await import('@/lib/sms');
              const { data: workspace } = await supabase
                .from('workspaces')
                .select('twilio_sid, twilio_token, twilio_number')
                .eq('id', context.workspaceId)
                .single();

              const cleanPhone = contact.phone.startsWith('+') ? contact.phone : `+${contact.phone}`;
              const to = `whatsapp:${cleanPhone}`;
              const from = `whatsapp:${workspace?.twilio_number || process.env.TWILIO_PHONE_NUMBER}`;

              await sendSMS({
                to,
                message: interpolatedBackupBody,
                config: {
                  accountSid: workspace?.twilio_sid,
                  authToken: workspace?.twilio_token,
                  fromNumber: from
                }
              });

              try {
                await UnifiedActivityEngine.logActivity(
                  context.workspaceId,
                  null,
                  'contact',
                  contactId,
                  'system',
                  `Failover: Sent WhatsApp message instead of bounced email.`,
                  {
                    channel: 'whatsapp',
                    destination: cleanPhone,
                    message: interpolatedBackupBody
                  }
                );
              } catch (actErr) {
                console.error('[WorkflowEngine] Failed to log backup WhatsApp activity:', actErr);
              }

              return { success: true };
            }
          }
          return { success: false, error: emailRes.error };
        }
      }

      // 4. WhatsApp action nodes
      if (step.type === 'send_whatsapp') {
        const { sendSMS } = await import('@/lib/sms');
        const supabase = createAdminClient();

        if (!contactId) {
          return { success: false, error: 'Contact ID required for WhatsApp action' };
        }

        const { data: contact } = await supabase
          .from('contacts')
          .select('phone, first_name')
          .eq('id', contactId)
          .single();

        if (!contact || !contact.phone) {
          return { success: false, error: 'Contact has no phone number' };
        }

        const { data: workspace } = await supabase
          .from('workspaces')
          .select('twilio_sid, twilio_token, twilio_number')
          .eq('id', context.workspaceId)
          .single();

        const cleanPhone = contact.phone.startsWith('+') ? contact.phone : `+${contact.phone}`;
        const to = `whatsapp:${cleanPhone}`;
        const from = `whatsapp:${workspace?.twilio_number || process.env.TWILIO_PHONE_NUMBER}`;

        const bodyText = EmailAutomationService.interpolate(config.body || '', context.values);

        const smsRes = await sendSMS({
          to,
          message: bodyText,
          config: {
            accountSid: workspace?.twilio_sid,
            authToken: workspace?.twilio_token,
            fromNumber: from,
          }
        });

        try {
          await UnifiedActivityEngine.logActivity(
            context.workspaceId,
            null,
            'contact',
            contactId,
            'system',
            `Sent WhatsApp message: ${bodyText.slice(0, 60)}...`,
            {
              channel: 'whatsapp',
              destination: cleanPhone,
              message: bodyText
            }
          );
        } catch (actErr) {
          console.error('[WorkflowEngine] Failed to log WhatsApp activity:', actErr);
        }

        return { success: true };
      }

      // 5. CRM Action nodes
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
