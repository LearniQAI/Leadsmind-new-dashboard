'use client';

import React, { useState } from 'react';
import { Map, MapPin, Search, Layers, Navigation, ChevronRight, Building2, User } from 'lucide-react';
import Link from 'next/link';

export function OpportunityMapLayer({ leads }: { leads: any[] }) {
  // Simulate map rendering with a simplified grid for MVP.
  // In production, this mounts Mapbox GL JS or Google Maps.
  
  const [filter, setFilter] = useState('all');

  return (
    <div className="bg-n800 border border-white/10 rounded-3xl overflow-hidden flex flex-col h-[600px] relative">
      {/* Map Controls Overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-n900/90 backdrop-blur-md border border-white/10 rounded-xl p-2 flex items-center gap-2 pointer-events-auto shadow-2xl">
          <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${filter === 'all' ? 'bg-white/10 text-white' : 'text-t4 hover:text-white'}`}>All Leads</button>
          <button onClick={() => setFilter('high')} className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${filter === 'high' ? 'bg-emerald-500/20 text-emerald-400' : 'text-t4 hover:text-emerald-400'}`}>High Opp</button>
          <button onClick={() => setFilter('gaps')} className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${filter === 'gaps' ? 'bg-amber-500/20 text-amber-400' : 'text-t4 hover:text-amber-400'}`}>Gaps</button>
        </div>
        <div className="bg-n900/90 backdrop-blur-md border border-white/10 rounded-xl p-2 flex flex-col gap-1 pointer-events-auto shadow-2xl">
          <button className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"><Layers size={18} /></button>
          <button className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"><Navigation size={18} /></button>
        </div>
      </div>

      {/* Abstract Map Visualization */}
      <div className="flex-1 bg-[#0a1128] relative overflow-hidden flex items-center justify-center p-8">
        {/* Decorative Grid */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        {leads.length === 0 ? (
          <div className="text-center z-10">
            <Map size={48} className="text-t4 mx-auto mb-4 opacity-30" />
            <p className="text-t4 font-bold tracking-widest uppercase text-sm">Map Data Unavailable</p>
          </div>
        ) : (
          <div className="w-full h-full relative z-10">
            {/* Render a scattered sample of leads to simulate map markers */}
            {leads.slice(0, 30).map((lead, i) => {
              // Deterministic fake position based on ID length/index
              const top = `${20 + ((i * 17) % 60)}%`;
              const left = `${10 + ((i * 23) % 80)}%`;
              
              const isHigh = lead.lead_score >= 70;
              const isGap = !lead.website || lead.rating < 4.0;
              
              if (filter === 'high' && !isHigh) return null;
              if (filter === 'gaps' && !isGap) return null;

              return (
                <Link key={lead.id} href={`/lead-finder/lead/${lead.id}`} className="absolute group transform -translate-x-1/2 -translate-y-1/2 hover:z-50 transition-all duration-300 hover:scale-110" style={{ top, left }}>
                  <div className={`p-2 rounded-full shadow-xl shadow-black/50 ${isHigh ? 'bg-emerald-500 text-black' : isGap ? 'bg-amber-400 text-black' : 'bg-white text-black'}`}>
                    {isHigh ? <Building2 size={14} /> : <MapPin size={14} />}
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-n900 border border-white/10 rounded-xl p-3 w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl">
                    <p className="text-xs font-bold text-white truncate">{lead.business_name}</p>
                    <p className="text-[10px] text-t3 truncate mt-1">{lead.location}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-n900 border-t border-white/5 p-4 flex items-center justify-between text-xs font-bold text-t4 uppercase tracking-wider">
        <span>{leads.length} Leads in Viewport</span>
        <span className="flex items-center gap-1">Data Layer: Default <ChevronRight size={14} /></span>
      </div>
    </div>
  );
}
