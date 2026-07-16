'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { UnifiedActivityEngine } from '@/lib/crm/UnifiedActivityEngine';

// Reads the real, actively-used CRM tables (contacts/opportunities) — the
// same ones /contacts and /pipelines read/write — not the parallel
// crm_contacts/crm_opportunities model. Per Issue #10's investigation,
// contact_activities isn't uniquely canonical over crm_activities (both are
// genuinely live), but that conclusion does NOT extend to crm_contacts:
// crm_contacts is still actively written by LeadScoringEngine, the email
// deliverability webhook, and POPIA erasure/unsubscribe actions, while the
// real contact-creation flow (ContactService/ContactRepository, used by
// /contacts) only ever writes to `contacts`. So a contact created through
// the actual app UI would never have appeared in a crm_contacts-backed
// dashboard — `contacts` is the one that reflects what a user actually sees
// elsewhere in the app, which is what this dashboard needs to match.
export async function getCRMDashboardData() {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };

  // Fetch opportunities pipeline
  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('*, contact:contact_id(first_name, last_name, email)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch recent contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
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
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Unauthorized' };

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };

  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('*, contact:contact_id(first_name, last_name, email)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  return { success: true, data: opportunities || [] };
}
