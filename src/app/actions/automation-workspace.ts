'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { insertSequentialEdge } from './automation_editor';

export async function getAutomationDashboardData() {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };

  // Fetch workflows
  const { data: workflows } = await supabase
    .from('workflows')
    .select('*, workflow_steps(*)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  // Per-workflow execution counts — `workflows.execution_count` isn't a real
  // column, so each card's count is derived here by grouping
  // workflow_executions rows (workflow_id only, no row limit) client-side.
  // A single lightweight fetch, consistent with this function's existing
  // pattern of separate targeted queries rather than one large join.
  const { data: executionCountRows } = await supabase
    .from('workflow_executions')
    .select('workflow_id')
    .eq('workspace_id', workspaceId);

  const executionCountsByWorkflow: Record<string, number> = {};
  for (const row of executionCountRows || []) {
    executionCountsByWorkflow[row.workflow_id] = (executionCountsByWorkflow[row.workflow_id] || 0) + 1;
  }

  const workflowsWithCounts = (workflows || []).map((w: any) => ({
    ...w,
    execution_count: executionCountsByWorkflow[w.id] || 0
  }));

  // Fetch recent executions
  const { data: executions } = await supabase
    .from('workflow_executions')
    .select('*, workflows(name, trigger_type)')
    .eq('workspace_id', workspaceId)
    .order('started_at', { ascending: false })
    .limit(10);

  // Fetch failed executions
  const { data: failures } = await supabase
    .from('workflow_executions')
    .select('*, workflows!inner(name, workspace_id)')
    .eq('workspace_id', workspaceId)
    .eq('status', 'failed');

  // Real total-execution count, backing the "Total Executions" KPI —
  // `workflows.execution_count` does not exist as a column; the count must
  // come from the workflow_executions table itself.
  const { count: totalExecutions } = await supabase
    .from('workflow_executions')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);

  return {
    success: true,
    data: {
      workflows: workflowsWithCounts,
      executions: executions || [],
      failures: failures || [],
      totalExecutions: totalExecutions || 0
    }
  };
}

export async function toggleWorkflowActive(workflowId: string, currentState: boolean) {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) throw new Error('No active workspace');

  await supabase
    .from('workflows')
    .update({ is_active: !currentState })
    .eq('id', workflowId)
    .eq('workspace_id', workspaceId);

  revalidatePath('/automation');
  return { success: true };
}

export async function deleteWorkflow(workflowId: string) {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) throw new Error('No active workspace');

  await supabase
    .from('workflows')
    .delete()
    .eq('id', workflowId)
    .eq('workspace_id', workspaceId);

  revalidatePath('/automation');
  return { success: true };
}

// Dismisses a failed execution from the dead letter queue without pretending it succeeded
// (status stays distinguishable from 'completed') — the executor only ever writes
// running/completed/failed, so 'resolved' only ever gets set here, by a human acknowledging
// a failure they've dealt with outside the workflow itself.
export async function resolveExecution(executionId: string) {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) throw new Error('No active workspace');

  const { error } = await supabase
    .from('workflow_executions')
    .update({ status: 'resolved' })
    .eq('id', executionId)
    .eq('workspace_id', workspaceId)
    .eq('status', 'failed');

  if (error) throw error;

  revalidatePath('/automation/history');
  revalidatePath('/automation');
  return { success: true };
}

export async function seedSARecipes() {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };

  // NOTE: "Invoice Overdue Chase" and "SARS Tax Calendar Reminders" recipes
  // were removed from this seed. Both used trigger_type values
  // ('invoice_overdue', 'sars_tax_reminder') that no engine has ever
  // published — they are calendar/deadline-based conditions, not discrete
  // events, and nothing in the codebase computes "invoice went overdue" or
  // "N days before SARS deadline" as a trigger. Reintroducing them needs a
  // real cron/scheduler to compute and publish those events; that's new
  // infrastructure, out of scope for this pass. The seed previously
  // inserted these as is_active: true, meaning they looked live in the UI
  // but could never fire.

  // A. LMS Course Recoveries — trigger fixed to match the real EventBus
  // event ('quiz_failed'); the seed previously used 'lms_quiz_failed',
  // which was never published anywhere.
  const { data: quizExists } = await supabase
    .from('workflows')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('name', 'LMS Course Recoveries')
    .maybeSingle();

  if (!quizExists) {
    const { data: wf } = await supabase
      .from('workflows')
      .insert({
        workspace_id: workspaceId,
        name: 'LMS Course Recoveries',
        description: 'Triggered immediately when quiz scores fall short.',
        trigger_type: 'quiz_failed',
        trigger_config: {},
        is_active: true,
        goal_rules: [{ field: 'passed_quiz', operator: 'equals', value: true }]
      })
      .select('id')
      .single();

    if (wf) {
      const { data: insertedSteps } = await supabase.from('workflow_steps').insert([
        {
          workflow_id: wf.id,
          workspace_id: workspaceId,
          position: 1,
          type: 'send_email',
          config: {
            templateType: 'recovery',
            subject: 'Quiz Recovery: Keep going, {{first_name}}!',
            body: 'Hi {{first_name}}, we noticed you fell short on the recent quiz. Don\'t worry! Here is a link to review the material and try again: {{recovery_link}}',
            backup_whatsapp_body: 'Hi {{first_name}}, we noticed you fell short on the recent quiz. You can review the material and try again here: {{recovery_link}}'
          }
        },
        {
          workflow_id: wf.id,
          workspace_id: workspaceId,
          position: 2,
          type: 'create_task',
          config: {
            title: 'Tutor Check-in: {{first_name}}',
            description: 'Follow up with student who failed the recent quiz.',
            priority: 'normal'
          }
        }
      ]).select('id, position');

      // Steps alone aren't enough to progress past the first one -- executor.ts's
      // step-to-step lookup only follows workflow_edges, with no position-based
      // fallback (confirmed live: without this, step 2 above never ran). Same
      // helper the real editor's save path uses for a plain step sequence.
      const ordered = (insertedSteps || []).sort((a: any, b: any) => a.position - b.position);
      for (let i = 0; i < ordered.length - 1; i++) {
        await insertSequentialEdge(supabase, workspaceId, wf.id, ordered[i].id, ordered[i + 1].id);
      }
    }
  }

  revalidatePath('/automation');
  return { success: true };
}

