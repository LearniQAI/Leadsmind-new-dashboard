'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { UnifiedActivityEngine } from '@/lib/crm/UnifiedActivityEngine';

export async function getCRMDashboardData() {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };

  // Fetch opportunities pipeline
  const { data: opportunities } = await supabase
    .from('crm_opportunities')
    .select('*, company:company_id(name), contact:contact_id(first_name, last_name, email)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch recent contacts
  const { data: contacts } = await supabase
    .from('crm_contacts')
    .select('*, company:company_id(name)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(5);

  // Fetch recent global activity
  const activities = await UnifiedActivityEngine.getGlobalActivity(workspaceId, 8);

  return { 
    success: true, 
    data: { 
      opportunities: opportunities || [],
      contacts: contacts || [],
      activities: activities || []
    } 
  };
}

export async function getCRMPipelines() {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };

  const { data: opportunities } = await supabase
    .from('crm_opportunities')
    .select('*, company:company_id(name), contact:contact_id(first_name, last_name, email)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  return { success: true, data: opportunities || [] };
}
