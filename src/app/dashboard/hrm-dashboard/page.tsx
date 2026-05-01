import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import React from "react";
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import HrmDashboardClient from "@/components/pagesUI/hrm/HrmDashboardClient";

const HrmDashboardMain = async () => {
  const user = await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/login');

  const supabase = await createServerClient();

  // Fetch Live KPI Data for HRM
  const [
    { count: employeeCount },
    { count: projectCount },
    { count: completedProjectCount },
    { count: clientCount },
    { count: ticketCount },
    { data: revenueData },
    { data: upcomingMeetings },
    { data: recentTasks }
  ] = await Promise.all([
    // 1. Total Employees (Workspace Members)
    supabase.from('workspace_members').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    // 2. Total Projects
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    // 3. Completed Projects
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'completed'),
    // 4. Total Clients (Contacts)
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    // 5. Support Tickets
    supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    // 6. Revenue (Paid Invoices)
    supabase.from('invoices').select('total_amount').eq('workspace_id', workspaceId).eq('status', 'paid'),
    // 7. Upcoming Meetings (Appointments)
    supabase.from('appointments')
      .select('*, contacts(first_name, last_name)')
      .eq('workspace_id', workspaceId)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(5),
    // 8. Recent Tasks
    supabase.from('project_tasks')
      .select('*, projects(name)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  const totalRevenue = revenueData?.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0) || 0;

  return (
    <>
      <MetaData pageTitle="HRM Dashboard">
        <Wrapper>
          <HrmDashboardClient
            stats={{
              employees: employeeCount || 0,
              projects: projectCount || 0,
              completedProjects: completedProjectCount || 0,
              clients: clientCount || 0,
              tickets: ticketCount || 0,
              revenue: totalRevenue,
            }}
            upcomingMeetings={upcomingMeetings || []}
            recentTasks={recentTasks || []}
          />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default HrmDashboardMain;
