import { createAdminClient } from '@/lib/supabase/server';

export interface CampaignRecord {
  id: string;
  workspace_id: string;
  platform: string | null;
  external_campaign_id: string | null;
  name: string | null;
  status: string | null;
  budget_daily: number | null;
  spend_to_date: number | null;
  impressions: number;
  clicks: number;
  conversions: number;
  leads_created: number;
  last_synced_at: string | null;
}

export interface CampaignDerivedMetrics {
  ctrPercent: number | null;
  conversionRatePercent: number | null;
  cpc: number | null;
  cpa: number | null;
}

export async function getCampaignById(workspaceId: string, campaignId: string): Promise<CampaignRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ad_campaigns')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', campaignId)
    .maybeSingle();

  if (error) throw error;
  return data as CampaignRecord | null;
}

/** Plain-code metric math — the LLM reasons over these, it doesn't compute them. */
export function computeDerivedMetrics(campaign: CampaignRecord): CampaignDerivedMetrics {
  const impressions = Number(campaign.impressions ?? 0);
  const clicks = Number(campaign.clicks ?? 0);
  const conversions = Number(campaign.conversions ?? 0);
  const spend = Number(campaign.spend_to_date ?? 0);

  return {
    ctrPercent: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : null,
    conversionRatePercent: clicks > 0 ? Math.round((conversions / clicks) * 10000) / 100 : null,
    cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : null,
    cpa: conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : null,
  };
}

/** Insufficient data to generate meaningful recommendations. */
export function hasSufficientCampaignData(campaign: CampaignRecord): boolean {
  return Number(campaign.impressions ?? 0) > 0 || Number(campaign.clicks ?? 0) > 0 || Number(campaign.spend_to_date ?? 0) > 0;
}
