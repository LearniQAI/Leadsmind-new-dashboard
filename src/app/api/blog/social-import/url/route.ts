import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'Source URL is required.' }, { status: 400 });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Scraper reached unreachable server: HTTP ${response.status}` }, { status: 400 });
    }

    const html = await response.text();

    // Regex tags for flexible property / content sequence matches
    const getMetaTag = (property: string): string | null => {
      const match1 = html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["'](.*?)["']`, 'i'));
      if (match1) return match1[1];
      const match2 = html.match(new RegExp(`<meta[^>]*content=["'](.*?)["'][^>]*property=["']${property}["']`, 'i'));
      if (match2) return match2[1];
      
      // Fallback to name tags
      const match3 = html.match(new RegExp(`<meta[^>]*name=["']${property.replace('og:', '')}["'][^>]*content=["'](.*?)["']`, 'i'));
      if (match3) return match3[1];
      return null;
    };

    const title = getMetaTag('og:title') || html.match(/<title>(.*?)<\/title>/i)?.[1] || '';
    const description = getMetaTag('og:description') || getMetaTag('description') || '';
    const image = getMetaTag('og:image') || '';

    // HTML Decoders
    const decodeHtml = (str: string) => {
      return str
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    };

    return NextResponse.json({
      title: decodeHtml(title).trim(),
      description: decodeHtml(description).trim(),
      image: image.trim()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Scraper encountered a processing crash.' }, { status: 500 });
  }
}
