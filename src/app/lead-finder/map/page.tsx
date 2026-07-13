import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getTerritoryMapData } from '@/app/actions/territory-workspace';
import { OpportunityMapLayer } from '@/components/lead-finder/OpportunityMapLayer';
import { Map as MapIcon, Target, Users } from 'lucide-react';

export default async function TerritoryDashboardPage() {
  const { success, data, error } = await getTerritoryMapData();

  if (!success || !data) {
    return (
      <Wrapper>
        <div className="p-12 text-center !text-dash-textMuted">Error loading territory map data.</div>
      </Wrapper>
    );
  }

  const { territories, networks, leads } = data;

  const totalLeads = territories.reduce((acc: number, t: any) => acc + t.leadCount, 0);
  const highOppZones = territories.filter((t: any) => t.level === 'High').length;

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black !text-dash-text mb-2 flex items-center gap-3">
            <MapIcon className="text-dash-accent" size={32} /> Territory Intelligence
          </h1>
          <p className="!text-dash-textMuted">Analyze geographic opportunity zones, map business networks, and visualize market density.</p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-dash-border rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <MapIcon size={80} className="!text-dash-textMuted" />
            </div>
            <p className="text-xs font-bold !text-dash-textMuted tracking-widest mb-2">Mapped Leads</p>
            <h3 className="text-4xl font-black !text-dash-text">{totalLeads}</h3>
            <p className="text-sm !text-dash-textMuted mt-2">Total businesses in viewport.</p>
          </div>
          
          <div className="bg-white border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Target size={80} className="text-emerald-400" />
            </div>
            <p className="text-xs font-bold text-emerald-400 tracking-widest mb-2">High Opp Zones</p>
            <h3 className="text-4xl font-black !text-dash-text">{highOppZones}</h3>
            <p className="text-sm !text-dash-textMuted mt-2">Territories ripe for agency services.</p>
          </div>

          <div className="bg-white border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Users size={80} className="text-blue-400" />
            </div>
            <p className="text-xs font-bold text-blue-400 tracking-widest mb-2">Detected Networks</p>
            <h3 className="text-4xl font-black !text-dash-text">{networks.length}</h3>
            <p className="text-sm !text-dash-textMuted mt-2">Franchises and multi-location brands.</p>
          </div>
        </div>

        {/* Main Map View */}
        <OpportunityMapLayer leads={leads} />

        {/* Right Sidebar */}
        <div className="w-80 space-y-6">
        </div>
      </div>
    </Wrapper>
  );
}
