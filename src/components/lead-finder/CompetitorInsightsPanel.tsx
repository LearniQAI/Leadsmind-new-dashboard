'use client';

import React from 'react';
import { Crosshair, Star, Navigation } from 'lucide-react';

export function CompetitorInsightsPanel({ competitors }: { competitors: any[] }) {
  if (!competitors || competitors.length === 0) return null;

  return (
    <div className="bg-n800 border border-white/10 rounded-3xl p-6">
      <h3 className="text-lg font-space font-bold text-white mb-4 flex items-center gap-2">
        <Crosshair className="text-accent" /> Competitor Context
      </h3>
      
      <div className="space-y-3">
        {competitors.map((comp, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
            <div>
              <p className="text-sm font-bold text-white">{comp.competitor_name}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-t3">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star size={12} className="fill-amber-400" /> {comp.rating}
                </span>
                <span className="flex items-center gap-1">
                  <Navigation size={12} /> {(comp.distance_meters / 1000).toFixed(1)} km away
                </span>
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-widest text-t4 px-2 py-1 bg-white/10 rounded">
                Market Threat
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
