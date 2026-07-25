import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Release-note content itself is low-sensitivity (admin-authored changelog copy, no
// workspace/user data) — but both real callers (DashboardHeader, HelpDrawer) only ever render
// inside the authenticated dashboard shell, and nothing depends on this being reachable without
// a session. A basic auth check costs those callers nothing and keeps this consistent with the
// rest of the dashboard's API surface rather than being open with no concrete reason to be.
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const route = searchParams.get('route');

    if (!route) {
      return NextResponse.json({ data: [] });
    }

    const supabase = await createServerClient();
    let normalizedPath = route.trim();
    if (normalizedPath !== '/' && normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.slice(0, -1);
    }

    const { data, error } = await supabase
      .from('platform_release_notes')
      .select('id, title, description, screen_route, created_at')
      .eq('is_active', true)
      .eq('screen_route', normalizedPath)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    console.error('[API Platform Release Notes Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
