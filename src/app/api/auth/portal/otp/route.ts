import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendSMS } from '@/lib/sms';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Please provide a valid phone number.' }, { status: 400 });
    }

    const cleanPhone = phone.trim();

    // 1. Fetch contact matching phone
    const { data: contacts, error: fetchErr } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('phone', cleanPhone)
      .eq('portal_access_enabled', true)
      .eq('portal_access_revoked', false);

    if (fetchErr || !contacts || contacts.length === 0) {
      return NextResponse.json({ error: 'Portal access is not enabled for this phone number.' }, { status: 403 });
    }

    const contact = contacts[0];

    // 2. Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    // 3. Save to portal_otps
    const { error: dbErr } = await supabaseAdmin.from('portal_otps').insert({
      contact_id: contact.id,
      phone: cleanPhone,
      code_hash: codeHash,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
    });

    if (dbErr) {
      throw new Error('Failed to record OTP token');
    }

    // 4. Send WhatsApp message
    await sendSMS({
      to: 'whatsapp:' + cleanPhone,
      message: `Your LeadsMind Client Portal Verification PIN: ${code}. Valid for 5 minutes.`
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Portal OTP Request Error]:', err.message);
    return NextResponse.json({ error: err.message || 'OTP generation failed' }, { status: 500 });
  }
}
