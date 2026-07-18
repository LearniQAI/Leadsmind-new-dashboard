'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getPortalSession } from '@/lib/portal/session';
import { getUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';

/**
 * Resolves a project's real workspace_id and verifies the current user is a
 * member of it — same "verify then read/write" shape saveProjectSettings
 * below already established, factored out since the internal "Manage Node"
 * modal needs it for several new actions (detail fetch, edit, delete, task
 * CRUD), not just settings. Deliberately re-checks the project's own
 * workspace_id rather than trusting the caller's active-workspace cookie,
 * since a project id is an explicit argument that could belong to any
 * workspace, not necessarily the caller's currently-active one.
 *
 * Returns an admin client for callers to actually read/write with: unlike
 * `projects` (which has a real "Workspace Projects Access" FOR ALL RLS
 * policy for workspace members), `project_tasks` only has a portal/client-
 * facing SELECT policy — no internal-team-member policy exists at all
 * (confirmed by reading supabase/migrations directly). A session-scoped
 * client would silently see zero task rows and fail every task write for a
 * real, legitimate internal team member. Safe here because membership is
 * already independently verified above before the admin client is ever
 * handed back — same "verify explicitly, then use the admin client" shape
 * `calendar/public.ts`/`calendar/manage.ts` already use elsewhere.
 */
async function verifyProjectAccess(projectId: string) {
  const user = await getUser();
  if (!user) {
    return { error: 'Unauthorized.' } as const;
  }

  const supabase = await createServerClient();
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projErr || !project) {
    return { error: 'Project not found.' } as const;
  }

  const { data: member, error: memErr } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', project.workspace_id)
    .eq('user_id', user.id)
    .single();

  if (memErr || !member) {
    return { error: 'Unauthorized. You do not belong to this workspace.' } as const;
  }

  return { supabase: createAdminClient(), user, project } as const;
}

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

/**
 * Internal "Manage Node" detail fetch: the project row plus its real
 * project_tasks (used to render an actual editable task checklist, and to
 * compute real progress/team-member counts — the projects table itself has
 * no progress/team_size columns to read).
 */
export async function getProjectDetail(projectId: string) {
  try {
    const access = await verifyProjectAccess(projectId);
    if ('error' in access) return { success: false, error: access.error };
    const { supabase, project } = access;

    const { data: tasks, error: tasksErr } = await supabase
      .from('project_tasks')
      .select('id, title, status, assigned_to, priority, due_date, created_at')
      .eq('project_id', projectId)
      .order('position', { ascending: true });

    if (tasksErr) throw tasksErr;

    const assigneeIds = Array.from(new Set((tasks || []).map((t) => t.assigned_to).filter(Boolean)));
    const { data: assignees } = assigneeIds.length
      ? await supabase.from('users').select('id, first_name, last_name, email, avatar_url').in('id', assigneeIds)
      : { data: [] as any[] };
    const assigneesById = new Map((assignees || []).map((u) => [u.id, u]));

    const tasksWithAssignee = (tasks || []).map((t) => ({ ...t, assignee: t.assigned_to ? assigneesById.get(t.assigned_to) || null : null }));
    const total = tasksWithAssignee.length;
    const done = tasksWithAssignee.filter((t) => t.status === 'done').length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    const teamSize = Math.max(assigneeIds.length, 1);

    return { success: true, data: { project, tasks: tasksWithAssignee, progress, teamSize } };
  } catch (err: any) {
    logger.error({ err, projectId }, 'projects.detail.fetch.failed');
    return { success: false, error: 'Failed to load project details.' };
  }
}

/** Edits the project's own editable fields (name/description/status) — the fields saveProjectSettings above deliberately doesn't touch. */
export async function updateProjectDetails(projectId: string, updates: { name?: string; description?: string; status?: string }) {
  try {
    const access = await verifyProjectAccess(projectId);
    if ('error' in access) return { success: false, error: access.error };
    const { supabase } = access;

    const payload: Record<string, any> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.status !== undefined) payload.status = updates.status;

    const { error } = await supabase.from('projects').update(payload).eq('id', projectId);
    if (error) throw error;

    revalidatePath('/projects');
    return { success: true };
  } catch (err: any) {
    logger.error({ err, projectId }, 'projects.update.failed');
    return { success: false, error: 'Failed to update project.' };
  }
}

/** Deletes a project node entirely (the "..." menu's Delete action). project_tasks cascade-delete via the FK's ON DELETE CASCADE. */
export async function deleteProject(projectId: string) {
  try {
    const access = await verifyProjectAccess(projectId);
    if ('error' in access) return { success: false, error: access.error };
    const { supabase } = access;

    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;

    revalidatePath('/projects');
    return { success: true };
  } catch (err: any) {
    logger.error({ err, projectId }, 'projects.delete.failed');
    return { success: false, error: 'Failed to delete project.' };
  }
}

/** Adds a real task to a project's checklist — this is what "1 Team members"/"progress" are actually computed from. */
export async function createProjectTask(projectId: string, input: { title: string; assignedTo?: string | null; priority?: string }) {
  try {
    const access = await verifyProjectAccess(projectId);
    if ('error' in access) return { success: false, error: access.error };
    const { supabase, project } = access;

    if (!input.title?.trim()) return { success: false, error: 'Task title is required.' };

    const { error } = await supabase.from('project_tasks').insert({
      project_id: projectId,
      workspace_id: project.workspace_id,
      title: input.title.trim(),
      assigned_to: input.assignedTo || null,
      priority: input.priority || 'normal',
      status: 'todo',
    });
    if (error) throw error;

    revalidatePath('/projects');
    return { success: true };
  } catch (err: any) {
    logger.error({ err, projectId }, 'projects.task.create.failed');
    return { success: false, error: 'Failed to add task.' };
  }
}

/** Toggles a project task's completion — the actual mechanism progress tracking moves through. */
export async function updateProjectTaskStatus(projectId: string, taskId: string, status: 'todo' | 'in_progress' | 'review' | 'done') {
  try {
    const access = await verifyProjectAccess(projectId);
    if ('error' in access) return { success: false, error: access.error };
    const { supabase } = access;

    const { error } = await supabase
      .from('project_tasks')
      .update({ status })
      .eq('id', taskId)
      .eq('project_id', projectId);
    if (error) throw error;

    revalidatePath('/projects');
    return { success: true };
  } catch (err: any) {
    logger.error({ err, projectId, taskId }, 'projects.task.status.failed');
    return { success: false, error: 'Failed to update task.' };
  }
}

/** Removes a task from a project's checklist. */
export async function deleteProjectTask(projectId: string, taskId: string) {
  try {
    const access = await verifyProjectAccess(projectId);
    if ('error' in access) return { success: false, error: access.error };
    const { supabase } = access;

    const { error } = await supabase.from('project_tasks').delete().eq('id', taskId).eq('project_id', projectId);
    if (error) throw error;

    revalidatePath('/projects');
    return { success: true };
  } catch (err: any) {
    logger.error({ err, projectId, taskId }, 'projects.task.delete.failed');
    return { success: false, error: 'Failed to delete task.' };
  }
}
