import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!token) {
    return NextResponse.redirect(`${appUrl}/auth/student/login?error=Missing token`);
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('[FATAL] JWT_SECRET is not configured');
    }
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);

    // 1. Verify custom cryptographic JWT token
    const { payload } = await jwtVerify(token, secret);
    const email = payload.email as string;

    if (!email) {
      throw new Error('Invalid token payload');
    }

    // 2. Hash token to look up tracking record in DB
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { data: record, error: dbErr } = await supabaseAdmin
      .from('student_magic_links')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (dbErr || !record) {
      return NextResponse.redirect(`${appUrl}/auth/student/login?error=Link invalid or not found`);
    }

    // 3. Restrict life cycle and verify usage state
    if (record.used) {
      return NextResponse.redirect(`${appUrl}/auth/student/login?error=Link has already been used`);
    }

    if (new Date() > new Date(record.expires_at)) {
      return NextResponse.redirect(`${appUrl}/auth/student/login?error=Link has expired`);
    }

    // 4. Immediately invalidate the token in DB to make it single-use and update last login
    const { data: contacts } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('email', email);
    const contactIds = (contacts || []).map(c => c.id);

    // Defense in depth: even if a stale/forged magic-link row somehow exists for a
    // non-student email, never mint a real Supabase account + session for it here.
    if (contactIds.length === 0) {
      return NextResponse.redirect(`${appUrl}/auth/student/login?error=No student record found for this email`);
    }

    const [{ error: updateErr }] = await Promise.all([
      supabaseAdmin
        .from('student_magic_links')
        .update({ used: true })
        .eq('id', record.id),
      contactIds.length > 0 ? supabaseAdmin
        .from('contacts')
        .update({ last_login_at: new Date().toISOString() })
        .in('id', contactIds) : Promise.resolve({ error: null })
    ]);

    if (updateErr) {
      throw new Error('Failed to update token state');
    }

    // 5. Generate active Supabase browser session redirect
    // This will register the user automatically if they don't exist yet
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${appUrl}/student`
      }
    });

    if (linkErr || !linkData?.properties?.action_link) {
      console.error('[Magic Link Verification] Supabase link generation error:', linkErr?.message);
      throw new Error('Failed to establish session credentials');
    }

    // 6. Redirect the user to establish the active browser session
    return NextResponse.redirect(linkData.properties.action_link);
  } catch (err: any) {
    console.error('[Magic Link Verification Error]:', err.message);
    return NextResponse.redirect(`${appUrl}/auth/student/login?error=Verification failed: ${encodeURIComponent(err.message)}`);
  }
}
