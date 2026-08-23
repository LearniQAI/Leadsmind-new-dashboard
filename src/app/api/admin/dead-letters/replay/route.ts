import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requirePlatformOperator } from '@/lib/auth/platformOperator';
import { ForbiddenError, UnauthorizedError, toClientError } from '@/shared/errors/AppError';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Replaying a global dead letter can re-fire real processing across tenants.
export async function POST(req: Request) {
  try {
    // Tenant membership cannot authorize access to this global table.
    await requirePlatformOperator();

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    // Re-fetch the real, stored dead-letter row by id — never trust a client-supplied
    // `provider`/`payload`. The previous version took both directly from the request body,
    // meaning any caller could forge an arbitrary payload and have it forwarded verbatim to
    // internal inbound-webhook handlers under any dead-letter id, including ones that don't
    // exist or belong to a different incident than the one actually being replayed.
    const { data: deadLetter, error: fetchErr } = await supabaseAdmin
      .from('webhook_dead_letters')
      .select('id, provider, payload')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !deadLetter) {
      return NextResponse.json({ error: 'Dead letter not found' }, { status: 404 });
    }

    const { provider, payload } = deadLetter;

    let targetUrl = '';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (provider === 'resend') {
      targetUrl = `${baseUrl}/api/webhooks/resend/inbound`;
    } else if (provider === 'twilio_inbound') {
      targetUrl = `${baseUrl}/api/webhooks/twilio/inbound`;
    } else if (provider === 'email_deliverability') {
      targetUrl = `${baseUrl}/api/webhooks/email/deliverability`;
    } else {
      return NextResponse.json({ error: 'Replay not supported for this provider' }, { status: 400 });
    }

    // Prepare payload (Twilio needs FormData, Resend/Deliverability need JSON/Raw)
    let fetchOptions: RequestInit = {
      method: 'POST'
    };

    if (provider === 'twilio_inbound') {
      const formData = new URLSearchParams();
      for (const key in payload) {
        formData.append(key, payload[key]);
      }
      fetchOptions.body = formData.toString();
      fetchOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    } else if (provider === 'resend') {
      // Resend payload object from dead letter actually contains { headers, body }
      fetchOptions.body = payload.body || JSON.stringify(payload);
      fetchOptions.headers = {
         'Content-Type': 'application/json',
         'svix-id': payload.headers?.['svix-id'] || 'replay',
         'svix-timestamp': payload.headers?.['svix-timestamp'] || '',
         'svix-signature': payload.headers?.['svix-signature'] || ''
      };
    } else {
      fetchOptions.body = JSON.stringify(payload);
      fetchOptions.headers = { 'Content-Type': 'application/json' };
    }

    // We do NOT await the target response to fail the replay if the target itself fails.
    // Actually, we SHOULD await to see if the replay succeeded.
    const response = await fetch(targetUrl, fetchOptions);

    if (response.ok) {
      await supabaseAdmin.from('webhook_dead_letters').update({ retry_state: 'resolved' }).eq('id', id);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Target endpoint rejected replay' }, { status: response.status });
    }
  } catch (error: any) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      const clientError = toClientError(error);
      return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
    }
    console.error('[Dead Letter Replay] Failed:', error);
    return NextResponse.json({ error: 'Dead letter replay failed.' }, { status: 500 });
  }
}
