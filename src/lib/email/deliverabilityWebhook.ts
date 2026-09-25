import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';
import { processEmailEvent } from './deliverabilityEvents';
import type { NormalizedEmailEvent } from './provider/types';

/** Applies a signature-verified delivery event and maps the outcome to the webhook response. */
export async function handleDeliverabilityEvent(event: NormalizedEmailEvent) {
  const supabaseAdmin = createAdminClient();
  try {
    const outcome = await processEmailEvent(supabaseAdmin as any, event);
    if (outcome === 'unattributed') {
      await supabaseAdmin.from('webhook_dead_letters').insert({
        provider: 'email_deliverability',
        payload: event.raw as any,
        error: 'Event could not be attributed to a workspace (no matching sent row or tags)',
        error_type: 'validation_failed',
        retry_state: 'dropped',
      });
    }
    return NextResponse.json({ received: true, status: outcome });
  } catch (error: any) {
    logger.error({ err: error, eventId: event.eventId, type: event.type }, 'webhook.email_deliverability.failed');
    try {
      await supabaseAdmin.from('webhook_dead_letters').insert({
        provider: 'email_deliverability',
        payload: event.raw as any,
        error: error.message,
        error_type: 'infrastructure_failure',
        retry_state: 'pending',
      });
    } catch (dbErr: any) {
      logger.error({ err: dbErr }, 'webhook.email_deliverability.dead_letter_insert.failed');
    }
    // Transient failure -> 500 so the provider retries (the event id dedupes a partial apply).
    return NextResponse.json({ error: 'Infrastructure failure' }, { status: 500 });
  }
}
