export const dynamic = 'force-dynamic';
//@refresh
import MetaData from "@/hooks/useMetaData";
import Wrapper from "@/components/layouts/DefaultWrapper";
import React from "react";
import { createServerClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import HomeDashboardClient from "@/components/pagesUI/apps/home/HomeDashboardClient";
import { cookies } from 'next/headers';
import { WorkspaceSync } from '@/components/auth/WorkspaceSync';
import { DashboardWorkspacePicker } from '@/components/auth/DashboardWorkspacePicker';

import { AttributionEngine } from '@/lib/analytics/AttributionEngine';

const Home = async () => {
  const user = await requireAuth();

  const supabase = await createServerClient();
  const cookieStore = cookies();
  const activeWorkspaceId = cookieStore.get('active_workspace_id')?.value ?? null;

  const { data: memberships, error: membershipError } = await supabase
    .from('workspace_members')
    .select(`
      role,
      workspace_id,
      workspaces (
        id, name, slug, logo_url, owner_id, plan_tier, created_at
      )
    `)
    .eq('user_id', user.id);

  if (membershipError) {
    redirect('/auth/signin-basic?error=no_workspace');
  }

  type RawWorkspace = {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    owner_id: string;
    plan_tier: 'free' | 'pro' | 'enterprise';
    created_at: string;
  };

  const workspaces = (memberships ?? [])
    .filter((membership) => membership.workspaces)
    .map((membership) => {
      const workspace = membership.workspaces as unknown as RawWorkspace;
      return {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        logoUrl: workspace.logo_url,
        ownerId: workspace.owner_id,
        plan: workspace.plan_tier,
        createdAt: workspace.created_at,
        role: membership.role,
      };
    });

  if (workspaces.length === 0) {
    redirect('/auth/signin-basic?error=no_workspace');
  }

  const workspace = activeWorkspaceId
    ? workspaces.find((item) => item.id === activeWorkspaceId) ?? null
    : null;

  if (workspaces.length > 1 && !workspace) {
    return <DashboardWorkspacePicker workspaces={workspaces} />;
  }

  const resolvedWorkspace = workspace ?? workspaces[0];
  const workspaceId = resolvedWorkspace.id;

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
    supabase.from('tasks').select('id, title, due_date').eq('workspace_id', workspaceId).eq('priority', 'high').neq('status', 'done').lt('due_date', new Date().toISOString()),
    AttributionEngine.getAttributionMetrics(workspaceId)
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
  const attributionMetrics = results[9] as any;

  const totalRevenue = revenueData?.reduce((acc: any, curr: any) => acc + (Number(curr.total_amount) || 0), 0) || 0;

  return (
    <>
      <MetaData pageTitle="Main Dashboard">
        <WorkspaceSync workspaceId={workspaceId} />
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
            attributionMetrics={attributionMetrics}
          />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default Home;
