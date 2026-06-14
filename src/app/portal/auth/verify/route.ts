import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_key_leadsmind_jwt_passwordless_token'
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!token) {
    return NextResponse.redirect(`${appUrl}/auth/portal/login?error=Missing token`);
  }

  try {
    // 1. Verify custom cryptographic JWT token
    const { payload } = await jwtVerify(token, secret);
    const email = payload.email as string;

    if (!email) {
      throw new Error('Invalid token payload');
    }

    // 2. Validate that portal access is still enabled in DB
    const { data: contacts } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('email', email)
      .eq('portal_access_enabled', true)
      .eq('portal_access_revoked', false);

    if (!contacts || contacts.length === 0) {
      return NextResponse.redirect(`${appUrl}/auth/portal/login?error=Portal access revoked or disabled`);
    }

    // 3. Hash token to look up tracking record in DB
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { data: record, error: dbErr } = await supabaseAdmin
      .from('student_magic_links')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (dbErr || !record) {
      return NextResponse.redirect(`${appUrl}/auth/portal/login?error=Link invalid or not found`);
    }

    // 4. Restrict lifecycle and verify usage state
    if (record.used) {
      return NextResponse.redirect(`${appUrl}/auth/portal/login?error=Link has already been used`);
    }

    if (new Date() > new Date(record.expires_at)) {
      return NextResponse.redirect(`${appUrl}/auth/portal/login?error=Link has expired`);
    }

    // 5. Invalidate the token immediately and update contact's last login timestamp
    await Promise.all([
      supabaseAdmin
        .from('student_magic_links')
        .update({ used: true })
        .eq('id', record.id),
      supabaseAdmin
        .from('contacts')
        .update({ last_login_at: new Date().toISOString() })
        .in('id', contacts.map(c => c.id))
    ]);

    // 6. Generate active Supabase browser session redirect
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${appUrl}/portal/dashboard`
      }
    });

    if (linkErr || !linkData?.properties?.action_link) {
      throw new Error('Failed to establish session credentials');
    }

    return NextResponse.redirect(linkData.properties.action_link);
  } catch (err: any) {
    console.error('[Portal Magic Link Verification Error]:', err.message);
    return NextResponse.redirect(`${appUrl}/auth/portal/login?error=Verification failed: ${encodeURIComponent(err.message)}`);
  }
}
