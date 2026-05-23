'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { WebsiteAnalyzer } from '@/lib/lead-finder/WebsiteAnalyzer';
import { OpportunityScoringEngine } from '@/lib/lead-finder/OpportunityScoringEngine';
import { RecommendationEngine } from '@/lib/lead-finder/RecommendationEngine';

export async function analyzeOpportunity(leadId: string) {
  const supabase = await createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return { success: false, error: 'Unauthorized' };

  try {
    // 1. Get Lead
    const { data: lead } = await supabase.from('lead_finder_results').select('*').eq('id', leadId).single();
    if (!lead) throw new Error('Lead not found');

    // 2. Check if already analyzed
    const { data: existingScore } = await supabase.from('opportunity_scores').select('id').eq('result_id', leadId);
    if (existingScore && existingScore.length > 0) return { success: true };

    // 3. Analyze Website
    let websiteData = null;
    if (lead.website) {
      websiteData = await WebsiteAnalyzer.analyze(lead.website, lead.business_name);
      if (websiteData) {
        await supabase.from('website_analysis').insert({
          result_id: leadId,
          ...websiteData
        });
      }
    }

    // 4. Calculate Opportunity Score
    const { score, tier } = OpportunityScoringEngine.calculateOpportunity(lead, websiteData);
    await supabase.from('opportunity_scores').insert({
      result_id: leadId,
      score,
      tier
    });

    // 5. Generate Recommendations
    const recommendations = RecommendationEngine.generateRecommendations(lead, websiteData);
    if (recommendations.length > 0) {
      await supabase.from('opportunity_recommendations').insert(
        recommendations.map(r => ({ result_id: leadId, ...r }))
      );
    }

    // 6. Generate Competitor Context (Heuristic/Mock for MVP)
    const competitors = [
      { result_id: leadId, competitor_name: 'Local Competitor A', rating: 4.8, distance_meters: 1200 },
      { result_id: leadId, competitor_name: 'Leading ' + lead.category, rating: 4.5, distance_meters: 3500 },
      { result_id: leadId, competitor_name: 'Budget ' + lead.category, rating: 3.2, distance_meters: 800 }
    ];
    await supabase.from('competitor_context').insert(competitors);

    revalidatePath(`/lead-finder/lead/${leadId}`);
    return { success: true };
  } catch (error: any) {
    console.error('[AnalyzeOpportunity] Error:', error);
    return { success: false, error: error.message };
  }
}

export async function getOpportunityDashboardData() {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };

  // Get Top Ranked Opportunities
  const { data: opportunities, error } = await supabase
    .from('opportunity_scores')
    .select(`
      id, score, tier,
      lead:result_id (id, business_name, category, location, estimated_value, pipeline_id)
    `)
    .order('score', { ascending: false })
    .limit(20);

  if (error) return { success: false, error: error.message };

  return { success: true, data: opportunities || [] };
}

export async function updateEstimatedValue(leadId: string, value: number) {
  const supabase = await createServerClient();
  const { error } = await supabase.from('lead_finder_results').update({ estimated_value: value }).eq('id', leadId);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/lead-finder/lead/${leadId}`);
  return { success: true };
}
