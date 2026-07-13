import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { SavedSearchManager } from '@/components/lead-finder/SavedSearchManager';
import { ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';

export default function LeadFinderSavedPage() {
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
                <Clock className="text-dash-accent" />
                Saved Searches
              </h1>
              <p className="text-sm !text-dash-textMuted mt-1">
                View your previous lead generation queries and their results.
              </p>
            </div>
            
            <Link 
              href="/lead-finder" 
              className="px-6 py-2.5 bg-dash-accent text-white font-bold tracking-wider rounded-xl hover:bg-dash-accent/90 transition-colors"
            >
              New Search
            </Link>
          </div>

          <div className="max-w-4xl">
            <SavedSearchManager />
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
