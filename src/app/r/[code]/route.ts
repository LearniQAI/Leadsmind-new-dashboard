import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + '|lm_salt').digest('hex');
}

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = params.code;
  const supabase = createAdminClient();

  try {
    // 1. Fetch affiliate by short code
    const { data: affiliate, error: affError } = await supabase
      .from('affiliates')
      .select('*, programme:affiliate_programmes(*)')
      .eq('short_code', code)
      .eq('status', 'approved')
      .maybeSingle();

    if (affError || !affiliate || !affiliate.programme) {
      // If code is invalid or not approved, redirect to home page
      return NextResponse.redirect(new URL('/', req.url));
    }

    const programme = affiliate.programme;
    
    // Resolve landing URL from programme settings or default to home page
    let landingUrlString = '/';
    try {
      const regSettings = typeof programme.registration_settings === 'string'
        ? JSON.parse(programme.registration_settings)
        : programme.registration_settings;
      if (regSettings?.landing_url) {
        landingUrlString = regSettings.landing_url;
      }
    } catch (e) {}

    // Ensure the landing URL has ?ref= short_code preserved
    const landingUrl = new URL(landingUrlString, req.url);
    landingUrl.searchParams.set('ref', code);

    // 2. Log click with hashed IP
    const ip = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
    const ipHash = hashIp(ip.split(',')[0].trim());
    const userAgent = req.headers.get('user-agent') || '';

    // Check if the click is unique (no clicks from same IP hash in last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentClick } = await supabase
      .from('affiliate_clicks')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .eq('ip_hash', ipHash)
      .gt('created_at', twentyFourHoursAgo)
      .limit(1)
      .maybeSingle();

    const isUnique = !recentClick;

    await supabase.from('affiliate_clicks').insert({
      affiliate_id: affiliate.id,
      programme_id: programme.id,
      workspace_id: affiliate.workspace_id,
      ip_hash: ipHash,
      user_agent: userAgent,
      landing_url: landingUrl.toString(),
      is_unique: isUnique
    });

    // 3. Set cookie `lm_ref`
    const cookieValue = JSON.stringify({
      affiliate_id: affiliate.id,
      programme_id: programme.id,
      ts: Date.now()
    });

    const response = NextResponse.redirect(landingUrl.toString(), 302);
    
    // Calculate max age in seconds
    const days = programme.cookie_days || 7;
    const maxAge = days === 0 ? 10 * 365 * 24 * 60 * 60 : days * 24 * 60 * 60; // 0 means 10 years / unlimited

    response.cookies.set('lm_ref', cookieValue, {
      path: '/',
      maxAge,
      httpOnly: false, // Accessible by client side attribution script if needed
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    return response;
  } catch (err) {
    console.error('[Affiliate Redirect Error]:', err);
    return NextResponse.redirect(new URL('/', req.url));
  }
}
