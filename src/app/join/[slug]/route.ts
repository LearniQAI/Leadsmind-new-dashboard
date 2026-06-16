import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;
  if (!slug) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const supabase = createAdminClient();
  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (!ws) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.redirect(
    new URL(`/affiliate-portal/register?workspace=${slug}`, request.url)
  );
}
