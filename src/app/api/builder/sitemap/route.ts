import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get('websiteId');

    if (!websiteId) {
      return NextResponse.json({ error: 'Missing websiteId parameter' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch website and workspace details
    const { data: website, error: wsError } = await supabase
      .from('websites')
      .select('id, subdomain, custom_domain, workspaces(slug)')
      .eq('id', websiteId)
      .single();

    if (wsError || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // 2. Fetch all pages
    const { data: wsPages } = await supabase
      .from('website_pages')
      .select('path, updated_at')
      .eq('website_id', websiteId);

    const workspaceSlug = (website.workspaces as any)?.slug || 'default';
    const baseUrl = website.custom_domain
      ? `https://${website.custom_domain}`
      : `https://leadsmind.com/p/${workspaceSlug}/${website.subdomain}`;

    // 3. Construct XML
    const sitemapEntries = (wsPages || []).map((page) => {
      const cleanPath = page.path === '/' ? '' : page.path;
      const lastMod = page.updated_at ? new Date(page.updated_at).toISOString() : new Date().toISOString();
      return `
        <url>
          <loc>${baseUrl}${cleanPath}</loc>
          <lastmod>${lastMod}</lastmod>
          <changefreq>daily</changefreq>
          <priority>${page.path === '/' ? '1.0' : '0.8'}</priority>
        </url>
      `;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${sitemapEntries}
      </urlset>
    `.trim();

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600'
      }
    });

  } catch (error: any) {
    console.error('[Sitemap API Error]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
