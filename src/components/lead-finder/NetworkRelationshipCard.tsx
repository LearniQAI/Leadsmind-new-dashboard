'use client';

import React from 'react';
import { Network, Link as LinkIcon, Building2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export function NetworkRelationshipCard({ networks }: { networks: any[] }) {
  if (!networks || networks.length === 0) return null;

  return (
    <div className="bg-n800 border border-white/10 rounded-3xl p-6">
      <h2 className="text-xl font-space font-bold text-white mb-6 flex items-center gap-2">
        <Network className="text-accent" /> Business Networks
      </h2>

      <div className="space-y-4">
        {networks.slice(0, 5).map((network, i) => (
          <div key={i} className="p-5 bg-white/5 border border-white/10 rounded-2xl group hover:border-accent/40 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-white mb-1 group-hover:text-accent transition-colors">{network.network_name}</h3>
                <p className="text-xs text-t3 flex items-center gap-1">
                  <Building2 size={12} /> {network.type}
                </p>
              </div>
              <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">
                {network.confidence_score}% Match
              </span>
            </div>

            <div className="space-y-2 mb-4">
              {network.members.slice(0, 3).map((member: any) => (
                <Link key={member.id} href={`/lead-finder/lead/${member.id}`} className="flex items-center justify-between text-sm text-t2 hover:text-white transition-colors bg-n900 p-2 rounded-lg">
                  <span className="truncate pr-4 flex items-center gap-2">
                    <LinkIcon size={12} className="text-t4 shrink-0" />
                    {member.business_name}
                  </span>
                  <ChevronRight size={14} className="text-t4 shrink-0" />
                </Link>
              ))}
              {network.members.length > 3 && (
                <p className="text-xs font-bold text-accent uppercase tracking-wider text-center mt-2 pt-2 border-t border-white/5">
                  + {network.members.length - 3} more locations
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
