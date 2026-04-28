import { createServerClient } from "@/lib/supabase/server";
import { AutomationActions } from "./actions_registry";
import { isWithinBusinessHours, nextWindowOpen, BusinessHoursConfig } from "./business_hours";
import { resolveWinningBranch } from "./condition_evaluator";
import { cyrb53 } from "@/lib/utils";

/**
 * Trigger point for all automations.
 * Fetches all active workflows for the given trigger type.
 */
export async function triggerWorkflows(workspaceId: string, triggerType: string, contactId: string) {
  const supabase = await createServerClient();
  
  const { data: workflows } = await supabase
    .from("workflows")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("trigger_type", triggerType)
    .eq("is_active", true);

  if (!workflows || workflows.length === 0) return;

  for (const workflow of workflows) {
    await startWorkflowExecution(workflow, contactId);
  }
}

/**
 * Initializes a new execution record (or queues it) using the atomic stored procedure.
 */
async function startWorkflowExecution(workflow: any, contactId: string) {
  const supabase = await createServerClient();

  // Call the atomic enrollment procedure
  const { data: executionId, error } = await supabase.rpc('enroll_contact_in_workflow', {
    p_workspace_id: workflow.workspace_id,
    p_workflow_id: workflow.id,
    p_contact_id: contactId
  });

  if (error) {
    console.error("[executor] Enrollment RPC Failed:", error);
    return;
  }

  // If executionId is returned, it means it started immediately (not queued)
  if (executionId) {
    await processNextStep(executionId);
  } else {
    console.log(`[executor] Workflow ${workflow.id} for contact ${contactId} was either queued or skipped due to rules.`);
  }
}

/**
 * Core loop: Fetches current step, executes it, and decides whether to continue.
 */
