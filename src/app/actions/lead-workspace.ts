'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getLeadDetails(leadId: string) {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };

  // Get Lead
  const { data: lead, error: leadError } = await supabase
    .from('lead_finder_results')
    .select(`
      *,
      lead_finder_searches(search_type, keywords, location, business_type)
    `)
    .eq('id', leadId)
    .single();

  if (leadError) return { success: false, error: leadError.message };

  // Get Notes
  const { data: notes } = await supabase
    .from('lead_notes')
    .select('*, auth_user:user_id(email)')
    .eq('result_id', leadId)
    .order('created_at', { ascending: false });

  // Get Activities
  const { data: activities } = await supabase
    .from('lead_activities')
    .select('*, auth_user:user_id(email)')
    .eq('result_id', leadId)
    .order('created_at', { ascending: false });

  // Get Users (for assignment) - using auth is tricky, usually we fetch workspace members
  // Assuming a generic approach or we just return the data.

  const { data: contacts } = await supabase
    .from('lead_contacts')
    .select('*')
    .eq('result_id', leadId)
    .order('confidence_score', { ascending: false });

  const { data: oppScore } = await supabase.from('opportunity_scores').select('*').eq('result_id', leadId).maybeSingle();
  const { data: websiteData } = await supabase.from('website_analysis').select('*').eq('result_id', leadId).maybeSingle();
  const { data: recommendations } = await supabase.from('opportunity_recommendations').select('*').eq('result_id', leadId);
  const { data: competitors } = await supabase.from('competitor_context').select('*').eq('result_id', leadId);

  return { 
    success: true, 
    data: { 
      lead, 
      notes: notes || [], 
      activities: activities || [],
      contacts: contacts || [],
      opportunity: oppScore,
      websiteAnalysis: websiteData,
      recommendations: recommendations || [],
      competitors: competitors || []
    } 
  };
}

async function logActivity(supabase: any, resultId: string, userId: string, type: string, description: string, metadata: any = {}) {
  await supabase.from('lead_activities').insert({
    result_id: resultId,
    user_id: userId,
    type,
    description,
    metadata
  });
}

export async function updateLeadStatus(leadId: string, status: string) {
  const supabase = await createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return { success: false, error: 'Unauthorized' };

  const { error } = await supabase
    .from('lead_finder_results')
    .update({ qualification_status: status })
    .eq('id', leadId);

  if (error) return { success: false, error: error.message };

  await logActivity(supabase, leadId, userId, 'status_change', `Updated status to ${status}`, { status });
  revalidatePath(`/lead-finder/lead/${leadId}`);
  return { success: true };
}

export async function addLeadNote(leadId: string, content: string) {
  const supabase = await createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return { success: false, error: 'Unauthorized' };

  const { error } = await supabase
    .from('lead_notes')
    .insert({ result_id: leadId, user_id: userId, content });

  if (error) return { success: false, error: error.message };

  await logActivity(supabase, leadId, userId, 'note_added', 'Added a new note');
  revalidatePath(`/lead-finder/lead/${leadId}`);
  return { success: true };
}

export async function addLeadTag(leadId: string, tag: string) {
  const supabase = await createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return { success: false, error: 'Unauthorized' };

  // Get current tags
  const { data: lead } = await supabase.from('lead_finder_results').select('smart_tags').eq('id', leadId).single();
  const tags = lead?.smart_tags || [];
  
  if (!tags.includes(tag)) {
    const newTags = [...tags, tag];
    await supabase.from('lead_finder_results').update({ smart_tags: newTags }).eq('id', leadId);
    await logActivity(supabase, leadId, userId, 'tag_added', `Added smart tag: ${tag}`, { tag });
  }

  revalidatePath(`/lead-finder/lead/${leadId}`);
  return { success: true };
}

export async function removeLeadTag(leadId: string, tag: string) {
  const supabase = await createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return { success: false, error: 'Unauthorized' };

  const { data: lead } = await supabase.from('lead_finder_results').select('smart_tags').eq('id', leadId).single();
  const tags = lead?.smart_tags || [];
  
  const newTags = tags.filter((t: string) => t !== tag);
  await supabase.from('lead_finder_results').update({ smart_tags: newTags }).eq('id', leadId);
  await logActivity(supabase, leadId, userId, 'tag_removed', `Removed smart tag: ${tag}`, { tag });

  revalidatePath(`/lead-finder/lead/${leadId}`);
  return { success: true };
}

export async function pushLeadToPipeline(leadId: string, pipelineId: string, stageId: string) {
  const supabase = await createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return { success: false, error: 'Unauthorized' };

  const { error } = await supabase
    .from('lead_finder_results')
    .update({ 
      pipeline_id: pipelineId, 
      pipeline_stage_id: stageId,
      status: 'added_to_crm',
      qualification_status: 'Contacted' 
    })
    .eq('id', leadId);

  if (error) return { success: false, error: error.message };

  await logActivity(supabase, leadId, userId, 'crm_push', 'Pushed lead into CRM Pipeline');
  revalidatePath(`/lead-finder/lead/${leadId}`);
  return { success: true };
}
