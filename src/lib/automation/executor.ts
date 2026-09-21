// This module is a system-triggered automation engine (invoked from portal
// actions, LMS event triggers, webhooks, staff actions, etc.) — never a
// direct end-user data surface. Callers are responsible for their own
// authorization checks before calling in (see e.g. projects.ts's ownership
// check ahead of triggerWorkflows). It therefore always uses the admin
// client, matching the same pattern as WorkflowEngine.ts/AutomationLogger.ts.
// Using the session-bound client here would silently break under RLS for
// any caller without a Supabase Auth session — which includes client-portal
// sessions (getPortalSession()) and LMS/event-bus triggers, both real
// callers of this module.
import { createAdminClient } from "@/lib/supabase/server";
import { AutomationActions } from "./actions_registry";
import { isWithinBusinessHours, nextWindowOpen, BusinessHoursConfig } from "./business_hours";
import { resolveWinningBranch } from "./condition_evaluator";
import { cyrb53 } from "@/lib/utils";
import { logger } from "@/shared/logger";
import { userSafeMessage } from "@/shared/errors/userSafe";
import { SEQUENCE_SOURCE } from "./sequenceConstants";
import { matchesTriggerConfig } from "./triggerFilter";
import { EmailSuppressedError, isPermanentEmailError } from "./automationEmail";
import { randomUUID } from "crypto";
import { checkEmailSuppression } from "@/lib/campaigns/emailSuppression";

// Logging is observability, not business logic — a broken log transport
// (e.g. pino's worker-thread transport dying) must never be able to abort
// step execution or, worse, escape the catch block that's supposed to be
// the safety net for a failed step. Every logger call on this critical
// path goes through this instead of calling `logger` directly.
function safeLog(fn: () => void) {
 try { fn(); } catch { /* logging failure must not affect execution */ }
}

/**
 * Trigger point for all automations.
 * Fetches all active workflows for the given trigger type.
 */
export async function triggerWorkflows(workspaceId: string, triggerType: string, contactId: string, payload: Record<string, any> = {}) {
 const supabase = createAdminClient();

 const { data: workflows } = await supabase
  .from("workflows")
  .select("*")
  .eq("workspace_id", workspaceId)
  .eq("trigger_type", triggerType)
  .eq("is_active", true);

 if (!workflows || workflows.length === 0) return;

 for (const workflow of workflows) {
  const isSequence = workflow.source === SEQUENCE_SOURCE;

  // The trigger's configured tag/course/funnel must match THIS event; the
  // trigger type alone is not enough (otherwise "Tag added" fires for any tag).
  if (!matchesTriggerConfig(triggerType, workflow.trigger_config, payload, { requireFilter: isSequence })) continue;

  // A sequence is email-only, so a contact who can't be emailed is never
  // enrolled. (Generic workflows can have non-email steps, so they enroll
  // and the send_email step gates itself.) Fail closed on lookup errors.
  if (isSequence) {
   try {
    const { data: contact } = await supabase
     .from("contacts")
     .select("id, email, is_invalid_email")
     .eq("id", contactId)
     .eq("workspace_id", workspaceId)
     .maybeSingle();
    const blocked = contact ? await checkEmailSuppression(supabase as any, workspaceId, contact) : 'no_email';
    if (blocked) {
     await supabase.from("workflow_executions").insert({
      workspace_id: workspaceId,
      workflow_id: workflow.id,
      contact_id: contactId,
      status: 'skipped_suppressed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      error_message: `Declined: contact cannot be emailed (${blocked})`,
     });
     continue;
    }
   } catch (err) {
    safeLog(() => logger.error({ err, workflowId: workflow.id, contactId }, "executor.enrollment_suppression_check.failed"));
    continue;
   }
  }

  await startWorkflowExecution(workflow, contactId);
 }
}

/**
 * Initializes a new execution record (or queues it) using the atomic stored procedure.
 */
async function startWorkflowExecution(workflow: any, contactId: string) {
 const supabase = createAdminClient();

 // Call the atomic enrollment procedure
 const { data: executionId, error } = await supabase.rpc('enroll_contact_in_workflow', {
  p_workspace_id: workflow.workspace_id,
  p_workflow_id: workflow.id,
  p_contact_id: contactId
 });

 if (error) {
  safeLog(() => logger.error({ err: error }, "executor.enrollment_rpc.failed"));
  return;
 }

 // If executionId is returned, it means it started immediately (not queued)
 if (executionId) {
  await processNextStep(executionId);
 } else {
  safeLog(() => logger.info({ workflowId: workflow.id, contactId }, "executor.workflow.queued_or_skipped"));
 }
}

