import React from 'react';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MetaData from '@/hooks/useMetaData';
import { FolderOpen } from 'lucide-react';
import ProjectTimeline from '@/components/portal/ProjectTimeline';

export const dynamic = 'force-dynamic';

export default async function PortalProjectsPage() {
  const session = await getPortalSession();
  if (!session) {
    redirect('/auth/portal/login');
  }

  const { contact, workspace } = session;
  const supabase = createAdminClient();

  // 1. Fetch workspace default project visibility settings
  const { data: dbWorkspace } = await supabase
    .from('workspaces')
    .select('project_settings')
    .eq('id', workspace.id)
    .single();

  const workspaceSettings = dbWorkspace?.project_settings || {
    show_tasks: true,
    show_employee_names: false,
    show_financials: false
  };

  // 2. Fetch client projects
  const { data: dbProjects } = await supabase
    .from('projects')
    .select('*')
    .eq('contact_id', contact.id)
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false });

  const projects = dbProjects || [];

  // 3. Fetch tasks for these projects
  const projectIds = projects.map(p => p.id);
  let tasks: any[] = [];
  let usersMap = new Map<string, any>();

  if (projectIds.length > 0) {
    const { data: dbTasks } = await supabase
      .from('project_tasks')
      .select('*')
      .in('project_id', projectIds)
      .order('due_date', { ascending: true });
    
    tasks = dbTasks || [];

    // Resolve assignees manually in Javascript to bypass cross-schema auth.users/public.users join limitations
    const userIds = Array.from(new Set(tasks.map(t => t.assigned_to).filter(Boolean)));
    if (userIds.length > 0) {
      const { data: dbUsers } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', userIds);
      
      (dbUsers || []).forEach(u => {
        usersMap.set(u.id, u);
      });
    }
  }

  // 4. Fetch attachments explicitly marked by internal teams as client deliverables
  let deliverables: any[] = [];
  if (projectIds.length > 0) {
    const { data: dbDeliverables } = await supabase
      .from('media_files')
      .select('*')
      .in('project_id', projectIds)
      .eq('is_client_deliverable', true)
      .order('created_at', { ascending: false });
    deliverables = dbDeliverables || [];
  }

  const getTasksForProject = (projectId: string) => {
    return tasks
      .filter(t => t.project_id === projectId)
      .map(t => ({
        ...t,
        assigned_user: t.assigned_to ? usersMap.get(t.assigned_to) : null
      }));
  };

  const getDeliverablesForProject = (projectId: string) => {
    return deliverables.filter(d => d.project_id === projectId);
  };

  return (
    <MetaData pageTitle="My Projects">
      <div className="max-w-6xl mx-auto space-y-8 p-8 md:p-12">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight font-space">
            Project <span className="text-[var(--accent2)]">Boards</span>
          </h1>
          <p className="text-[11.5px] text-[var(--t3)] uppercase tracking-[0.2em] mt-2 font-medium">
            Track active project progress, timeline roadmaps, and approve milestones
          </p>
        </div>

        {/* Content list */}
        {projects.length === 0 ? (
          <div className="bg-[var(--n800)] border border-[var(--bdr)] p-16 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center text-[#4a5a82] opacity-55">
              <FolderOpen size={28} />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--t2)]">No Active Projects</h3>
              <p className="text-xs text-[var(--t3)] mt-1.5 max-w-xs leading-relaxed">
                There are no active project collaboration boards linked to your client profile. Contact our delivery team to set up a workspace project.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {projects.map((p, idx) => {
              const pTasks = getTasksForProject(p.id);
              const pDeliverables = getDeliverablesForProject(p.id);
              
              // Fall back to workspace-level default settings if project settings are missing
              const projectSettings = p.project_settings || workspaceSettings;

              return (
                <ProjectTimeline 
                  key={idx}
                  project={p}
                  tasks={pTasks}
                  deliverables={pDeliverables}
                  settings={projectSettings}
                />
              );
            })}
          </div>
        )}
      </div>
    </MetaData>
  );
}