export async function processNextStep(executionId: string) {
  const supabase = await createServerClient();

  // 1. Fetch Execution & Current Step
  const { data: execution } = await supabase
    .from("workflow_executions")
    .select("*, workflow:workflows(*)")
    .eq("id", executionId)
    .single();

  if (!execution || execution.status !== 'running') return;

  // 1.5 Goal Check: Stop sequence if contact conversion goal is met
  const isGoalAchieved = await checkGoalAchieved(execution.workflow, execution.contact_id);
  if (isGoalAchieved) {
    await supabase.from("workflow_executions").update({ 
      status: 'completed', 
      completed_at: new Date().toISOString(),
      context: { ...execution.context, termination_reason: 'goal_achieved' }
    }).eq("id", executionId);
    
    console.log(`[executor] Termination: Contact ${execution.contact_id} met goal for workflow ${execution.workflow_id}`);
    return;
  }

  const currentStepId = execution.current_step_id;
  
  if (!currentStepId) {
    // If no current_step_id, the workflow is finished
    await supabase.from("workflow_executions").update({ 
      status: 'completed', 
      completed_at: new Date().toISOString() 
    }).eq("id", executionId);
    return;
  }

  const { data: step } = await supabase
    .from("workflow_steps")
    .select("*")
    .eq("id", currentStepId)
    .single();

  // If node doesn't exist, terminate
  if (!step) {
    await supabase.from("workflow_executions").update({ 
      status: 'completed', 
      completed_at: new Date().toISOString() 
    }).eq("id", executionId);
    return;
  }

  // ── LOGIC: Check if we are resuming from a business-hours hold ──────────────
  if (execution.context?.held_until) {
    const heldUntil = new Date(execution.context.held_until);
    const now = new Date();
    if (now < heldUntil) {
      return; // Not yet time
    }
    // Clear and proceed
    await supabase.from("workflow_executions").update({
      context: { ...execution.context, held_until: null }
    }).eq("id", executionId);
  }

  // ── LOGIC: Check if we are resuming from a wait ──────────────────────────────
  if (step.type === 'wait' && execution.context?.resume_at) {
    const resumeAt = new Date(execution.context.resume_at);
    const now = new Date();
    
    if (now >= resumeAt) {
      // Find next step via edges
      const { data: nextEdge } = await supabase
        .from('workflow_edges')
        .select('target_step_id')
        .eq('source_step_id', step.id)
        .limit(1)
        .single();

      await supabase.from("workflow_executions").update({
        current_step_id: nextEdge?.target_step_id || null, 
        status: nextEdge?.target_step_id ? 'running' : 'completed',
        completed_at: nextEdge?.target_step_id ? null : new Date().toISOString(),
        context: { ...execution.context, resume_at: null }
      }).eq("id", executionId);
      
      if (nextEdge?.target_step_id) {
        await processNextStep(executionId);
      }
      return;
    }
    return; // Still waiting
  }

  // 2. Create Step Log
  const { data: log } = await supabase
    .from("workflow_step_logs")
    .insert({
      execution_id: executionId,
      workspace_id: execution.workspace_id,
      step_id: step.id,
      status: 'running',
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  const logId: string | null = log?.id ?? null;
  const updateLog = (patch: Record<string, unknown>) =>
    logId ? supabase.from("workflow_step_logs").update(patch).eq("id", logId) : Promise.resolve();

  try {
    // ── BUSINESS HOURS CHECK (send_email / send_sms only) ────────────────────
    if (step.type === 'send_email' || step.type === 'send_sms') {
      const bhConfig: BusinessHoursConfig | null = step.business_hours ?? null;

      if (bhConfig?.enabled) {
        const { data: contactRow } = await supabase
          .from("contacts")
          .select("timezone")
          .eq("id", execution.contact_id)
          .single();

        const contactTimezone: string | null = contactRow?.timezone ?? null;

        if (!isWithinBusinessHours(bhConfig, contactTimezone)) {
          const nextOpen = nextWindowOpen(bhConfig, contactTimezone);
          
          await updateLog({
            status: 'held',
            completed_at: new Date().toISOString(),
            error_message: `Outside business hours. Scheduled for ${nextOpen.toISOString()}`
          });

          await supabase.from("workflow_executions").update({
            context: { ...execution.context, held_until: nextOpen.toISOString() }
          }).eq("id", executionId);

          return;
        }
      }
    }

    // ── EXECUTE ACTION ───────────────────────────────────────────────────────
    
    if (step.type === 'wait') {
      if (execution.context?.resume_at) return;

      const { delayValue = 1, delayUnit = 'minutes' } = step.config;
      const resumeAt = new Date();
      if (delayUnit === 'minutes') resumeAt.setMinutes(resumeAt.getMinutes() + Number(delayValue));
      else if (delayUnit === 'hours') resumeAt.setHours(resumeAt.getHours() + Number(delayValue));
      else if (delayUnit === 'days') resumeAt.setDate(resumeAt.getDate() + Number(delayValue));

      await supabase.from("workflow_executions").update({ 
        context: { ...execution.context, resume_at: resumeAt.toISOString() }
      }).eq("id", executionId);

      await updateLog({ status: 'completed', completed_at: new Date().toISOString() });
      return;
    }

    if (step.type === 'route') {
      const branches = step.config?.branches ?? [];
      
      const { data: contactData } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', execution.contact_id)
        .single();

      const contact = contactData ?? {};
      const winner = resolveWinningBranch(branches, contact);
      const chosenBranch = winner?.name ?? 'Default';

      console.log(`[executor] Route matched branch: ${chosenBranch} for contact ${execution.contact_id}`);
      
      await updateLog({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        metadata: { 
          chosen_branch: chosenBranch,
          evaluated_branches: branches.filter((b: any) => !b.is_default).length
        } 
      });

      // Find edge for this specific branch
      const { data: edge } = await supabase
        .from('workflow_edges')
        .select('target_step_id')
        .eq('source_step_id', step.id)
        .eq('source_handle', winner?.is_default ? 'default' : chosenBranch)
        .single();

      if (edge?.target_step_id) {
        await supabase.from("workflow_executions").update({ current_step_id: edge.target_step_id }).eq("id", executionId);
        await processNextStep(executionId);
      } else {
        await supabase.from("workflow_executions").update({ status: 'completed', completed_at: new Date().toISOString() }).eq("id", executionId);
      }
      return;
    }

    if (step.type === 'split') {
      const splitPercentage = step.config?.splitPercentage ?? 50;
      const winnerDeclared = step.config?.winner_declared ?? false;
      const winnerVariant = step.config?.winner_variant;

      let variant: 'A' | 'B';

      if (winnerDeclared && winnerVariant) {
        variant = winnerVariant as 'A' | 'B';
      } else {
        // Deterministic Splitting: Use cyrb53(contactId + stepId)
        const hash = cyrb53(`${execution.contact_id}${step.id}`);
        const normalizedHash = (hash % 100); // 0-99
        variant = normalizedHash < splitPercentage ? 'A' : 'B';
      }

      await updateLog({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        metadata: { 
          assigned_variant: variant,
          is_winner_path: winnerDeclared
        } 
      });

      // Find edge for this specific variant
      const { data: edge } = await supabase
        .from('workflow_edges')
        .select('target_step_id')
        .eq('source_step_id', step.id)
        .eq('source_handle', variant)
        .single();

      if (edge?.target_step_id) {
        await supabase.from("workflow_executions").update({ current_step_id: edge.target_step_id }).eq("id", executionId);
        await processNextStep(executionId);
      } else {
        await supabase.from("workflow_executions").update({ status: 'completed', completed_at: new Date().toISOString() }).eq("id", executionId);
      }
      return;
    }

    // Standard Actions
    const handler = (AutomationActions as any)[step.type];
    if (handler) {
      await handler(execution.workspace_id, execution.contact_id, step.config);
    }

    // ── PROGRESSION ──────────────────────────────────────────────────────────
    await updateLog({ status: 'completed', completed_at: new Date().toISOString() });

    const { data: nextEdge } = await supabase
      .from('workflow_edges')
      .select('target_step_id')
      .eq('source_step_id', step.id)
      .limit(1)
      .single();

    if (nextEdge?.target_step_id) {
      await supabase.from("workflow_executions").update({ current_step_id: nextEdge.target_step_id }).eq("id", executionId);
      await processNextStep(executionId);
    } else {
      await supabase.from("workflow_executions").update({ status: 'completed', completed_at: new Date().toISOString() }).eq("id", executionId);
    }

  } catch (err: any) {
    console.error(`[executor] Step failed (${step.type}):`, err);
    await updateLog({ status: 'failed', error_message: err.message, completed_at: new Date().toISOString() });

    await supabase.from("workflow_executions").update({ 
      status: 'failed', 
      error_message: `Step ${step?.type || 'unknown'} failed: ${err.message}` 
    }).eq("id", executionId);
  }
}

/**
 * Utility to check if a specific goal has been met by a contact.
 */
export async function checkGoalAchieved(workflow: any, contactId: string): Promise<boolean> {
  if (!workflow?.goal_event_type || workflow.goal_event_type === 'none') return false;

  const supabase = await createServerClient();

  switch (workflow.goal_event_type) {
    case 'appointment_booked':
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('contact_id', contactId)
        .limit(1);
      return (appointments?.length ?? 0) > 0;

    case 'invoice_paid':
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('contact_id', contactId)
        .eq('status', 'paid')
        .limit(1);
      return (invoices?.length ?? 0) > 0;

    default:
      return false;
  }
}
/**
 * Event-driven goal checker. 
 * Should be called whenever a "conversion" event happens in the system.
 * Terminates any active workflows for the contact that have this goal type.
 */
export async function checkActiveWorkflowGoals(workspaceId: string, contactId: string, eventType: string) {
  const supabase = await createServerClient();

  // Find all ACTIVE executions for this contact in this workspace that have this goal type
  const { data: executions } = await supabase
    .from("workflow_executions")
    .select(`
      *,
      workflow:workflows!inner(*)
    `)
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    .eq("status", "running")
    .eq("workflow.goal_event_type", eventType);

  if (!executions || executions.length === 0) return;

  for (const execution of executions) {
    // Terminate the workflow
    await supabase.from("workflow_executions").update({
      status: "completed",
      context: { 
        ...execution.context, 
        terminated_due_to_goal: true, 
        goal_type: eventType,
        terminated_at: new Date().toISOString()
      },
      completed_at: new Date().toISOString()
    }).eq("id", execution.id);

    // Log the termination in step logs for visibility
    await supabase.from("workflow_step_logs").insert({
      execution_id: execution.id,
      workspace_id: workspaceId,
      status: "skipped",
      error_message: `Workflow terminated: Goal '${eventType}' met.`,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    });
  }
}