// Hard ceiling on synchronous step chaining within a single invocation. Workflow
// graphs are user-editable (workflow_edges), so a misconfigured or malicious
// edge cycle (e.g. a stage-change automation that moves the deal back to a
// stage that re-triggers the same workflow) would otherwise recurse forever
// inside one serverless invocation until it crashes on stack/time limits.
const MAX_WORKFLOW_STEP_DEPTH = 15;

// Per-step retry budget for a transiently failing email, and the backoff before each retry
// (minutes, indexed by failures so far). Same shape as the campaign queues' retry policy.
const MAX_EMAIL_STEP_ATTEMPTS = 3;
const emailRetryBackoffMinutes = (failures: number) => Math.pow(4, failures) * 15 / 4; // 15m, 60m

/**
 * Entry point for running an execution. Claims it first (acquire_workflow_executions:
 * FOR UPDATE SKIP LOCKED, stale locks reclaimed), so two overlapping callers -- two cron
 * runs, or a cron run and the request that just enrolled the contact -- can never both run
 * the same step. A caller that loses the claim just returns. Internal chained steps
 * (depth > 0) run under the claim already held by the top-level call.
 */
export async function processNextStep(executionId: string, depth = 0) {
 if (depth > 0) return runStep(executionId, depth);

 const supabase = createAdminClient();
 const workerId = `wf_${randomUUID()}`;
 const { data: claimed, error } = await supabase.rpc('acquire_workflow_executions', {
  worker_id: workerId,
  batch_size: 1,
  target_execution_id: executionId,
 });
 if (error) {
  safeLog(() => logger.error({ err: error, executionId }, 'executor.claim.failed'));
  return;
 }
 if (!claimed || claimed.length === 0) {
  safeLog(() => logger.info({ executionId }, 'executor.claim.not_acquired'));
  return;
 }
 await runClaimedExecution(executionId, workerId);
}

/** Runs an execution the caller has ALREADY claimed for `workerId`, then releases the lock. */
export async function runClaimedExecution(executionId: string, workerId: string) {
 const supabase = createAdminClient();
 try {
  await runStep(executionId, 0);
 } finally {
  // Release only our own lock: if it went stale and another worker reclaimed it, leave theirs.
  await supabase.from('workflow_executions')
   .update({ locked_at: null, locked_by: null })
   .eq('id', executionId)
   .eq('locked_by', workerId);
 }
}

// Moves an execution to the step after `step` (or completes it), then keeps going.
async function advanceFrom(step: any, executionId: string, depth: number, contextPatch: Record<string, unknown> = {}, execution?: any) {
 const supabase = createAdminClient();
 const { data: nextEdge } = await supabase
  .from('workflow_edges')
  .select('target_step_id')
  .eq('source_step_id', step.id)
  .limit(1)
  .single();
 const context = { ...(execution?.context ?? {}), ...contextPatch };
 if (nextEdge?.target_step_id) {
  await supabase.from("workflow_executions").update({ current_step_id: nextEdge.target_step_id, next_attempt_at: null, context }).eq("id", executionId);
  await processNextStep(executionId, depth + 1);
 } else {
  await supabase.from("workflow_executions").update({ status: 'completed', completed_at: new Date().toISOString(), context }).eq("id", executionId);
 }
}

/**
 * Core loop: Fetches current step, executes it, and decides whether to continue.
 */
