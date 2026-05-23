import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getOpportunityDashboardData } from '@/app/actions/opportunity-workspace';
import { OpportunityRankingCard } from '@/components/lead-finder/OpportunityRankingCard';
import { Target, TrendingUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default async function OpportunitiesDashboardPage() {
  const { success, data, error } = await getOpportunityDashboardData();

  if (!success) {
    return (
      <Wrapper>
        <div className="p-12 text-center text-white">Error loading opportunity dashboard: {error}</div>
      </Wrapper>
    );
  }

  const highOpps = data?.filter((o: any) => o.tier === 'High') || [];
  const mediumOpps = data?.filter((o: any) => o.tier === 'Medium') || [];
  const lowOpps = data?.filter((o: any) => o.tier === 'Low') || [];

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-space font-black text-white mb-2 flex items-center gap-3">
            <Target className="text-accent" size={32} /> Revenue Opportunities
          </h1>
          <p className="text-t3">Prioritized prospects based on digital footprint, reputation deficits, and engagement.</p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-n800 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <TrendingUp size={80} className="text-emerald-400" />
            </div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">High Priority</p>
            <h3 className="text-4xl font-space font-black text-white">{highOpps.length}</h3>
            <p className="text-sm text-t4 mt-2">Ready for immediate strategic outreach.</p>
          </div>
          
          <div className="bg-n800 border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Target size={80} className="text-amber-400" />
            </div>
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Medium Priority</p>
            <h3 className="text-4xl font-space font-black text-white">{mediumOpps.length}</h3>
            <p className="text-sm text-t4 mt-2">Requires nurturing or manual verification.</p>
          </div>

          <div className="bg-n800 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <AlertCircle size={80} className="text-white" />
            </div>
            <p className="text-xs font-bold text-t4 uppercase tracking-widest mb-2">Low Priority</p>
            <h3 className="text-4xl font-space font-black text-white">{lowOpps.length}</h3>
            <p className="text-sm text-t4 mt-2">Standard prospects or incomplete profiles.</p>
          </div>
        </div>

        {/* Top Opportunities Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-space font-bold text-white">Top Ranked Opportunities</h2>
            <Link href="/lead-finder" className="text-sm font-bold text-accent hover:text-accent-hover transition-colors">
              Discover More Leads
            </Link>
          </div>

          {data && data.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.map((opp: any) => (
                <OpportunityRankingCard key={opp.id} opp={opp} />
              ))}
            </div>
          ) : (
            <div className="text-center p-12 bg-n800 border border-white/5 rounded-2xl">
              <Target size={48} className="text-t4 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-white mb-2">No Opportunities Analyzed</h3>
              <p className="text-sm text-t3 mb-6">Analyze leads in the Lead Workspace to generate opportunity scores.</p>
              <Link href="/lead-finder" className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors inline-block">
                Go to Lead Finder
              </Link>
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  );
}
