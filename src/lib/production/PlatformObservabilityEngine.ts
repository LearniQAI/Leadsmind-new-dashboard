import { createServerClient } from '@/lib/supabase/server';

export class PlatformObservabilityEngine {
  /**
   * Logs a critical system failure or operational metric.
   */
  public static async logMetric(
    metricType: 'api_latency' | 'workflow_failure' | 'realtime_disconnect' | 'enrichment_failure', 
    severity: 'info' | 'warning' | 'critical', 
    source: string, 
    details: any = {},
    workspaceId?: string
  ) {
    const supabase = await createServerClient();
    
    // In a real high-throughput environment, this would hit Redis or DataDog.
    // For LeadsMind MVP, we log to Postgres.
    await supabase.from('observability_metrics').insert({
      metric_type: metricType,
      severity,
      source,
      details,
      workspace_id: workspaceId || null
    });
  }

  /**
   * Evaluates basic database connectivity for health checks.
   */
  public static async checkDatabaseHealth(): Promise<{ status: string, latency: number }> {
    const supabase = await createServerClient();
    const start = Date.now();
    
    try {
      // Simple ping query
      await supabase.from('system_health_logs').select('id').limit(1);
      const latency = Date.now() - start;
      return { status: 'healthy', latency };
    } catch (e) {
      return { status: 'down', latency: Date.now() - start };
    }
  }
}
