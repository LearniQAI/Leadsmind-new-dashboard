//@refresh
import MetaData from "@/hooks/useMetaData";
import Wrapper from "@/components/layouts/DefaultWrapper";
import React from "react";
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import HomeDashboardClient from "@/components/pagesUI/apps/home/HomeDashboardClient";

const Home = async () => {
  const user = await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/login');

  const supabase = await createServerClient();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Fetch Live KPI Data for General Dashboard
  const results = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).gte('created_at', sevenDaysAgo.toISOString()),
    supabase.from('automation_workflows').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('is_active', true),
    supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'won'),
    supabase.from('social_posts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'scheduled'),
    supabase.from('invoices').select('total_amount').eq('workspace_id', workspaceId).eq('status', 'paid'),
    supabase.from('contact_activities').select('*, contacts(id, first_name, last_name)').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(8),
    supabase.from('opportunities').select('*, contacts(id, first_name, last_name)').eq('workspace_id', workspaceId).eq('status', 'open').order('value', { ascending: false }).limit(5),
    supabase.from('tasks').select('id, title, due_date').eq('workspace_id', workspaceId).eq('priority', 'high').neq('status', 'done').lt('due_date', new Date().toISOString())
  ]);

  const contactCount = results[0].count || 0;
  const newLeadsCount = results[1].count || 0;
  const activeWorkflows = results[2].count || 0;
  const wonOpportunities = results[3].count || 0;
  const socialQueueCount = results[4].count || 0;
  const revenueData = results[5].data || [];
  const recentActivities = results[6].data || [];
  const topOpportunities = results[7].data || [];
  const overdueTasks = results[8].data || [];

  const totalRevenue = revenueData?.reduce((acc: any, curr: any) => acc + (Number(curr.total_amount) || 0), 0) || 0;

  return (
    <>
      <MetaData pageTitle="Main Dashboard">
        <Wrapper>
          <HomeDashboardClient
            stats={{
              leads: contactCount,
              newLeads: newLeadsCount,
              automations: activeWorkflows,
              wonDeals: wonOpportunities,
              socialQueue: socialQueueCount,
              revenue: totalRevenue,
            }}
            recentActivities={recentActivities || []}
            topOpportunities={topOpportunities || []}
            overdueTasks={overdueTasks || []}
          />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default Home;
