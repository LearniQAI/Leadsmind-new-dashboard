'use server';

// Simplified "Email Sequence" builder on top of Engine A (the same
// workflows/workflow_steps/workflow_edges/workflow_executions tables and
// executor.ts the generic Workflow Builder uses). This file intentionally
// contains no parallel schema or executor -- it only curates a narrower
// trigger list, shapes a "subject/body + wait between" step list into the
// same EditorStepInput[] saveWorkflowEditor already accepts, and marks the
// resulting workflow row with source='email_sequence' so the sequences list
// can find its own workflows. Everything else (save/load/execute) is 100%
// shared with /automations/[id]/edit.

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, requireWorkspaceAccess } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { saveWorkflowEditor, getWorkflowForEdit, type EditorStepInput } from './automation_editor';
import { SEQUENCE_SOURCE } from '@/lib/automation/sequenceConstants';

export interface SequenceEmailStep {
  subject: string;
  body: string;
  isHtml?: boolean;
  // Wait before this email fires, relative to the previous one. Ignored for
  // the first email in the sequence (fires immediately on trigger).
  delayValue: number;
  delayUnit: 'minutes' | 'hours' | 'days';
}

export interface SavesequencePayload {
  id: string;
  name: string;
  trigger_type: string;
  is_active: boolean;
  emails: SequenceEmailStep[];
}

export async function listSequences() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false as const, error: 'No active workspace' };
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('workflows')
    .select('*, workflow_steps(count)')
    .eq('workspace_id', workspaceId)
    .eq('source', SEQUENCE_SOURCE)
    .order('created_at', { ascending: false });

  if (error) return { success: false as const, error: 'Failed to load sequences' };

  const withStats = await Promise.all(
    (data || []).map(async (wf: any) => {
      const { data: statusCounts } = await supabase
        .from('workflow_executions')
        .select('status')
        .eq('workflow_id', wf.id);
      const stats = { running: 0, completed: 0, failed: 0 };
      for (const row of statusCounts || []) {
        if (row.status === 'running') stats.running++;
        else if (row.status === 'completed') stats.completed++;
        else if (row.status === 'failed') stats.failed++;
      }
      return { ...wf, stats };
    })
  );

  return { success: true as const, data: withStats };
}

export async function createSequenceDraft() {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('workflows')
    .insert({
      workspace_id: workspaceId,
      name: 'Untitled sequence',
      trigger_type: 'contact_created',
      trigger_config: {},
      is_active: false,
      source: SEQUENCE_SOURCE,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error('Failed to create sequence');
  redirect(`/sequences/${data.id}/edit`);
}

// Loads a workflow for the sequence editor. Refuses to hand a non-sequence
// (or a sequence with steps this editor can't round-trip, e.g. one hand-built
// with route/split/other-action steps in the main Workflow Builder) to the
// simplified UI -- send those to the full editor instead so their steps
// aren't silently dropped by the sequence editor's send_email/wait-only view.
export async function getSequenceForEdit(id: string) {
  const result = await getWorkflowForEdit(id);
  if (!result.success) return { success: false as const, error: result.error, notSequence: false as const };

  const workflow = result.data;
  if (workflow.source !== SEQUENCE_SOURCE) {
    return { success: false as const, error: 'Not an email sequence', notSequence: true as const };
  }

  const steps = workflow.workflow_steps || [];
  const isSimpleAlternating = steps.every((s: any, i: number) =>
    i % 2 === 0 ? s.type === 'send_email' : s.type === 'wait'
  );
  if (!isSimpleAlternating) {
    return { success: false as const, error: 'This sequence has steps that were edited outside the simplified builder', notSequence: true as const };
  }

  const emails: SequenceEmailStep[] = [];
  for (let i = 0; i < steps.length; i += 2) {
    const emailStep = steps[i];
    const waitStep = steps[i + 1];
    emails.push({
      subject: emailStep.config?.subject || '',
      body: emailStep.config?.body || '',
      isHtml: !!emailStep.config?.isHtml,
      delayValue: waitStep?.config?.delayValue ?? 1,
      delayUnit: waitStep?.config?.delayUnit ?? 'days',
    });
  }

  return {
    success: true as const,
    data: { id: workflow.id, name: workflow.name, trigger_type: workflow.trigger_type, is_active: workflow.is_active, emails },
  };
}

// Shapes the sequence's flat email list into alternating send_email/wait
// EditorStepInput rows and hands off to saveWorkflowEditor -- the exact same
// save path /automations/[id]/edit uses, so a sequence writes indistinguishable
// workflow_steps/workflow_edges rows and is editable there too.
export async function saveSequence(payload: SavesequencePayload) {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  const { data: owned } = await supabase.from('workflows').select('id, source').eq('id', payload.id).eq('workspace_id', workspaceId).maybeSingle();
  if (!owned) return { success: false as const, error: 'Sequence not found' };
  if (owned.source !== SEQUENCE_SOURCE) return { success: false as const, error: 'Not an email sequence' };

  if (payload.emails.length === 0) return { success: false as const, error: 'Add at least one email' };

  const steps: EditorStepInput[] = [];
  let position = 1;
  payload.emails.forEach((email, idx) => {
    if (idx > 0) {
      steps.push({
        position: position++,
        type: 'wait',
        config: { delayValue: email.delayValue, delayUnit: email.delayUnit },
      });
    }
    steps.push({
      position: position++,
      type: 'send_email',
      config: { subject: email.subject, body: email.body, isHtml: !!email.isHtml },
    });
  });

  const result = await saveWorkflowEditor({
    id: payload.id,
    name: payload.name,
    trigger_type: payload.trigger_type,
    is_active: payload.is_active,
    steps,
  });
  if (!result.success) return result;

  revalidatePath('/sequences');
  revalidatePath(`/sequences/${payload.id}/edit`);
  return { success: true as const };
}

export async function toggleSequenceActive(id: string, isActive: boolean) {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from('workflows')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .eq('source', SEQUENCE_SOURCE);
  if (error) return { success: false as const, error: 'Failed to update sequence' };
  revalidatePath('/sequences');
  return { success: true as const };
}

export async function deleteSequence(id: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from('workflows')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .eq('source', SEQUENCE_SOURCE);
  if (error) return { success: false as const, error: 'Failed to delete sequence' };
  revalidatePath('/sequences');
  return { success: true as const };
}
