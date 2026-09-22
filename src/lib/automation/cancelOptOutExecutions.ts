import type { SupabaseClient } from '@supabase/supabase-js';

// Executor step types that send an SMS or WhatsApp message. Opt-out is unified across the two
// channels (migration 20260823000002), so a STOP ends runs that would use either.
export const SMS_STEP_TYPES = ['send_sms', 'send_whatsapp', 'send_whatsapp_template', 'send_whatsapp_voice'];

const CHUNK = 100;

/**
 * Cancels every still-running workflow execution, for the given contacts, whose workflow has an
 * SMS/WhatsApp step. Called when a STOP is received, so the run stops immediately instead of only
 * skipping each SMS step later at send time (the send-time gate in sendSMS is the backstop).
 * Runs with no SMS step (email-only sequences, tagging, ...) are left alone: a STOP is not an
 * email unsubscribe. `workspaceId` may be null for a STOP to a platform-level number, in which
 * case the contact ids alone scope the lookup. Uses the admin client.
 * Returns the number of executions cancelled.
 */
export async function cancelSmsExecutionsForContacts(
  supabase: SupabaseClient,
  workspaceId: string | null,
  contactIds: string[],
  reason = 'sms_opt_out',
  logMessage = 'Cancelled: contact replied STOP (SMS/WhatsApp opt-out).',
): Promise<number> {
  if (contactIds.length === 0) return 0;

  const running: any[] = [];
  for (let i = 0; i < contactIds.length; i += CHUNK) {
    let q = supabase
      .from('workflow_executions')
      .select('id, workspace_id, workflow_id, current_step_id, context')
      .eq('status', 'running')
      .in('contact_id', contactIds.slice(i, i + CHUNK));
    if (workspaceId) q = q.eq('workspace_id', workspaceId);
    const { data, error } = await q;
    if (error) throw new Error(`execution lookup failed: ${error.message}`);
    running.push(...(data ?? []));
  }
  if (running.length === 0) return 0;

  const workflowIds = [...new Set(running.map((e) => e.workflow_id))];
  const { data: smsSteps, error: stepError } = await supabase
    .from('workflow_steps')
    .select('id, workflow_id')
    .in('workflow_id', workflowIds)
    .in('type', SMS_STEP_TYPES);
  if (stepError) throw new Error(`workflow step lookup failed: ${stepError.message}`);

  // workflow_step_logs.step_id is NOT NULL: log against the step the run was on, else an SMS step.
  const smsStepOf = new Map<string, string>();
  for (const s of (smsSteps ?? []) as any[]) if (!smsStepOf.has(s.workflow_id)) smsStepOf.set(s.workflow_id, s.id);

  const now = new Date().toISOString();
  let cancelled = 0;
  for (const exec of running.filter((e) => smsStepOf.has(e.workflow_id))) {
    const { error } = await supabase
      .from('workflow_executions')
      .update({
        status: 'cancelled',
        completed_at: now,
        context: { ...(exec.context ?? {}), termination_reason: reason, resume_at: null, held_until: null },
      })
      .eq('id', exec.id)
      .eq('status', 'running');
    if (error) throw new Error(`execution cancel failed: ${error.message}`);

    const stepId = exec.current_step_id ?? smsStepOf.get(exec.workflow_id);
    if (stepId) {
      // Best-effort audit row: the cancellation above is what matters.
      await supabase.from('workflow_step_logs').insert({
        execution_id: exec.id,
        workspace_id: exec.workspace_id,
        step_id: stepId,
        status: 'skipped',
        error_message: logMessage,
        started_at: now,
        completed_at: now,
      });
    }
    cancelled++;
  }
  return cancelled;
}
