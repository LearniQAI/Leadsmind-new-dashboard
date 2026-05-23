import React from 'react';
import { createServerClient } from '@/lib/supabase/server';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { SearchResultsGrid } from '@/components/lead-finder/SearchResultsGrid';
import { ArrowLeft, Target, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default async function LeadFinderResultsPage({
  searchParams,
}: {
  searchParams: { searchId?: string };
}) {
  const supabase = await createServerClient();
  let results: any[] = [];
  let search: any = null;

  if (searchParams.searchId) {
    // Fetch search details
    const { data: searchData } = await supabase
      .from('lead_finder_searches')
      .select('*')
      .eq('id', searchParams.searchId)
      .single();
    
    search = searchData;

    // Fetch results
    const { data: resultsData } = await supabase
      .from('lead_finder_results')
      .select('*')
      .eq('search_id', searchParams.searchId)
      .order('rating', { ascending: false });

    if (resultsData) {
      results = resultsData;
    }
  }

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <Link 
                href="/lead-finder" 
                className="inline-flex items-center gap-2 text-sm font-bold text-t3 hover:text-white transition-colors mb-2"
              >
                <ArrowLeft size={16} /> Back to Search
              </Link>
              <h1 className="text-3xl font-space font-black text-white flex items-center gap-3">
                <Target className="text-accent" />
                Search Results
              </h1>
              {search && (
                <p className="text-sm text-t3 mt-1">
                  Found {results.length} leads for <strong className="text-white">{search.search_type === 'keyword' ? search.keywords : search.business_type}</strong> in <strong className="text-white">{search.location}</strong>.
                </p>
              )}
            </div>
          </div>

          {results.length > 0 ? (
            <SearchResultsGrid results={results} />
          ) : (
            <div className="bg-n900 border border-white/5 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                <Target className="w-10 h-10 text-t4" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No Results Found</h2>
              <p className="text-t3 max-w-md mx-auto">
                We couldn't find any leads matching your criteria in that location. Try expanding the radius or using different keywords.
              </p>
              <Link 
                href="/lead-finder" 
                className="mt-6 px-6 py-3 bg-accent text-white font-bold uppercase tracking-wider rounded-xl hover:bg-accent-hover transition-colors"
              >
                New Search
              </Link>
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  );
}
