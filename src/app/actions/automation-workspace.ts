'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

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

  // Fetch recent executions
  const { data: executions } = await supabase
    .from('workflow_executions')
    .select('*, workflows(name)')
    .eq('workspace_id', workspaceId)
    .order('started_at', { ascending: false })
    .limit(10);

  // Fetch failed executions
  const { data: failures } = await supabase
    .from('workflow_executions')
    .select('*, workflows!inner(name, workspace_id)')
    .eq('workspace_id', workspaceId)
    .eq('status', 'failed');

  return { 
    success: true, 
    data: { 
      workflows: workflows || [],
      executions: executions || [],
      failures: failures || []
    } 
  };
}

export async function toggleWorkflowActive(workflowId: string, currentState: boolean) {
  const supabase = await createServerClient();
  await supabase.from('workflows').update({ is_active: !currentState }).eq('id', workflowId);
  revalidatePath('/automation');
  return { success: true };
}

export async function deleteWorkflow(workflowId: string) {
  const supabase = await createServerClient();
  await supabase.from('workflows').delete().eq('id', workflowId);
  revalidatePath('/automation');
  return { success: true };
}

export async function seedSARecipes() {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };

  // A. Invoice Overdue Chase
  const { data: overdueExists } = await supabase
    .from('workflows')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('name', 'Invoice Overdue Chase')
    .maybeSingle();

  if (!overdueExists) {
    const { data: wf } = await supabase
      .from('workflows')
      .insert({
        workspace_id: workspaceId,
        name: 'Invoice Overdue Chase',
        description: 'Polite cross-channel notifications transitioning to structured collection tasks.',
        trigger_type: 'invoice_overdue',
        trigger_config: {},
        is_active: true,
        goal_rules: [{ field: 'invoice_paid', operator: 'equals', value: true }]
      })
      .select('id')
      .single();

    if (wf) {
      await supabase.from('workflow_steps').insert([
        { workflow_id: wf.id, workspace_id: workspaceId, position: 1, type: 'wait', config: { delaySeconds: 86400 } },
        {
          workflow_id: wf.id,
          workspace_id: workspaceId,
          position: 2,
          type: 'send_email',
          config: {
            templateType: 'custom_followup',
            subject: 'Overdue Reminder: Invoice ZAR {{invoice_amount_zar}}',
            body: 'Hi {{first_name}}, this is a friendly reminder that invoice {{invoice_number}} for ZAR {{invoice_amount_zar}} is currently overdue. Let us know if you need any assistance.',
            backup_whatsapp_body: 'Hi {{first_name}}, this is a friendly reminder that invoice {{invoice_number}} for ZAR {{invoice_amount_zar}} is overdue. Please settle it at your earliest convenience.'
          }
        },
        {
          workflow_id: wf.id,
          workspace_id: workspaceId,
          position: 3,
          type: 'if_else',
          config: {
            conditions: [{ field: 'invoice_paid', operator: 'equals', value: true }],
            matchAction: 'stop',
            fallbackAction: 'continue'
          }
        },
        {
          workflow_id: wf.id,
          workspace_id: workspaceId,
          position: 4,
          type: 'send_whatsapp',
          config: {
            body: 'URGENT: ZAR {{invoice_amount_zar}} payment is outstanding. Please reply to confirm payment.'
          }
        },
        {
          workflow_id: wf.id,
          workspace_id: workspaceId,
          position: 5,
          type: 'create_task',
          config: {
            title: 'Call {{first_name}} - Overdue Invoice ZAR {{invoice_amount_zar}}',
            description: 'Verify payment status for invoice {{invoice_number}}.',
            priority: 'high'
          }
        }
      ]);
    }
  }

  // B. SARS Tax Calendar Reminders
  const { data: taxExists } = await supabase
    .from('workflows')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('name', 'SARS Tax Calendar Reminders')
    .maybeSingle();

  if (!taxExists) {
    const { data: wf } = await supabase
      .from('workflows')
      .insert({
        workspace_id: workspaceId,
        name: 'SARS Tax Calendar Reminders',
        description: 'Automations that check the SA Tax Calendar and trigger action sequences ahead of EMP201 deadlines.',
        trigger_type: 'sars_tax_reminder',
        trigger_config: {},
        is_active: true,
        goal_rules: []
      })
      .select('id')
      .single();

    if (wf) {
      await supabase.from('workflow_steps').insert([
        { workflow_id: wf.id, workspace_id: workspaceId, position: 1, type: 'wait', config: { delaySeconds: 432000 } },
        {
          workflow_id: wf.id,
          workspace_id: workspaceId,
          position: 2,
          type: 'send_email',
          config: {
            templateType: 'notification',
            subject: 'SARS EMP201 Deadline Reminder',
            body: 'Hi team, the SARS EMP201 submission deadline is approaching. Please submit your monthly figures before the 7th.',
            backup_whatsapp_body: 'Reminder: The SARS EMP201 submission deadline is approaching. Please calculate and submit monthly payroll figures before the 7th.'
          }
        }
      ]);
    }
  }

  // C. LMS Course Recoveries
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
        trigger_type: 'lms_quiz_failed',
        trigger_config: {},
        is_active: true,
        goal_rules: [{ field: 'passed_quiz', operator: 'equals', value: true }]
      })
      .select('id')
      .single();

    if (wf) {
      await supabase.from('workflow_steps').insert([
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
      ]);
    }
  }

  revalidatePath('/automation');
  return { success: true };
}

