'use client';

import React, { useState } from 'react';
import { Target, GripHorizontal, DollarSign, Building2, User } from 'lucide-react';
import Link from 'next/link';

const STAGES = [
  { id: 'new', title: 'New Opportunity', color: 'border-blue-400', dot: 'bg-blue-500' },
  { id: 'contacted', title: 'Contacted', color: 'border-amber-400', dot: 'bg-amber-500' },
  { id: 'qualified', title: 'Qualified', color: 'border-emerald-400', dot: 'bg-emerald-500' },
  { id: 'proposal', title: 'Proposal Sent', color: 'border-purple-400', dot: 'bg-purple-500' },
  { id: 'won', title: 'Closed Won', color: 'border-emerald-500', dot: 'bg-emerald-600' }
];

export function OpportunityPipeline({ opportunities }: { opportunities: any[] }) {
  const [opps, setOpps] = useState(opportunities);

  // In a real app, you'd use react-beautiful-dnd or similar.
  // For MVP, we render a static kanban board mapping the stages.

  return (
    <div className="flex gap-6 overflow-x-auto pb-8 custom-scrollbar h-[calc(100vh-250px)]">
      {STAGES.map(stage => {
        const stageOpps = opps.filter(o => o.stage_id === stage.id);
        const stageTotal = stageOpps.reduce((acc, o) => acc + Number(o.amount), 0);

        return (
          <div key={stage.id} className="min-w-[320px] w-[320px] flex flex-col h-full bg-dash-surface border border-dash-border rounded-3xl p-4">
            <div className={`mb-4 pb-4 border-b-2 ${stage.color} flex items-center justify-between`}>
              <div>
                <h3 className="font-space font-bold text-dash-text text-sm uppercase tracking-wider flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${stage.dot}`} /> {stage.title}
                </h3>
                <p className="text-xs text-dash-textMuted mt-1 font-bold">${stageTotal.toLocaleString()} • {stageOpps.length} deals</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {stageOpps.map(opp => (
                <div key={opp.id} className="bg-dash-bg border border-dash-border rounded-2xl p-4 hover:border-dash-accent/40 hover:shadow-md transition-all group cursor-grab">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-dash-text text-sm group-hover:text-dash-accent transition-colors leading-tight">
                      {opp.name}
                    </h4>
                    <GripHorizontal size={14} className="text-dash-textMuted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="font-space font-black text-emerald-600 mb-3 flex items-center gap-1">
                    <DollarSign size={14} /> {Number(opp.amount).toLocaleString()}
                  </div>

                  <div className="space-y-1.5 mt-3 pt-3 border-t border-dash-border">
                    {opp.company?.name && (
                      <p className="text-xs text-dash-textMuted flex items-center gap-2 truncate">
                        <Building2 size={12} className="text-dash-textMuted shrink-0" /> {opp.company.name}
                      </p>
                    )}
                    {opp.contact?.email && (
                      <p className="text-xs text-dash-textMuted flex items-center gap-2 truncate">
                        <User size={12} className="text-dash-textMuted shrink-0" /> {opp.contact.email}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