async function runStep(executionId: string, depth = 0) {
 const supabase = createAdminClient();

 if (depth > MAX_WORKFLOW_STEP_DEPTH) {
  safeLog(() => logger.error({ executionId, depth }, 'executor.loop_protection.triggered'));
  await supabase.from('workflow_executions').update({
   status: 'failed',
   error_message: `Loop protection triggered: workflow exceeded ${MAX_WORKFLOW_STEP_DEPTH} chained steps in a single run.`,
  }).eq('id', executionId);
  return;
 }

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
  
  safeLog(() => logger.info({ contactId: execution.contact_id, workflowId: execution.workflow_id }, "executor.termination.goal_met"));
  return;
 }

 // A step that failed transiently is retried only once its backoff has elapsed.
 if (execution.next_attempt_at && new Date(execution.next_attempt_at) > new Date()) return;

 const currentStepId = execution.current_step_id;

 // A RUNNING execution always has a position (a finished one is marked completed at the
 // moment it runs out of steps). Reaching here without one means its step was lost --
 // that used to be reported as a normal "completed"; it is an error and must say so.
 if (!currentStepId) {
  await supabase.from("workflow_executions").update({
   status: 'failed',
   completed_at: new Date().toISOString(),
   error_message: 'Run lost its position in the workflow (its step no longer exists).',
  }).eq("id", executionId);
  return;
 }

 const { data: step, error: stepError } = await supabase
  .from("workflow_steps")
  .select("*")
  .eq("id", currentStepId)
  .maybeSingle();

 if (stepError) {
  // Transient lookup failure, not a missing step: leave the run as-is; the sweep retries it.
  safeLog(() => logger.error({ err: stepError, executionId }, 'executor.step_lookup.failed'));
  return;
 }
 if (!step) {
  await supabase.from("workflow_executions").update({
   status: 'failed',
   completed_at: new Date().toISOString(),
   error_message: 'The step this run was on no longer exists (the workflow was edited).',
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
    await processNextStep(executionId, depth + 1);
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

 // Failure bookkeeping for send_email retries (see the catch block).
 let priorFailures = 0;
 let handlerDone = false;

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

   safeLog(() => logger.info({ chosenBranch, contactId: execution.contact_id }, "executor.route.branch_matched"));
   
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
    await processNextStep(executionId, depth + 1);
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
    await processNextStep(executionId, depth + 1);
   } else {
    await supabase.from("workflow_executions").update({ status: 'completed', completed_at: new Date().toISOString() }).eq("id", executionId);
   }
   return;
  }

  // Standard Actions
  const handler = (AutomationActions as any)[step.type];
  if (!handler) {
   // Was previously `if (handler) { await handler(...) }` -- a step type
   // with no registered action silently did nothing, then fell through to
   // the same "completed" progression logic below as a real successful
   // step, with no error anywhere. Same "reports success while doing
   // nothing" failure mode already fixed for apply_tag/create_opportunity/
   // etc. -- fail loudly instead, caught by the try/catch below and logged
   // as a real failed step, same as any other action throwing.
   throw new Error(`Unknown action type '${step.type}' — no handler registered in AutomationActions`);
  }
  let suppressedReason: string | null = null;
  try {
   // Earlier logged failures of THIS step for THIS run: a genuine retry sends under a new
   // idempotency key, while a crash-redelivery (nothing logged) reuses the old one.
   if (step.type === 'send_email') {
    const { count } = await supabase
     .from('workflow_step_logs')
     .select('id', { count: 'exact', head: true })
     .eq('execution_id', executionId)
     .eq('step_id', step.id)
     .eq('status', 'failed');
    priorFailures = count ?? 0;
   }
   await handler(execution.workspace_id, execution.contact_id, step.config, {
    workflowId: execution.workflow_id,
    executionId,
    stepId: step.id,
    attempt: priorFailures,
   });
   handlerDone = true;
  } catch (handlerErr) {
   if (!(handlerErr instanceof EmailSuppressedError)) throw handlerErr;
   if (execution.workflow?.source === SEQUENCE_SOURCE) {
    // Unsubscribed/bounced mid-sequence: stop the whole run, no further emails.
    await updateLog({ status: 'skipped', error_message: handlerErr.message, completed_at: new Date().toISOString() });
    await supabase.from("workflow_executions").update({
     status: 'cancelled',
     completed_at: new Date().toISOString(),
     context: { ...execution.context, termination_reason: `email_${handlerErr.reason}` },
    }).eq("id", executionId);
    return;
   }
   // Generic workflow: skip only this email step; its other steps still run.
   suppressedReason = handlerErr.message;
  }

  // ── PROGRESSION ──────────────────────────────────────────────────────────
  await updateLog(suppressedReason
   ? { status: 'skipped', error_message: suppressedReason, completed_at: new Date().toISOString() }
   : { status: 'completed', completed_at: new Date().toISOString() });

  const { data: nextEdge } = await supabase
   .from('workflow_edges')
   .select('target_step_id')
   .eq('source_step_id', step.id)
   .limit(1)
   .single();

  if (nextEdge?.target_step_id) {
   await supabase.from("workflow_executions").update({ current_step_id: nextEdge.target_step_id }).eq("id", executionId);
   await processNextStep(executionId, depth + 1);
  } else {
   await supabase.from("workflow_executions").update({ status: 'completed', completed_at: new Date().toISOString() }).eq("id", executionId);
  }

 } catch (err: any) {
  safeLog(() => logger.error({ err, stepType: step.type }, "executor.step.failed"));
  // Full error is logged above. error_message is stored and rendered to workspace
  // members (ExecutionLogs), so only a user-safe message may be persisted.
  const safeMessage = userSafeMessage(err, 'The step failed unexpectedly.');
  await updateLog({ status: 'failed', error_message: safeMessage, completed_at: new Date().toISOString() });

  // A failed email SEND (not a failed progression after a successful send, which must never
  // be re-sent) no longer kills the whole run:
  //  * transient failure  -> retry this step after a backoff, up to MAX_EMAIL_STEP_ATTEMPTS;
  //  * permanent / out of attempts -> in a sequence, give up on THIS email only and carry on
  //    with the rest (recorded on the run, not hidden); generic workflows keep fail-stop.
  if (step.type === 'send_email' && !handlerDone) {
   const failures = priorFailures + 1;
   if (!isPermanentEmailError(err) && failures < MAX_EMAIL_STEP_ATTEMPTS) {
    const retryAt = new Date(Date.now() + emailRetryBackoffMinutes(failures) * 60_000);
    await supabase.from("workflow_executions").update({
     next_attempt_at: retryAt.toISOString(),
     error_message: `Email step failed (attempt ${failures} of ${MAX_EMAIL_STEP_ATTEMPTS}), will retry: ${safeMessage}`,
    }).eq("id", executionId);
    return;
   }
   if (execution.workflow?.source === SEQUENCE_SOURCE) {
    const failedSteps = [
     ...(execution.context?.failed_steps ?? []),
     { step_id: step.id, error: safeMessage, attempts: failures, at: new Date().toISOString() },
    ];
    // error_message stays on the run so it is not reported as a clean success.
    await supabase.from("workflow_executions").update({
     error_message: `${failedSteps.length} email(s) could not be sent and were skipped. Last: ${safeMessage}`,
    }).eq("id", executionId);
    await advanceFrom(step, executionId, depth, { failed_steps: failedSteps }, execution);
    return;
   }
  }

  await supabase.from("workflow_executions").update({
   status: 'failed',
   error_message: `Step ${step?.type || 'unknown'} failed: ${safeMessage}`
  }).eq("id", executionId);
 }
}

