'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getPortalSession } from '@/lib/portal/session';
import { getUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';

/**
 * Client approval server action to confirm a milestone task
 */
export async function approveProjectMilestone(taskId: string) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return { success: false, error: 'Unauthorized. Client portal session active context required.' };
    }

    const { contact, workspace } = session;
    const adminClient = createAdminClient();

    // 1. Fetch the project task and resolve the project
    const { data: task, error: taskErr } = await adminClient
      .from('project_tasks')
      .select('*, projects(*)')
      .eq('id', taskId)
      .single();

    if (taskErr || !task) {
      return { success: false, error: 'Project milestone task not found.' };
    }

    // 2. Strict client multi-tenant ownership check
    if (task.projects.contact_id !== contact.id || task.projects.workspace_id !== workspace.id) {
      return { success: false, error: 'Access denied. You do not own this project.' };
    }

    // 3. Update the approval fields on the task milestone
    const { error: updateErr } = await adminClient
      .from('project_tasks')
      .update({
        client_approved_at: new Date().toISOString(),
        approved_by_contact_id: contact.id,
        status: 'done' // Set to done upon client approval
      })
      .eq('id', taskId);

    if (updateErr) {
      logger.error({ err: updateErr, taskId }, 'projects.milestone.approve.failed');
      return { success: false, error: 'Failed to record milestone approval.' };
    }

    // 4. Log the confirmation inside contact activities CRM logs
    await adminClient.from('contact_activities').insert({
      workspace_id: workspace.id,
      contact_id: contact.id,
      type: 'project',
      description: `Client approved project milestone: "${task.title}"`
    });

    // 5. Trigger workflow engine on milestone approval
    try {
      const { triggerWorkflows } = await import('@/lib/automation/executor');
      await triggerWorkflows(workspace.id, 'milestone_approved', contact.id);
    } catch (triggerErr: any) {
      logger.error({ err: triggerErr, taskId }, 'projects.milestone.workflow_trigger.failed');
    }

    revalidatePath('/portal/projects');
    return { success: true };
  } catch (err: any) {
    logger.error({ err, taskId }, 'projects.milestone.approve_action.failed');
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Admin action to save specific project visibility and delivery settings
 */
export async function saveProjectSettings(projectId: string, settings: {
  show_tasks: boolean;
  show_employee_names: boolean;
  show_financials: boolean;
  budget?: number;
  cost?: number;
  tracked_hours?: number;
  start_date?: string;
  due_date?: string;
}) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized.' };
    }

    const supabase = await createServerClient();
    const adminClient = createAdminClient();

    // 1. Resolve project workspace
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('workspace_id')
      .eq('id', projectId)
      .single();

    if (projErr || !project) {
      return { success: false, error: 'Project not found.' };
    }

    // 2. Verify workspace membership & role
    const { data: member, error: memErr } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', project.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (memErr || !member) {
      return { success: false, error: 'Unauthorized. You do not belong to this workspace.' };
    }

    // 3. Save visibility rules JSONB and optional metadata fields
    const updates: any = {
      project_settings: {
        show_tasks: settings.show_tasks,
        show_employee_names: settings.show_employee_names,
        show_financials: settings.show_financials
      }
    };

    if (settings.budget !== undefined) updates.budget = settings.budget;
    if (settings.cost !== undefined) updates.cost = settings.cost;
    if (settings.tracked_hours !== undefined) updates.tracked_hours = settings.tracked_hours;
    if (settings.start_date !== undefined) updates.start_date = settings.start_date || null;
    if (settings.due_date !== undefined) updates.due_date = settings.due_date || null;

    const { error: updateErr } = await adminClient
      .from('projects')
      .update(updates)
      .eq('id', projectId);

    if (updateErr) {
      logger.error({ err: updateErr, projectId }, 'projects.settings.save.failed');
      return { success: false, error: 'Failed to save settings.' };
    }

    revalidatePath(`/settings`);
    return { success: true };
  } catch (err: any) {
    logger.error({ err, projectId }, 'projects.settings.save_action.failed');
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Admin action to save workspace-level default project visibility settings
 */
export async function saveWorkspaceProjectSettings(workspaceId: string, settings: {
  show_tasks: boolean;
  show_employee_names: boolean;
  show_financials: boolean;
}) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized.' };
    }

    const supabase = await createServerClient();
    const adminClient = createAdminClient();

    // Verify workspace membership & role
    const { data: member, error: memErr } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (memErr || !member || (member.role !== 'admin' && member.role !== 'owner')) {
      return { success: false, error: 'Unauthorized. Workspace admin role required.' };
    }

    const { error: updateErr } = await adminClient
      .from('workspaces')
      .update({
        project_settings: {
          show_tasks: settings.show_tasks,
          show_employee_names: settings.show_employee_names,
          show_financials: settings.show_financials
        }
      })
      .eq('id', workspaceId);

    if (updateErr) {
      logger.error({ err: updateErr, workspaceId }, 'projects.workspace_settings.save.failed');
      return { success: false, error: 'Failed to save settings.' };
    }

    revalidatePath(`/settings`);
    return { success: true };
  } catch (err: any) {
    logger.error({ err, workspaceId }, 'projects.workspace_settings.save_action.failed');
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
