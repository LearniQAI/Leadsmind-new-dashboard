import { NextRequest } from 'next/server';
import { corsResponse, corsError, getAdminSupabase } from '../../forms/_lib/cors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.events)) {
      return corsError('Invalid events payload', 400);
    }

    const events = body.events as any[];
    if (events.length === 0) return corsResponse({ success: true }, 200);

    const supabase = getAdminSupabase();

    // Map payload to DB schema
    const rows = events.map(e => ({
      workspace_id: e.workspaceId,
      form_id: e.formId,
      session_id: e.sessionId,
      event_type: e.eventType,
      field_id: e.fieldId || null,
      step_id: e.stepId || null,
      variant_id: e.variantId || null,
      metadata: e.metadata || {},
      // Ensure we don't insert crazy future timestamps
      created_at: new Date(Math.min(e.timestamp, Date.now())).toISOString()
    }));

    // In a massive production env, this would write to Kafka or Kinesis.
    // Here we batch insert directly to form_analytics_events.
    const { error } = await supabase.from('form_analytics_events').insert(rows);

    if (error) {
      console.error('[Analytics] Failed to record events:', error);
      return corsError('Internal Server Error', 500);
    }

    return corsResponse({ success: true, count: rows.length }, 200);
  } catch (err) {
    console.error('[Analytics] Unhandled error:', err);
    return corsError('Internal Server Error', 500);
  }
}

export async function OPTIONS() {
  return corsResponse(null, 200);
}
