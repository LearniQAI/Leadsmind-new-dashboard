import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { validateExternalUrl, UrlValidationError } from '@/lib/security/validateUrl';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult;

  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'Source URL is required.' }, { status: 400 });

    let validUrl: URL;
    try {
      validUrl = validateExternalUrl(url);
    } catch (e) {
      const message = e instanceof UrlValidationError ? e.message : 'Invalid URL.';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const response = await fetch(validUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Scraper reached unreachable server: HTTP ${response.status}` }, { status: 400 });
    }

    const html = await response.text();

    // Resilient Meta tag scraper
    const getMetaTag = (property: string): string | null => {
      const properties = [
        property,
        property.startsWith('og:') ? property.replace('og:', '') : `og:${property}`,
        property.startsWith('twitter:') ? property.replace('twitter:', '') : `twitter:${property}`
      ];
      
      for (const prop of properties) {
        const regexes = [
          new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["'](.*?)["']`, 'i'),
          new RegExp(`<meta[^>]*content=["'](.*?)["'][^>]*property=["']${prop}["']`, 'i'),
          new RegExp(`<meta[^>]*name=["']${prop}["'][^>]*content=["'](.*?)["']`, 'i'),
          new RegExp(`<meta[^>]*content=["'](.*?)["'][^>]*name=["']${prop}["']`, 'i'),
          new RegExp(`<meta[^>]*itemprop=["']${prop}["'][^>]*content=["'](.*?)["']`, 'i')
        ];
        
        for (const regex of regexes) {
          const match = html.match(regex);
          if (match && match[1]) return match[1];
        }
      }
      return null;
    };

    const title = getMetaTag('og:title') || html.match(/<title>(.*?)<\/title>/i)?.[1] || html.match(/<h1>(.*?)<\/h1>/i)?.[1] || '';
    
    let description = getMetaTag('og:description') || getMetaTag('description') || '';
    if (!description) {
      const pMatch = html.match(/<p[^>]*>(.*?)<\/p>/i);
      if (pMatch) {
        description = pMatch[1].replace(/<[^>]*>/g, '');
      }
    }
    
    const image = getMetaTag('og:image') || getMetaTag('twitter:image') || '';

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
