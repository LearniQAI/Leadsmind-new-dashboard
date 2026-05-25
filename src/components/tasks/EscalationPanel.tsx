'use client';

import React from 'react';
import { AlertTriangle, Clock, Target, User } from 'lucide-react';

export function EscalationPanel({ escalations }: { escalations: any[] }) {
  if (!escalations || escalations.length === 0) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 mb-8">
      <h2 className="text-xl font-space font-bold text-red-400 mb-6 flex items-center gap-2">
        <AlertTriangle /> Overdue Escalations
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {escalations.map((escalation: any) => (
          <div key={escalation.id} className="p-4 bg-n900 border border-red-500/30 rounded-2xl flex items-start justify-between">
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                {escalation.crm_tasks?.title}
              </h4>
              <p className="text-xs text-red-400 mt-2 font-semibold">
                Reason: {escalation.escalation_reason}
              </p>
            </div>
            <div className="text-right">
              <span className="bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded inline-flex items-center gap-1">
                <Clock size={10} /> Escalated
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
