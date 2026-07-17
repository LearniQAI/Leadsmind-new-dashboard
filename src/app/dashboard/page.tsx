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
import { fetchDashboardMetrics } from '@/lib/analytics';

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
    supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'open'),
    supabase.from('social_posts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'scheduled'),
    supabase.from('invoices').select('total_amount').eq('workspace_id', workspaceId).eq('status', 'paid'),
    supabase.from('contact_activities').select('*, contacts(id, first_name, last_name)').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(8),
    // `opportunities` has three FKs into `contacts` (`contact_id`, plus
    // `buyer_id`/`seller_id` from the real-estate-pipeline migration) — an
    // unqualified `contacts(...)` embed is ambiguous to PostgREST and fails
    // outright (PGRST201), which silently zeroed out this widget via the
    // `.data || []` fallback below. Same root cause found and fixed for
    // `/pipelines` itself in this pass (see pipelines.ts and crm.md).
    supabase.from('opportunities').select('*, contacts!opportunities_contact_id_fkey(id, first_name, last_name)').eq('workspace_id', workspaceId).eq('status', 'open').order('value', { ascending: false }).limit(5),
    supabase.from('tasks').select('id, title, due_date').eq('workspace_id', workspaceId).eq('priority', 'high').neq('status', 'done').lt('due_date', new Date().toISOString()),
    // Powers the "Upcoming Meetings" widget — previously hardcoded sample
    // entries regardless of real appointment data.
    supabase.from('appointments').select('id, title, start_time, end_time, status, contact:contacts(first_name, last_name)').eq('workspace_id', workspaceId).eq('status', 'scheduled').gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(5),
    AttributionEngine.getAttributionMetrics(workspaceId),
    // Additive: powers the Revenue/Leads trend charts and the real per-stage
    // Sales Pipeline row on the redesigned dashboard. Existing queries above
    // are untouched.
    fetchDashboardMetrics(workspaceId, '30d'),
  ]);

  const contactCount = results[0].count || 0;
  const newLeadsCount = results[1].count || 0;
  const activeWorkflows = results[2].count || 0;
  const wonOpportunities = results[3].count || 0;
  const activeDealsCount = results[4].count || 0;
  const socialQueueCount = results[5].count || 0;
  const revenueData = results[6].data || [];
  const recentActivities = results[7].data || [];
  const topOpportunities = results[8].data || [];
  const overdueTasks = results[9].data || [];
  const upcomingMeetings = results[10].data || [];
  const attributionMetrics = results[11] as any;
  const metrics = results[12] as Awaited<ReturnType<typeof fetchDashboardMetrics>>;

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
              activeDeals: activeDealsCount,
              socialQueue: socialQueueCount,
              revenue: totalRevenue,
            }}
            recentActivities={recentActivities || []}
            topOpportunities={topOpportunities || []}
            overdueTasks={overdueTasks || []}
            upcomingMeetings={upcomingMeetings || []}
            attributionMetrics={attributionMetrics}
            metrics={metrics}
          />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default Home;
