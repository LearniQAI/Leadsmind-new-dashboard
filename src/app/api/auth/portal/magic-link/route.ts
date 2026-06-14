import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';
import { sendSMS } from '@/lib/sms';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_key_leadsmind_jwt_passwordless_token'
);

export async function POST(req: NextRequest) {
  try {
    const { email, channel } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Verify that the contact exists and has portal access enabled
    const { data: contacts, error: fetchErr } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('email', cleanEmail)
      .eq('portal_access_enabled', true)
      .eq('portal_access_revoked', false);

    if (fetchErr || !contacts || contacts.length === 0) {
      return NextResponse.json({ error: 'Portal access is not enabled for this email.' }, { status: 403 });
    }

    const contact = contacts[0];

    // 2. Generate JWT Token with 15-minute expiration
    const token = await new SignJWT({ email: cleanEmail })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secret);

    // 3. Hash token for security tracking
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 4. Save magic link entry to DB
    const { error: dbErr } = await supabaseAdmin.from('student_magic_links').insert({
      email: cleanEmail,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });

    if (dbErr) {
      throw new Error('Failed to record token state');
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const magicLinkUrl = `${appUrl}/portal/auth/verify?token=${token}`;

    if (channel === 'whatsapp' && contact.phone) {
      // Send magic link via WhatsApp
      await sendSMS({
        to: 'whatsapp:' + contact.phone,
        message: `Your LeadsMind Client Portal Magic Access Link (expires in 15 mins): ${magicLinkUrl}`
      });
    } else {
      // Send magic link via Email
      await sendEmail({
        to: cleanEmail,
        subject: 'LeadsMind Portal: Magic Access Link',
        html: `
          <div style="font-family:sans-serif;padding:30px;color:#333;line-height:1.6;max-width:500px;margin:0 auto;border:1px solid rgba(0,0,0,0.05);border-radius:16px;background-color:#fafafa;">
            <h2 style="color:#2563eb;margin-bottom:15px;text-transform:uppercase;font-family:monospace;letter-spacing:1px;">Client Portal Sign In</h2>
            <p>Hello,</p>
            <p>Please click the button below to verify your session and access the LeadsMind Client Portal:</p>
            <div style="margin:30px 0;text-align:center;">
              <a href="${magicLinkUrl}" style="background-color:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:bold;font-size:13px;display:inline-block;text-transform:uppercase;letter-spacing:1px;box-shadow:0 4px 12px rgba(37,99,235,0.15);">Sign In to Portal</a>
            </div>
            <p style="font-size:11px;color:#666;">This secure magic link is active for <strong>15 minutes</strong> and will be invalidated after first use.</p>
            <p style="font-size:11px;color:#888;">If the button doesn't work, copy and paste this link: <br/><a href="${magicLinkUrl}" style="color:#2563eb;">${magicLinkUrl}</a></p>
          </div>
        `
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Portal Magic Link Error]:', err.message);
    return NextResponse.json({ error: err.message || 'Verification flow failed' }, { status: 500 });
  }
}
