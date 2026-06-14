import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Fetch contact
    const { data: contacts, error: fetchErr } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('email', cleanEmail)
      .eq('portal_access_enabled', true)
      .eq('portal_access_revoked', false);

    if (fetchErr || !contacts || contacts.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const contact = contacts[0];

    // 2. Check if client has set a password
    if (!contact.portal_password_hash) {
      return NextResponse.json({ 
        error: 'No password set yet for this account. Please sign in via Magic Link first and set a password in your Profile.' 
      }, { status: 400 });
    }

    // 3. Verify password hash
    const isMatch = bcrypt.compareSync(password, contact.portal_password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // 4. Generate Supabase session redirect link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: cleanEmail,
      options: {
        redirectTo: `${appUrl}/portal/dashboard`
      }
    });

    if (linkErr || !linkData?.properties?.action_link) {
      throw new Error('Failed to establish session credentials');
    }

    return NextResponse.json({ success: true, redirectUrl: linkData.properties.action_link });
  } catch (err: any) {
    console.error('[Portal Password Login Error]:', err.message);
    return NextResponse.json({ error: err.message || 'Authentication failed' }, { status: 500 });
  }
}
