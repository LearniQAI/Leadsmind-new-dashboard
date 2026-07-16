import React from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { SearchResultsGrid } from '@/components/lead-finder/SearchResultsGrid';
import { ArrowLeft, Target, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default async function LeadFinderResultsPage({
  searchParams,
}: {
  searchParams: { searchId?: string };
}) {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();
  let results: any[] = [];
  let search: any = null;
  let loadError: string | null = null;

  if (!workspaceId) {
    loadError = 'No active workspace found.';
  } else if (searchParams.searchId) {
    // Fetch search details — explicit workspace_id filter, defense in depth
    // on top of RLS (not a substitute for it).
    const { data: searchData, error: searchError } = await supabase
      .from('lead_finder_searches')
      .select('*')
      .eq('id', searchParams.searchId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (searchError) {
      loadError = 'Failed to load this search. Please try again.';
    } else if (!searchData) {
      // Either the search doesn't exist, or it belongs to another
      // workspace — the .eq('workspace_id', workspaceId) above already
      // means it just isn't returned. Don't fetch results for a search we
      // couldn't verify belongs to this workspace.
      loadError = 'Search not found.';
    } else {
      search = searchData;

      // lead_finder_results has no workspace_id column of its own — its
      // real tenant boundary is the search it belongs to, which was just
      // verified above to belong to this workspace. Scoping by that
      // already-verified search_id is the correct defense-in-depth filter
      // here, not a fabricated workspace_id column that doesn't exist.
      const { data: resultsData, error: resultsError } = await supabase
        .from('lead_finder_results')
        .select('*')
        .eq('search_id', search.id)
        .order('rating', { ascending: false });

      if (resultsError) {
        loadError = 'Failed to load results for this search. Please try again.';
      } else if (resultsData) {
        results = resultsData;
      }
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
                className="inline-flex items-center gap-2 text-sm font-bold !text-dash-textMuted hover:!text-dash-text transition-colors mb-2"
              >
                <ArrowLeft size={16} /> Back to Search
              </Link>
              <h1 className="text-3xl font-black !text-dash-text flex items-center gap-3">
                <Target className="text-dash-accent" />
                Search Results
              </h1>
              {search && (
                <p className="text-sm !text-dash-textMuted mt-1">
                  Found {results.length} leads for <strong className="!text-dash-text">{search.search_type === 'keyword' ? search.keywords : search.business_type}</strong> in <strong className="!text-dash-text">{search.location}</strong>.
                </p>
              )}
            </div>
          </div>

          {loadError ? (
            <div className="bg-white border border-red-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-xl font-bold !text-dash-text mb-2">Couldn't load these results</h2>
              <p className="!text-dash-textMuted max-w-md mx-auto">{loadError}</p>
              <Link
                href="/lead-finder"
                className="mt-6 px-6 py-3 bg-dash-accent text-white font-bold tracking-wider rounded-xl hover:bg-dash-accent/90 transition-colors"
              >
                Back to Search
              </Link>
            </div>
          ) : results.length > 0 ? (
            <SearchResultsGrid results={results} />
          ) : (
            <div className="bg-white border border-dash-border rounded-3xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-dash-surface rounded-full flex items-center justify-center mb-6">
                <Target className="w-10 h-10 !text-dash-textMuted" />
              </div>
              <h2 className="text-xl font-bold !text-dash-text mb-2">No Results Found</h2>
              <p className="!text-dash-textMuted max-w-md mx-auto">
                We couldn't find any leads matching your criteria in that location. Try expanding the radius or using different keywords.
              </p>
              <Link 
                href="/lead-finder" 
                className="mt-6 px-6 py-3 bg-dash-accent text-white font-bold tracking-wider rounded-xl hover:bg-dash-accent/90 transition-colors"
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
