import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUser } from '@/lib/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // The browser client (components/admin/DeadLetterPanel.tsx) never sends an Authorization
    // header at all — it relies on the session cookie, same as the page that renders it. The
    // previous code read the header and did nothing with it, so this endpoint had no real
    // auth. There is no platform-staff/superadmin role in this codebase distinct from
    // per-workspace roles, so this matches the same bar the page itself already enforces
    // (real session required) rather than inventing a bearer-token scheme nothing calls with.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, provider, payload } = await req.json();

    if (!id || !provider || !payload) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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
    console.error('[Dead Letter Replay] Failed:', error);
    return NextResponse.json({ error: 'Dead letter replay failed.' }, { status: 500 });
  }
}
