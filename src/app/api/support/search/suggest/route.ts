import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const supabase = await createServerClient();
    const cleanQuery = query.trim();

    // 1. Fetch matching articles by title prefix or substring
    const { data: articles, error: artError } = await supabase
      .from('help_articles')
      .select('title, slug, category')
      .ilike('title', `%${cleanQuery}%`)
      .limit(5);

    if (artError) {
      throw artError;
    }

    // 2. Fetch popular queries matching input from logs
    const { data: popularLogs, error: logError } = await supabase
      .from('help_search_log')
      .select('search_query')
      .ilike('search_query', `%${cleanQuery}%`)
      .limit(20);

    const popularQueries: string[] = [];
    if (!logError && popularLogs) {
      const counts: Record<string, number> = {};
      popularLogs.forEach(log => {
        const q = log.search_query.trim();
        // Skip identical query or very long ones
        if (q && q.toLowerCase() !== cleanQuery.toLowerCase() && q.length < 50) {
          counts[q] = (counts[q] || 0) + 1;
        }
      });
      const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
      popularQueries.push(...sorted.slice(0, 3));
    }

    // Map suggestions to a unified display list
    const suggestions = (articles || []).map(art => ({
      type: 'article',
      title: art.title,
      slug: art.slug,
      category: art.category
    }));

    popularQueries.forEach(pop => {
      // Check duplicate title names
      if (!suggestions.some(s => s.title.toLowerCase() === pop.toLowerCase())) {
        suggestions.push({
          type: 'popular',
          title: pop,
          slug: '',
          category: 'Popular Search'
        });
      }
    });

    return NextResponse.json({ suggestions: suggestions.slice(0, 6) });
  } catch (err: any) {
    console.error('[Autocomplete Suggestion API Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
