'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { PlatformObservabilityEngine } from '@/lib/production/PlatformObservabilityEngine';
import { logger } from '@/shared/logger';

export async function getSystemHealthData() {
  const supabase = await createServerClient();
  
  // Fetch system logs (admin level)
  const { data: healthLogs } = await supabase
    .from('system_health_logs')
    .select('*')
    .order('last_checked_at', { ascending: false })
    .limit(10);

  // Fetch observability metrics
  const { data: metrics } = await supabase
    .from('observability_metrics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  // Ping DB
  const dbHealth = await PlatformObservabilityEngine.checkDatabaseHealth();

  return { 
    success: true, 
    data: { 
      healthLogs: healthLogs || [],
      metrics: metrics || [],
      dbHealth
    } 
  };
}

export async function submitPlatformFeedback(feedbackData: any) {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };

  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase.from('platform_feedback').insert({
    workspace_id: workspaceId,
    user_id: userData?.user?.id,
    ...feedbackData
  });

  if (error) {
    logger.error({ err: error, workspaceId }, 'production_workspace.platform_feedback.submit.failed');
    return { success: false, error: 'Failed to submit feedback.' };
  }
  return { success: true };
}
