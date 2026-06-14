import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json();

    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone number and verification code are required.' }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    const cleanCode = code.trim();
    const codeHash = crypto.createHash('sha256').update(cleanCode).digest('hex');

    // 1. Fetch valid, unused OTP
    const { data: record, error: dbErr } = await supabaseAdmin
      .from('portal_otps')
      .select('*, contact:contacts(*)')
      .eq('phone', cleanPhone)
      .eq('code_hash', codeHash)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbErr || !record || !record.contact) {
      return NextResponse.json({ error: 'Invalid or expired verification PIN.' }, { status: 400 });
    }

    // 2. Mark OTP as used
    await supabaseAdmin
      .from('portal_otps')
      .update({ used: true })
      .eq('id', record.id);

    // 3. Check if contact has portal access active
    const contact = record.contact;
    if (!contact.portal_access_enabled || contact.portal_access_revoked) {
      return NextResponse.json({ error: 'Portal access is disabled for this account.' }, { status: 403 });
    }

    // 4. Generate Supabase session redirect link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: contact.email,
      options: {
        redirectTo: `${appUrl}/portal/dashboard`
      }
    });

    if (linkErr || !linkData?.properties?.action_link) {
      throw new Error('Failed to establish session credentials');
    }

    return NextResponse.json({ success: true, redirectUrl: linkData.properties.action_link });
  } catch (err: any) {
    console.error('[Portal OTP Verify Error]:', err.message);
    return NextResponse.json({ error: err.message || 'OTP verification failed' }, { status: 500 });
  }
}
