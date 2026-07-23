import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { RecoveryTokenHandler } from '@/lib/persistence/RecoveryTokenHandler';
import { RecoveryManager } from '@/lib/persistence/RecoveryManager';

// Basic IP rate limiting — this is a public, unauthenticated endpoint that dispatches a real
// email to an arbitrary attacker-supplied address; without a limit, it's a spam vector.
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const formId = params.id;

  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const now = Date.now();
  const rateData = rateLimitMap.get(ip) || { count: 0, lastReset: now };
  if (now - rateData.lastReset > RATE_LIMIT_WINDOW) {
    rateData.count = 1;
    rateData.lastReset = now;
  } else {
    rateData.count++;
    if (rateData.count > MAX_REQUESTS) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  }
  rateLimitMap.set(ip, rateData);

  try {
    const { email, sessionId } = await req.json();
    if (!email || !sessionId) {
      return NextResponse.json(
        { error: 'Missing email or sessionId' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Fetch form info and config
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('name, config')
      .eq('id', formId)
      .single();

    if (formError || !form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    const config = form.config || {};
    const recoveryEmailEnabled = config.recoveryEmailEnabled ?? false;
    const sessionExpirationDays = config.sessionExpirationDays ?? 7;

    if (!recoveryEmailEnabled) {
      return NextResponse.json(
        { error: 'Recovery emails are disabled for this form' },
        { status: 400 }
      );
    }

    // 2. Generate secure token & expiration
    const token = RecoveryTokenHandler.createToken();
    const expiresAt = RecoveryTokenHandler.getExpirationDate(sessionExpirationDays);

    // 3. Update the existing partial submission or insert it
    const { error: upsertError } = await supabase
      .from('form_partial_submissions')
      .upsert({
        form_id: formId,
        session_id: sessionId,
        email: email,
        recovery_token: token,
        recovery_token_expires_at: expiresAt.toISOString(),
      }, { onConflict: 'form_id,session_id' });

    if (upsertError) {
      console.error('[RecoveryLinkAPI] Upsert error:', upsertError);
      return NextResponse.json(
        { error: 'Failed to generate recovery session' },
        { status: 500 }
      );
    }

    // 4. Send the recovery email
    const recoveryLink = RecoveryManager.generateRecoveryLink(formId, token);
    const emailRes = await RecoveryManager.sendRecoveryEmail(
      email,
      form.name,
      recoveryLink
    );

    if (!emailRes.success) {
      return NextResponse.json(
        { error: emailRes.error || 'Failed to send recovery email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[RecoveryLinkAPI] Unhandled error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
