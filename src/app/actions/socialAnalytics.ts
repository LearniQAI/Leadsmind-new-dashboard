'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';

// Same platform ceiling as socialComments.ts (Task 93) and comments.ts/analytics.ts — see
// those files for why LinkedIn/TikTok are absent, not disabled.
const SUPPORTED_PLATFORMS = ['facebook', 'instagram', 'youtube'] as const;

export async function getSocialEngagementAnalytics(filterPlatform?: string) {
  try {
    const supabase = await createServerClient();
    const { workspaceId } = await requireWorkspaceAccess();

    const { data: connections, error: connErr } = await supabase
      .from('platform_connections')
      .select('platform, status')
      .eq('workspace_id', workspaceId)
      .in('platform', SUPPORTED_PLATFORMS as unknown as string[])
      .eq('status', 'connected');
    if (connErr) throw connErr;
    const connectedPlatforms = (connections || []).map((c: any) => c.platform as string);

    let query = supabase
      .from('social_engagement_metrics')
      .select('platform, platform_post_id, metric_type, metric_date, value, fetched_at')
      .eq('workspace_id', workspaceId)
      .order('metric_date', { ascending: true })
      .limit(2000);

    if (filterPlatform && (SUPPORTED_PLATFORMS as readonly string[]).includes(filterPlatform)) {
      query = query.eq('platform', filterPlatform);
    }

    const { data, error } = await query;
    if (error) throw error;

    const lastUpdated = (data || []).reduce((max: string | null, row: any) => {
      if (!row.fetched_at) return max;
      return !max || row.fetched_at > max ? row.fetched_at : max;
    }, null as string | null);

    return { data: data || [], connectedPlatforms, lastUpdated };
  } catch (error: any) {
    logger.error({ err: error }, 'social.analytics.fetch.failed');
    return { error: 'Failed to fetch engagement analytics.', data: [], connectedPlatforms: [] as string[], lastUpdated: null as string | null };
  }
}
