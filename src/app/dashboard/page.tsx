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
 const [
  { count: contactCount },
  { count: newLeadsCount },
  { count: activeWorkflows },
  { count: wonOpportunities },
  { count: socialQueueCount },
  { data: revenueData },
  { data: recentActivities },
  { data: topOpportunities }
 ] = await Promise.all([
  // 1. Total Leads
  supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
  // 2. New Leads (7d)
  supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).gte('created_at', sevenDaysAgo.toISOString()),
  // 3. Active Automations
  supabase.from('automation_workflows').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('is_active', true),
  // 4. Won Deals
  supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'won'),
  // 5. Social Queue
  supabase.from('social_posts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'scheduled'),
  // 6. Revenue
  supabase.from('invoices').select('total_amount').eq('workspace_id', workspaceId).eq('status', 'paid'),
  // 7. Recent Activity
  supabase.from('contact_activities')
   .select('*, contacts(id, first_name, last_name)')
   .eq('workspace_id', workspaceId)
   .order('created_at', { ascending: false })
   .limit(8),
  // 8. Top Opportunities
  supabase.from('opportunities')
   .select('*, contacts(id, first_name, last_name)')
   .eq('workspace_id', workspaceId)
   .eq('status', 'open')
   .order('value', { ascending: false })
   .limit(5)
 ]);

 const totalRevenue = revenueData?.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0) || 0;

 return (
  <>
   <MetaData pageTitle="Main Dashboard">
    <Wrapper>
     <HomeDashboardClient
      stats={{
       leads: contactCount || 0,
       newLeads: newLeadsCount || 0,
       automations: activeWorkflows || 0,
       wonDeals: wonOpportunities || 0,
       socialQueue: socialQueueCount || 0,
       revenue: totalRevenue,
      }}
      recentActivities={recentActivities || []}
      topOpportunities={topOpportunities || []}
     />
    </Wrapper>
   </MetaData>
  </>
 );
};

export default Home;