/**
 * Utility to check if a specific goal has been met by a contact.
 */
export async function checkGoalAchieved(workflow: any, contactId: string): Promise<boolean> {
 if (!workflow?.goal_event_type || workflow.goal_event_type === 'none') return false;

 const supabase = createAdminClient();

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
 const supabase = createAdminClient();

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

  // Log the termination in step logs for visibility. workflow_step_logs.step_id is
  // NOT NULL, so the row must name a step: the one the run was on, else the workflow's
  // first step. (It was previously inserted with no step_id, so the insert was rejected
  // and -- the error being ignored -- the audit row silently never existed.)
  let stepId: string | null = execution.current_step_id ?? null;
  if (!stepId) {
   const { data: first } = await supabase
    .from("workflow_steps")
    .select("id")
    .eq("workflow_id", execution.workflow_id)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();
   stepId = first?.id ?? null;
  }
  if (!stepId) {
   safeLog(() => logger.warn({ executionId: execution.id }, "executor.goal_termination.no_step_to_log_against"));
   continue;
  }
  const { error: logError } = await supabase.from("workflow_step_logs").insert({
   execution_id: execution.id,
   workspace_id: workspaceId,
   step_id: stepId,
   status: "skipped",
   error_message: `Workflow terminated: Goal '${eventType}' met.`,
   started_at: new Date().toISOString(),
   completed_at: new Date().toISOString()
  });
  if (logError) safeLog(() => logger.error({ err: logError, executionId: execution.id }, "executor.goal_termination.log_insert.failed"));
 }
}
