'use client';

import React from 'react';
import { ShieldAlert, Check, X } from 'lucide-react';

export function ApprovalPanel({ approvals }: { approvals: any[] }) {
  if (!approvals || approvals.length === 0) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 mb-8">
      <h2 className="text-xl font-space font-bold text-amber-400 mb-6 flex items-center gap-2">
        <ShieldAlert /> Pending Approvals
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {approvals.map((req: any) => (
          <div key={req.id} className="p-4 bg-n900 border border-amber-500/30 rounded-2xl flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">
                {req.request_type.replace(/_/g, ' ')}
              </p>
              <h4 className="font-bold text-white text-sm">
                Requested by: {req.requester?.email || 'Unknown User'}
              </h4>
              <p className="text-xs text-t3 mt-2">{req.notes || 'No notes provided.'}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl transition-colors" title="Approve">
                <Check size={16} />
              </button>
              <button className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl transition-colors" title="Reject">
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
