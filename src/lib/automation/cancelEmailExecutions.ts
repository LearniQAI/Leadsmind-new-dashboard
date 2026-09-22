import type { SupabaseClient } from '@supabase/supabase-js';
import { escapeLikePattern } from '@/lib/campaigns/emailSuppression';
import { SEQUENCE_SOURCE } from '@/lib/automation/sequenceConstants';

/**
 * Cancels every still-running workflow execution that would email this
 * address, in one workspace. Called when the address unsubscribes, so a
 * sequence (or any workflow with a send_email step) stops immediately rather
 * than waiting for its next email to hit the send-time suppression gate.
 * Workflows with no email step (SMS-only, tagging, etc.) are left running:
 * an email unsubscribe is not consent withdrawal for those.
 * Returns the number of executions cancelled. Uses the admin client.
 */
export async function cancelEmailExecutionsForEmail(
  supabase: SupabaseClient,
  workspaceId: string,
  email: string,
  reason = 'unsubscribed',
): Promise<number> {
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .ilike('email', escapeLikePattern(email.trim()));
  if (contactsError) throw new Error(`contact lookup failed: ${contactsError.message}`);
  const contactIds = (contacts ?? []).map((c: any) => c.id);
  if (contactIds.length === 0) return 0;

  const { data: running, error: runningError } = await supabase
    .from('workflow_executions')
    .select('id, workflow_id, current_step_id, context')
    .eq('workspace_id', workspaceId)
    .eq('status', 'running')
    .in('contact_id', contactIds);
  if (runningError) throw new Error(`execution lookup failed: ${runningError.message}`);
  if (!running || running.length === 0) return 0;

  const workflowIds = [...new Set(running.map((e: any) => e.workflow_id))];
  const [{ data: workflows, error: wfError }, { data: emailSteps, error: stepError }] = await Promise.all([
    supabase.from('workflows').select('id, source').in('id', workflowIds),
    supabase.from('workflow_steps').select('id, workflow_id').in('workflow_id', workflowIds).eq('type', 'send_email'),
  ]);
  if (wfError || stepError) throw new Error('workflow lookup failed');

  const emailing = new Set<string>([
    ...(workflows ?? []).filter((w: any) => w.source === SEQUENCE_SOURCE).map((w: any) => w.id),
    ...(emailSteps ?? []).map((s: any) => s.workflow_id),
  ]);

  // workflow_step_logs.step_id is NOT NULL: log against the step the run was on,
  // else any email step of its workflow.
  const anyEmailStep = new Map<string, string>();
  for (const s of (emailSteps ?? []) as any[]) if (!anyEmailStep.has(s.workflow_id)) anyEmailStep.set(s.workflow_id, s.id);

  const now = new Date().toISOString();
  let cancelled = 0;
  for (const exec of running.filter((e: any) => emailing.has(e.workflow_id))) {
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
    const stepId = exec.current_step_id ?? anyEmailStep.get(exec.workflow_id);
    if (stepId) {
      // Best-effort audit row: the cancellation above is what matters.
      await supabase.from('workflow_step_logs').insert({
        execution_id: exec.id,
        workspace_id: workspaceId,
        step_id: stepId,
        status: 'skipped',
        error_message: `Cancelled: contact ${reason}.`,
        started_at: now,
        completed_at: now,
      });
    }
    cancelled++;
  }
  return cancelled;
}
