import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// The consentId is a bearer token (mailed/texted link, no login expected) — without an expiry
// window it would remain valid forever if ever leaked (email compromise, forwarding, log
// capture, browser history). 7 days matches the recovery-link precedent used elsewhere.
const CONSENT_LINK_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * POST /api/kyc/consent/submit
 * Submits the signed POPIA consent record, updating its status to obtained and capturing signature / audit metadata
 */
export async function POST(req: NextRequest) {
  try {
    const { consentId, signatureData, deviceFingerprint } = await req.json();

    if (!consentId || !signatureData) {
      return NextResponse.json({ error: 'consentId and signatureData are required' }, { status: 400 });
    }

    const clientIP = (
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1'
    );

    const adminClient = createAdminClient();

    // 1. Fetch current consent log
    const { data: consent, error: fetchErr } = await adminClient
      .from('kyc_consent')
      .select('*')
      .eq('id', consentId)
      .single();

    if (fetchErr || !consent) {
      return NextResponse.json({ error: 'KYC consent record not found' }, { status: 404 });
    }

    if (consent.status === 'obtained') {
      return NextResponse.json({ success: true, message: 'Consent already obtained' });
    }

    // Reject and mark expired if the link is older than the expiry window — a single-use
    // check alone doesn't stop a leaked, never-yet-used link from being redeemed indefinitely.
    const ageMs = Date.now() - new Date(consent.created_at).getTime();
    if (consent.status !== 'pending' || ageMs > CONSENT_LINK_EXPIRY_MS) {
      if (consent.status === 'pending') {
        await adminClient.from('kyc_consent').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', consentId);
      }
      return NextResponse.json({ error: 'This consent link is no longer valid' }, { status: 410 });
    }

    // 2. Perform database updates
    const { error: updateErr } = await adminClient
      .from('kyc_consent')
      .update({
        status: 'obtained',
        ip_address: clientIP,
        device_fingerprint: deviceFingerprint || req.headers.get('user-agent') || 'Unknown Agent',
        signature_data: signatureData,
        consent_given_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', consentId);

    if (updateErr) {
      throw new Error('Failed to update consent status: ' + updateErr.message);
    }

    // 3. Register contact activity trace
    const checkListLabel = consent.check_types && consent.check_types.length > 0
      ? consent.check_types.join(', ').toUpperCase()
      : 'IDENTITY';

    await adminClient.from('contact_activities').insert({
      workspace_id: consent.workspace_id,
      contact_id: consent.contact_id,
      type: 'edit',
      description: `POPIA consent obtained online. Signed for verifications: [${checkListLabel}]`
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[POST /api/kyc/consent/submit Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to register consent submission' }, { status: 500 });
  }
}
