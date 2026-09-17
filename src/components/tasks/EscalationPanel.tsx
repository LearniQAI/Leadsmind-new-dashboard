'use client';

import React from 'react';
import { AlertTriangle, Clock, Target, User } from 'lucide-react';

export function EscalationPanel({ escalations }: { escalations: any[] }) {
  if (!escalations || escalations.length === 0) return null;

  return (
    <div className="bg-red/5 border border-red/20 rounded-3xl p-6 mb-8">
      <h2 className="text-lg font-bold text-red mb-6 flex items-center gap-2 tracking-tight">
        <AlertTriangle className="w-5 h-5" /> Escalations
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {escalations.map((escalation: any) => (
          <div key={escalation.id} className="p-4 bg-white border border-red/20 rounded-2xl flex items-start justify-between shadow-sm">
            <div>
              <h4 className="font-semibold !text-dash-text text-sm">
                {escalation.tasks?.title}
              </h4>
              <p className="text-xs text-red mt-2 font-medium">
                {escalation.escalation_reason}
              </p>
            </div>
            <div className="text-right">
              <span className="bg-red/10 text-red text-[11px] font-semibold px-2 py-1 rounded-md inline-flex items-center gap-1">
                <Clock size={10} /> Escalated
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
