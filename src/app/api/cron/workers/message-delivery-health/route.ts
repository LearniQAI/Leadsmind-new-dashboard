import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';
import {
  DELIVERY_ALERT_WINDOW_MIN,
  DELIVERY_ALERT_COOLDOWN_MIN,
  DELIVERY_ALERT_THRESHOLD,
  shouldAlertOnFailureRate,
} from '@/lib/messaging/retryConfig';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const META_CHANNELS = ['facebook', 'instagram', 'whatsapp'];
const CHANNEL_LABEL: Record<string, string> = { facebook: 'Messenger', instagram: 'Instagram', whatsapp: 'WhatsApp' };

// Message Delivery Reliability Part 4 (PRD 5.5) — rolling failure-rate watch.
// Every DELIVERY_ALERT_WINDOW_MIN minutes: per (workspace, channel), if the
// outbound send failure rate over the window exceeds DELIVERY_ALERT_THRESHOLD
// (and volume is meaningful), emit:
//   - a structured `messaging.delivery_health.alert` log line (the hook an
//     external log-drain monitor keys on — zero extra infra),
//   - a webhook_dead_letters row (queryable audit, shows in the dead-letter
//     panel + doubles as the per-(workspace,channel) cooldown source),
//   - a Slack ping IF SLACK_OPS_WEBHOOK_URL is set (same plain Incoming-Webhook
//     POST mechanism as notify_slack in actions_registry.ts — no new channel).
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = Date.now();
    const windowStart = new Date(now - DELIVERY_ALERT_WINDOW_MIN * 60_000).toISOString();
    const cooldownStart = new Date(now - DELIVERY_ALERT_COOLDOWN_MIN * 60_000).toISOString();

    const { data: msgs, error } = await supabaseAdmin
      .from('messages')
      .select('workspace_id, status, conversations!inner(platform)')
      .eq('direction', 'outbound')
      .gte('sent_at', windowStart)
      .in('conversations.platform', META_CHANNELS)
      .limit(5000);

    if (error) {
      logger.error({ err: error }, 'cron.message_delivery_health.query_failed');
      return NextResponse.json({ error: 'query failed' }, { status: 500 });
    }

    // Tally per (workspace, platform).
    const groups = new Map<string, { workspaceId: string; platform: string; total: number; failed: number }>();
    for (const m of msgs || []) {
      const conv: any = Array.isArray((m as any).conversations) ? (m as any).conversations[0] : (m as any).conversations;
      const platform = conv?.platform;
      if (!platform) continue;
      const key = `${(m as any).workspace_id}:${platform}`;
      const g = groups.get(key) || { workspaceId: (m as any).workspace_id, platform, total: 0, failed: 0 };
      g.total += 1;
      if ((m as any).status === 'failed') g.failed += 1;
      groups.set(key, g);
    }

    const tripped = [...groups.values()].filter((g) => shouldAlertOnFailureRate({ failed: g.failed, total: g.total }));
    if (tripped.length === 0) {
      return NextResponse.json({ success: true, groups: groups.size, alerted: 0 });
    }

    // Cooldown: recent alert rows for the same (workspace, platform).
    const { data: recent } = await supabaseAdmin
      .from('webhook_dead_letters')
      .select('payload, timestamp')
      .eq('provider', 'message_delivery_alert')
      .gte('timestamp', cooldownStart);

    const onCooldown = new Set(
      (recent || []).map((r: any) => `${r.payload?.workspace_id}:${r.payload?.platform}`),
    );

    let alerted = 0;
    for (const g of tripped) {
      const key = `${g.workspaceId}:${g.platform}`;
      if (onCooldown.has(key)) continue;

      const rate = g.failed / g.total;
      const pct = Math.round(rate * 1000) / 10;
      const label = CHANNEL_LABEL[g.platform] || g.platform;
      const summary = `${label} send failure rate ${pct}% over ${DELIVERY_ALERT_WINDOW_MIN}m (${g.failed}/${g.total})`;

      logger.warn(
        { workspaceId: g.workspaceId, platform: g.platform, failed: g.failed, total: g.total, rate, threshold: DELIVERY_ALERT_THRESHOLD },
        'messaging.delivery_health.alert',
      );

      const { error: dlErr } = await supabaseAdmin.from('webhook_dead_letters').insert({
        provider: 'message_delivery_alert',
        payload: { workspace_id: g.workspaceId, platform: g.platform, failed: g.failed, total: g.total, failure_rate: rate, window_min: DELIVERY_ALERT_WINDOW_MIN },
        error: summary,
        error_type: 'delivery_failure_rate',
        retry_state: 'unresolved',
      });
      if (dlErr) logger.error({ err: dlErr, key }, 'cron.message_delivery_health.dead_letter_insert_failed');

      const slackUrl = process.env.SLACK_OPS_WEBHOOK_URL;
      if (slackUrl) {
        try {
          const res = await fetch(slackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: `:warning: LeadsMind delivery alert — ${summary} (workspace ${g.workspaceId})` }),
          });
          if (!res.ok) logger.error({ status: res.status, key }, 'cron.message_delivery_health.slack_failed');
        } catch (slackErr) {
          logger.error({ err: slackErr, key }, 'cron.message_delivery_health.slack_failed');
        }
      }

      alerted += 1;
    }

    return NextResponse.json({ success: true, groups: groups.size, tripped: tripped.length, alerted });
  } catch (err: any) {
    logger.error({ err }, 'cron.message_delivery_health.failed');
    return NextResponse.json({ error: 'health check failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
