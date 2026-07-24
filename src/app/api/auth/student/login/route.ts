import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('[FATAL] JWT_SECRET is not configured');
    }
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);

    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Only ever dispatch a login link to an email that actually matches a real student/contact
    // record — previously this endpoint would happily mint a valid session-granting token and
    // email it to ANY address regardless of whether that person was a known student anywhere,
    // and the verify step would then auto-create a brand-new Supabase account for a stranger.
    // The response is intentionally identical either way to avoid leaking which emails exist.
    const { data: matchingContacts } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('email', cleanEmail)
      .limit(1);

    if (!matchingContacts || matchingContacts.length === 0) {
      return NextResponse.json({ success: true });
    }

    // 1. Generate JWT Token with 15-minute expiration
    const token = await new SignJWT({ email: cleanEmail })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secret);

    // 2. Hash token for secure tracking and single-use validation
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 3. Save magic link entry to DB
    const { error: dbErr } = await supabaseAdmin.from('student_magic_links').insert({
      email: cleanEmail,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });

    if (dbErr) {
      console.error('[Magic Link Login] Database insertion error:', dbErr.message);
      throw new Error('Failed to record token state');
    }

    // 4. Generate absolute link URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const magicLinkUrl = `${appUrl}/auth/student/verify?token=${token}`;

    // 5. Send magic link email
    await sendEmail({
      to: cleanEmail,
      subject: 'LeadsMind Student Portal: Magic Access Token',
      html: `
        <div style="font-family:sans-serif;padding:30px;color:#333;line-height:1.6;max-width:500px;margin:0 auto;border:1px solid rgba(0,0,0,0.05);border-radius:16px;background-color:#fafafa;">
          <h2 style="color:#2563eb;margin-bottom:15px;text-transform:uppercase;font-family:monospace;letter-spacing:1px;">Student Portal Sign In</h2>
          <p>Hello,</p>
          <p>We received a request to log in to the LeadsMind student learning portal. Please click the button below to verify your session and access your courses:</p>
          <div style="margin:30px 0;text-align:center;">
            <a href="${magicLinkUrl}" style="background-color:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:bold;font-size:13px;display:inline-block;text-transform:uppercase;letter-spacing:1px;box-shadow:0 4px 12px rgba(37,99,235,0.15);">Sign In to Dashboard</a>
          </div>
          <p style="font-size:11px;color:#666;">This secure magic link is active for <strong>15 minutes</strong> and will be invalidated immediately after its first use.</p>
          <p style="font-size:11px;color:#888;">If the button doesn't work, copy and paste this link: <br/><a href="${magicLinkUrl}" style="color:#2563eb;">${magicLinkUrl}</a></p>
          <hr style="border:none;border-top:1px solid #eaeaea;margin:25px 0;" />
          <p style="font-size:10px;color:#bbb;text-align:center;">LeadsMind Education Engine • Operational Node</p>
        </div>
      `
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Magic Link Login Error]:', err.message);
    return NextResponse.json({ error: err.message || 'Verification flow failed' }, { status: 500 });
  }
}
