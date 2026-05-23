import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { SearchFilters } from '@/components/lead-finder/SearchFilters';
import { SavedSearchManager } from '@/components/lead-finder/SavedSearchManager';
import { Target, Zap } from 'lucide-react';

export default function LeadFinderPage() {
  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
        <div className="flex flex-col gap-8">
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-n900 to-[#0a1128] border border-white/10 p-8 md:p-12">
            <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
              <Target className="w-64 h-64 text-accent" />
            </div>
            
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-widest mb-6">
                <Zap size={14} /> New Feature MVP
              </div>
              <h1 className="text-4xl md:text-5xl font-space font-black text-white mb-4 leading-tight">
                Discover <span className="text-accent">High-Intent</span> Leads on Autopilot.
              </h1>
              <p className="text-lg text-t3 mb-0">
                Search globally through Google Places, enrich data instantly, and add verified prospects directly into your CRM pipeline with a single click.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <React.Suspense fallback={<div className="h-64 bg-n900 border border-white/10 rounded-2xl animate-pulse"></div>}>
                <SearchFilters />
              </React.Suspense>
            </div>
            <div className="lg:col-span-1">
              <SavedSearchManager />
            </div>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
