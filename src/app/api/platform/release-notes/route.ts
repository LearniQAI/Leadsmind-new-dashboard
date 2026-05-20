import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
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
