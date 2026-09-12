'use client';

import React from 'react';
import { ShieldAlert, Check, X } from 'lucide-react';

export function ApprovalPanel({ approvals }: { approvals: any[] }) {
  if (!approvals || approvals.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 mb-8">
      <h2 className="text-xl font-space font-bold text-amber-700 mb-6 flex items-center gap-2">
        <ShieldAlert /> Pending Approvals
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {approvals.map((req: any) => (
          <div key={req.id} className="p-4 bg-dash-surface border border-amber-300 rounded-2xl flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">
                {req.request_type.replace(/_/g, ' ')}
              </p>
              <h4 className="font-bold text-dash-text text-sm">
                Requested by: {req.requester?.email || 'Unknown User'}
              </h4>
              <p className="text-xs text-dash-textMuted mt-2">{req.notes || 'No notes provided.'}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button className="p-2 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded-xl transition-colors" title="Approve">
                <Check size={16} />
              </button>
              <button className="p-2 bg-rose-100 text-rose-600 hover:bg-rose-200 rounded-xl transition-colors" title="Reject">
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
